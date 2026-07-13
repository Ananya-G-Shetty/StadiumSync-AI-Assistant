import * as schema from './schema';
import { seedDatabase } from './seed';
import fs from 'fs';
import path from 'path';

// Local Persistent JSON Database Store Paths
const DB_DIR = path.join(process.cwd(), '.pglite-data');
const DATA_FILE = path.join(DB_DIR, 'db-store.json');

// Stateful in-memory database arrays
let venuesData: any[] = [];
let amenitiesData: any[] = [];
let matchesData: any[] = [];
let waitTimesData: any[] = [];
let userFeedbackData: any[] = [];

let seeded = false;

// Load database from file system
function loadDbFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(content);
      
      venuesData = parsed.venues || [];
      amenitiesData = parsed.amenities || [];
      matchesData = parsed.matches || [];
      waitTimesData = parsed.waitTimes || [];
      userFeedbackData = parsed.userFeedback || [];
      
      // Mapped date objects
      matchesData.forEach(m => m.datetime = m.datetime ? new Date(m.datetime) : new Date());
      userFeedbackData.forEach(f => f.reportedAt = f.reportedAt ? new Date(f.reportedAt) : new Date());
      waitTimesData.forEach(w => w.updatedAt = w.updatedAt ? new Date(w.updatedAt) : new Date());
      
      return true;
    }
  } catch (err) {
    console.error('Failed to load database from file, using memory backup:', err);
  }
  return false;
}

// Save database to file system
function saveDbToFile() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          venues: venuesData,
          amenities: amenitiesData,
          matches: matchesData,
          waitTimes: waitTimesData,
          userFeedback: userFeedbackData,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to save database to file:', err);
  }
}

// Load current data on import
loadDbFromFile();

// Parse actual Drizzle ORM condition objects
function parseDrizzleCondition(condition: any) {
  if (!condition) return null;

  if (condition.left !== undefined && condition.right !== undefined) {
    return {
      key: condition.left.name,
      value: condition.right
    };
  }

  if (condition.queryChunks && Array.isArray(condition.queryChunks)) {
    let colName = '';
    let value: any = undefined;
    let foundColumn = false;
    let foundParam = false;

    for (const chunk of condition.queryChunks) {
      if (chunk && typeof chunk === 'object') {
        if ('table' in chunk && 'name' in chunk) {
          colName = chunk.name;
          foundColumn = true;
        } else if ('value' in chunk && !Array.isArray(chunk.value) && 'encoder' in chunk) {
          value = chunk.value;
          foundParam = true;
        }
      }
    }

    if (foundColumn && foundParam) {
      return { key: colName, value };
    }
  }

  return null;
}

// Match conditions in WHERE clauses
function matchCondition(item: any, condition: any): boolean {
  if (!condition) return true;

  if (typeof condition === 'function') {
    return condition(item);
  }

  const parsed = parseDrizzleCondition(condition);
  if (parsed) {
    const { key: colName, value } = parsed;
    
    // Map database snake_case keys to local JSON camelCase keys
    const keyMap: Record<string, string> = {
      'venue_id': 'venueId',
      'id': 'id',
      'status': 'status',
      'type': 'type',
      'amenity_id': 'amenityId',
    };
    const jsKey = keyMap[colName] || colName;
    return item[jsKey] === value;
  }

  // Parse Drizzle And class
  if (condition.conditions && Array.isArray(condition.conditions)) {
    return condition.conditions.every((c: any) => matchCondition(item, c));
  }

  // Also support nested conditions in queryChunks for composite SQL
  if (condition.queryChunks && Array.isArray(condition.queryChunks)) {
    const subConds = condition.queryChunks.filter((chunk: any) => chunk && typeof chunk === 'object' && 'queryChunks' in chunk);
    if (subConds.length > 0) {
      return subConds.every((c: any) => matchCondition(item, c));
    }
  }

  return true;
}

// Drizzle mock query builder
class QueryBuilder {
  private tableData: any[] = [];
  private filterFn: ((item: any) => boolean) | null = null;
  private joinTableData: any[] = [];
  private joinOnFn: ((left: any, right: any) => boolean) | null = null;
  private orderFn: ((a: any, b: any) => number) | null = null;
  private limitNum: number | null = null;

  constructor(private fields: any) {}

  select(fields?: any) {
    return this;
  }

  from(table: any) {
    if (table === schema.venues) this.tableData = venuesData;
    else if (table === schema.amenities) this.tableData = amenitiesData;
    else if (table === schema.matches) this.tableData = matchesData;
    else if (table === schema.waitTimes) this.tableData = waitTimesData;
    else if (table === schema.userFeedback) this.tableData = userFeedbackData;
    return this;
  }

  leftJoin(targetTable: any, onCondition: any) {
    if (targetTable === schema.waitTimes) this.joinTableData = waitTimesData;
    this.joinOnFn = (left, right) => left.id === right.amenityId;
    return this;
  }

  where(condition: any) {
    this.filterFn = (item) => matchCondition(item, condition);
    return this;
  }

  orderBy(orderClause: any) {
    this.orderFn = (a, b) => {
      const valA = a.reportedAt || a.datetime || 0;
      const valB = b.reportedAt || b.datetime || 0;
      return new Date(valB).getTime() - new Date(valA).getTime(); // default desc
    };
    return this;
  }

  limit(num: number) {
    this.limitNum = num;
    return this;
  }

  async execute() {
    let result = [...this.tableData];

    // Left Join mapping
    if (this.joinTableData.length > 0 && this.joinOnFn) {
      result = result.map((leftItem) => {
        const rightItem = this.joinTableData.find((r) => this.joinOnFn!(leftItem, r));
        return {
          ...leftItem,
          waitTimeMinutes: rightItem ? rightItem.waitTimeMinutes : null,
          updatedAt: rightItem ? rightItem.updatedAt : null,
        };
      });
    }

    // Filter
    if (this.filterFn) {
      result = result.filter(this.filterFn);
    }

    // Sort
    if (this.orderFn) {
      result.sort(this.orderFn);
    }

    // Limit
    if (this.limitNum !== null) {
      result = result.slice(0, this.limitNum);
    }

    // Count projection helper
    if (this.fields && this.fields.count) {
      return [{ count: result.length }];
    }

    return result;
  }

  then(onfulfilled?: any, onrejected?: any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Drizzle mock insert builder
class InsertBuilder {
  constructor(private table: any) {}

  values(data: any) {
    let targetArray: any[] = [];
    if (this.table === schema.venues) targetArray = venuesData;
    else if (this.table === schema.amenities) targetArray = amenitiesData;
    else if (this.table === schema.matches) targetArray = matchesData;
    else if (this.table === schema.waitTimes) targetArray = waitTimesData;
    else if (this.table === schema.userFeedback) targetArray = userFeedbackData;

    const rows = Array.isArray(data) ? data : [data];
    const insertedRows = rows.map((row, index) => {
      const newItem = {
        id: row.id || (targetArray.length + index + 1),
        createdAt: new Date(),
        reportedAt: new Date(),
        status: 'pending',
        ...row,
      };
      return newItem;
    });

    targetArray.push(...insertedRows);
    saveDbToFile();

    return {
      returning: () => insertedRows,
      then: (onfulfilled: any) => Promise.resolve(insertedRows).then(onfulfilled),
    };
  }
}

// Drizzle mock update builder
class UpdateBuilder {
  private filterFn: ((item: any) => boolean) | null = null;
  private tableData: any[] = [];

  constructor(private table: any) {
    if (this.table === schema.venues) this.tableData = venuesData;
    else if (this.table === schema.amenities) this.tableData = amenitiesData;
    else if (this.table === schema.matches) this.tableData = matchesData;
    else if (this.table === schema.waitTimes) this.tableData = waitTimesData;
    else if (this.table === schema.userFeedback) this.tableData = userFeedbackData;
  }

  set(values: any) {
    return {
      where: (condition: any) => {
        this.filterFn = (item) => matchCondition(item, condition);
        this.tableData.forEach((item) => {
          if (this.filterFn && this.filterFn(item)) {
            Object.keys(values).forEach((key) => {
              // Map DB wait_time_minutes to schema JS waitTimeMinutes
              const jsKey = key === 'wait_time_minutes' ? 'waitTimeMinutes' : key;
              item[jsKey] = values[key];
            });
          }
        });
        saveDbToFile();
        return {
          returning: () => this.tableData,
          then: (onfulfilled: any) => Promise.resolve(this.tableData).then(onfulfilled),
        };
      },
      then: (onfulfilled: any) => {
        this.tableData.forEach((item) => {
          Object.keys(values).forEach((key) => {
            const jsKey = key === 'wait_time_minutes' ? 'waitTimeMinutes' : key;
            item[jsKey] = values[key];
          });
        });
        saveDbToFile();
        return Promise.resolve(this.tableData).then(onfulfilled);
      }
    };
  }
}

// Initialize seed data if database is empty
if (venuesData.length === 0 && process.env.NEXT_PHASE !== 'phase-production-build') {
  console.log('Database empty on start. Running mock-DB seeder...');
  seeded = true;
  // Initialize mock db client and run seed
  const mockDbClient = {
    select: (fields?: any) => new QueryBuilder(fields),
    insert: (table: any) => new InsertBuilder(table),
    update: (table: any) => new UpdateBuilder(table),
  } as any;
  
  seedDatabase(mockDbClient).catch((err) => {
    console.error('Failed to run mock-DB seeder:', err);
  });
}

// Export drop-in replacements for Drizzle + PgLite
export const db = {
  select: (fields?: any) => new QueryBuilder(fields),
  insert: (table: any) => new InsertBuilder(table),
  update: (table: any) => new UpdateBuilder(table),
} as any;

export const pglite = {} as any;


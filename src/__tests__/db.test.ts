import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { venues, amenities, matches, waitTimes, userFeedback } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('Drizzle DB Mock Query Engine & Schemas', () => {

  it('should query venues from the schema and filter by country', async () => {
    const allVenues = await db.select().from(venues).execute();
    expect(allVenues).toBeDefined();
    expect(allVenues.length).toBe(3); // seeded metlife, sofi, azteca

    const usaVenues = allVenues.filter((v: any) => v.country === 'USA');
    expect(usaVenues.length).toBe(2);
    expect(usaVenues.map((v: any) => v.id)).toContain('metlife-stadium');
    expect(usaVenues.map((v: any) => v.id)).toContain('sofi-stadium');

    const mexicoVenues = allVenues.filter((v: any) => v.country === 'Mexico');
    expect(mexicoVenues.length).toBe(1);
    expect(mexicoVenues[0].id).toBe('estadio-azteca');
  });

  it('should perform join mapping of amenities with wait times', async () => {
    const list = await db.select()
      .from(amenities)
      .leftJoin(waitTimes, eq(amenities.id, waitTimes.amenityId))
      .where(eq(amenities.venueId, 'sofi-stadium'))
      .execute();

    expect(list).toBeDefined();
    expect(list.length).toBeGreaterThan(0);

    const firstItem = list[0];
    expect(firstItem.venueId).toBe('sofi-stadium');
    // Left-joined mock properties should be populated
    expect(firstItem).toHaveProperty('waitTimeMinutes');
  });

  it('should query matches filtered by venueId', async () => {
    const metlifeMatches = await db.select()
      .from(matches)
      .where(eq(matches.venueId, 'metlife-stadium'))
      .execute();

    expect(metlifeMatches).toBeDefined();
    expect(metlifeMatches.length).toBeGreaterThan(0);
    metlifeMatches.forEach((m: any) => {
      expect(m.venueId).toBe('metlife-stadium');
    });
  });

  it('should support limit clause in query builders', async () => {
    const limitedVenues = await db.select()
      .from(venues)
      .limit(1)
      .execute();

    expect(limitedVenues).toBeDefined();
    expect(limitedVenues.length).toBe(1);
  });

});

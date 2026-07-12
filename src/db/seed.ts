import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';
import { count } from 'drizzle-orm';

export async function seedDatabase(db: ReturnType<typeof drizzle<typeof schema>>) {
  // Check if seeding is already done
  const existingVenues = await db.select({ count: count() }).from(schema.venues);
  if (existingVenues[0].count > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding database with FIFA 2026 Stadiums and accessibility facilities...');

  // 1. Seed Venues
  await db.insert(schema.venues).values([
    {
      id: 'metlife-stadium',
      name: 'MetLife Stadium',
      city: 'East Rutherford, NJ',
      country: 'USA',
      capacity: 82500,
      image: 'https://images.unsplash.com/photo-1566371486490-560ded239fe6?auto=format&fit=crop&w=600&q=80',
      accessibilitySummary: 'Fully ADA compliant. Offering comprehensive wheelchair-accessible seating across all levels, assisted listening devices, captioning boards, and multiple sensory relief rooms.',
      gates: 'Gate A (ADA Priority), Gate B, Gate C, Gate D, Pepsi Gate, Verizon Gate',
    },
    {
      id: 'sofi-stadium',
      name: 'SoFi Stadium',
      city: 'Los Angeles, CA',
      country: 'USA',
      capacity: 70240,
      image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
      accessibilitySummary: 'State-of-the-art accessible architecture. Includes universal step-free access, 12 major elevator banks, sensory rooms powered by KultureCity, open-captioning on the Infinity Screen, and dedicated ADA shuttles from parking lots.',
      gates: 'Entry 1 to 12. Entry 7 & Entry 12 are designated ADA priority access routes.',
    },
    {
      id: 'estadio-azteca',
      name: 'Estadio Azteca',
      city: 'Mexico City',
      country: 'Mexico',
      capacity: 87523,
      image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
      accessibilitySummary: 'Historic venue renovated with modern accessibility infrastructure. Newly added wheelchair ramps, retrofitted low-counter ticketing and concession windows, audio-described commentary services, and dedicated multilingual accessibility volunteers.',
      gates: 'Torniquetes Insurgentes (ADA Priority), Torniquetes Calzada de Tlalpan, Puerta 1, Puerta 2',
    },
  ]);

  // 2. Seed Amenities
  // MetLife Stadium Amenities
  const metlifeAmenities = await db.insert(schema.amenities).values([
    {
      venueId: 'metlife-stadium',
      name: 'Section 109 Accessible Restroom',
      type: 'restroom',
      location: 'Lower Concourse, near Section 109',
      level: 1,
      section: '109',
      isAccessible: true,
      accessibilityDetails: 'All-gender single-occupant, grab bars, lowered sink, motion-sensor doors, braille signage, emergency pull-string.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Section 124 Companion Restroom',
      type: 'restroom',
      location: 'Lower Concourse, near Section 124',
      level: 1,
      section: '124',
      isAccessible: true,
      accessibilityDetails: 'Spacious companion/family toilet with baby changing station and adult-sized changing table.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Plaza Level Elevator Bank A',
      type: 'elevator',
      location: 'West Concourse, near Gate A',
      level: 1,
      section: 'Gate A',
      isAccessible: true,
      accessibilityDetails: 'Voice announcements, braille buttons, tactile flooring guide, wide doors for double-wheelchair capacity.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Section 228 Escalator (East Concourse)',
      type: 'elevator',
      location: 'Upper Concourse, near Section 228',
      level: 2,
      section: '228',
      isAccessible: false,
      accessibilityDetails: 'Escalator connecting lower and upper plazas. Undergoing standard maintenance.',
      status: 'maintenance',
    },
    {
      venueId: 'metlife-stadium',
      name: 'KultureCity Sensory Room',
      type: 'sensory_room',
      location: 'Citibank Club Level, Lounge Area',
      level: 2,
      section: 'Club Lounge',
      isAccessible: true,
      accessibilityDetails: 'Quiet environment with sensory active toys, noise-canceling headphones, weighted lap pads, and trained sensory staff.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Section 143 First Aid Station',
      type: 'first_aid',
      location: 'Main Plaza Level, near Section 143',
      level: 1,
      section: '143',
      isAccessible: true,
      accessibilityDetails: 'Wheelchair storage, oxygen therapy, paramedic support, accessible triage table, and cooling fans.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Gate A Service Animal Relief Area',
      type: 'relief_area',
      location: 'Just outside Gate A Plaza, next to guest services',
      level: 1,
      section: 'Gate A',
      isAccessible: true,
      accessibilityDetails: 'Fenced synthetic grass area, waste disposal bags, watering station, wheelchair-accessible latch gate.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Kickoff Eats (Low Counter Concession)',
      type: 'food',
      location: 'Lower Concourse, near Section 117',
      level: 1,
      section: '117',
      isAccessible: true,
      accessibilityDetails: 'Lowered cash register and pickup counter (32 inches), audio menus, gluten-free, vegan and allergen-free snack options.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Corner Cafe',
      type: 'food',
      location: 'Upper Concourse, Section 312',
      level: 3,
      section: '312',
      isAccessible: true,
      accessibilityDetails: 'Standard counter heights. Large print menus available.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Section 215 Family Restroom',
      type: 'restroom',
      location: 'Club Level, near Section 215',
      level: 2,
      section: '215',
      isAccessible: true,
      accessibilityDetails: 'All-gender family restroom with wide turning radius, infant changer, and companion call assistance.',
      status: 'operational',
    },
    {
      venueId: 'metlife-stadium',
      name: 'Section 328 Accessible Restroom',
      type: 'restroom',
      location: 'Upper Concourse, near Section 328',
      level: 3,
      section: '328',
      isAccessible: true,
      accessibilityDetails: 'Single-occupant, step-free access, emergency push-buttons, low sink heights, grab bars.',
      status: 'operational',
    },
  ]).returning();

  // SoFi Stadium Amenities
  const sofiAmenities = await db.insert(schema.amenities).values([
    {
      venueId: 'sofi-stadium',
      name: 'Section 120 Accessible Unisex Restroom',
      type: 'restroom',
      location: 'Level 4 Concourse, near Section 120',
      level: 4,
      section: '120',
      isAccessible: true,
      accessibilityDetails: 'Automatic sliding doors, toilet paper dispensers at accessible heights, emergency panic buttons linked to medical dispatch.',
      status: 'operational',
    },
    {
      venueId: 'sofi-stadium',
      name: 'Elevator Bank 4 (South)',
      type: 'elevator',
      location: 'South Concourse, near Entry 8',
      level: 1,
      section: 'Entry 8',
      isAccessible: true,
      accessibilityDetails: 'Dual-access doors, low-height control panel, audio floor indicators in Spanish and English.',
      status: 'operational',
    },
    {
      venueId: 'sofi-stadium',
      name: 'North Ramp (Step-free Route)',
      type: 'ramp',
      location: 'Connecting level 2 to level 4, North End',
      level: 2,
      section: 'North End',
      isAccessible: true,
      accessibilityDetails: 'Gentle grade (1:12 slope) with level landing platforms every 30 feet, slip-resistant concrete, continuous handrails.',
      status: 'operational',
    },
    {
      venueId: 'sofi-stadium',
      name: 'Sensory Room by KultureCity',
      type: 'sensory_room',
      location: 'Level 2, North Guest Services Lobby',
      level: 2,
      section: 'North Lobby',
      isAccessible: true,
      accessibilityDetails: 'Quiet room with soft light panels, weighted blankets, tactile bubble walls, and sensory bags with noise-reduction earmuffs.',
      status: 'operational',
    },
    {
      venueId: 'sofi-stadium',
      name: 'First Aid Center - Level 6',
      type: 'first_aid',
      location: 'Level 6 Concourse, near Section 302',
      level: 6,
      section: '302',
      isAccessible: true,
      accessibilityDetails: 'Wheelchair assistance base, basic cardiac life support, accessible examination cot.',
      status: 'operational',
    },
    {
      venueId: 'sofi-stadium',
      name: 'Gluten-Free & Organic World Concessions',
      type: 'food',
      location: 'Level 4 Concourse, Section 224',
      level: 4,
      section: '224',
      isAccessible: true,
      accessibilityDetails: 'Lowered pickup counter, braille and Spanish/English menus, vegan, gluten-free, peanut-free certifications.',
      status: 'operational',
    },
    {
      venueId: 'sofi-stadium',
      name: 'Section 215 Family Restroom',
      type: 'restroom',
      location: 'Club Level, near Section 215',
      level: 2,
      section: '215',
      isAccessible: true,
      accessibilityDetails: 'All-gender family restroom with wide turning radius, infant changer, and companion call assistance.',
      status: 'operational',
    },
    {
      venueId: 'sofi-stadium',
      name: 'Section 328 Accessible Restroom',
      type: 'restroom',
      location: 'Upper Concourse, near Section 328',
      level: 3,
      section: '328',
      isAccessible: true,
      accessibilityDetails: 'Single-occupant, step-free access, emergency push-buttons, low sink heights, grab bars.',
      status: 'operational',
    },
  ]).returning();

  // Estadio Azteca Amenities
  const aztecaAmenities = await db.insert(schema.amenities).values([
    {
      venueId: 'estadio-azteca',
      name: 'Baño Accesible Sección 100',
      type: 'restroom',
      location: 'Nivel Principal, Sección 105',
      level: 1,
      section: '105',
      isAccessible: true,
      accessibilityDetails: 'Pasamanos reforzados, lavamanos de baja altura, espacio para giro de silla de ruedas de 360 grados.',
      status: 'operational',
    },
    {
      venueId: 'estadio-azteca',
      name: 'Elevador de Acceso Preferente Poniente',
      type: 'elevator',
      location: 'Acceso Poniente, junto al túnel 3',
      level: 1,
      section: 'Túnel 3',
      isAccessible: true,
      accessibilityDetails: 'Operado por personal de asistencia, botones táctiles y auditivos en español e inglés.',
      status: 'operational',
    },
    {
      venueId: 'estadio-azteca',
      name: 'Rampa de Acceso General Oriente',
      type: 'ramp',
      location: 'Entrada Calzada de Tlalpan, Conexión a Gradas',
      level: 1,
      section: 'Entrada Oriente',
      isAccessible: true,
      accessibilityDetails: 'Rampa adaptada de 1.8 metros de ancho, superficie texturizada antideslizante.',
      status: 'operational',
    },
    {
      venueId: 'estadio-azteca',
      name: 'Módulo de Primeros Auxilios Cruz Roja',
      type: 'first_aid',
      location: 'Túnel de Acceso Especial 8',
      level: 1,
      section: 'Túnel 8',
      isAccessible: true,
      accessibilityDetails: 'Personal paramédico bilingüe, almacenamiento de tanques de oxígeno y medicamentos especiales.',
      status: 'operational',
    },
    {
      venueId: 'estadio-azteca',
      name: 'Section 215 Family Restroom',
      type: 'restroom',
      location: 'Club Level, near Section 215',
      level: 2,
      section: '215',
      isAccessible: true,
      accessibilityDetails: 'All-gender family restroom with wide turning radius, infant changer, and companion call assistance.',
      status: 'operational',
    },
    {
      venueId: 'estadio-azteca',
      name: 'Section 328 Accessible Restroom',
      type: 'restroom',
      location: 'Upper Concourse, near Section 328',
      level: 3,
      section: '328',
      isAccessible: true,
      accessibilityDetails: 'Single-occupant, step-free access, emergency push-buttons, low sink heights, grab bars.',
      status: 'operational',
    },
  ]).returning();

  // 3. Seed Matches
  const matchesData = await db.insert(schema.matches).values([
    // MetLife Stadium
    {
      venueId: 'metlife-stadium',
      homeTeam: 'USA',
      awayTeam: 'Italy',
      datetime: new Date('2026-06-15T18:00:00Z'),
      status: 'scheduled',
      score: null,
    },
    {
      venueId: 'metlife-stadium',
      homeTeam: 'Brazil',
      awayTeam: 'Spain',
      datetime: new Date('2026-07-19T20:00:00Z'), // World Cup Final venue!
      status: 'scheduled',
      score: null,
    },
    // SoFi Stadium
    {
      venueId: 'sofi-stadium',
      homeTeam: 'Canada',
      awayTeam: 'Japan',
      datetime: new Date('2026-06-12T17:00:00Z'),
      status: 'live',
      score: '1 - 1',
    },
    {
      venueId: 'sofi-stadium',
      homeTeam: 'England',
      awayTeam: 'Morocco',
      datetime: new Date('2026-06-25T15:00:00Z'),
      status: 'completed',
      score: '2 - 0',
    },
    // Estadio Azteca
    {
      venueId: 'estadio-azteca',
      homeTeam: 'Mexico',
      awayTeam: 'France',
      datetime: new Date('2026-06-11T19:00:00Z'), // Opening match!
      status: 'completed',
      score: '2 - 1',
    },
    {
      venueId: 'estadio-azteca',
      homeTeam: 'Argentina',
      awayTeam: 'Germany',
      datetime: new Date('2026-06-28T21:00:00Z'),
      status: 'scheduled',
      score: null,
    },
  ]);

  // 4. Seed Wait Times
  // Seed wait times for food and restrooms
  const amenitiesList = [...metlifeAmenities, ...sofiAmenities, ...aztecaAmenities];
  const waitTimesData = [];

  for (const amenity of amenitiesList) {
    if (amenity.type === 'food' || amenity.type === 'restroom') {
      // Create random wait time between 2 and 22 minutes
      const waitTime = Math.floor(Math.random() * 20) + 3;
      waitTimesData.push({
        amenityId: amenity.id,
        waitTimeMinutes: waitTime,
      });
    }
  }

  if (waitTimesData.length > 0) {
    await db.insert(schema.waitTimes).values(waitTimesData);
  }

  console.log('Seeding completed successfully!');
}

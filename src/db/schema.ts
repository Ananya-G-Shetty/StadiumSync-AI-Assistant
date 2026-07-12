import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const venues = pgTable('venues', {
  id: text('id').primaryKey(), // e.g. 'lumen-field', 'metlife-stadium'
  name: text('name').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(), // USA, Canada, Mexico
  capacity: integer('capacity').notNull(),
  image: text('image'), // placeholder or illustration
  accessibilitySummary: text('accessibility_summary'),
  gates: text('gates'), // comma-separated gates e.g. "Gate A, Gate B, Gate C"
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const amenities = pgTable('amenities', {
  id: serial('id').primaryKey(),
  venueId: text('venue_id').references(() => venues.id).notNull(),
  name: text('name').notNull(), // e.g. "Section 102 Accessible Restroom" or "Taco Stand"
  type: text('type').notNull(), // 'restroom' | 'food' | 'first_aid' | 'elevator' | 'ramp' | 'sensory_room' | 'water' | 'relief_area'
  location: text('location').notNull(), // e.g. "Concourse Lower Level, Section 102"
  level: integer('level').notNull(), // 1, 2, 3
  section: text('section').notNull(), // "102"
  isAccessible: boolean('is_accessible').default(true).notNull(),
  accessibilityDetails: text('accessibility_details'), // e.g., "Strobe-free, wheelchair accessible, braille signage"
  status: text('status').default('operational').notNull(), // 'operational' | 'closed' | 'maintenance'
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  venueId: text('venue_id').references(() => venues.id).notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  datetime: timestamp('datetime').notNull(),
  status: text('status').default('scheduled').notNull(), // 'scheduled' | 'live' | 'completed'
  score: text('score'), // e.g. "0 - 0"
});

export const waitTimes = pgTable('wait_times', {
  id: serial('id').primaryKey(),
  amenityId: integer('amenity_id').references(() => amenities.id).notNull(),
  waitTimeMinutes: integer('wait_time_minutes').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userFeedback = pgTable('user_feedback', {
  id: serial('id').primaryKey(),
  venueId: text('venue_id').references(() => venues.id).notNull(),
  category: text('category').notNull(), // 'cleanliness' | 'broken_facility' | 'safety' | 'access_block' | 'other'
  description: text('description').notNull(),
  location: text('location').notNull(), // e.g. "Section 104 Elevator"
  status: text('status').default('pending').notNull(), // 'pending' | 'investigating' | 'resolved'
  reportedAt: timestamp('reported_at').defaultNow().notNull(),
});

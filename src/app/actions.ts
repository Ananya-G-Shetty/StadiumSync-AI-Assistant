'use server';

import { db } from '@/db';
import { userFeedback, venues, amenities, matches, waitTimes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getVenues() {
  return await db.select().from(venues);
}

export async function getMatchesByVenue(venueId: string) {
  return await db.select().from(matches).where(eq(matches.venueId, venueId));
}

export async function getAmenitiesByVenue(venueId: string) {
  return await db.select().from(amenities).where(eq(amenities.venueId, venueId));
}

export async function getActiveWaitTimes(venueId: string) {
  const results = await db.select({
    amenityId: amenities.id,
    name: amenities.name,
    type: amenities.type,
    location: amenities.location,
    waitTimeMinutes: waitTimes.waitTimeMinutes,
    updatedAt: waitTimes.updatedAt,
    status: amenities.status,
  })
  .from(amenities)
  .leftJoin(waitTimes, eq(amenities.id, waitTimes.amenityId))
  .where(eq(amenities.venueId, venueId));

  return results;
}

export async function reportIssue(venueId: string, category: string, location: string, description: string) {
  if (!venueId || !category || !location || !description) {
    return { success: false, error: 'All fields are required.' };
  }

  try {
    await db.insert(userFeedback).values({
      venueId,
      category,
      location,
      description,
      status: 'pending',
    });

    revalidatePath('/');
    return { success: true, message: 'Issue reported successfully! Stadium assistance staff has been dispatched.' };
  } catch (err: any) {
    console.error('Error reporting issue:', err);
    return { success: false, error: err.message || 'Database error occurred.' };
  }
}

export async function getRecentFeedback(venueId: string) {
  return await db.select()
    .from(userFeedback)
    .where(eq(userFeedback.venueId, venueId))
    .orderBy(desc(userFeedback.reportedAt))
    .limit(5);
}

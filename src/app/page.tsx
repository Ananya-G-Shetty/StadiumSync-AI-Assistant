import React from 'react';
import { getVenues } from '@/app/actions';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch initial venue list server-side (RSC)
  const venues = await getVenues();

  return <DashboardClient initialVenues={venues} />;
}

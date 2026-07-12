import { describe, it, expect, vi } from 'vitest';
import { 
  getVenues, 
  getMatchesByVenue, 
  getAmenitiesByVenue, 
  reportIssue, 
  getRecentFeedback 
} from '../app/actions';

// Mock next/cache because revalidatePath is client-side or Next.js server-only
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('StadiumSync AI Server Actions', () => {
  
  it('should fetch list of venues', async () => {
    const venues = await getVenues();
    expect(venues).toBeDefined();
    expect(Array.isArray(venues)).toBe(true);
    expect(venues.length).toBeGreaterThan(0);
    
    // Check that seeded venues are present
    const ids = venues.map((v: any) => v.id);
    expect(ids).toContain('metlife-stadium');
    expect(ids).toContain('sofi-stadium');
    expect(ids).toContain('estadio-azteca');
  });

  it('should fetch matches for a specific venue', async () => {
    const matches = await getMatchesByVenue('metlife-stadium');
    expect(matches).toBeDefined();
    expect(Array.isArray(matches)).toBe(true);
    
    // Check that matches belong to metlife-stadium
    matches.forEach((match: any) => {
      expect(match.venueId).toBe('metlife-stadium');
    });
  });

  it('should fetch amenities for a specific venue', async () => {
    const amenities = await getAmenitiesByVenue('sofi-stadium');
    expect(amenities).toBeDefined();
    expect(Array.isArray(amenities)).toBe(true);
    
    // Check that all amenities belong to sofi-stadium
    amenities.forEach((amenity: any) => {
      expect(amenity.venueId).toBe('sofi-stadium');
    });
  });

  it('should fail to report an issue if required fields are missing', async () => {
    // Missing description
    const res1 = await reportIssue('metlife-stadium', 'access_block', 'Section 102', '');
    expect(res1.success).toBe(false);
    expect(res1.error).toBe('All fields are required.');

    // Missing venueId
    const res2 = await reportIssue('', 'access_block', 'Section 102', 'Blocked ramp');
    expect(res2.success).toBe(false);
    expect(res2.error).toBe('All fields are required.');
  });

  it('should successfully report a new issue and fetch it back in recent feedback', async () => {
    const testLocation = `Section 104 Concourse-${Math.random()}`;
    const testDesc = 'The elevator door is stuck and making grinding noises.';
    
    const res = await reportIssue(
      'metlife-stadium',
      'broken_facility',
      testLocation,
      testDesc
    );
    
    expect(res.success).toBe(true);
    expect(res.message).toContain('Issue reported successfully!');

    // Retrieve recent feedback and verify it was logged
    const feedback = await getRecentFeedback('metlife-stadium');
    expect(feedback).toBeDefined();
    expect(feedback.length).toBeGreaterThan(0);
    
    const reportedItem = feedback.find((f: any) => f.location === testLocation);
    expect(reportedItem).toBeDefined();
    expect(reportedItem.category).toBe('broken_facility');
    expect(reportedItem.description).toBe(testDesc);
    expect(reportedItem.status).toBe('pending');
  });

});

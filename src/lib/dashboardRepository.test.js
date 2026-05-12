import { describe, expect, it } from 'vitest';
import { loadDashboardData } from './dashboardRepository.js';

describe('dashboard repository', () => {
  it('falls back to seed data when Supabase is not configured', async () => {
    const data = await loadDashboardData();

    expect(data.source).toBe('seed');
    expect(data.people.MM.name).toBe('Michael Mannino');
    expect(data.projects.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseClient.js', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

describe('dashboard repository', () => {
  it('falls back to seed data when Supabase is not configured', async () => {
    const { loadDashboardData } = await import('./dashboardRepository.js');
    const data = await loadDashboardData();

    expect(data.source).toBe('seed');
    expect(data.people.MM.name).toBe('Michael Mannino');
    expect(data.projects.length).toBeGreaterThan(0);
  });
});

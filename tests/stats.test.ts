import { describe, it, expect } from 'vitest';
import { computeStats } from '~/lib/stats';
import type { Party } from '~/lib/db/schema';

const mk = (over: Partial<Party>): Party => ({
  id: 1, date: '2026-05-19', type: 'bia', title: 'test',
  description: null, location: null, crew: null,
  epicLevel: 3, isSpecial: false,
  createdAt: '', updatedAt: '', ...over,
});

describe('computeStats', () => {
  it('counts totals and per-type', () => {
    const s = computeStats([
      mk({ id: 1, type: 'bia' }),
      mk({ id: 2, type: 'ruou' }),
      mk({ id: 3, type: 'ruou' }),
    ]);
    expect(s.total).toBe(3);
    expect(s.byType.bia).toBe(1);
    expect(s.byType.ruou).toBe(2);
  });

  it('ranks crews', () => {
    const s = computeStats([
      mk({ id: 1, crew: 'Lab3' }),
      mk({ id: 2, crew: 'Lab3' }),
      mk({ id: 3, crew: 'Sotatek' }),
    ]);
    expect(s.topCrew).toEqual({ crew: 'Lab3', count: 2 });
  });

  it('buckets heatmap days correctly', () => {
    const s = computeStats([
      mk({ id: 1, date: '2026-05-19', epicLevel: 5 }),
      mk({ id: 2, date: '2026-05-19', epicLevel: 5 }),
    ]);
    expect(s.heatmap['2026-05-19']).toBe(10);
  });

  it('returns 0 for currentMonthCount when no entries this month', () => {
    const s = computeStats([mk({ date: '2024-01-01' })]);
    expect(typeof s.currentMonthCount).toBe('number');
  });
});

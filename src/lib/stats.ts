import type { Party } from './db/schema';
import type { PartyType } from './types';
import { PARTY_TYPES } from './types';

export interface Stats {
  total: number;
  byType: Record<PartyType, number>;
  byMonth: Record<string, number>;       // 'YYYY-MM' -> count
  byCrew: { crew: string; count: number }[];
  topCrew: { crew: string; count: number } | null;
  ruouPercent: number;
  currentMonthCount: number;
  heatmap: Record<string, number>;       // 'YYYY-MM-DD' -> sum(epicLevel)
}

export function computeStats(parties: Party[]): Stats {
  const byType = Object.fromEntries(PARTY_TYPES.map(t => [t, 0])) as Record<PartyType, number>;
  const byMonth: Record<string, number> = {};
  const crewCounts = new Map<string, number>();
  const heatmap: Record<string, number> = {};

  for (const p of parties) {
    byType[p.type as PartyType]++;
    const ym = p.date.slice(0, 7);
    byMonth[ym] = (byMonth[ym] ?? 0) + 1;
    if (p.crew) {
      for (const c of p.crew.split(',').map(s => s.trim()).filter(Boolean)) {
        crewCounts.set(c, (crewCounts.get(c) ?? 0) + 1);
      }
    }
    heatmap[p.date] = (heatmap[p.date] ?? 0) + (p.epicLevel ?? 0);
  }

  const byCrew = [...crewCounts.entries()]
    .map(([crew, count]) => ({ crew, count }))
    .sort((a, b) => b.count - a.count);

  const ruouTotal = byType.ruou + byType.bia_ruou;
  const ruouPercent = parties.length ? Math.round((ruouTotal / parties.length) * 100) : 0;

  const now = new Date();
  const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthCount = byMonth[ymNow] ?? 0;

  return {
    total: parties.length,
    byType,
    byMonth,
    byCrew,
    topCrew: byCrew[0] ?? null,
    ruouPercent,
    currentMonthCount,
    heatmap,
  };
}

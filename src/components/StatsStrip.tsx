import type { Stats } from '~/lib/stats';

interface Props { stats: Stats }

export default function StatsStrip({ stats }: Props) {
  return (
    <div className="sticky top-10 z-20 mx-auto max-w-4xl px-4 py-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
      <Stat label="Tổng" value={stats.total.toString()} color="text-neon-yellow" />
      <Stat label="% Rượu" value={`${stats.ruouPercent}%`} color="text-neon-pink" />
      <Stat label="Top Crew" value={stats.topCrew?.crew ?? '—'} color="text-neon-cyan" />
      <Stat label="Tháng này" value={stats.currentMonthCount.toString()} color="text-neon-orange" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-bg-deep/60 backdrop-blur rounded-lg border border-ink/10 px-3 py-1.5">
      <div className="text-ink/50 uppercase tracking-wider text-[10px]">{label}</div>
      <div className={`font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}

import type { Stats } from '~/lib/stats';
import { TYPE_META, type PartyType } from '~/lib/types';

interface Props { stats: Stats }

export default function DeepStats({ stats }: Props) {
  const months = Object.entries(stats.byMonth).sort(([a],[b]) => a.localeCompare(b)).slice(-12);
  const maxMonth = Math.max(1, ...months.map(([_,n]) => n));

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="font-display text-2xl text-neon-yellow mb-3">12 THÁNG GẦN ĐÂY</h3>
        <div className="flex items-end gap-1 h-40">
          {months.map(([ym, n]) => (
            <div key={ym} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-gradient-to-t from-neon-pink to-neon-orange rounded-t shadow-neon-pink" style={{ height: `${(n / maxMonth) * 100}%` }} />
              <span className="text-[9px] text-ink/50">{ym.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-display text-2xl text-neon-cyan mb-3">TOP CREW</h3>
        <ol className="space-y-1">
          {stats.byCrew.slice(0, 8).map((c, i) => (
            <li key={c.crew} className="flex justify-between text-sm border-b border-ink/10 py-1">
              <span><span className="text-neon-orange font-display mr-2">{i + 1}.</span>{c.crew}</span>
              <span className="text-neon-yellow font-mono">{c.count}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

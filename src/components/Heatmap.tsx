interface Props { heatmap: Record<string, number> }

const BUCKETS = [
  { max: 0,  cls: 'bg-ink/10' },
  { max: 3,  cls: 'bg-neon-cyan/30' },
  { max: 6,  cls: 'bg-neon-cyan/55' },
  { max: 10, cls: 'bg-neon-pink/75 shadow-neon-pink' },
  { max: Infinity, cls: 'bg-neon-pink shadow-neon-pink' },
];

function bucket(v: number) { return BUCKETS.find(b => v <= b.max)!.cls; }

export default function Heatmap({ heatmap }: Props) {
  const today = new Date();
  const days: { date: string; value: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, value: heatmap[iso] ?? 0 });
  }
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="font-display text-3xl text-neon-cyan mb-4 text-center">HEATMAP 365 NGÀY</h2>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map(d => (
                <div
                  key={d.date}
                  className={`w-3 h-3 rounded-sm ${bucket(d.value)}`}
                  title={`${d.date}: ${d.value} pts`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

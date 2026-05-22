import { useEffect, useState } from 'react';

type Filter = 'all' | 'bia' | 'ruou' | 'special';

interface Props { crews: string[] }

export default function FilterPills({ crews }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [crew, setCrew] = useState<string>('all');

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.entry').forEach(el => {
      const type = el.dataset.type ?? '';
      const entryCrew = el.dataset.crew ?? '';
      const isSpecial = el.classList.contains('special');
      let match = true;
      if (filter === 'bia') match = type === 'bia' || type === 'bia_ruou';
      else if (filter === 'ruou') match = type === 'ruou' || type === 'bia_ruou';
      else if (filter === 'special') match = isSpecial;
      if (match && crew !== 'all') match = entryCrew === crew;
      el.style.opacity = match ? '1' : '.25';
      el.style.transform = match ? 'scale(1)' : 'scale(.98)';
      el.style.filter = match ? 'none' : 'grayscale(.6)';
    });
  }, [filter, crew]);

  const pill = (val: Filter, label: string, color: string) =>
    <button onClick={() => setFilter(val)}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${filter===val ? `${color} text-bg-deep` : 'border-ink/30 text-ink/70 hover:text-ink'}`}>
      {label}
    </button>;

  return (
    <div className="sticky top-0 z-30 bg-bg-deep/85 backdrop-blur-md border-y border-ink/10 py-2 px-4 flex items-center justify-center gap-2 flex-wrap">
      {pill('all', 'TẤT CẢ', 'bg-ink border-ink')}
      {pill('bia', 'BIA', 'bg-neon-yellow border-neon-yellow')}
      {pill('ruou', 'RƯỢU', 'bg-neon-pink border-neon-pink')}
      {pill('special', '★ ĐẶC BIỆT', 'bg-neon-cyan border-neon-cyan')}
      {crews.length > 0 && (
        <select
          value={crew}
          onChange={(e) => setCrew(e.target.value)}
          className="px-2 py-1 rounded-full text-xs font-semibold bg-bg-deep border border-ink/30 text-ink/80"
        >
          <option value="all">Tất cả crew</option>
          {crews.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
    </div>
  );
}

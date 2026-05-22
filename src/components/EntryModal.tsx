import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface EntryData {
  id: number; type: string; title: string;
  description?: string; location?: string; crew?: string;
  photos: { r2Key: string; caption: string | null }[];
}

declare global { interface Window { PUBLIC_R2_URL?: string; } }

export default function EntryModal() {
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    const onClick = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-entry-trigger]');
      if (!t) return;
      setPhotoIdx(0);
      setEntry({
        id: Number(t.dataset.id),
        type: t.dataset.type ?? '',
        title: t.dataset.title ?? '',
        description: t.dataset.description || undefined,
        location: t.dataset.location || undefined,
        crew: t.dataset.crew || undefined,
        photos: JSON.parse(t.dataset.photos || '[]'),
      });
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEntry(null); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const base = (typeof window !== 'undefined' && window.PUBLIC_R2_URL) || '';

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEntry(null)}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-bg-deep border border-neon-pink/60 shadow-neon-pink rounded-2xl max-w-lg w-full p-6 text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-3xl text-neon-pink mb-2">{entry.title}</h2>
            <div className="flex gap-2 text-xs text-ink/60 mb-4">
              {entry.crew && <span>👥 {entry.crew}</span>}
              {entry.location && <span>📍 {entry.location}</span>}
            </div>
            {entry.description && <p className="text-sm text-ink/80 mb-4">{entry.description}</p>}

            {entry.photos.length > 0 && (
              <div className="relative">
                <img
                  src={`${base}/${entry.photos[photoIdx].r2Key}`}
                  alt={entry.photos[photoIdx].caption ?? ''}
                  className="w-full rounded-lg"
                  loading="lazy"
                />
                {entry.photos.length > 1 && (
                  <div className="flex justify-between mt-2 text-sm">
                    <button onClick={() => setPhotoIdx((i) => (i - 1 + entry.photos.length) % entry.photos.length)} className="text-neon-cyan">← prev</button>
                    <span className="text-ink/50">{photoIdx + 1} / {entry.photos.length}</span>
                    <button onClick={() => setPhotoIdx((i) => (i + 1) % entry.photos.length)} className="text-neon-cyan">next →</button>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setEntry(null)} className="mt-4 w-full py-2 border border-ink/30 rounded text-sm text-ink/70 hover:text-ink">Close (Esc)</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

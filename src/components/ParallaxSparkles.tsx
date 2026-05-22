import { useEffect, useRef } from 'react';

interface Props { count?: number }

export default function ParallaxSparkles({ count = 80 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current; if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = (e.clientX / window.innerWidth - 0.5) * 20;
        const dy = (e.clientY / window.innerHeight - 0.5) * 20;
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const seed = 1337;
  const rand = (i: number) => ((i * 9301 + seed) % 233280) / 233280;
  const stars = Array.from({ length: count }, (_, i) => ({
    x: rand(i) * 100,
    y: rand(i + 100) * 100,
    s: 0.5 + rand(i + 200) * 2,
    d: 2 + rand(i + 300) * 4,
    depth: 0.4 + rand(i + 400) * 0.6,
  }));

  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-10 overflow-hidden will-change-transform transition-transform duration-100">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s}px`, height: `${s.s}px`, animationDuration: `${s.d}s`, opacity: s.depth }}
        />
      ))}
    </div>
  );
}

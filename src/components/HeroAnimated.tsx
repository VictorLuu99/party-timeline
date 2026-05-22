import { motion, useReducedMotion } from 'framer-motion';

const LETTERS = 'TIMELINE'.split('');

export default function HeroAnimated() {
  const reduced = useReducedMotion();
  return (
    <div className="flex items-baseline gap-1">
      {LETTERS.map((ch, i) => (
        <motion.span
          key={i}
          initial={reduced ? false : { opacity: 0, y: 40, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
          transition={{ duration: 0.6, delay: 0.05 * i, ease: 'easeOut' }}
          className="font-display text-7xl md:text-9xl tracking-[0.05em] text-neon-gradient animate-flicker"
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}

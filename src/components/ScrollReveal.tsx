import { motion, useReducedMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

type Variant = 'slide-left' | 'slide-right' | 'scale-in' | 'fade-up';

interface Props { variant?: Variant; delay?: number; once?: boolean }

const VARIANTS: Record<Variant, { from: any; to: any }> = {
  'slide-left':  { from: { opacity: 0, x: -40 }, to: { opacity: 1, x: 0 } },
  'slide-right': { from: { opacity: 0, x:  40 }, to: { opacity: 1, x: 0 } },
  'scale-in':    { from: { opacity: 0, scale: 0.4 }, to: { opacity: 1, scale: 1 } },
  'fade-up':     { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 } },
};

export default function ScrollReveal({ children, variant = 'fade-up', delay = 0, once = true }: PropsWithChildren<Props>) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return <>{children}</>;
  const v = VARIANTS[variant];
  return (
    <motion.div
      initial={v.from}
      whileInView={v.to}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

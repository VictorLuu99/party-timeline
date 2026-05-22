export const PARTY_TYPES = ['bia', 'ruou', 'bia_ruou', 'coca', 'voi', 'other'] as const;
export type PartyType = typeof PARTY_TYPES[number];

export interface TypeMeta {
  label: string;
  colorClass: string;       // tailwind text color
  glowClass: string;        // tailwind shadow
  icon: 'beer' | 'wine' | 'both' | 'soda' | 'tea' | 'dot';
  inFilters: ('bia' | 'ruou')[];  // which filter groups it appears in
}

export const TYPE_META: Record<PartyType, TypeMeta> = {
  bia:      { label: 'BIA',      colorClass: 'text-neon-yellow', glowClass: 'shadow-neon-yellow', icon: 'beer', inFilters: ['bia'] },
  ruou:     { label: 'RƯỢU',     colorClass: 'text-neon-pink',   glowClass: 'shadow-neon-pink',   icon: 'wine', inFilters: ['ruou'] },
  bia_ruou: { label: 'BIA+RƯỢU', colorClass: 'text-neon-orange', glowClass: 'shadow-neon-orange', icon: 'both', inFilters: ['bia', 'ruou'] },
  coca:     { label: 'COCA',     colorClass: 'text-neon-cyan',   glowClass: 'shadow-neon-cyan',   icon: 'soda', inFilters: [] },
  voi:      { label: 'VỐI',      colorClass: 'text-neon-green',  glowClass: 'shadow-neon-green',  icon: 'tea',  inFilters: [] },
  other:    { label: 'KHÁC',     colorClass: 'text-ink',         glowClass: '',                   icon: 'dot',  inFilters: [] },
};

export const MONTH_COLORS: Record<number, string> = {
  1: 'pink', 2: 'green', 3: 'yellow', 4: 'cyan', 5: 'pink', 6: 'orange',
  7: 'pink', 8: 'green', 9: 'yellow', 10: 'cyan', 11: 'pink', 12: 'orange',
};

export const MONTH_NAMES_VI = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

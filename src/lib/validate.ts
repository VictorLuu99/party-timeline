import { PARTY_TYPES, type PartyType } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface PartyInput {
  date: string;
  type: PartyType;
  title: string;
  description: string | null;
  location: string | null;
  crew: string | null;
  epicLevel: number;
  isSpecial: boolean;
}

export function validatePartyInput(raw: unknown, { partial = false } = {}): PartyInput | string {
  if (!raw || typeof raw !== 'object') return 'body must be an object';
  const b = raw as Record<string, unknown>;
  const out: Partial<PartyInput> = {};

  if (b.date !== undefined) {
    if (typeof b.date !== 'string' || !DATE_RE.test(b.date)) return 'date must be YYYY-MM-DD';
    out.date = b.date;
  } else if (!partial) return 'date is required';

  if (b.type !== undefined) {
    if (typeof b.type !== 'string' || !PARTY_TYPES.includes(b.type as PartyType)) return `type must be one of ${PARTY_TYPES.join(',')}`;
    out.type = b.type as PartyType;
  } else if (!partial) return 'type is required';

  if (b.title !== undefined) {
    if (typeof b.title !== 'string' || !b.title.trim()) return 'title must be a non-empty string';
    out.title = b.title.trim().slice(0, 500);
  } else if (!partial) return 'title is required';

  for (const f of ['description', 'location', 'crew'] as const) {
    if (b[f] !== undefined) {
      if (b[f] !== null && typeof b[f] !== 'string') return `${f} must be string or null`;
      out[f] = b[f] === null ? null : (b[f] as string).slice(0, 1000);
    }
  }

  if (b.epicLevel !== undefined) {
    const n = Number(b.epicLevel);
    if (!Number.isInteger(n) || n < 1 || n > 5) return 'epicLevel must be integer 1..5';
    out.epicLevel = n;
  }

  if (b.isSpecial !== undefined) {
    out.isSpecial = !!b.isSpecial;
  }

  return out as PartyInput;
}

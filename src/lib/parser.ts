import type { PartyType } from './types';

export interface SeedRow {
  date: string;          // YYYY-MM-DD
  type: PartyType;
  title: string;
  description: string | null;
  location: string | null;
  crew: string | null;
  epicLevel: number;
  isSpecial: boolean;
}

const KNOWN_CREWS = ['Chính vì điều đó', 'Lab3', 'Sotatek', 'FC Coder', 'Defikit', 'XOX', 'BTN', 'SAVA', 'Vinfast'];
const KNOWN_LOCATIONS = ['Lào Cai', 'Phúc Yên', 'Vĩnh Phúc', 'Sóc Sơn', 'Sầm Sơn', 'Việt Trì', 'Hà Nội', 'HY', 'Time-city', 'Cầu Giấy'];
const SPECIAL_KEYWORDS = ['đám cưới', 'tất niên', 'yep', 'kickoff', 'sinh nhật', 'hoá vàng', 'giỗ', 'tốt nghiệp'];
const TYPE_MAP: Record<string, PartyType> = {
  bia: 'bia',
  'rượu': 'ruou',
  ruou: 'ruou',
  coca: 'coca',
  'vối': 'voi',
  voi: 'voi',
  'bia+rượu': 'bia_ruou',
  'rượu+bia': 'bia_ruou',
  'rượu & bia': 'bia_ruou',
  'bia & rượu': 'bia_ruou',
};

const HEADER_RE = /^Lịch nhậu tháng\s+(\d{1,2})\s*\/\s*(\d{4})/i;

// Matches the leading date cluster: digits, commas, slashes, dashes, spaces
// up to the opening parenthesis
const DATE_CLUSTER_RE = /^([\d,/\-\s]+?)\s*\(/;
// Fallback: date cluster without paren
const DATE_CLUSTER_NO_PAREN_RE = /^([\d,/\-]+)\s+(.+)$/;

// Extract (type) possibly without closing paren
const TYPE_PAREN_RE = /\(([^)]*)/;

export function parsePartyNote(text: string): SeedRow[] {
  const lines = text.split('\n');
  const out: SeedRow[] = [];
  let currentYear = new Date().getFullYear();
  let currentMonth: number | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const header = line.match(HEADER_RE);
    if (header) {
      currentMonth = parseInt(header[1], 10);
      currentYear = parseInt(header[2], 10);
      continue;
    }

    const entry = parseLine(line, currentYear, currentMonth);
    if (entry) out.push(entry);
  }

  return out;
}

function parseLine(line: string, year: number, headerMonth: number | null): SeedRow | null {
  // Must start with a digit
  if (!/^\d/.test(line)) return null;

  let dateCluster: string;
  let rest: string;

  const withParenMatch = line.match(DATE_CLUSTER_RE);
  if (withParenMatch) {
    dateCluster = withParenMatch[1].trim();
    rest = line.slice(withParenMatch[0].length - 1); // keep the "(" in rest
  } else {
    const noParen = line.match(DATE_CLUSTER_NO_PAREN_RE);
    if (!noParen) return null;
    dateCluster = noParen[1].trim();
    rest = noParen[2];
  }

  const { day, month } = extractDayMonth(dateCluster, headerMonth);
  if (!day || !month || month > 12 || day > 31) return null;

  let type: PartyType = 'other';
  let title = rest;

  const typeMatch = rest.match(TYPE_PAREN_RE);
  if (typeMatch) {
    const rawType = typeMatch[1].toLowerCase().trim();
    type = TYPE_MAP[rawType] ?? 'other';
    const afterParen = rest.indexOf(')');
    title = afterParen >= 0 ? rest.slice(afterParen + 1).trim() : rest.replace(/\([^)]*/, '').trim();
  }

  if (!title) title = '(không tiêu đề)';

  const lower = title.toLowerCase();
  const isSpecial = SPECIAL_KEYWORDS.some(k => lower.includes(k));
  const epicLevel = isSpecial ? 5 : 3;

  const crew = KNOWN_CREWS.find(c => title.includes(c)) ?? null;
  const location = KNOWN_LOCATIONS.find(l => title.includes(l)) ?? null;

  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    type,
    title,
    description: null,
    location,
    crew,
    epicLevel,
    isSpecial,
  };
}

/**
 * Extract day and month from a date cluster string.
 * Handles:
 *   "19-5"         → day=19, month=5
 *   "2/5"          → day=2,  month=5
 *   "29-30/4"      → day=29, month=4
 *   "29-30/4 - 1/5"→ day=29, month=4
 *   "14,15,16,17-2"→ day=14, month=2
 */
function extractDayMonth(cluster: string, headerMonth: number | null): { day: number; month: number } {
  const s = cluster.trim();

  // Simple slash: "D/M"
  const slashSimple = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashSimple) {
    return { day: parseInt(slashSimple[1], 10), month: parseInt(slashSimple[2], 10) };
  }

  // Simple dash: "D-M"
  const dashSimple = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (dashSimple) {
    return { day: parseInt(dashSimple[1], 10), month: parseInt(dashSimple[2], 10) };
  }

  // Extract first number as day
  const firstNum = s.match(/^(\d{1,2})/);
  if (!firstNum) return { day: 0, month: 0 };
  const day = parseInt(firstNum[1], 10);

  // Use the first whitespace-delimited segment to find month
  const firstSegment = s.split(/\s/)[0];

  // Slash in first segment: "29-30/4"
  const slashInSegment = firstSegment.match(/\/(\d{1,2})$/);
  if (slashInSegment) {
    return { day, month: parseInt(slashInSegment[1], 10) };
  }

  // Trailing dash number in first segment: "14,15,16,17-2"
  const dashInSegment = firstSegment.match(/-(\d{1,2})$/);
  if (dashInSegment) {
    const candidate = parseInt(dashInSegment[1], 10);
    if (candidate <= 12) {
      return { day, month: candidate };
    }
    // candidate > 12 → it's another day in a range, use header month
    if (headerMonth) return { day, month: headerMonth };
  }

  if (headerMonth) return { day, month: headerMonth };

  return { day, month: 0 };
}

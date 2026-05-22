import { describe, it, expect } from 'vitest';
import { parsePartyNote } from '~/lib/parser';

describe('parsePartyNote', () => {
  it('parses a single bia entry with crew', () => {
    const out = parsePartyNote(`Lịch nhậu tháng 5/2026\n19-5 (bia) 5 ae dev cuối cùng Lab3`);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      date: '2026-05-19',
      type: 'bia',
      title: '5 ae dev cuối cùng Lab3',
      crew: 'Lab3',
    });
  });

  it('parses rượu with location', () => {
    const out = parsePartyNote(`Lịch nhậu tháng 4/2026\n29-30/4 - 1/5 (rượu) mỗi ngày 2 cữ  ở Lào Cai`);
    expect(out[0].location).toBe('Lào Cai');
    expect(out[0].type).toBe('ruou');
  });

  it('marks đám cưới as special and high epic level', () => {
    const out = parsePartyNote(`Lịch nhậu tháng 5/2026\n17-5 (rượu) đám cưới Trang XOX`);
    expect(out[0].isSpecial).toBe(true);
    expect(out[0].epicLevel).toBeGreaterThanOrEqual(4);
  });

  it('parses bia+rượu combo type', () => {
    const out = parsePartyNote(`Lịch nhậu tháng 5/2026\n12-5 (bia+rượu) chính vì điều đó`);
    expect(out[0].type).toBe('bia_ruou');
  });

  it('handles 2/5 style date prefix', () => {
    const out = parsePartyNote(`Lịch nhậu tháng 5/2026\n2/5 (rượu) Chính vì điều`);
    expect(out[0].date).toBe('2026-05-02');
  });

  it('returns empty array on empty input', () => {
    expect(parsePartyNote('')).toEqual([]);
  });

  it('skips header-only lines', () => {
    expect(parsePartyNote('Lịch nhậu tháng 5/2026')).toEqual([]);
  });
});

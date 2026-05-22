// scripts/seed-from-notes.ts
// Run: pnpm db:seed:local  or  pnpm db:seed:prod
//
// Note: Instead of passing SQL via --command (which is fragile with special
// characters like Unicode text, parentheses, and shell metacharacters), this
// script writes SQL to a temp file and uses --file. This avoids all
// shell-quoting issues with wrangler execSync.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePartyNote } from '../src/lib/parser';

const args = process.argv.slice(2);
const target = args.includes('--remote') ? '--remote' : '--local';

const text = readFileSync('party_note.txt', 'utf8');
const rows = parsePartyNote(text);
console.log(`Parsed ${rows.length} entries from party_note.txt`);

// Chunk to avoid overly large SQL files
const CHUNK = 25;
const tmpFile = join(tmpdir(), `party_seed_${Date.now()}.sql`);

try {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = slice.map(r => {
      const esc = (s: string | null) => s == null ? 'NULL' : `'${s.replace(/'/g, "''")}'`;
      return `(${esc(r.date)}, ${esc(r.type)}, ${esc(r.title)}, ${esc(r.description)}, ${esc(r.location)}, ${esc(r.crew)}, ${r.epicLevel}, ${r.isSpecial ? 1 : 0})`;
    }).join(',\n');

    const sql = `INSERT INTO parties (date, type, title, description, location, crew, epic_level, is_special) VALUES\n${values};`;

    writeFileSync(tmpFile, sql, 'utf8');

    const chunkNum = Math.floor(i / CHUNK) + 1;
    const totalChunks = Math.ceil(rows.length / CHUNK);
    console.log(`Inserting chunk ${chunkNum}/${totalChunks}...`);
    execSync(`pnpm exec wrangler d1 execute party-db ${target} --file ${JSON.stringify(tmpFile)}`, { stdio: 'inherit' });
  }
} finally {
  // Clean up temp file
  try { unlinkSync(tmpFile); } catch { /* ignore */ }
}

console.log('✓ Seed complete');

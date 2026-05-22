import { eq, desc, sql } from 'drizzle-orm';
import type { DB } from './client';
import { parties, partyPhotos, type Party, type NewParty } from './schema';

export async function listParties(db: DB): Promise<(Party & { photos: { r2Key: string; caption: string | null }[] })[]> {
  const rows = await db.select().from(parties).orderBy(desc(parties.date));
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const photos = await db.select().from(partyPhotos)
    .where(sql`${partyPhotos.partyId} IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})`)
    .orderBy(partyPhotos.sortOrder);
  const byParty = new Map<number, typeof photos>();
  for (const p of photos) {
    if (!byParty.has(p.partyId)) byParty.set(p.partyId, []);
    byParty.get(p.partyId)!.push(p);
  }
  return rows.map(r => ({ ...r, photos: (byParty.get(r.id) ?? []).map(p => ({ r2Key: p.r2Key, caption: p.caption })) }));
}

export async function createParty(db: DB, data: NewParty) {
  const [row] = await db.insert(parties).values(data).returning();
  return row;
}

export async function updateParty(db: DB, id: number, patch: Partial<NewParty>) {
  const [row] = await db.update(parties).set({ ...patch, updatedAt: new Date().toISOString() }).where(eq(parties.id, id)).returning();
  return row;
}

export async function deleteParty(db: DB, id: number) {
  await db.delete(parties).where(eq(parties.id, id));
}

export async function getParty(db: DB, id: number) {
  const [row] = await db.select().from(parties).where(eq(parties.id, id));
  return row ?? null;
}

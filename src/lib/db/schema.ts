import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

export const parties = sqliteTable('parties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  type: text('type', { enum: ['bia', 'ruou', 'bia_ruou', 'coca', 'voi', 'other'] }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  crew: text('crew'),
  epicLevel: integer('epic_level').default(1).notNull(),
  isSpecial: integer('is_special', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP').notNull(),
}, (t) => ({
  byDate: index('idx_parties_date').on(t.date),
  byCrew: index('idx_parties_crew').on(t.crew),
}));

export const partyPhotos = sqliteTable('party_photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  partyId: integer('party_id').notNull().references(() => parties.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  caption: text('caption'),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export type Party = typeof parties.$inferSelect;
export type NewParty = typeof parties.$inferInsert;
export type PartyPhoto = typeof partyPhotos.$inferSelect;

# Lịch Nhậu Huyền Thoại — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, single-page Cloudflare-hosted website that renders the owner's `lịch nhậu` (party schedule) as a neon synthwave timeline poster matching `template.png` 100%, with password-gated admin CRUD over D1 + R2.

**Architecture:** Astro 5 page server-rendered on Cloudflare Pages Functions; React islands handle filter/admin/heatmap/animations; Drizzle ORM over D1 for data; R2 for photos via signed PUT URLs; single-password JWT cookie for auth. Edge cache (60s) on the public page, busted on writes.

**Tech Stack:** Astro 5, React 18, Tailwind CSS, Framer Motion, GSAP, Drizzle ORM, Cloudflare D1, Cloudflare R2, Cloudflare Pages, Wrangler, Vitest, Miniflare.

**Spec:** [docs/superpowers/specs/2026-05-22-party-timeline-design.md](../specs/2026-05-22-party-timeline-design.md)

---

## File Structure

Below is the full file tree this plan produces. Each task creates or modifies a focused set of files with one clear responsibility.

```
party/
├── astro.config.mjs                   # Astro + Cloudflare adapter + React + Tailwind integrations
├── tailwind.config.ts                 # Neon palette, fonts, custom shadows (glow utilities)
├── tsconfig.json                      # TypeScript strict
├── package.json                       # Scripts: dev, build, preview, test, db:migrate, db:seed
├── wrangler.toml                      # D1 binding (DB), R2 binding (PHOTOS), secrets
├── drizzle.config.ts                  # Drizzle CLI config (D1 dialect)
├── .gitignore                         # node_modules, .wrangler, .superpowers, dist
├── .env.example                       # ADMIN_PASSWORD, JWT_SECRET placeholders
├── public/
│   ├── fonts/                         # Self-hosted Bebas Neue, Pacifico, Inter (woff2)
│   └── favicon.svg                    # Beer-mug favicon
├── src/
│   ├── env.d.ts                       # Cloudflare runtime types (App.Locals.runtime)
│   ├── styles/
│   │   └── global.css                 # Tailwind base + custom @layer (neon glow keyframes, sparkles)
│   ├── layouts/
│   │   └── Base.astro                 # HTML shell + font preload + sparkles mount
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts              # Drizzle schema (parties, party_photos)
│   │   │   ├── client.ts              # drizzle() factory bound to D1
│   │   │   └── queries.ts             # listParties, getParty, createParty, updateParty, deleteParty
│   │   ├── stats.ts                   # computeStats(parties) → totals, byMonth, byType, byCrew, heatmap buckets
│   │   ├── types.ts                   # PartyType enum, Party type, typeMeta (label/color/icon)
│   │   ├── parser.ts                  # parsePartyNote(text) → seed rows; regex + heuristics
│   │   ├── validate.ts                # validatePartyInput() — whitelist + type guard for API writes
│   │   ├── auth.ts                    # signJwt, verifyJwt, constantTimeEqual, cookie helpers
│   │   ├── r2.ts                      # signPutUrl(key), publicUrl(key), thumbnailKey(key)
│   │   └── cache.ts                   # invalidateEdgeCache(urls[])
│   ├── components/
│   │   ├── Sparkles.astro             # SVG sparkle background layer (used by admin + as fallback)
│   │   ├── ParallaxSparkles.tsx       # React island: mouse-driven parallax sparkles for public page
│   │   ├── IconBeerMug.astro          # Inline SVG
│   │   ├── IconWineGlass.astro        # Inline SVG
│   │   ├── IconStar.astro             # Inline SVG sparkle
│   │   ├── Hero.astro                 # Full-viewport hero block (composes HeroAnimated)
│   │   ├── HeroAnimated.tsx           # React island: TIMELINE letter stagger + flicker
│   │   ├── ScrollReveal.tsx           # React island: scroll-triggered motion wrapper
│   │   ├── EntryModal.tsx             # React island: entry-click modal + photo carousel
│   │   ├── AdminApp.tsx               # React island: admin table + form + photo uploader
│   │   ├── Footer.astro               # Legend + tip
│   │   ├── timeline/
│   │   │   ├── TimelineSpine.astro    # Central vertical neon line
│   │   │   ├── YearMarker.astro       # Round year pill
│   │   │   ├── DatePill.astro         # Per-month date circle
│   │   │   ├── MonthCard.astro        # Card wrapper (side="left"|"right", color)
│   │   │   ├── EntryRow.astro         # Single party row (button; emits data attributes for EntryModal)
│   │   │   ├── TypeBadge.astro        # Colored bracketed type tag
│   │   │   └── TimelineSection.astro  # Assembles all months into the zigzag layout
│   │   ├── StatsStrip.tsx             # React island: sticky on scroll, mini-stats
│   │   ├── FilterPills.tsx            # React island: filter state, mutates entry opacity via DOM
│   │   ├── Heatmap.tsx                # React island: 365-day grid + tooltip
│   │   └── DeepStats.tsx              # React island: bar chart + ranking
│   ├── pages/
│   │   ├── index.astro                # Public timeline page (SSR)
│   │   ├── admin/
│   │   │   ├── login.astro            # Password form
│   │   │   └── index.astro            # Admin table + new/edit form
│   │   └── api/
│   │       ├── parties/
│   │       │   ├── index.ts           # GET (list) + POST (create)
│   │       │   └── [id].ts            # PATCH + DELETE
│   │       ├── upload-url.ts          # POST → R2 signed PUT URL
│   │       ├── login.ts               # POST → set JWT cookie
│   │       └── logout.ts              # POST → clear cookie
│   └── middleware.ts                  # Auth gate for /admin/** and /api/(parties[write]|upload-url|logout)
├── db/
│   └── migrations/
│       └── 0001_init.sql              # CREATE TABLE parties + party_photos + indexes
├── scripts/
│   └── seed-from-notes.ts             # Parses party_note.txt → D1 INSERT
├── tests/
│   ├── parser.test.ts                 # Vitest: parsePartyNote
│   ├── stats.test.ts                  # Vitest: computeStats
│   ├── auth.test.ts                   # Vitest: JWT sign/verify, constantTimeEqual
│   └── api/
│       ├── parties.test.ts            # Vitest + Miniflare: GET/POST/PATCH/DELETE
│       └── login.test.ts              # Vitest + Miniflare: login success/fail
└── docs/
    └── superpowers/
        ├── specs/2026-05-22-party-timeline-design.md
        └── plans/2026-05-22-party-timeline.md  # this file
```

**Decomposition principles:**
- One Astro component per visual concept (`MonthCard`, `EntryRow`, `DatePill`).
- All D1 access funneled through `src/lib/db/queries.ts` so cache invalidation and validation live in one place.
- React islands kept lean: each holds its own state, communicates with siblings via DOM custom events (no global store).
- Pure functions (parser, stats, auth) live in `src/lib/` and are 100% unit-tested with no Cloudflare runtime dependency.

---

## Task Map (Phases)

| Phase | Tasks | Outcome |
|---|---|---|
| 1. Foundation | 1–4 | Project boots locally, types compile, D1/R2 bound |
| 2. Data | 5–8 | Type metadata + queries, parser tested, stats tested, ~70 entries seeded |
| 3. Visual primitives | 9–10 | Icons + sparkles built; shared timeline components built |
| 4. Public page | 11–13 | Base layout + hero + footer + timeline section + SSR'd index page |
| 5. Interactive islands | 14–17 | Filter pills, stats strip, heatmap, deep stats |
| 6. Responsive + Animations | 18, 19, 19b | Mobile collapse, all spec §10 animations, entry modal + photo carousel |
| 7. Auth + Admin + API | 20–23 | Auth helpers, middleware, API routes (validated), login + admin UI w/ photo upload |
| 8. Deploy | 24 | Live on Cloudflare Pages with secrets bound |

---

# PHASE 1 — Foundation

## Task 1: Scaffold Astro project with Cloudflare adapter + React + Tailwind

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `src/env.d.ts`, `src/styles/global.css`, `.gitignore`, `.env.example`

- [ ] **Step 1: Init pnpm + git**

Run from `/Users/vuongluu/Documents/jobs/victorluu/party`:

```bash
git init
pnpm init
```

Expected: `.git/` created, `package.json` created.

- [ ] **Step 2: Install Astro + integrations + Cloudflare runtime**

**Important:** pin Tailwind to v3. The plan's `tailwind.config.ts` (Task 1 Step 6) uses v3 syntax — Tailwind v4 ignores it and uses CSS-first `@theme` config instead, which would silently drop every `text-neon-*` / `shadow-neon-*` / `font-display` class and destroy the visual fidelity that is goal #1.

```bash
pnpm add -D astro @astrojs/react @astrojs/cloudflare @astrojs/tailwind tailwindcss@^3 postcss autoprefixer typescript wrangler
pnpm add react react-dom
pnpm add -D @types/react @types/react-dom
```

Expected: `node_modules/` populated; `package.json` has these in `dependencies` / `devDependencies`. Commit the resulting `pnpm-lock.yaml` so CI uses identical versions.

- [ ] **Step 3: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react(), tailwind({ applyBaseStyles: false })],
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "types": ["@cloudflare/workers-types"],
    "baseUrl": ".",
    "paths": { "~/*": ["src/*"] }
  },
  "include": [".astro/types.d.ts", "src/**/*"]
}
```

Install workers types:

```bash
pnpm add -D @cloudflare/workers-types
```

- [ ] **Step 5: Create `src/env.d.ts`**

```ts
/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  PUBLIC_R2_URL: string;
}

declare namespace App {
  interface Locals extends Runtime {
    user?: { admin: true };
  }
}
```

- [ ] **Step 6: Create `tailwind.config.ts` with neon palette + safelist**

Note the `safelist` block: components in Task 10 use a lookup table to produce class names like `text-neon-pink`, but Tailwind's JIT cannot statically detect class names assembled from variables. Safelisting the per-month color variants ensures they survive the build.

```ts
import type { Config } from 'tailwindcss';

const NEON = ['pink', 'orange', 'yellow', 'cyan', 'green'] as const;

export default {
  content: ['./src/**/*.{astro,ts,tsx,jsx,js}'],
  safelist: [
    ...NEON.map(c => `text-neon-${c}`),
    ...NEON.map(c => `border-neon-${c}`),
    ...NEON.map(c => `bg-neon-${c}`),
    ...NEON.map(c => `shadow-neon-${c}`),
  ],
  theme: {
    extend: {
      colors: {
        bg: { deep: '#0a0518', mid: '#2a0a4a' },
        neon: {
          pink: '#ff3b8a',
          orange: '#ff8a3d',
          yellow: '#ffeb3b',
          cyan: '#00e5ff',
          green: '#7cff5a',
        },
        ink: '#f8f4ff',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        script: ['Pacifico', 'cursive'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-pink': '0 0 12px #ff3b8a, 0 0 30px #ff3b8a55',
        'neon-orange': '0 0 12px #ff8a3d, 0 0 30px #ff8a3d55',
        'neon-yellow': '0 0 12px #ffeb3b, 0 0 30px #ffeb3b55',
        'neon-cyan': '0 0 12px #00e5ff, 0 0 30px #00e5ff55',
        'neon-green': '0 0 12px #7cff5a, 0 0 30px #7cff5a55',
      },
    },
  },
} satisfies Config;
```

- [ ] **Step 7: Create `src/styles/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body { background: radial-gradient(120% 80% at 50% 0%, #2a0a4a 0%, #0a0518 70%); color: #f8f4ff; }
  body { font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }
}

@layer utilities {
  .text-neon-gradient {
    background: linear-gradient(90deg, #ff3b8a, #ff8a3d, #ffeb3b, #00e5ff, #ff3b8a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    45% { opacity: .92; }
    55% { opacity: .98; }
  }
  .animate-flicker { animation: flicker 4s ease-in-out infinite; }
}
```

- [ ] **Step 8: Create `.gitignore` and `.env.example`**

`.gitignore`:
```
node_modules
dist
.astro
.wrangler
.superpowers
.env
.env.*
!.env.example
.DS_Store
```

`.env.example`:
```
ADMIN_PASSWORD=replace-me
JWT_SECRET=replace-me-with-32-byte-random
PUBLIC_R2_URL=https://pub-XXXXXX.r2.dev
```

- [ ] **Step 9: Add npm scripts to `package.json`**

Replace `"scripts"` block with:
```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "wrangler pages dev ./dist --d1 DB --r2 PHOTOS",
  "typecheck": "astro check",
  "test": "vitest run",
  "db:generate": "drizzle-kit generate",
  "db:migrate:local": "wrangler d1 migrations apply party-db --local",
  "db:migrate:prod": "wrangler d1 migrations apply party-db --remote",
  "db:seed:local": "tsx scripts/seed-from-notes.ts --local",
  "db:seed:prod": "tsx scripts/seed-from-notes.ts --remote"
}
```

Install `tsx`:
```bash
pnpm add -D tsx
```

- [ ] **Step 10: Verify scaffold compiles**

```bash
pnpm typecheck
```

Expected: exits 0 with no errors. (Astro may warn about no pages yet — OK.)

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat(scaffold): astro + cloudflare + react + tailwind boilerplate"
```

---

## Task 2: Fonts + base assets

**Files:**
- Create: `public/fonts/bebas-neue.woff2`, `public/fonts/pacifico.woff2`, `public/fonts/inter-var.woff2`, `public/favicon.svg`, update `src/styles/global.css`

- [ ] **Step 1: Download self-hosted fonts**

Run:
```bash
mkdir -p public/fonts
curl -L -o public/fonts/bebas-neue.woff2 https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@latest/latin-400-normal.woff2
curl -L -o public/fonts/pacifico.woff2  https://cdn.jsdelivr.net/fontsource/fonts/pacifico@latest/latin-400-normal.woff2
curl -L -o public/fonts/inter-var.woff2 https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-wght-normal.woff2
```

Expected: 3 files exist, each > 5KB.

- [ ] **Step 2: Register `@font-face` in `src/styles/global.css`**

Prepend:
```css
@font-face {
  font-family: 'Bebas Neue';
  src: url('/fonts/bebas-neue.woff2') format('woff2');
  font-display: swap;
}
@font-face {
  font-family: 'Pacifico';
  src: url('/fonts/pacifico.woff2') format('woff2');
  font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
```

- [ ] **Step 3: Create `public/favicon.svg`** (beer mug emoji as SVG)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="14" y="16" width="28" height="38" rx="3" fill="#ff8a3d" stroke="#0a0518" stroke-width="2"/>
  <rect x="42" y="22" width="10" height="22" rx="3" fill="none" stroke="#0a0518" stroke-width="3"/>
  <path d="M14 22 Q22 14 30 18 T46 18" fill="#fff" stroke="#0a0518" stroke-width="2"/>
</svg>
```

- [ ] **Step 4: Commit**

```bash
git add public/ src/styles/global.css
git commit -m "feat(assets): self-hosted fonts (Bebas Neue, Pacifico, Inter) + favicon"
```

---

## Task 3: Wrangler config + D1/R2 bindings

**Files:**
- Create: `wrangler.toml`

- [ ] **Step 1: Authenticate wrangler** (one-time, requires user input)

```bash
pnpm exec wrangler login
```

Expected: browser opens, user grants access.

- [ ] **Step 2: Create D1 database**

```bash
pnpm exec wrangler d1 create party-db
```

Expected output includes:
```
[[d1_databases]]
binding = "DB"
database_name = "party-db"
database_id = "<some-uuid>"
```

**Copy the `database_id` for the next step.**

- [ ] **Step 3: Create R2 bucket**

```bash
pnpm exec wrangler r2 bucket create party-photos
```

Expected: `Created bucket 'party-photos'`.

- [ ] **Step 4: Write `wrangler.toml`** (replace `<DB_ID>`)

```toml
name = "party-timeline"
compatibility_date = "2025-09-01"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "party-db"
database_id = "<DB_ID>"
migrations_dir = "db/migrations"

[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "party-photos"

[vars]
PUBLIC_R2_URL = "https://pub-PLACEHOLDER.r2.dev"
```

- [ ] **Step 5: Enable R2 public access** (manual via dashboard)

In Cloudflare dashboard → R2 → `party-photos` → Settings → "Public Access" → enable → copy the public URL. Paste into `wrangler.toml` `PUBLIC_R2_URL`.

- [ ] **Step 6: Set local secrets**

Create `.dev.vars` (gitignored — add `.dev.vars` to `.gitignore` if missing):

```
ADMIN_PASSWORD=letmein-change-this
JWT_SECRET=local-dev-secret-32-bytes-min-aaaaaaaaaa
```

- [ ] **Step 7: Verify `wrangler.toml` parses**

```bash
pnpm exec wrangler types
```

Expected: generates `worker-configuration.d.ts` with `Env` interface. No errors.

- [ ] **Step 8: Commit**

```bash
git add wrangler.toml .gitignore
git commit -m "feat(infra): wrangler config with D1 + R2 bindings"
```

---

## Task 4: Drizzle ORM setup + D1 schema migration

**Files:**
- Create: `drizzle.config.ts`, `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `db/migrations/0001_init.sql`

- [ ] **Step 1: Install Drizzle**

```bash
pnpm add drizzle-orm
pnpm add -D drizzle-kit
```

- [ ] **Step 2: Create `src/lib/db/schema.ts`**

```ts
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
```

- [ ] **Step 3: Create `src/lib/db/client.ts`**

```ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export const db = (binding: D1Database) => drizzle(binding, { schema });
export type DB = ReturnType<typeof db>;
```

- [ ] **Step 4: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http', // for generation only; we apply via wrangler
});
```

- [ ] **Step 5: Write migration manually** (drizzle-kit generates verbose syntax — we want a single readable file)

Create `db/migrations/0001_init.sql`:

```sql
CREATE TABLE parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  crew TEXT,
  epic_level INTEGER NOT NULL DEFAULT 1,
  is_special INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parties_date ON parties(date DESC);
CREATE INDEX idx_parties_crew ON parties(crew);

CREATE TABLE party_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);
```

- [ ] **Step 6: Apply migration locally**

```bash
pnpm db:migrate:local
```

Expected: `Migrations applied successfully`. Verify with:

```bash
pnpm exec wrangler d1 execute party-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected output lists `parties` and `party_photos`.

- [ ] **Step 7: Commit**

```bash
git add drizzle.config.ts src/lib/db/ db/migrations/
git commit -m "feat(db): drizzle schema + initial D1 migration"
```

---

# PHASE 2 — Data

## Task 5: Type/display metadata + queries module

**Files:**
- Create: `src/lib/types.ts`, `src/lib/db/queries.ts`

- [ ] **Step 1: Create `src/lib/types.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/lib/db/queries.ts`**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/db/queries.ts
git commit -m "feat(db): type metadata + query layer (list/create/update/delete)"
```

---

## Task 6: Note parser + unit tests (TDD)

**Files:**
- Create: `tests/parser.test.ts`, `src/lib/parser.ts`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest @types/node
```

Add to `package.json`:
```json
"test": "vitest run"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', globals: false },
});
```

- [ ] **Step 3: Write failing tests in `tests/parser.test.ts`**

```ts
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
```

- [ ] **Step 4: Run tests — expect FAIL**

```bash
pnpm test tests/parser.test.ts
```

Expected: all 7 tests fail with `parsePartyNote is not a function` or import error.

- [ ] **Step 5: Implement `src/lib/parser.ts`**

```ts
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
  bia: 'bia', rượu: 'ruou', ruou: 'ruou', coca: 'coca', vối: 'voi', voi: 'voi',
  'bia+rượu': 'bia_ruou', 'rượu+bia': 'bia_ruou',
};

const HEADER_RE = /^Lịch nhậu tháng\s+(\d{1,2})\s*\/\s*(\d{4})/i;
// Matches "DD-M", "D-M", "DD/M", "D/M" and ranges like "29-30/4" — we take the first date.
const LINE_RE = /^(\d{1,2})(?:[-,/]\d{1,2}|[-\s]+\d{1,2}\/\d{1,2})*[\s\-/]+(\d{1,2})(?:\s*\(([^)]+)\))?\s*(.*)$/;

export function parsePartyNote(text: string): SeedRow[] {
  const lines = text.split('\n');
  const out: SeedRow[] = [];
  let currentYear = new Date().getFullYear();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const header = line.match(HEADER_RE);
    if (header) { currentYear = parseInt(header[2], 10); continue; }

    const m = line.match(LINE_RE);
    if (!m) continue;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (!day || !month || month > 12 || day > 31) continue;

    const rawType = (m[3] ?? 'other').toLowerCase().trim();
    const type: PartyType = TYPE_MAP[rawType] ?? 'other';
    const title = (m[4] ?? '').trim() || '(không tiêu đề)';

    const lower = title.toLowerCase();
    const isSpecial = SPECIAL_KEYWORDS.some(k => lower.includes(k));
    const epicLevel = isSpecial ? 5 : 3;

    const crew = KNOWN_CREWS.find(c => title.includes(c)) ?? null;
    const location = KNOWN_LOCATIONS.find(l => title.includes(l)) ?? null;

    out.push({
      date: `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      type,
      title,
      description: null,
      location,
      crew,
      epicLevel,
      isSpecial,
    });
  }
  return out;
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
pnpm test tests/parser.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add tests/parser.test.ts src/lib/parser.ts vitest.config.ts package.json
git commit -m "feat(parser): regex parser for party_note.txt with crew/location/epic detection"
```

---

## Task 7: Stats compute + tests

**Files:**
- Create: `tests/stats.test.ts`, `src/lib/stats.ts`

- [ ] **Step 1: Write failing tests in `tests/stats.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeStats } from '~/lib/stats';
import type { Party } from '~/lib/db/schema';

const mk = (over: Partial<Party>): Party => ({
  id: 1, date: '2026-05-19', type: 'bia', title: 'test',
  description: null, location: null, crew: null,
  epicLevel: 3, isSpecial: false,
  createdAt: '', updatedAt: '', ...over,
});

describe('computeStats', () => {
  it('counts totals and per-type', () => {
    const s = computeStats([
      mk({ id: 1, type: 'bia' }),
      mk({ id: 2, type: 'ruou' }),
      mk({ id: 3, type: 'ruou' }),
    ]);
    expect(s.total).toBe(3);
    expect(s.byType.bia).toBe(1);
    expect(s.byType.ruou).toBe(2);
  });

  it('ranks crews', () => {
    const s = computeStats([
      mk({ id: 1, crew: 'Lab3' }),
      mk({ id: 2, crew: 'Lab3' }),
      mk({ id: 3, crew: 'Sotatek' }),
    ]);
    expect(s.topCrew).toEqual({ crew: 'Lab3', count: 2 });
  });

  it('buckets heatmap days correctly', () => {
    const s = computeStats([
      mk({ id: 1, date: '2026-05-19', epicLevel: 5 }),
      mk({ id: 2, date: '2026-05-19', epicLevel: 5 }),
    ]);
    expect(s.heatmap['2026-05-19']).toBe(10);
  });

  it('returns 0 for currentMonthCount when no entries this month', () => {
    const s = computeStats([mk({ date: '2024-01-01' })]);
    expect(typeof s.currentMonthCount).toBe('number');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test tests/stats.test.ts
```

- [ ] **Step 3: Implement `src/lib/stats.ts`**

```ts
import type { Party } from './db/schema';
import type { PartyType } from './types';
import { PARTY_TYPES } from './types';

export interface Stats {
  total: number;
  byType: Record<PartyType, number>;
  byMonth: Record<string, number>;       // 'YYYY-MM' -> count
  byCrew: { crew: string; count: number }[];
  topCrew: { crew: string; count: number } | null;
  ruouPercent: number;
  currentMonthCount: number;
  heatmap: Record<string, number>;       // 'YYYY-MM-DD' -> sum(epicLevel)
}

export function computeStats(parties: Party[]): Stats {
  const byType = Object.fromEntries(PARTY_TYPES.map(t => [t, 0])) as Record<PartyType, number>;
  const byMonth: Record<string, number> = {};
  const crewCounts = new Map<string, number>();
  const heatmap: Record<string, number> = {};

  for (const p of parties) {
    byType[p.type as PartyType]++;
    const ym = p.date.slice(0, 7);
    byMonth[ym] = (byMonth[ym] ?? 0) + 1;
    if (p.crew) crewCounts.set(p.crew, (crewCounts.get(p.crew) ?? 0) + 1);
    heatmap[p.date] = (heatmap[p.date] ?? 0) + (p.epicLevel ?? 0);
  }

  const byCrew = [...crewCounts.entries()]
    .map(([crew, count]) => ({ crew, count }))
    .sort((a, b) => b.count - a.count);

  const ruouTotal = byType.ruou + byType.bia_ruou;
  const ruouPercent = parties.length ? Math.round((ruouTotal / parties.length) * 100) : 0;

  const now = new Date();
  const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthCount = byMonth[ymNow] ?? 0;

  return {
    total: parties.length,
    byType,
    byMonth,
    byCrew,
    topCrew: byCrew[0] ?? null,
    ruouPercent,
    currentMonthCount,
    heatmap,
  };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm test tests/stats.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add tests/stats.test.ts src/lib/stats.ts
git commit -m "feat(stats): compute totals, by-type, by-month, crew ranking, heatmap buckets"
```

---

## Task 8: Seed script

**Files:**
- Create: `scripts/seed-from-notes.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/seed-from-notes.ts
// Run: pnpm db:seed:local  or  pnpm db:seed:prod
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parsePartyNote } from '../src/lib/parser';

const args = process.argv.slice(2);
const target = args.includes('--remote') ? '--remote' : '--local';

const text = readFileSync('party_note.txt', 'utf8');
const rows = parsePartyNote(text);
console.log(`Parsed ${rows.length} entries from party_note.txt`);

// Chunk to avoid command-line length limits
const CHUNK = 25;
for (let i = 0; i < rows.length; i += CHUNK) {
  const slice = rows.slice(i, i + CHUNK);
  const values = slice.map(r => {
    const esc = (s: string | null) => s == null ? 'NULL' : `'${s.replace(/'/g, "''")}'`;
    return `(${esc(r.date)}, ${esc(r.type)}, ${esc(r.title)}, ${esc(r.description)}, ${esc(r.location)}, ${esc(r.crew)}, ${r.epicLevel}, ${r.isSpecial ? 1 : 0})`;
  }).join(',\n');

  const sql = `INSERT INTO parties (date, type, title, description, location, crew, epic_level, is_special) VALUES\n${values};`;
  console.log(`Inserting chunk ${Math.floor(i / CHUNK) + 1}/${Math.ceil(rows.length / CHUNK)}...`);
  execSync(`pnpm exec wrangler d1 execute party-db ${target} --command ${JSON.stringify(sql)}`, { stdio: 'inherit' });
}

console.log('✓ Seed complete');
```

- [ ] **Step 2: Run seed (local)**

```bash
pnpm db:seed:local
```

Expected: prints `Parsed N entries`, then `Inserting chunk X/Y` for each, ends with `✓ Seed complete`.

- [ ] **Step 3: Verify count**

```bash
pnpm exec wrangler d1 execute party-db --local --command "SELECT COUNT(*) as n FROM parties"
```

Expected: `n` ≥ 60 (depending on parser coverage of party_note.txt).

- [ ] **Step 4: Spot check a famous entry**

```bash
pnpm exec wrangler d1 execute party-db --local --command "SELECT date, type, title FROM parties WHERE title LIKE '%Trang XOX%'"
```

Expected: row with `2026-05-17, ruou, ... Trang XOX ...`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-from-notes.ts
git commit -m "feat(seed): bulk import party_note.txt into D1 via wrangler"
```

---

# PHASE 3 — Visual Primitives

## Task 9: SVG icons + Sparkles background

**Files:**
- Create: `src/components/IconBeerMug.astro`, `src/components/IconWineGlass.astro`, `src/components/IconStar.astro`, `src/components/Sparkles.astro`

- [ ] **Step 1: `IconBeerMug.astro`**

```astro
---
interface Props { class?: string }
const { class: className = '' } = Astro.props;
---
<svg viewBox="0 0 64 64" class={className} aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="14" y="18" width="28" height="38" rx="3" />
  <rect x="42" y="24" width="10" height="22" rx="3" />
  <path d="M16 26 Q24 18 32 24 T44 22" />
  <path d="M20 30 L20 50 M28 30 L28 50 M36 30 L36 50" stroke-width="1.5" opacity=".6" />
</svg>
```

- [ ] **Step 2: `IconWineGlass.astro`**

```astro
---
interface Props { class?: string }
const { class: className = '' } = Astro.props;
---
<svg viewBox="0 0 64 64" class={className} aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 8 H44 L42 28 Q42 38 32 38 Q22 38 22 28 Z" />
  <line x1="32" y1="38" x2="32" y2="54" />
  <line x1="22" y1="54" x2="42" y2="54" />
  <path d="M22 18 H42" stroke-width="1.5" opacity=".5" />
</svg>
```

- [ ] **Step 3: `IconStar.astro`**

```astro
---
interface Props { class?: string; size?: number }
const { class: className = '', size = 16 } = Astro.props;
---
<svg width={size} height={size} viewBox="0 0 24 24" class={className} fill="currentColor" aria-hidden="true">
  <path d="M12 1 L14 9 L22 12 L14 15 L12 23 L10 15 L2 12 L10 9 Z" />
</svg>
```

- [ ] **Step 4: `Sparkles.astro`** (deterministic random positions for SSR stability)

```astro
---
interface Props { count?: number }
const { count = 60 } = Astro.props;
const seed = 1337;
function rand(i: number) { return ((i * 9301 + seed) % 233280) / 233280; }
const stars = Array.from({ length: count }, (_, i) => ({
  x: rand(i) * 100,
  y: rand(i + 100) * 100,
  s: 0.5 + rand(i + 200) * 2,
  d: 2 + rand(i + 300) * 4,
}));
---
<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
  {stars.map(s => (
    <span
      class="absolute rounded-full bg-white animate-twinkle"
      style={`left:${s.x}%;top:${s.y}%;width:${s.s}px;height:${s.s}px;animation-duration:${s.d}s`}
    ></span>
  ))}
</div>

<style is:global>
  @keyframes twinkle { 0%,100% { opacity: .15 } 50% { opacity: 1 } }
  .animate-twinkle { animation: twinkle infinite ease-in-out; }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Icon*.astro src/components/Sparkles.astro
git commit -m "feat(ui): SVG icons (beer mug, wine glass, star) + sparkles background"
```

---

## Task 10: Timeline primitive components

**Files:**
- Create: `src/components/timeline/TimelineSpine.astro`, `YearMarker.astro`, `DatePill.astro`, `MonthCard.astro`, `EntryRow.astro`, `TypeBadge.astro`

- [ ] **Step 1: `TypeBadge.astro`**

```astro
---
import { TYPE_META, type PartyType } from '~/lib/types';
interface Props { type: PartyType }
const { type } = Astro.props;
const m = TYPE_META[type];
---
<span class={`inline-block px-1.5 py-0.5 text-[10px] font-semibold tracking-wider rounded-sm border border-current ${m.colorClass}`}>
  ({m.label})
</span>
```

- [ ] **Step 2: `EntryRow.astro`**

```astro
---
import TypeBadge from './TypeBadge.astro';
import type { PartyType } from '~/lib/types';
interface Props { day: number; month: number; type: PartyType; title: string; isSpecial?: boolean; id: number }
const { day, month, type, title, isSpecial, id } = Astro.props;
---
<div
  class={`flex items-baseline gap-2 py-1 text-[13px] leading-snug entry ${isSpecial ? 'special' : ''}`}
  data-type={type}
  data-id={id}
>
  <span class="text-neon-yellow font-mono shrink-0 w-12">{day}-{month}</span>
  <TypeBadge type={type} />
  <span class="text-ink/90">{title}{isSpecial ? ' ★' : ''}</span>
</div>
```

- [ ] **Step 3: `MonthCard.astro`**

The color lookup uses *literal class strings* so Tailwind's JIT can see them (template literals like `` `text-neon-${color}` `` would be purged unless safelisted). Even with the safelist in `tailwind.config.ts`, prefer literal maps so the intent is obvious.

```astro
---
import { MONTH_COLORS } from '~/lib/types';
interface Props { month: number; year: number; side: 'left' | 'right' }
const { month, year, side } = Astro.props;
const colorKey = MONTH_COLORS[month] as 'pink' | 'orange' | 'yellow' | 'cyan' | 'green';

const COLOR_CLASSES = {
  pink:   { text: 'text-neon-pink',   border: 'border-neon-pink',   glow: 'shadow-neon-pink'   },
  orange: { text: 'text-neon-orange', border: 'border-neon-orange', glow: 'shadow-neon-orange' },
  yellow: { text: 'text-neon-yellow', border: 'border-neon-yellow', glow: 'shadow-neon-yellow' },
  cyan:   { text: 'text-neon-cyan',   border: 'border-neon-cyan',   glow: 'shadow-neon-cyan'   },
  green:  { text: 'text-neon-green',  border: 'border-neon-green',  glow: 'shadow-neon-green'  },
} as const;
const c = COLOR_CLASSES[colorKey];
---
<div
  class:list={['month-card rounded-xl border bg-bg-deep/55 backdrop-blur-md p-4 relative', c.border, c.glow]}
  data-side={side}
  data-month={month}
  data-year={year}
>
  <h3 class:list={['font-display text-2xl tracking-widest mb-2', c.text]}>THÁNG {month}</h3>
  <div class="space-y-0">
    <slot />
  </div>
</div>
```

- [ ] **Step 4: `YearMarker.astro`**

```astro
---
interface Props { year: number }
const { year } = Astro.props;
---
<div class="year-marker flex justify-center my-12">
  <div class="font-display text-7xl text-neon-orange drop-shadow-[0_0_24px_rgba(255,138,61,.7)]">
    {year}
  </div>
</div>
```

- [ ] **Step 5: `DatePill.astro`**

```astro
---
import { MONTH_NAMES_VI } from '~/lib/types';
interface Props { month: number; year: number }
const { month } = Astro.props;
---
<div class="date-pill inline-flex flex-col items-center justify-center w-16 h-16 rounded-full bg-bg-deep border-2 border-neon-cyan shadow-neon-cyan">
  <span class="font-display text-2xl leading-none text-ink">{String(month).padStart(2, '0')}</span>
  <span class="font-display text-[10px] leading-none text-neon-cyan tracking-wider mt-1">{MONTH_NAMES_VI[month]}</span>
</div>
```

- [ ] **Step 6: `TimelineSpine.astro`**

```astro
<div class="timeline-spine hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-neon-cyan via-neon-pink to-neon-orange shadow-[0_0_8px_#00e5ff]"></div>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/timeline/
git commit -m "feat(ui): timeline primitives (spine, year marker, date pill, month card, entry row, type badge)"
```

---

# PHASE 4 — Public Page

## Task 11: Hero + Footer + global layout

**Files:**
- Create: `src/components/Hero.astro`, `src/components/Footer.astro`, `src/layouts/Base.astro`

- [ ] **Step 1: `src/layouts/Base.astro`**

```astro
---
import '~/styles/global.css';
import Sparkles from '~/components/Sparkles.astro';
interface Props { title?: string }
const { title = 'Lịch Nhậu Huyền Thoại' } = Astro.props;
---
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="/fonts/bebas-neue.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/pacifico.woff2" as="font" type="font/woff2" crossorigin />
  </head>
  <body class="font-body antialiased">
    <Sparkles count={80} />
    <slot />
  </body>
</html>
```

- [ ] **Step 2: `Hero.astro`**

```astro
---
import IconBeerMug from './IconBeerMug.astro';
import IconWineGlass from './IconWineGlass.astro';
---
<header class="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
  <div class="flex items-center gap-6 text-neon-yellow mb-4">
    <IconBeerMug class="w-14 h-14 -rotate-12 drop-shadow-[0_0_12px_#ffeb3b]" />
    <h1 class="font-display text-7xl md:text-9xl tracking-[0.15em] text-neon-gradient animate-flicker">TIMELINE</h1>
    <IconWineGlass class="w-14 h-14 rotate-12 text-neon-pink drop-shadow-[0_0_12px_#ff3b8a]" />
  </div>
  <p class="font-script text-3xl md:text-5xl text-neon-orange drop-shadow-[0_0_12px_rgba(255,138,61,.8)] -mt-2">
    Lịch Nhậu Huyền Thoại
  </p>
  <a href="#timeline" class="absolute bottom-8 text-ink/60 text-sm animate-bounce">↓ scroll</a>
</header>
```

- [ ] **Step 3: `Footer.astro`**

```astro
---
import IconBeerMug from './IconBeerMug.astro';
import IconWineGlass from './IconWineGlass.astro';
import IconStar from './IconStar.astro';
---
<footer class="mt-24 border-t border-ink/10 py-10 px-4">
  <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
    <div>
      <h4 class="font-display tracking-widest text-ink/70 mb-3">CHÚ THÍCH</h4>
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2"><IconBeerMug class="w-5 h-5 text-neon-yellow" /><span class="text-neon-yellow font-semibold">BIA</span><span class="text-ink/60">— Vui vẻ, sôi động</span></div>
        <div class="flex items-center gap-2"><IconWineGlass class="w-5 h-5 text-neon-pink" /><span class="text-neon-pink font-semibold">RƯỢU</span><span class="text-ink/60">— Ấm áp, thân cảm</span></div>
        <div class="flex items-center gap-2"><IconStar class="text-neon-cyan" size={20} /><span class="text-neon-cyan font-semibold">ĐẶC BIỆT</span><span class="text-ink/60">— Sự kiện đặc biệt</span></div>
      </div>
    </div>
    <div>
      <h4 class="font-display tracking-widest text-ink/70 mb-3">TIP</h4>
      <p class="text-sm text-ink/70 italic">Uống có trách nhiệm.<br />Nhậu nhiệt tình — sống hết mình!</p>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/ src/components/Hero.astro src/components/Footer.astro
git commit -m "feat(ui): base layout, hero section, footer with legend + tip"
```

---

## Task 12: Timeline section (zigzag assembly)

**Files:**
- Create: `src/components/timeline/TimelineSection.astro`

- [ ] **Step 1: Write the component**

```astro
---
import TimelineSpine from './TimelineSpine.astro';
import YearMarker from './YearMarker.astro';
import DatePill from './DatePill.astro';
import MonthCard from './MonthCard.astro';
import EntryRow from './EntryRow.astro';
import type { Party } from '~/lib/db/schema';
import type { PartyType } from '~/lib/types';

interface Props { parties: Party[] }
const { parties } = Astro.props;

// Group by year, then by month, sorted descending
const groups = new Map<number, Map<number, Party[]>>();
for (const p of parties) {
  const [y, m] = p.date.split('-').map(Number);
  if (!groups.has(y)) groups.set(y, new Map());
  const yearGroup = groups.get(y)!;
  if (!yearGroup.has(m)) yearGroup.set(m, []);
  yearGroup.get(m)!.push(p);
}

const years = [...groups.keys()].sort((a, b) => b - a);
---
<section id="timeline" class="relative max-w-6xl mx-auto px-4 py-12">
  <TimelineSpine />

  {years.map((year, yi) => {
    const months = [...groups.get(year)!.keys()].sort((a, b) => b - a);
    return (
      <div class="relative">
        <YearMarker year={year} />
        {months.map((month, mi) => {
          const side: 'left' | 'right' = ((yi + mi) % 2 === 0) ? 'left' : 'right';
          const entries = groups.get(year)!.get(month)!;
          return (
            <div class="month-row relative grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start mb-10">
              <div class={side === 'left' ? '' : 'hidden md:block'}>
                {side === 'left' && (
                  <MonthCard month={month} year={year} side="left">
                    {entries.map(e => {
                      const [_, mm, dd] = e.date.split('-').map(Number);
                      return <EntryRow id={e.id} day={dd} month={mm} type={e.type as PartyType} title={e.title} isSpecial={!!e.isSpecial} />;
                    })}
                  </MonthCard>
                )}
              </div>
              <div class="hidden md:flex justify-center pt-2">
                <DatePill month={month} year={year} />
              </div>
              <div class={side === 'right' ? '' : 'hidden md:block'}>
                {side === 'right' && (
                  <MonthCard month={month} year={year} side="right">
                    {entries.map(e => {
                      const [_, mm, dd] = e.date.split('-').map(Number);
                      return <EntryRow id={e.id} day={dd} month={mm} type={e.type as PartyType} title={e.title} isSpecial={!!e.isSpecial} />;
                    })}
                  </MonthCard>
                )}
              </div>
              <div class="md:hidden">
                <MonthCard month={month} year={year} side="left">
                  {entries.map(e => {
                    const [_, mm, dd] = e.date.split('-').map(Number);
                    return <EntryRow id={e.id} day={dd} month={mm} type={e.type as PartyType} title={e.title} isSpecial={!!e.isSpecial} />;
                  })}
                </MonthCard>
              </div>
            </div>
          );
        })}
      </div>
    );
  })}
</section>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/timeline/TimelineSection.astro
git commit -m "feat(ui): timeline zigzag section (desktop: alternating L/R, mobile: 1 column)"
```

---

## Task 13: Public index page (SSR with D1 data)

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Write the page**

```astro
---
import Base from '~/layouts/Base.astro';
import Hero from '~/components/Hero.astro';
import Footer from '~/components/Footer.astro';
import TimelineSection from '~/components/timeline/TimelineSection.astro';
import StatsStrip from '~/components/StatsStrip.tsx';
import FilterPills from '~/components/FilterPills.tsx';
import Heatmap from '~/components/Heatmap.tsx';
import DeepStats from '~/components/DeepStats.tsx';
import { db } from '~/lib/db/client';
import { listParties } from '~/lib/db/queries';
import { computeStats } from '~/lib/stats';

const env = Astro.locals.runtime.env;
const parties = await listParties(db(env.DB));
const stats = computeStats(parties);

Astro.response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
---
<Base>
  <Hero />
  <StatsStrip client:idle stats={stats} />
  <FilterPills client:idle crews={stats.byCrew.map(c => c.crew)} />
  <TimelineSection parties={parties} />
  <Heatmap client:visible heatmap={stats.heatmap} />
  <DeepStats client:visible stats={stats} />
  <Footer />
</Base>
```

- [ ] **Step 2: Run dev server**

```bash
pnpm dev
```

Expected: Astro starts at `http://localhost:4321`. Visit it.

- [ ] **Step 3: Verify**

- Hero renders with "TIMELINE" gradient + "Lịch Nhậu Huyền Thoại" cursive.
- Timeline zigzag visible with all seeded entries.
- Each entry shows `DD-M (BIA)` etc.
- Heatmap, stats strip, filter pills are PLACEHOLDERS (will be built next) — page must not error, even if these components are empty.
- **If StatsStrip/FilterPills/Heatmap/DeepStats files don't exist yet, stub them** as empty React components returning `<div />` so the page compiles.

Create stub `src/components/StatsStrip.tsx`:
```tsx
export default function StatsStrip(_: any) { return <div />; }
```
Repeat for `FilterPills.tsx`, `Heatmap.tsx`, `DeepStats.tsx`.

- [ ] **Step 4: Take screenshot at 1440x900 desktop**

Use Chrome DevTools or Playwright. Compare visually against `template.png`. Note any color/font mismatch — adjust `tailwind.config.ts` / `global.css` accordingly before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/components/StatsStrip.tsx src/components/FilterPills.tsx src/components/Heatmap.tsx src/components/DeepStats.tsx
git commit -m "feat(page): SSR'd public timeline with D1 data + 60s edge cache"
```

---

# PHASE 5 — Interactive Islands

## Task 14: FilterPills island

**Files:**
- Modify: `src/components/FilterPills.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useState } from 'react';

type Filter = 'all' | 'bia' | 'ruou' | 'special';

interface Props { crews: string[] }

export default function FilterPills({ crews }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [crew, setCrew] = useState<string>('all');

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.entry').forEach(el => {
      const type = el.dataset.type ?? '';
      const isSpecial = el.classList.contains('special');
      let match = true;
      if (filter === 'bia') match = type === 'bia' || type === 'bia_ruou';
      else if (filter === 'ruou') match = type === 'ruou' || type === 'bia_ruou';
      else if (filter === 'special') match = isSpecial;
      el.style.opacity = match ? '1' : '.25';
      el.style.filter = match ? 'none' : 'grayscale(.6)';
    });
  }, [filter, crew]);

  const pill = (val: Filter, label: string, color: string) =>
    <button onClick={() => setFilter(val)}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${filter===val ? `${color} text-bg-deep` : 'border-ink/30 text-ink/70 hover:text-ink'}`}>
      {label}
    </button>;

  return (
    <div className="sticky top-0 z-30 bg-bg-deep/85 backdrop-blur-md border-y border-ink/10 py-2 px-4 flex items-center justify-center gap-2 flex-wrap">
      {pill('all', 'TẤT CẢ', 'bg-ink border-ink')}
      {pill('bia', 'BIA', 'bg-neon-yellow border-neon-yellow')}
      {pill('ruou', 'RƯỢU', 'bg-neon-pink border-neon-pink')}
      {pill('special', '★ ĐẶC BIỆT', 'bg-neon-cyan border-neon-cyan')}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test in browser**

Click each pill. Non-matching entries fade.

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterPills.tsx
git commit -m "feat(ui): FilterPills island with type/special filtering"
```

---

## Task 15: StatsStrip island

**Files:**
- Modify: `src/components/StatsStrip.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Stats } from '~/lib/stats';

interface Props { stats: Stats }

export default function StatsStrip({ stats }: Props) {
  return (
    <div className="sticky top-10 z-20 mx-auto max-w-4xl px-4 py-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
      <Stat label="Tổng" value={stats.total.toString()} color="text-neon-yellow" />
      <Stat label="% Rượu" value={`${stats.ruouPercent}%`} color="text-neon-pink" />
      <Stat label="Top Crew" value={stats.topCrew?.crew ?? '—'} color="text-neon-cyan" />
      <Stat label="Tháng này" value={stats.currentMonthCount.toString()} color="text-neon-orange" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-bg-deep/60 backdrop-blur rounded-lg border border-ink/10 px-3 py-1.5">
      <div className="text-ink/50 uppercase tracking-wider text-[10px]">{label}</div>
      <div className={`font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StatsStrip.tsx
git commit -m "feat(ui): StatsStrip sticky island with totals, %, top crew"
```

---

## Task 16: Heatmap island

**Files:**
- Modify: `src/components/Heatmap.tsx`

- [ ] **Step 1: Implement**

```tsx
interface Props { heatmap: Record<string, number> }

const BUCKETS = [
  { max: 0,  cls: 'bg-ink/10' },
  { max: 3,  cls: 'bg-neon-cyan/30' },
  { max: 6,  cls: 'bg-neon-cyan/55' },
  { max: 10, cls: 'bg-neon-pink/75 shadow-neon-pink' },
  { max: Infinity, cls: 'bg-neon-pink shadow-neon-pink' },
];

function bucket(v: number) { return BUCKETS.find(b => v <= b.max)!.cls; }

export default function Heatmap({ heatmap }: Props) {
  const today = new Date();
  const days: { date: string; value: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, value: heatmap[iso] ?? 0 });
  }
  // arrange into 53 columns × 7 rows (weekday)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="font-display text-3xl text-neon-cyan mb-4 text-center">HEATMAP 365 NGÀY</h2>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map(d => (
                <div
                  key={d.date}
                  className={`w-3 h-3 rounded-sm ${bucket(d.value)}`}
                  title={`${d.date}: ${d.value} pts`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Heatmap.tsx
git commit -m "feat(ui): Heatmap 365-day island with 5-bucket intensity"
```

---

## Task 17: DeepStats island (bar + donut + ranking)

**Files:**
- Modify: `src/components/DeepStats.tsx`

- [ ] **Step 1: Implement** (pure SVG, no chart lib needed)

```tsx
import type { Stats } from '~/lib/stats';
import { TYPE_META, type PartyType } from '~/lib/types';

interface Props { stats: Stats }

export default function DeepStats({ stats }: Props) {
  const months = Object.entries(stats.byMonth).sort(([a],[b]) => a.localeCompare(b)).slice(-12);
  const maxMonth = Math.max(1, ...months.map(([_,n]) => n));

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="font-display text-2xl text-neon-yellow mb-3">12 THÁNG GẦN ĐÂY</h3>
        <div className="flex items-end gap-1 h-40">
          {months.map(([ym, n]) => (
            <div key={ym} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-gradient-to-t from-neon-pink to-neon-orange rounded-t shadow-neon-pink" style={{ height: `${(n / maxMonth) * 100}%` }} />
              <span className="text-[9px] text-ink/50">{ym.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-display text-2xl text-neon-cyan mb-3">TOP CREW</h3>
        <ol className="space-y-1">
          {stats.byCrew.slice(0, 8).map((c, i) => (
            <li key={c.crew} className="flex justify-between text-sm border-b border-ink/10 py-1">
              <span><span className="text-neon-orange font-display mr-2">{i + 1}.</span>{c.crew}</span>
              <span className="text-neon-yellow font-mono">{c.count}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeepStats.tsx
git commit -m "feat(ui): DeepStats island (12-month bars + crew ranking)"
```

---

# PHASE 6 — Responsive + Animations

## Task 18: Mobile responsive polish

- [ ] **Step 1: Open `http://localhost:4321` in Chrome DevTools, set width to 375px (iPhone SE).**

- [ ] **Step 2: Verify behavior**

- Hero TIMELINE scales down (use `text-7xl md:text-9xl` already in place).
- Timeline section: spine hidden, date pills hidden, cards stack 1 column.
- Filter pills wrap to 2 rows.
- Heatmap scrolls horizontally.
- No horizontal page scroll.

- [ ] **Step 3: Fix any overflow** — if any element overflows, add `overflow-x-hidden` to `<body>` in `Base.astro`, or scale specific text down with responsive utility classes.

- [ ] **Step 4: Commit fixes**

```bash
git add -u
git commit -m "fix(responsive): mobile overflow + layout tweaks"
```

---

## Task 19: Animations (Framer Motion + scroll triggers + parallax)

Covers spec §10 in full: TIMELINE letter stagger, cursive flicker, sparkle parallax to mouse, month card slide-in, date pill scale-in, entry row stagger. Respects `prefers-reduced-motion`.

**Files:**
- Create: `src/components/ScrollReveal.tsx`, `src/components/HeroAnimated.tsx`, `src/components/ParallaxSparkles.tsx`
- Modify: `src/components/Hero.astro` (swap to `HeroAnimated` island), `src/components/timeline/TimelineSection.astro` (wrap month cards + date pills in `ScrollReveal`), `src/layouts/Base.astro` (swap `Sparkles` for `ParallaxSparkles` island)

- [ ] **Step 1: Install Framer Motion**

```bash
pnpm add framer-motion
```

- [ ] **Step 2: Create `src/components/ScrollReveal.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/components/HeroAnimated.tsx`** (TIMELINE letter stagger + flicker)

```tsx
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
```

- [ ] **Step 4: Create `src/components/ParallaxSparkles.tsx`** (mouse-driven layered parallax)

```tsx
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
```

- [ ] **Step 5: Wire islands in `Hero.astro` and `Base.astro`**

In `src/components/Hero.astro`, replace the bare `<h1>TIMELINE</h1>` block with:
```astro
---
import HeroAnimated from './HeroAnimated.tsx';
import IconBeerMug from './IconBeerMug.astro';
import IconWineGlass from './IconWineGlass.astro';
---
<header class="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
  <div class="flex items-center gap-6 text-neon-yellow mb-4">
    <IconBeerMug class="w-14 h-14 -rotate-12 drop-shadow-[0_0_12px_#ffeb3b]" />
    <HeroAnimated client:load />
    <IconWineGlass class="w-14 h-14 rotate-12 text-neon-pink drop-shadow-[0_0_12px_#ff3b8a]" />
  </div>
  <p class="font-script text-3xl md:text-5xl text-neon-orange drop-shadow-[0_0_12px_rgba(255,138,61,.8)] -mt-2">
    Lịch Nhậu Huyền Thoại
  </p>
  <a href="#timeline" class="absolute bottom-8 text-ink/60 text-sm animate-bounce">↓ scroll</a>
</header>
```

In `src/layouts/Base.astro`, replace `<Sparkles count={80} />` with `<ParallaxSparkles client:load count={80} />` (and update the import).

- [ ] **Step 6: Wrap MonthCards + DatePills in `TimelineSection.astro` with ScrollReveal**

Inside each `month-row`, wrap the `<MonthCard>` blocks with `<ScrollReveal client:visible variant={side === 'left' ? 'slide-left' : 'slide-right'}>...</ScrollReveal>` and wrap each `<DatePill ... />` with `<ScrollReveal client:visible variant="scale-in">...</ScrollReveal>`.

Inside `MonthCard.astro`, wrap the `<slot />` with a `<div class="entry-stagger">` and add to `global.css`:

```css
.entry-stagger > .entry { opacity: 0; animation: fade-in 0.4s ease-out forwards; }
.entry-stagger > .entry:nth-child(1) { animation-delay: 0.05s; }
.entry-stagger > .entry:nth-child(2) { animation-delay: 0.10s; }
.entry-stagger > .entry:nth-child(3) { animation-delay: 0.15s; }
.entry-stagger > .entry:nth-child(4) { animation-delay: 0.20s; }
.entry-stagger > .entry:nth-child(n+5) { animation-delay: 0.25s; }
@keyframes fade-in { to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .entry-stagger > .entry { opacity: 1; animation: none; }
}
```

- [ ] **Step 7: Verify in browser**

Refresh `http://localhost:4321`:
- Hero: TIMELINE letters stagger-fade in.
- Move mouse: sparkles drift in opposite direction.
- Scroll down: month cards slide in from L/R, date pills pop with scale.
- Open DevTools → Rendering → "Emulate reduced motion: reduce" → all animations disabled (instant snap).

- [ ] **Step 8: Commit**

```bash
git add -u src/
git commit -m "feat(motion): hero letter stagger, parallax sparkles, scroll-reveal cards + pills + entries"
```

---

## Task 19b: Entry click → modal with photo carousel

Implements spec §10 entry-click behavior. Photos uploaded via admin (Task 22/23) are not visible publicly without this.

**Files:**
- Create: `src/components/EntryModal.tsx`
- Modify: `src/components/timeline/EntryRow.astro` (add `data-photos` attribute), `src/pages/index.astro` (mount `EntryModal` once at root)

- [ ] **Step 1: Update `EntryRow.astro` to carry full payload**

Replace its frontmatter and body:

```astro
---
import TypeBadge from './TypeBadge.astro';
import type { PartyType } from '~/lib/types';
interface Props {
  id: number; day: number; month: number; type: PartyType; title: string;
  isSpecial?: boolean;
  description?: string | null;
  location?: string | null;
  crew?: string | null;
  photos?: { r2Key: string; caption: string | null }[];
}
const { id, day, month, type, title, isSpecial, description, location, crew, photos = [] } = Astro.props;
const dataPhotos = JSON.stringify(photos);
---
<button
  class:list={['entry flex items-baseline gap-2 py-1 text-[13px] leading-snug w-full text-left hover:bg-white/5 rounded px-1 cursor-pointer', isSpecial && 'special']}
  data-entry-trigger
  data-id={id}
  data-type={type}
  data-title={title}
  data-description={description ?? ''}
  data-location={location ?? ''}
  data-crew={crew ?? ''}
  data-photos={dataPhotos}
>
  <span class="text-neon-yellow font-mono shrink-0 w-12">{day}-{month}</span>
  <TypeBadge type={type} />
  <span class="text-ink/90">{title}{isSpecial ? ' ★' : ''}</span>
</button>
```

- [ ] **Step 2: Update `TimelineSection.astro` to pass photos + extra fields**

In the JSX, change each `<EntryRow ... />` call to also pass `description={e.description} location={e.location} crew={e.crew} photos={(e as any).photos ?? []}`. (Type cast acceptable because `listParties` returns the augmented shape.)

- [ ] **Step 3: Create `src/components/EntryModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface EntryData {
  id: number; type: string; title: string;
  description?: string; location?: string; crew?: string;
  photos: { r2Key: string; caption: string | null }[];
}

declare global { interface Window { PUBLIC_R2_URL?: string; } }

export default function EntryModal() {
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    const onClick = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-entry-trigger]');
      if (!t) return;
      setPhotoIdx(0);
      setEntry({
        id: Number(t.dataset.id),
        type: t.dataset.type ?? '',
        title: t.dataset.title ?? '',
        description: t.dataset.description || undefined,
        location: t.dataset.location || undefined,
        crew: t.dataset.crew || undefined,
        photos: JSON.parse(t.dataset.photos || '[]'),
      });
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEntry(null); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const base = (typeof window !== 'undefined' && window.PUBLIC_R2_URL) || '';

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEntry(null)}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-bg-deep border border-neon-pink/60 shadow-neon-pink rounded-2xl max-w-lg w-full p-6 text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-3xl text-neon-pink mb-2">{entry.title}</h2>
            <div className="flex gap-2 text-xs text-ink/60 mb-4">
              {entry.crew && <span>👥 {entry.crew}</span>}
              {entry.location && <span>📍 {entry.location}</span>}
            </div>
            {entry.description && <p className="text-sm text-ink/80 mb-4">{entry.description}</p>}

            {entry.photos.length > 0 && (
              <div className="relative">
                <img
                  src={`${base}/${entry.photos[photoIdx].r2Key}`}
                  alt={entry.photos[photoIdx].caption ?? ''}
                  className="w-full rounded-lg"
                  loading="lazy"
                />
                {entry.photos.length > 1 && (
                  <div className="flex justify-between mt-2 text-sm">
                    <button onClick={() => setPhotoIdx((i) => (i - 1 + entry.photos.length) % entry.photos.length)} className="text-neon-cyan">← prev</button>
                    <span className="text-ink/50">{photoIdx + 1} / {entry.photos.length}</span>
                    <button onClick={() => setPhotoIdx((i) => (i + 1) % entry.photos.length)} className="text-neon-cyan">next →</button>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setEntry(null)} className="mt-4 w-full py-2 border border-ink/30 rounded text-sm text-ink/70 hover:text-ink">Close (Esc)</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Mount EntryModal once in `src/pages/index.astro`**

In the public page frontmatter, import `EntryModal` and add at the very end of the page body (after `<Footer />`):

```astro
<EntryModal client:idle />
<script define:vars={{ url: env.PUBLIC_R2_URL }}>window.PUBLIC_R2_URL = url;</script>
```

(Where `env = Astro.locals.runtime.env` already exists in the page frontmatter.)

- [ ] **Step 5: Smoke test**

Click any entry row → modal opens with title/crew/location/description. If photos exist (after admin upload), shows carousel with prev/next + counter. Esc closes.

- [ ] **Step 6: Commit**

```bash
git add -u src/
git commit -m "feat(ui): EntryModal with photo carousel (click entry → details + photos)"
```

---

# PHASE 7 — Auth, Admin, API

## Task 20: Auth helpers + tests (TDD)

**Files:**
- Create: `tests/auth.test.ts`, `src/lib/auth.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt, constantTimeEqual } from '~/lib/auth';

const SECRET = 'a'.repeat(32);

describe('auth', () => {
  it('signs and verifies a valid JWT', async () => {
    const token = await signJwt({ admin: true }, SECRET, 60);
    const payload = await verifyJwt(token, SECRET);
    expect(payload).toMatchObject({ admin: true });
  });

  it('rejects tampered tokens', async () => {
    const token = await signJwt({ admin: true }, SECRET, 60);
    const bad = token.slice(0, -2) + 'XX';
    await expect(verifyJwt(bad, SECRET)).resolves.toBeNull();
  });

  it('rejects expired tokens', async () => {
    const token = await signJwt({ admin: true }, SECRET, -10);
    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });

  it('constantTimeEqual returns true for equal strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });

  it('constantTimeEqual returns false for different strings', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test tests/auth.test.ts
```

- [ ] **Step 3: Implement `src/lib/auth.ts`** (Web Crypto API for Cloudflare compat)

```ts
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export async function signJwt(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const h = b64url(new TextEncoder().encode(JSON.stringify(header)));
  const p = b64url(new TextEncoder().encode(JSON.stringify(body)));
  const sig = await hmac(secret, `${h}.${p}`);
  return `${h}.${p}.${b64url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = await hmac(secret, `${h}.${p}`);
  const got = b64urlDecode(s);
  if (!constantTimeEqualBytes(expected, got)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function constantTimeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

export const COOKIE_NAME = 'pt_auth';

export function setAuthCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`;
}

export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readAuthCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE_NAME) return v.join('=');
  }
  return null;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm test tests/auth.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add tests/auth.test.ts src/lib/auth.ts
git commit -m "feat(auth): JWT sign/verify with Web Crypto + cookie helpers (tested)"
```

---

## Task 21: Auth middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write middleware**

```ts
import type { MiddlewareHandler } from 'astro';
import { verifyJwt, readAuthCookie } from '~/lib/auth';

const PROTECTED_PATHS = [/^\/admin(\/|$)/, /^\/api\/parties$/, /^\/api\/parties\//, /^\/api\/upload-url$/, /^\/api\/logout$/];

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  const url = new URL(ctx.request.url);
  const isProtected = PROTECTED_PATHS.some(re => re.test(url.pathname));

  // GET /api/parties is public; only writes are protected
  const isPartiesRead = url.pathname === '/api/parties' && ctx.request.method === 'GET';
  if (!isProtected || isPartiesRead || url.pathname === '/admin/login') return next();

  const token = readAuthCookie(ctx.request.headers.get('cookie'));
  const env = ctx.locals.runtime.env;
  const payload = token ? await verifyJwt(token, env.JWT_SECRET) : null;

  if (!payload?.admin) {
    if (url.pathname.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
    return ctx.redirect('/admin/login');
  }
  ctx.locals.user = { admin: true };
  return next();
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): middleware gates /admin and /api writes"
```

---

## Task 22: API routes — login/logout + parties CRUD + upload-url

**Files:**
- Create: `src/pages/api/login.ts`, `src/pages/api/logout.ts`, `src/pages/api/parties/index.ts`, `src/pages/api/parties/[id].ts`, `src/pages/api/upload-url.ts`, `src/lib/r2.ts`, `src/lib/cache.ts`

- [ ] **Step 1: `src/lib/cache.ts`**

```ts
export async function invalidateEdgeCache(urls: string[]): Promise<void> {
  const cache = (caches as any).default;
  if (!cache) return;
  await Promise.all(urls.map(u => cache.delete(u)));
}
```

- [ ] **Step 2: `src/lib/r2.ts`** (Cloudflare R2 supports presigned URLs via `aws4fetch` — simplest path)

```bash
pnpm add aws4fetch
```

```ts
import { AwsClient } from 'aws4fetch';

// R2 presign requires S3 API credentials (created in dashboard → R2 → Manage API Tokens)
// Stored as secrets: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET

export async function signPutUrl(env: Env & { R2_ACCESS_KEY_ID: string; R2_SECRET_ACCESS_KEY: string; R2_ACCOUNT_ID: string; R2_BUCKET: string }, key: string, contentType: string, expiresSec = 300): Promise<string> {
  const client = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`);
  url.searchParams.set('X-Amz-Expires', String(expiresSec));
  const signed = await client.sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }), { aws: { signQuery: true } });
  return signed.url;
}

export function publicUrl(env: Env, key: string): string {
  return `${env.PUBLIC_R2_URL}/${key}`;
}
```

Add to `Env` in `src/env.d.ts`:
```ts
R2_ACCESS_KEY_ID: string;
R2_SECRET_ACCESS_KEY: string;
R2_ACCOUNT_ID: string;
R2_BUCKET: string;
```

Add corresponding entries to `.dev.vars`.

- [ ] **Step 3: `src/pages/api/login.ts`**

```ts
import type { APIRoute } from 'astro';
import { constantTimeEqual, signJwt, setAuthCookie } from '~/lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const { password } = await request.json().catch(() => ({ password: '' }));
  if (typeof password !== 'string' || !constantTimeEqual(password, env.ADMIN_PASSWORD)) {
    return new Response('Invalid', { status: 401 });
  }
  const token = await signJwt({ admin: true }, env.JWT_SECRET, 30 * 24 * 60 * 60);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': setAuthCookie(token) } });
};
```

- [ ] **Step 4: `src/pages/api/logout.ts`**

```ts
import type { APIRoute } from 'astro';
import { clearAuthCookie } from '~/lib/auth';
export const POST: APIRoute = async () =>
  new Response(null, { status: 204, headers: { 'Set-Cookie': clearAuthCookie() } });
```

- [ ] **Step 5: Create `src/lib/validate.ts`** (input whitelist + type guard)

```ts
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
```

- [ ] **Step 6: `src/pages/api/parties/index.ts`**

```ts
import type { APIRoute } from 'astro';
import { db } from '~/lib/db/client';
import { listParties, createParty } from '~/lib/db/queries';
import { invalidateEdgeCache } from '~/lib/cache';
import { validatePartyInput } from '~/lib/validate';

export const GET: APIRoute = async ({ locals }) => {
  const parties = await listParties(db(locals.runtime.env.DB));
  return new Response(JSON.stringify(parties), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const validated = validatePartyInput(await request.json().catch(() => null));
  if (typeof validated === 'string') return new Response(validated, { status: 400 });
  const row = await createParty(db(locals.runtime.env.DB), validated);
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(JSON.stringify(row), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
```

- [ ] **Step 7: `src/pages/api/parties/[id].ts`**

```ts
import type { APIRoute } from 'astro';
import { db } from '~/lib/db/client';
import { updateParty, deleteParty } from '~/lib/db/queries';
import { invalidateEdgeCache } from '~/lib/cache';
import { validatePartyInput } from '~/lib/validate';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response('bad id', { status: 400 });
  const validated = validatePartyInput(await request.json().catch(() => null), { partial: true });
  if (typeof validated === 'string') return new Response(validated, { status: 400 });
  const row = await updateParty(db(locals.runtime.env.DB), id, validated);
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response('bad id', { status: 400 });
  await deleteParty(db(locals.runtime.env.DB), id);
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(null, { status: 204 });
};
```

- [ ] **Step 8: `src/pages/api/upload-url.ts`**

```ts
import type { APIRoute } from 'astro';
import { signPutUrl } from '~/lib/r2';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json().catch(() => null) as { filename?: string; contentType?: string } | null;
  if (!body?.filename || !body?.contentType) return new Response('filename + contentType required', { status: 400 });
  if (!ALLOWED_TYPES.has(body.contentType)) return new Response('unsupported content-type', { status: 400 });
  const ext = body.filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const d = new Date();
  const key = `photos/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
  const url = await signPutUrl(locals.runtime.env as any, key, body.contentType);
  return new Response(JSON.stringify({ url, key }), { headers: { 'Content-Type': 'application/json' } });
};
```

- [ ] **Step 9: `src/pages/api/parties/[id]/photos.ts`** (attach + list photos for a party)

```ts
import type { APIRoute } from 'astro';
import { db } from '~/lib/db/client';
import { partyPhotos } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateEdgeCache } from '~/lib/cache';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const partyId = Number(params.id);
  if (!Number.isInteger(partyId) || partyId < 1) return new Response('bad id', { status: 400 });
  const body = await request.json().catch(() => null) as { r2Key?: string; caption?: string; width?: number; height?: number } | null;
  if (!body?.r2Key || typeof body.r2Key !== 'string' || !body.r2Key.startsWith('photos/')) {
    return new Response('r2Key required and must start with photos/', { status: 400 });
  }
  const d = db(locals.runtime.env.DB);
  const existing = await d.select().from(partyPhotos).where(eq(partyPhotos.partyId, partyId));
  const [row] = await d.insert(partyPhotos).values({
    partyId,
    r2Key: body.r2Key,
    caption: body.caption ?? null,
    width: body.width ?? null,
    height: body.height ?? null,
    sortOrder: existing.length,
  }).returning();
  const origin = new URL(request.url).origin;
  await invalidateEdgeCache([`${origin}/api/parties`, `${origin}/`]);
  return new Response(JSON.stringify(row), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
```

Update `src/middleware.ts` `PROTECTED_PATHS` to include this new write route — change the existing `/^\/api\/parties\//` regex; it already covers `/api/parties/<id>/photos`. Verify no change needed.

- [ ] **Step 10: Commit**

```bash
git add src/lib/r2.ts src/lib/cache.ts src/lib/validate.ts src/pages/api/ src/env.d.ts
git commit -m "feat(api): login/logout + parties CRUD (validated) + photo attach + R2 presigned upload + cache busting"
```

---

## Task 23: Login page + Admin UI

**Files:**
- Create: `src/pages/admin/login.astro`, `src/pages/admin/index.astro`, `src/components/AdminApp.tsx`

- [ ] **Step 1: `src/pages/admin/login.astro`**

```astro
---
import Base from '~/layouts/Base.astro';
---
<Base title="Admin login">
  <main class="max-w-sm mx-auto mt-32 px-4">
    <h1 class="font-display text-3xl text-neon-pink mb-4">ADMIN LOGIN</h1>
    <form id="login-form" class="space-y-3">
      <input type="password" name="password" required placeholder="Mật khẩu" class="w-full px-3 py-2 rounded bg-bg-deep border border-ink/20 text-ink" />
      <button class="w-full py-2 rounded bg-neon-pink text-bg-deep font-semibold">Đăng nhập</button>
      <p id="err" class="text-red-400 text-sm hidden">Sai mật khẩu</p>
    </form>
  </main>
  <script>
    const f = document.getElementById('login-form') as HTMLFormElement;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = (new FormData(f).get('password') as string);
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (r.ok) location.href = '/admin';
      else document.getElementById('err')!.classList.remove('hidden');
    });
  </script>
</Base>
```

- [ ] **Step 2: `src/components/AdminApp.tsx`** (React island for table + form)

```tsx
import { useEffect, useState } from 'react';

interface Party { id: number; date: string; type: string; title: string; description?: string|null; location?: string|null; crew?: string|null; epicLevel: number; isSpecial: boolean }

export default function AdminApp() {
  const [list, setList] = useState<Party[]>([]);
  const [editing, setEditing] = useState<Partial<Party> | null>(null);

  async function load() {
    const r = await fetch('/api/parties'); setList(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const method = editing.id ? 'PATCH' : 'POST';
    const url = editing.id ? `/api/parties/${editing.id}` : '/api/parties';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setEditing(null); load();
  }

  async function del(id: number) {
    if (!confirm('Xoá?')) return;
    await fetch(`/api/parties/${id}`, { method: 'DELETE' });
    load();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.href = '/admin/login';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-ink">
      <header className="flex justify-between items-center mb-4">
        <h1 className="font-display text-3xl text-neon-pink">ADMIN</h1>
        <div className="flex gap-2">
          <button onClick={() => setEditing({ date: new Date().toISOString().slice(0,10), type: 'bia', title: '', epicLevel: 3, isSpecial: false })} className="px-3 py-1 bg-neon-yellow text-bg-deep rounded">+ New</button>
          <button onClick={logout} className="px-3 py-1 border border-ink/30 rounded">Logout</button>
        </div>
      </header>

      <table className="w-full text-sm">
        <thead><tr className="text-left border-b border-ink/20"><th>Date</th><th>Type</th><th>Title</th><th>Crew</th><th></th></tr></thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id} className="border-b border-ink/10">
              <td>{p.date}</td><td>{p.type}</td><td>{p.title}</td><td>{p.crew ?? ''}</td>
              <td className="text-right">
                <button onClick={() => setEditing(p)} className="text-neon-cyan mr-2">edit</button>
                <button onClick={() => del(p.id)} className="text-red-400">del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <form onSubmit={save} className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bg-deep border border-ink/20 rounded-xl max-w-md w-full p-4 space-y-2 my-8">
            <h2 className="font-display text-xl">{editing.id ? 'Edit' : 'New'}</h2>
            <input type="date" required value={editing.date ?? ''} onChange={e => setEditing({...editing, date: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <select value={editing.type ?? 'bia'} onChange={e => setEditing({...editing, type: e.target.value})} className="w-full p-2 bg-black/40 rounded">
              <option value="bia">bia</option><option value="ruou">ruou</option><option value="bia_ruou">bia+ruou</option><option value="coca">coca</option><option value="voi">voi</option><option value="other">other</option>
            </select>
            <input required placeholder="Title" value={editing.title ?? ''} onChange={e => setEditing({...editing, title: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <input placeholder="Location" value={editing.location ?? ''} onChange={e => setEditing({...editing, location: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <input placeholder="Crew" value={editing.crew ?? ''} onChange={e => setEditing({...editing, crew: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <label className="flex items-center gap-2"><input type="range" min={1} max={5} value={editing.epicLevel ?? 3} onChange={e => setEditing({...editing, epicLevel: Number(e.target.value)})} /> Epic {editing.epicLevel ?? 3}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.isSpecial} onChange={e => setEditing({...editing, isSpecial: e.target.checked})} /> Đặc biệt</label>
            {editing.id && <PhotoUploader partyId={editing.id} />}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="px-3 py-1 border border-ink/30 rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-neon-pink text-bg-deep rounded">Save</button>
            </div>
            {!editing.id && <p className="text-xs text-ink/50">Photos can be added after saving.</p>}
          </div>
        </form>
      )}
    </div>
  );
}

function PhotoUploader({ partyId }: { partyId: number }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true); setMsg(null);
    try {
      for (const file of Array.from(files)) {
        const sig = await fetch(`/api/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        }).then(r => r.json());
        const put = await fetch(sig.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!put.ok) throw new Error('R2 upload failed');
        const attach = await fetch(`/api/parties/${partyId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ r2Key: sig.key }),
        });
        if (!attach.ok) throw new Error('attach failed');
      }
      setMsg(`✓ Uploaded ${files.length} file(s)`);
    } catch (e: any) {
      setMsg(`✗ ${e.message ?? 'error'}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-ink/10 pt-2 mt-2">
      <label className="text-xs text-ink/60 block mb-1">Photos</label>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={uploading}
        onChange={(e) => onFiles(e.target.files)}
        className="text-xs"
      />
      {uploading && <p className="text-xs text-neon-cyan mt-1">Uploading...</p>}
      {msg && <p className="text-xs text-ink/70 mt-1">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: `src/pages/admin/index.astro`**

```astro
---
import Base from '~/layouts/Base.astro';
import AdminApp from '~/components/AdminApp.tsx';
---
<Base title="Admin">
  <AdminApp client:only="react" />
</Base>
```

- [ ] **Step 4: Smoke test**

In browser: visit `/admin`. Should redirect to `/admin/login`. Enter password (from `.dev.vars`). On success → redirected to `/admin` showing the table. Try Add / Edit / Delete.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ src/components/AdminApp.tsx
git commit -m "feat(admin): login page + admin CRUD UI (React island)"
```

---

# PHASE 8 — Deploy

## Task 24: Deploy to Cloudflare Pages

> API integration testing intentionally deferred for v1: auth logic is 100% unit-tested ([tests/auth.test.ts]) and the API handlers are thin glue (validate → DB call). Full E2E testing requires running `wrangler pages dev` in-process which adds disproportionate setup for this scope. Add later if regressions appear.


- [ ] **Step 1: Push to GitHub**

```bash
gh repo create party-timeline --private --source=. --remote=origin --push
```

(or manually: create repo on github.com, then `git remote add origin <url> && git push -u origin main`)

- [ ] **Step 2: Connect Cloudflare Pages to GitHub repo**

Cloudflare dashboard → Pages → "Create" → "Connect to Git" → select repo. Build config:
- Framework preset: **Astro**
- Build command: `pnpm install && pnpm build`
- Output directory: `dist`
- Root directory: `/`

- [ ] **Step 3: Set production environment variables/bindings in Pages dashboard**

Settings → Environment variables (Production):
- `ADMIN_PASSWORD` — strong password (Encrypted)
- `JWT_SECRET` — 32-byte random hex (Encrypted)
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET` (Encrypted)
- `PUBLIC_R2_URL` — public R2 bucket URL

Settings → Functions → Bindings:
- D1 Database: binding `DB` → `party-db`
- R2 Bucket: binding `PHOTOS` → `party-photos`

- [ ] **Step 4: Apply prod migrations + seed**

```bash
pnpm db:migrate:prod
pnpm db:seed:prod
```

- [ ] **Step 5: Trigger first deploy** (push a commit or use dashboard "Retry deployment")

```bash
git commit --allow-empty -m "chore: trigger deploy"
git push
```

- [ ] **Step 6: Verify live**

Visit `https://<project>.pages.dev`:
- Public page loads, timeline shows seeded data.
- Visit `/admin` → redirect to login → enter prod `ADMIN_PASSWORD` → admin loads → add a new party → see it on public page within 60s (or immediately after cache busts).

- [ ] **Step 7: Commit deployment notes** (optional)

```bash
echo "Deployed: $(date) — https://<project>.pages.dev" >> docs/deploy.log
git add docs/deploy.log
git commit -m "docs: log first prod deploy"
```

---

## Done Criteria (matches spec §18)

- [ ] Public page renders the timeline matching `template.png` 1:1 on 1440×900 desktop.
- [ ] Logged-in admin can create/edit/delete a party + upload a photo; appears publicly within 60s.
- [ ] Mobile (iPhone 12 sim) loads <2s on 4G, scrolls smoothly.
- [ ] All ~70 `party_note.txt` entries appear in the timeline.
- [ ] Lighthouse Performance ≥90, Accessibility ≥95.

---

## Notes for the executing agent

- This plan is sized for ~1–2 days of focused work for someone familiar with Astro + Cloudflare.
- Visual fidelity to `template.png` is the highest priority — at Task 13 the executor should screenshot and compare; iterate on colors/spacing in `tailwind.config.ts` and components until matching before proceeding.
- The neon glow, font weights, and exact icon shapes will likely need tuning to truly match the template — budget time for that polish loop.
- All write API routes are auth-gated by middleware (Task 21); do not rely on per-route auth checks.
- R2 presigned URLs require S3-compatible credentials (not the default D1/R2 bindings) — created separately in dashboard.

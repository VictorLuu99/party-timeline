# Lịch Nhậu Huyền Thoại

Personal portfolio website rendering Victor Luu's drinking schedule as a neon synthwave timeline poster.

## 🔗 Links

| | URL |
|---|---|
| **Public site** | https://party-timeline.pages.dev |
| **Admin panel** | https://party-timeline.pages.dev/admin/login |
| **OG preview image** | https://party-timeline.pages.dev/og.jpg |

## ✨ Features

- Neon synthwave timeline poster matching the design target 1:1
- 89+ party entries seeded from `party_note.txt`
- Sticky stats strip (total / % rượu / top crew / current month)
- Filter pills (type + crew dropdown) with live entry dimming
- 365-day GitHub-style heatmap (epic-level intensity buckets)
- 12-month bar chart + crew ranking
- Entry click → modal with title, crew, location, photo carousel
- Mobile responsive (zigzag → single column under 768px)
- Framer Motion animations (TIMELINE letter stagger, parallax sparkles, scroll-reveal)
- Password-gated admin with full CRUD + photo upload
- Open Graph + Twitter Card preview metadata

## 🛠 Tech stack

| Layer | Choice |
|---|---|
| Framework | Astro 5 (server output) |
| Interactive islands | React 18 |
| Styling | Tailwind CSS v3 (neon palette + custom shadow utilities) |
| Animation | Framer Motion |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Photo storage | Cloudflare R2 (S3-compatible presigned uploads) |
| Hosting | Cloudflare Pages |
| Auth | JWT (HS256, Web Crypto) in HttpOnly cookie |
| Tests | Vitest (21 tests across parser / stats / auth) |

## 🚀 Local development

```bash
pnpm install
pnpm db:migrate:local         # apply schema to local D1
pnpm db:seed:local             # seed 89 entries from party_note.txt
pnpm dev                       # http://localhost:4321
```

`.dev.vars` (gitignored) must contain:

```
ADMIN_PASSWORD=letmein-change-this
JWT_SECRET=local-dev-secret-32-bytes-min-aaaaaaaaaa
R2_ACCESS_KEY_ID=local-placeholder
R2_SECRET_ACCESS_KEY=local-placeholder
R2_ACCOUNT_ID=fa2d121bef68dce48efd907dcc068dfb
R2_BUCKET=party-photos
PUBLIC_R2_URL=https://pub-placeholder.r2.dev
```

## 📦 Deployment

```bash
pnpm build
pnpm exec wrangler pages deploy ./dist --project-name party-timeline --branch main
```

Production secrets are managed via `wrangler pages secret put <NAME> --project-name party-timeline`. D1 + R2 bindings are declared in `wrangler.toml`.

Apply prod migration + seed:

```bash
pnpm db:migrate:prod
pnpm db:seed:prod
```

## 📁 Project structure

```
src/
├── layouts/Base.astro          # HTML shell + OG meta + fonts + sparkles
├── lib/
│   ├── db/                      # Drizzle schema, client, queries
│   ├── parser.ts                # party_note.txt → seed rows
│   ├── stats.ts                 # computeStats (totals, byCrew, heatmap)
│   ├── types.ts                 # PartyType + TYPE_META + MONTH_COLORS
│   ├── validate.ts              # API input whitelist + type guard
│   ├── auth.ts                  # JWT sign/verify + cookie helpers
│   ├── r2.ts                    # presigned R2 PUT URLs
│   └── cache.ts                 # edge cache invalidation
├── components/
│   ├── Hero.astro + HeroAnimated.tsx
│   ├── ParallaxSparkles.tsx
│   ├── ScrollReveal.tsx
│   ├── EntryModal.tsx
│   ├── AdminApp.tsx
│   ├── timeline/                # spine, year marker, date pill, month card, entry row
│   ├── StatsStrip.tsx + FilterPills.tsx
│   └── Heatmap.tsx + DeepStats.tsx
├── pages/
│   ├── index.astro              # public SSR timeline
│   ├── admin/                   # login + admin CRUD
│   └── api/                     # login, logout, parties, upload-url, photos
└── middleware.ts                # auth gate

db/migrations/0001_init.sql
scripts/seed-from-notes.ts
tests/                            # parser, stats, auth unit tests
docs/superpowers/
├── specs/2026-05-22-party-timeline-design.md
└── plans/2026-05-22-party-timeline.md
```

## 📜 License

Personal project. Not licensed for redistribution.

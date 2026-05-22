# Lịch Nhậu Huyền Thoại — Design Spec

**Date:** 2026-05-22
**Author:** victorluu99@gmail.com
**Status:** Draft (pending implementation plan)

## 1. Overview

A public, single-page web portfolio that visualizes the owner's personal party/drinking schedule (lịch nhậu) as a neon-synthwave infographic poster. Visual fidelity to `template.png` is the top priority — colors, fonts, icons, and background must match 100%. Data is editable via a password-protected admin UI backed by Cloudflare D1 + R2 (no static rebuild required to add entries).

## 2. Goals

1. **Visual fidelity:** match `template.png` 1:1 — neon TIMELINE header, cursive "Lịch Nhậu Huyền Thoại" tagline, dark purple cosmic background with sparkles, beer/wine glass icons, central vertical timeline spine, zigzag left/right month cards, color-coded entries, footer legend + tip block.
2. **Dynamic data:** add/edit/delete parties without redeploying. Data flows from D1 → API → page.
3. **Always-on extras (long-scroll):** sticky stats strip, filter pills, GitHub-style heatmap calendar, and deeper stats charts below the timeline.
4. **Mobile-friendly:** below 768px, the zigzag layout collapses to a single column (cards stack under the spine).
5. **Edge-fast:** Cloudflare Pages + D1 + R2; public timeline JSON cached at edge.
6. **Simple admin:** single-password login, minimal form UI (not styled with neon — utility-focused).

## 3. Non-goals (YAGNI)

- Multi-user accounts, RBAC, comments, likes, social features.
- Public submission / "suggest a party" flow.
- Pixel-perfect mobile poster (we collapse to 1 column instead).
- Map view, geo lookups, weather overlay, etc.
- Email/notification systems.
- Internationalization (Vietnamese only).

## 4. Audience

Public portfolio. Anyone with the URL can view. Owner is the only writer.

## 5. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Astro 5 (multi-page, static-first) |
| Interactive parts | React islands (filter, admin, heatmap, animations, modals) |
| Styling | Tailwind CSS + custom CSS for neon glow / gradients |
| Animation | Framer Motion (`motion`) + GSAP (scroll-triggered for hero) |
| Fonts | `Bebas Neue` (TIMELINE), `Pacifico` (cursive tagline), `Inter` (body) — Google Fonts |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Photo storage | Cloudflare R2 (S3-compatible) |
| Hosting | Cloudflare Pages (auto-deploy from GitHub `main`) |
| Auth | Single password env var → JWT in HTTP-only cookie |
| Local dev | `wrangler pages dev` with local D1/R2 emulator |

## 6. Data Model

D1 (SQLite), two tables:

```sql
CREATE TABLE parties (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,            -- 'YYYY-MM-DD'
  type       TEXT NOT NULL,            -- 'bia' | 'ruou' | 'bia_ruou' | 'coca' | 'voi' | 'other'
  title      TEXT NOT NULL,            -- e.g. 'Đám cưới Trang XOX'
  description TEXT,                    -- longer detail (optional)
  location   TEXT,                     -- 'Hà Nội' | 'Lào Cai' | 'quê' | venue name...
  crew       TEXT,                     -- 'Chính vì điều đó' | 'Lab3' | 'Sotatek' | ...
  epic_level INTEGER DEFAULT 1,        -- 1..5
  is_special INTEGER DEFAULT 0,        -- 0/1 — show ★ ĐẶC BIỆT badge
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_parties_date ON parties(date DESC);
CREATE INDEX idx_parties_crew ON parties(crew);

CREATE TABLE party_photos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id  INTEGER NOT NULL,
  r2_key    TEXT NOT NULL,             -- 'photos/2026/05/abc123.jpg'
  caption   TEXT,
  width     INTEGER,
  height    INTEGER,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);
```

**R2 structure:** `photos/{year}/{month}/{uuid}.{ext}`. On upload, also generate a thumbnail `photos/{year}/{month}/{uuid}_thumb.webp` (300px wide) for grid views.

**Migration / seed:** a one-off Node script parses `party_note.txt`, regex-extracts `date / type / description / crew / location`, and bulk-inserts ~70 entries via Drizzle. The script is idempotent (UPSERT on `date + title`).

## 7. Architecture

```
[Browser]
   │
   ├─ GET /                   → Astro static-rendered shell + initial party JSON (built at deploy OR fetched at edge from cache)
   ├─ GET /api/parties        → Cloudflare Pages Function → D1 (cached 60s at edge)
   ├─ GET /admin              → Astro page, React island form
   ├─ POST /api/login         → set HTTP-only JWT cookie
   ├─ POST/PATCH/DELETE /api/parties/:id  → auth-gated, D1 writes, purge edge cache
   ├─ POST /api/upload-url    → auth-gated, returns R2 signed PUT URL
   └─ photos served via R2 public bucket (or signed URLs if private)
```

- **Rendering mode:** Astro page is **server-rendered on Cloudflare Pages Functions** (not static at build time) so newly added parties appear without rebuild. The page handler calls D1 directly, then ships HTML + embedded JSON for hydration. ("Static-first" in §5 refers to Astro's default zero-JS posture for non-interactive parts — interactive islands hydrate selectively; the *page itself* is SSR'd at the edge.)
- Subsequent filter/sort happen client-side in the React island over the already-loaded data (no extra fetch).
- The `/api/parties` JSON endpoint is provided as a parallel read path (for the admin's preview/refresh use cases and potential future consumers); it is edge-cached 60s.
- Cache invalidation: writes call `caches.default.delete()` for both the page URL and the API URL to bust the edge cache.

## 8. UI Sections (long-scroll, single page)

In order, top-to-bottom:

1. **Hero** — full-viewport. Sparkles parallax background, "TIMELINE" multicolor neon gradient header, cursive "Lịch Nhậu Huyền Thoại" tagline below, crossed beer-mug + wine-glass SVG icons flanking the title. Scroll-hint chevron at bottom.
2. **Sticky stats strip** — appears once user scrolls past hero. 3–4 mini-stat pills: total parties, % rượu, top crew, current month count.
3. **Filter pills** — sticky right below stats. Filter by type (All / Bia / Rượu / Đặc biệt), crew dropdown, year dropdown. Non-matching entries fade to opacity .25 + scale .98.
4. **Timeline (the poster)** — the centerpiece. Year markers (2026, 2025, …) as glowing pills on the central spine. Month cards alternate left/right; each card has a colored neon header (`THÁNG 5` pink, `THÁNG 4` orange, etc.) and a list of entries. Entry row: `▸ DD-MM [type] description` with type tag color-coded.
5. **Heatmap calendar** — GitHub-style year grid. Cell intensity = sum of `epic_level` for that day, bucketed into 5 levels: `0` (no party, base dark cell), `1–3` (low), `4–6` (medium), `7–10` (high), `11+` (max glow). Hover → tooltip preview (date + entry titles).
6. **Deep stats** — bar chart (count by month), donut (% by type), crew ranking, top locations.
7. **Footer** — legend (🍺 BIA / 🍷 RƯỢU / ★ ĐẶC BIỆT) and tip: *"Uống có trách nhiệm. Nhậu nhiệt tình – sống hết mình!"*

## 9. Visual Design Spec (must match template.png)

**Colors** (extract by eyedrop from template):

- Background gradient: radial from `#2a0a4a` (top-center) to `#0a0518` (bottom)
- Neon palette:
  - Pink: `#ff3b8a`
  - Orange: `#ff8a3d`
  - Yellow: `#ffeb3b`
  - Cyan: `#00e5ff`
  - Green (accent): `#7cff5a`
- Text on dark: `#f8f4ff`
- Card fill (semi-transparent): `rgba(10, 5, 24, 0.55)` with `backdrop-filter: blur(8px)`
- Neon border/glow: `0 0 12px <color>, 0 0 30px <color>` on hover/active

**Typography:**

- `Bebas Neue` 700, letter-spacing `0.15em` — for "TIMELINE" header (gradient + glow)
- `Pacifico` 400 — for "Lịch Nhậu Huyền Thoại" tagline (orange glow)
- `Inter` 400/600 — body, entry rows, stats
- Year markers: `Bebas Neue`, 80px, white with orange glow
- Month headers (THÁNG N): `Bebas Neue`, 28px, color rotates per month

**Per-month header color rotation** (sample from template; implementer to verify against `template.png` and adjust per actual month present):

- T12, T6: orange `#ff8a3d`
- T11, T5: pink `#ff3b8a`
- T10, T4: cyan `#00e5ff`
- T9, T3: yellow `#ffeb3b`
- T8, T2: green `#7cff5a`
- T7, T1: pink `#ff3b8a` (rotates back; OK to share with T11/T5 — colors recycle)

**Type display mapping** (resolves §8 filter / §9 visuals against §6 enum):

| `type` value | Badge label | Color | Icon | Filter group |
|---|---|---|---|---|
| `bia` | `BIA` | yellow `#ffeb3b` | 🍺 mug SVG | Bia |
| `ruou` | `RƯỢU` | pink `#ff3b8a` | 🍷 glass SVG | Rượu |
| `bia_ruou` | `BIA+RƯỢU` | gradient yellow→pink | both SVGs | shown in both Bia + Rượu filters |
| `coca` | `COCA` | cyan `#00e5ff` | 🥤 | shown only in "All" |
| `voi` | `VỐI` | green `#7cff5a` | 🍵 | shown only in "All" |
| `other` | `KHÁC` | white | • | shown only in "All" |

The `Đặc biệt` filter pill matches `is_special = 1` regardless of type.

**Icons:** custom SVGs for crossed beer mugs, crossed wine glasses, sparkle stars. Place inline in hero + footer. No emoji fonts (inconsistent across OS).

**Components:**

- `<TimelineSpine />` — central vertical neon line, full-height with glow
- `<YearMarker year="2026" />` — round pill on spine
- `<DatePill day="05" month="MAY" />` — small dark circle with neon ring, connects card to spine
- `<MonthCard side="left|right" color="pink" title="THÁNG 5">{entries}</MonthCard>`
- `<EntryRow date="19-5" type="bia" text="..." special={false} />`
- `<TypeBadge type="bia" />` — colored bracketed tag
- `<Sparkles count={50} />` — animated background SVG layer

## 10. Animations

- Hero: TIMELINE letters fade-in stagger (Framer Motion); cursive tagline draws in with stroke animation; sparkles slow parallax with mouse-move; icons gentle float (CSS keyframe).
- Month cards: `whileInView` slide-in from their side (left/right) + opacity 0→1, with a 0.05s stagger between cards.
- Date pills: scale 0→1 + glow boost when entering viewport.
- Entries: stagger fade-in (50ms each) inside their card.
- Filter: entries that don't match → `opacity .25, scale .98, filter: grayscale(.6)` with 200ms ease.
- Hover (desktop): entry row → translateY(-2px) + glow boost.
- Click entry → modal opens (Framer `AnimatePresence`) with full title/description + photo carousel.
- Reduce motion: respect `prefers-reduced-motion` (skip parallax + stagger, instant fades only).

## 11. Mobile (<768px)

- TimelineSpine hidden.
- All MonthCards collapse to a single full-width column.
- Hero TIMELINE scales down to ~56px font.
- Sticky stats strip + filter become a single sticky bar with horizontal scroll.
- Heatmap calendar overflow-x scroll.
- Blur effects reduced (`backdrop-filter: blur(4px)`) for perf.

## 12. Admin

Route: `/admin`. Password gate first; once authed, shows a simple table of all parties + Add/Edit/Delete actions. Admin UI uses a clean utility theme (Tailwind defaults, no neon) — visually separate from public site.

Form fields:

- Date (date picker)
- Type (select: bia/ruou/bia_ruou/coca/voi/other)
- Title (text)
- Description (textarea)
- Location (text, free-form)
- Crew (text, free-form — autocomplete from existing values)
- Epic level (1–5 slider)
- Is special (checkbox)
- Photos (drag-drop uploader → POST `/api/upload-url` to get a signed R2 PUT URL → PUT file directly to R2 → save `r2_key` via PATCH)

## 13. Auth

- Single password stored in Cloudflare secret `ADMIN_PASSWORD`.
- `POST /api/login` compares (constant-time) → on match, signs a JWT (HS256, secret `JWT_SECRET`, 30-day expiry) → sets HTTP-only, Secure, SameSite=Lax cookie `pt_auth`.
- All write endpoints (`POST/PATCH/DELETE /api/parties`, `POST /api/upload-url`) verify the cookie's JWT signature + expiry.
- `POST /api/logout` clears the cookie.
- No CSRF token needed because cookie is SameSite=Lax + admin is single-origin.
- **Rate limiting:** deferred for v1 (single user, single password — surface area is small). If brute-force attempts appear in logs, add Cloudflare rate-limiting rule on `/api/login` post-launch.

## 14. Deployment

- GitHub repo connected to Cloudflare Pages (auto-deploy on push to `main`).
- `wrangler.toml` declares D1 binding (`DB`), R2 binding (`PHOTOS`), and secrets (`ADMIN_PASSWORD`, `JWT_SECRET`).
- D1 migrations: `wrangler d1 migrations apply` runs in CI before deploy.
- R2 bucket: public read for `photos/**`, write only via signed URLs.
- Edge cache headers on `/api/parties`: `Cache-Control: public, max-age=60, s-maxage=60`.
- Custom domain optional (user adds later via CF DNS).

## 15. Seed Data Migration

One-off script `scripts/seed-from-notes.ts`:

1. Reads `party_note.txt`.
2. For each line, regex-extracts: `date`, `type` (from `(bia)`/`(rượu)`/…), `description`.
3. Heuristic-extracts `crew` (matches against known crew tokens like `Lab3`, `Sotatek`, `Chính vì điều đó`, `FC Coder`, `Defikit`, `XOX`) and `location` (matches `Lào Cai`, `quê`, `HY`, `Phúc Yên`, etc.). If no token matches, the field is left `NULL` — owner can fill in later via admin.
4. Sets `epic_level = 3` default, bumps to 5 for entries containing keywords `đám cưới` / `tất niên` / `YEP` / `kickoff` / `sinh nhật`.
5. Sets `is_special = 1` for the same keyword matches.
6. Bulk inserts via Drizzle in a single transaction.

User reviews seeded data in admin UI and tweaks as needed.

## 16. Open Questions

- **Domain name?** Not yet chosen. Default to `<project>.pages.dev` until decided.
- **Photo backfill?** Existing 70+ entries have no photos. Owner can add later as desired; no requirement to backfill.
- **Analytics?** Out of scope for v1. Cloudflare Web Analytics can be added in 1 line later.

## 17. Risks

- **Edge cache vs freshness:** 60s TTL means newly added parties take up to 1 minute to appear publicly. Mitigation: writes call `caches.default.delete()` for the API URL.
- **R2 egress on large galleries:** thumbnails capped at 300px wide; full-size only loaded on modal open.
- **Font loading flash:** preload Bebas Neue + Pacifico with `<link rel="preload" as="font" crossorigin>`; fall back to system fonts during swap.
- **Animation overload on low-end devices:** respect `prefers-reduced-motion`; throttle parallax to `requestAnimationFrame`.

## 18. Success Criteria

1. Public homepage renders the timeline matching `template.png` at 1:1 visual fidelity on a 1440px-wide desktop.
2. Owner can log in to `/admin`, create a new party with a photo, and see it appear on the public page within 60 seconds.
3. Mobile (iPhone 12-class) loads under 2s on 4G, scrolls smoothly at 60fps.
4. All 70+ existing entries from `party_note.txt` are seeded into D1 and render correctly.
5. Lighthouse: Performance ≥ 90, Accessibility ≥ 95.

## 19. Out of Scope for v1 (future ideas)

- Map view of locations
- Year-in-review auto-generated story
- Export to PDF/print poster
- Public read-only sharing of individual entries
- Streak/badge gamification

# Trouv Content — internal admin

Private editorial workflow for **Trouv Chauffeurs**: ideas → platforms → OpenAI generation → review → approve → Buffer queue. **Not** public-facing.

## Supabase schema (source of truth)

Use **only** these tables (already created in your project):

- `public.content_posts` — `content_post_status` enum: `idea` | `draft` | `approved` | `scheduled` | `posted` | `failed`. Columns: `platforms text[]`, topic/audience/`content_type`, and **at minimum** `linkedin_post`, `instagram_caption`, `x_post` for persisted AI output (see `src/lib/content-posts/generation-update.ts` — expand the allowlist when you add hooks/CTAs/hashtags columns). Optional read fields mapped in `db-map` when present.
- `public.content_reviews` — still keyed by `content_request_id` (post UUID) unless you rename the FK column; `generated_content_id` should be nullable
- `public.publish_logs` — same FK naming as above; `generated_content_id` nullable
- `public.app_settings`

Add `platforms text[]` and required copy columns on `content_posts` if missing. The app does **not** use `generated_contents`.

### One-time data migration (legacy statuses)

If rows still use old enum values, run in Supabase SQL (adjust to your data):

```sql
UPDATE public.content_posts SET status = 'draft' WHERE status::text IN ('generated','reviewed');
UPDATE public.content_posts SET status = 'scheduled' WHERE status::text = 'queued';
UPDATE public.content_posts SET status = 'posted' WHERE status::text = 'published';
UPDATE public.content_posts SET status = 'idea' WHERE status::text = 'draft' AND coalesce(trim(linkedin_post), '') = '' AND coalesce(trim(instagram_caption), '') = '' AND coalesce(trim(x_post), '') = '';
```

After this, brief-only rows are `idea`, copy pipeline rows are `draft`, etc. All Supabase `.in()` queries now use only valid enum values — legacy values are **not** included in query filters (Postgres rejects non-existent enum literals in comparisons). The `parseDbContentPostStatus` function still maps legacy values defensively if they appear in `select("*")` results.

## Setup

```bash
cd trouv-content
cp .env.example .env.local
# fill all variables
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in at `/login`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anon key (optional reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — all privileged DB access |
| `OPENAI_API_KEY` | Generation + review |
| `OPENAI_DEFAULT_MODEL` | Optional model id (default `gpt-4o-mini`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Single admin login |
| `ADMIN_JWT_SECRET` | Min 16 chars — signs `trouv_session` cookie |
| `BUFFER_ACCESS_TOKEN` | Buffer GraphQL |
| `BUFFER_*_PROFILE_ID` | Channel IDs for queueing (env only; not used from DB for publish) |

Secrets never go to the client.

### Vercel

In the project **Settings → Environment Variables**, add **every** variable from `.env.example` for Production (and Preview if you use it). If `ADMIN_JWT_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` is missing, API routes and signed-in pages will fail after login.

Opening `/` or `/login` without a session cookie no longer requires `ADMIN_JWT_SECRET` in `proxy.ts` (so the login page can load); signing in still requires a valid `ADMIN_JWT_SECRET` (≥16 characters).

## Final folder structure

```
src/
├── app/
│   ├── (admin)/          # Protected shell + pages
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── ideas/...
│   │   ├── drafts/...
│   │   ├── approved/page.tsx
│   │   ├── posted/page.tsx
│   │   ├── logs/page.tsx
│   │   └── settings/page.tsx
│   ├── login/page.tsx
│   ├── api/
│   │   ├── auth/login|logout/route.ts
│   │   ├── ideas/...
│   │   ├── generate/route.ts
│   │   ├── review/route.ts
│   │   ├── buffer/post/route.ts
│   │   └── settings/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
├── lib/
│   ├── auth.ts
│   ├── auth/constants.ts
│   ├── auth/password.ts
│   ├── buffer.ts
│   ├── openai.ts
│   ├── validations.ts
│   ├── types.ts
│   ├── db-map.ts
│   ├── queries.ts
│   ├── content-posts/   # status enum, DB filters, generation write allowlist
│   ├── settings.ts
│   ├── request-helpers.ts
│   └── supabase/server.ts, client.ts
└── proxy.ts
```

## Routes

| Path | Notes |
|------|--------|
| `/login` | Public |
| `/dashboard` | Stats + recent `content_posts` |
| `/ideas` | Brief stage: `idea` or legacy `draft` without copy |
| `/ideas/new` | Create post (`status = idea`) |
| `/ideas/[id]` | Edit/delete while brief stage only |
| `/drafts` | `draft` or `failed` with generated copy |
| `/drafts/[id]` | Copy + review / approve / reject / regenerate |
| `/approved` | `status = approved` → per-platform Buffer |
| `/posted` | Placeholder |
| `/logs` | `publish_logs` + filters |
| `/settings` | `app_settings` id=1 |

## API handlers

- `POST /api/auth/login` — JSON `{ email, password }`
- `POST /api/auth/logout`
- `POST /api/ideas` — create `content_posts` row + platforms (`content_type` in body)
- `PATCH /api/ideas/[id]` — edit while brief stage (`idea` / legacy empty `draft`)
- `DELETE /api/ideas/[id]` — delete while brief stage
- `POST /api/generate` — OpenAI → updates allowlisted copy columns + `status = draft`
- `POST /api/review` — `content_reviews` insert; **does not** change post status (stays `draft`)
- `PATCH /api/ideas/[id]/approve` — `draft` + latest review verdict `approve` → `approved`
- `PATCH /api/ideas/[id]/reject` — `draft` + at least one review (no status change)
- `POST /api/buffer/post` — `publish_logs`; success → `scheduled` (from `approved`; idempotent if already `scheduled`/`posted`)
- `GET` / `PATCH /api/settings`

## Fully working

- JWT session cookie `trouv_session` (24h), `proxy.ts` protection
- Ideas CRUD (`content_posts.platforms` array)
- OpenAI generation → writes copy onto `content_posts`
- OpenAI review → `content_reviews`
- Approve / reject lifecycle
- Buffer queue + `publish_logs` every attempt
- Dashboard counts, logs filters, settings patch

## Placeholder / later

- Posted confirmation (`/posted`)
- Retry UI for failed Buffer runs
- Images, webhooks

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |

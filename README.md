# Trouv Content — internal admin

Private editorial workflow for **Trouv Chauffeurs**: ideas → platforms → OpenAI generation → review → approve → Buffer queue. **Not** public-facing.

## Supabase schema (source of truth)

Use **only** these tables (already created in your project):

- `public.content_requests`
- `public.content_request_platforms`
- `public.generated_contents`
- `public.content_reviews`
- `public.publish_logs`
- `public.app_settings`

This app does **not** use `content_posts` or other legacy tables.

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

Opening `/` or `/login` without a session cookie no longer requires `ADMIN_JWT_SECRET` in middleware (so the login page can load); signing in still requires a valid `ADMIN_JWT_SECRET` (≥16 characters).

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
│   ├── settings.ts
│   ├── request-helpers.ts
│   └── supabase/server.ts, client.ts
└── middleware.ts
```

## Routes

| Path | Notes |
|------|--------|
| `/login` | Public |
| `/dashboard` | Stats + recent `content_requests` |
| `/ideas` | `status = draft` |
| `/ideas/new` | Create idea + platforms |
| `/ideas/[id]` | Edit/delete/generate while draft |
| `/drafts` | `status ∈ (generated, reviewed)` |
| `/drafts/[id]` | Copy + review / approve / reject / regenerate |
| `/approved` | `status = approved` → per-platform Buffer |
| `/posted` | Placeholder |
| `/logs` | `publish_logs` + filters |
| `/settings` | `app_settings` id=1 |

## API handlers

- `POST /api/auth/login` — JSON `{ email, password }`
- `POST /api/auth/logout`
- `POST /api/ideas` — create request + platforms
- `PATCH /api/ideas/[id]` — edit while `draft` (replace platforms)
- `DELETE /api/ideas/[id]` — delete while `draft`
- `POST /api/generate` — `{ contentRequestId }` → new `generated_contents`, `status = generated`
- `POST /api/review` — `{ contentRequestId }` → `content_reviews`, `status = reviewed`
- `PATCH /api/ideas/[id]/approve` — requires `reviewed` + latest verdict `approve`
- `PATCH /api/ideas/[id]/reject` — back to `generated`
- `POST /api/buffer/post` — `{ platform, text, contentRequestId }` → `publish_logs`, `status = queued` on success
- `GET` / `PATCH /api/settings`

## Fully working

- JWT session cookie `trouv_session` (24h), middleware protection
- Ideas CRUD + platform rows
- OpenAI generation → `generated_contents` (previous rows deactivated)
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

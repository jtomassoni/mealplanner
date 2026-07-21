# Mealplan

Private household meal-planning app for shared weekly schedules, recipes, grocery lists, pantry tracking, meal history with photos, optional OpenAI assistance, and optional Resend email notifications.

Built for two equal household members (for example JT and Mary) with a membership model that can grow to more users and households later.

## Architecture overview

- **Next.js App Router** (TypeScript, Server Components by default)
- **Supabase** for PostgreSQL, Auth, Storage, and Row Level Security
- **Tailwind CSS** + accessible UI primitives (Radix)
- **OpenAI** for explicit, user-triggered recipe and meal suggestions
- **Resend** for optional household emails
- **Vitest** unit tests and **Playwright** end-to-end smoke tests
- Deployable to **Vercel** without a custom Node server

Authorization boundary: active `household_members` membership (RLS + server-side rechecks). Email allowlist (`ALLOWED_EMAILS`) gates who may sign in. There is no public registration.

## Local prerequisites

- Node.js 20.12+ (20.x LTS recommended)
- pnpm 9+
- A Supabase project
- Optional: OpenAI API key, Resend API key

## Install

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` (never commit secrets).

## Environment variables

See `.env.example`. Required for a working login:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ALLOWED_EMAILS` (comma-separated)
- `APP_URL`

Service role key is only for setup/seed scripts:

- `SUPABASE_SERVICE_ROLE_KEY`

AI / email:

- `OPENAI_API_KEY`, `OPENAI_MODEL`, `ENABLE_AI_FEATURES`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ENABLE_EMAIL_NOTIFICATIONS`

## Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key into `.env.local`.
3. Copy the service role key into `.env.local` for local setup scripts only.
4. Apply migrations:

```bash
# With Supabase CLI linked to your project:
pnpm exec supabase db push

# Or run the SQL in the dashboard SQL editor:
# supabase/migrations/20260320000000_initial_schema.sql
```

5. Confirm the private `meal-photos` storage bucket exists (created by the migration).
6. In Authentication settings, disable public signup if available (the app also has no signup UI).

## Auth users

Create exactly the approved users in Supabase Auth (email + password). Example:

- `jt@example.com`
- `mary@example.com`

Those emails must appear in `ALLOWED_EMAILS`.

## Household initialization

```bash
pnpm setup:household
```

This idempotent script:

1. Finds auth users matching `ALLOWED_EMAILS`
2. Upserts `profiles`
3. Creates the default household (`DEFAULT_HOUSEHOLD_NAME`)
4. Adds both users as equal members
5. Creates default notification preference rows

## Optional development seed

```bash
pnpm seed:dev
```

Adds sample recipes and pantry staples for development only.

## OpenAI setup

1. Create an API key.
2. Set `OPENAI_API_KEY` and `OPENAI_MODEL` (default `gpt-4o-mini`).
3. Keep `ENABLE_AI_FEATURES=true` only when you want AI actions available.

AI runs only after explicit user actions (suggest meals, generate recipe, etc.). Ordinary browsing never calls OpenAI.

## Resend setup

1. Verify a sending domain and set `RESEND_FROM_EMAIL`.
2. Set `RESEND_API_KEY` and `ENABLE_EMAIL_NOTIFICATIONS=true`.
3. Users must also enable email in Settings → Notifications.

When Resend is not configured, notifications are logged in development-safe mode and the app continues normally.

## Local development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Primary authenticated route: `/app/week`.

## Testing

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
```

AI and Resend are mockable/disabled via env flags. Playwright covers login rejection and basic auth pages without requiring a live Supabase project for the unauthorized-email path.

## Production build

```bash
pnpm build
pnpm start
```

## Vercel deployment

1. Import the Git repository into Vercel.
2. Set all required environment variables in the Vercel project.
3. Deploy.
4. Run migrations against the production Supabase database.
5. Create production auth users and run `pnpm setup:household` locally pointed at production credentials (or a secure one-off admin context).
6. Confirm storage bucket policies and `APP_URL`.

## Troubleshooting

- **Unauthorized on login:** email missing from `ALLOWED_EMAILS`, or not normalized (whitespace/case).
- **Household setup needed:** run `pnpm setup:household` after creating auth users.
- **AI errors:** missing `OPENAI_API_KEY` or `ENABLE_AI_FEATURES=false`.
- **Photo upload fails:** confirm `meal-photos` bucket and RLS/storage policies.
- **Grocery regenerate warning:** edited generated items are preserved unless you confirm overwrite; manual items are kept.

## Security notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, or `RESEND_API_KEY` to the browser.
- Re-authorize inside server actions; do not rely only on middleware.
- RLS uses household membership, not email matching on each row.
- Public registration is not offered.

## Current limitations

- Single household in normal use (schema supports more).
- No invite flow; users are created manually in Supabase.
- Costco labels are heuristic suggestions, not live inventory/pricing.
- AI meal suggestions are returned as a preview payload; accept them into the planner intentionally.
- Offline support caches static assets only; grocery UI uses optimistic updates with sync status, not full conflict resolution.
- Placeholder PWA icons ship in `public/icons/`.

## Architecture decisions (ADR)

### Supabase for database, auth, and storage

**Decision:** Use Supabase Postgres + Auth + Storage.  
**Reasoning:** One vendor covers RLS, SSR cookie auth via `@supabase/ssr`, and private photo storage with household path prefixes.  
**Alternatives:** Custom Postgres + Auth.js + S3 — more moving parts for a two-person household app.  
**Date:** 2026-03-20

### Household membership authorization boundary

**Decision:** Authorize with `household_members` + `is_household_member()` RLS helper.  
**Reasoning:** Email allowlist gates login; membership gates data. Extends cleanly to multiple households.  
**Alternatives:** Email checks on every table — brittle and harder to evolve.  
**Date:** 2026-03-20

### Explicit AI triggers only

**Decision:** Never call OpenAI on page load or autosave.  
**Reasoning:** Cost control, predictability, and user trust.  
**Alternatives:** Background enrichment — rejected for v1.  
**Date:** 2026-03-20

### Immutable recipe versions

**Decision:** Edits create a new `recipe_versions` row and mark it current.  
**Reasoning:** Meal history can reference the exact version cooked.  
**Alternatives:** Overwrite in place — loses cooking history fidelity.  
**Date:** 2026-03-20

### Grocery regeneration preserves manual edits

**Decision:** Manual items are kept; user-edited generated items require confirm-overwrite.  
**Reasoning:** Shopping lists are edited in-store; silent destruction is unacceptable.  
**Alternatives:** Always replace — rejected.  
**Date:** 2026-03-20

### No external recipe scraping in v1

**Decision:** Household recipes + OpenAI structured generation only.  
**Reasoning:** Legal/ToS risk and brittle scraping; provider interface remains extensible.  
**Alternatives:** Scrape Google/recipe sites — rejected.  
**Date:** 2026-03-20

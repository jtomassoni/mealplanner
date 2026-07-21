# PROJECT_STATUS.md

## Project Summary

A private household meal-planning web app for JT and Mary. Shared weekly planning, household recipes (with versioning), grocery lists, pantry tracking, meal history with photos, optional AI assistance (OpenAI), and optional email notifications (Resend). Built with Next.js App Router, Supabase (Auth/DB/Storage), Tailwind, and designed mobile-first for two equal household members with a membership model that can scale later.

## Overall Progress

* Foundation — 95%
* Authentication — 95%
* Database — 95%
* Weekly Planner — 90%
* Recipes — 90%
* Grocery Lists — 90%
* Pantry — 85%
* AI — 80%
* Meal History — 85%
* Photos — 80%
* Notifications — 80%
* Testing — 75%
* Deployment — 70%

## Current Sprint

* **Current objective:** Greenfield implementation complete through verification; ready for Supabase credential wiring and household setup.
* **Files likely to change:** `.env.local` (user-provided secrets), optional UI polish, additional Playwright flows once live auth exists.
* **Remaining work:** Connect real Supabase project; create JT/Mary auth users; run migrations + `pnpm setup:household`; optional OpenAI/Resend keys; expand E2E against live data.
* **Known blockers:** External credentials required for live integrations (documented).

## Completed Features

* ✅ Next.js 15 App Router + TypeScript + Tailwind + pnpm
* ✅ Env validation (Zod) + `.env.example`
* ✅ shadcn-style UI primitives + mobile app shell (bottom nav / desktop sidebar)
* ✅ Supabase SSR clients, middleware session refresh, allowlist auth
* ✅ Login / logout / forgot + reset password (no signup)
* ✅ Local-only Skip login (dev) button gated by ENABLE_DEV_AUTH_BYPASS
* ✅ Brand-led login landing page (week planning pitch + sign-in)
* ✅ Full initial SQL migration (21 tables, RLS, storage bucket policies)
* ✅ Hand-written Database types
* ✅ Household setup script + optional dev seed
* ✅ Profiles & notification preferences settings
* ✅ Recipe CRUD with structured ingredients/steps and immutable versioning
* ✅ Weekly planner (days, meals, day profiles, approval, snack-prep flags)
* ✅ Deterministic grocery generation (scale, consolidate, pantry exclude, Costco heuristics)
* ✅ Mobile grocery shopping UI with optimistic checkoffs + sync status
* ✅ Pantry CRUD
* ✅ AI provider abstraction + recipe generation + meal suggestions (explicit triggers, Zod validation, `ai_generations` logging)
* ✅ Meal history logging + photo upload to private storage
* ✅ Optional Resend notifications with dedupe + dev log fallback
* ✅ PWA manifest, service worker (static assets only), placeholder icons
* ✅ README + ADRs
* ✅ Unit tests (39) + Playwright auth smoke (3)
* ✅ `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` passing locally

## Remaining Features

### Critical (MVP)

* [ ] Wire real Supabase project + apply migration in hosted DB
* [ ] Create JT/Mary auth users and run `pnpm setup:household`
* [ ] Production Vercel env + first deploy

### Important

* [ ] Richer AI suggestion accept/reject UI (preview currently logged + toast)
* [ ] Client-side image resize/thumbnail generation before upload
* [ ] Broader Playwright coverage against seeded Supabase (plan approve, grocery checkoff, recipe create)

### Nice to Have

* [ ] Offline grocery list reconnect polish
* [ ] Notification batching windows

### Future Version

* [ ] Multi-household UI
* [ ] Invite flows
* [ ] Live store pricing/inventory
* [ ] External recipe API providers

## Technical Debt

| Description | Reason | Estimated effort | Priority |
|---|---|---|---|
| AI meal suggestions accepted mainly via console/toast preview | Shipped explicit AI + preview without full accept-all UI | 2–4h | Medium |
| Nested Supabase relation selects avoided; manual joins used | Hand-written types lack Relationships metadata | 1–2h | Low |
| Vitest pinned to 2.x | Node 20.10 lacks APIs required by Vitest 4/rolldown | 0.5h after Node upgrade | Low |
| Placeholder PWA icons | Temporary solid-color PNGs | 0.5h | Low |

## Known Bugs

_(None known in local lint/typecheck/unit/e2e/build verification.)_

## Architecture Decisions

* **2026-03-20 — Supabase for DB/Auth/Storage:** One RLS-capable platform; see README ADR.
* **2026-03-20 — Household membership auth boundary:** Login allowlist + membership RLS.
* **2026-03-20 — Explicit AI only:** No OpenAI on page load/autosave.
* **2026-03-20 — Immutable recipe versions:** Preserve cooked version history.
* **2026-03-20 — Grocery regen preserves manuals / confirms edited overwrites.**
* **2026-03-20 — No recipe scraping in v1.**
* **2026-03-20 — Forest/sage visual system** (avoid cream+terracotta AI-default aesthetic).

## Database Status

* **Existing tables:** profiles, households, household_members, user_preferences, recipes, recipe_versions, recipe_ingredients, recipe_steps, weekly_plans, plan_days, planned_meals, meal_history, meal_history_participants, meal_photos, grocery_lists, grocery_items, grocery_item_sources, pantry_items, store_preferences, ai_generations, notification_events
* **Pending tables:** none for MVP
* **Existing migrations:** `supabase/migrations/20260320000000_initial_schema.sql`
* **Pending migrations:** none
* **RLS coverage:** enabled on all application tables + meal-photos storage policies

## Environment Variables

| Variable | Required | Implemented | Documented | Used | Tested |
|----------|----------|-------------|------------|------|--------|
| NEXT_PUBLIC_SUPABASE_URL | yes | yes | yes | yes | local placeholder |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | yes | yes | yes | yes | local placeholder |
| SUPABASE_SERVICE_ROLE_KEY | setup | yes | yes | setup scripts | needs real key |
| ALLOWED_EMAILS | yes | yes | yes | yes | unit + e2e |
| DEFAULT_HOUSEHOLD_NAME | yes | yes | yes | yes | setup script |
| OPENAI_API_KEY | AI | yes | yes | yes | disabled locally |
| OPENAI_MODEL | AI | yes | yes | yes | yes |
| RESEND_API_KEY | optional | yes | yes | yes | log fallback |
| RESEND_FROM_EMAIL | optional | yes | yes | yes | log fallback |
| APP_URL | yes | yes | yes | yes | yes |
| ENABLE_EMAIL_NOTIFICATIONS | yes | yes | yes | yes | yes |
| ENABLE_AI_FEATURES | yes | yes | yes | yes | yes |

## AI Usage

* **Features implemented:** generate recipe (with household precedence), suggest meals (modes), tracked in `ai_generations`
* **Prompt files:** inline in `src/actions/ai.ts` + system prompts in `src/lib/ai/provider.ts`
* **Models used:** configurable `OPENAI_MODEL` (default `gpt-4o-mini`)
* **Validation strategy:** Zod schemas in `src/lib/ai/schemas.ts` with one safe retry
* **Known limitations:** requires API key; suggestion accept UI is minimal; no scraping

## Testing Status

* **Unit coverage:** email allowlist, units, scaling, consolidate, Costco, AI schemas (39 tests)
* **Integration coverage:** none against live Supabase yet
* **Playwright coverage:** login page, no signup, unapproved email rejection, forgot-password page
* **Still needed:** approved login, weekly plan CRUD, approve + grocery generate, checkoff, recipe create, meal review (requires live/test Supabase)

## Deployment Checklist

* [ ] Environment variables on Vercel
* [ ] Storage bucket `meal-photos` (migration creates it)
* [ ] Auth users created; public signup disabled
* [ ] Database migrations applied
* [ ] `pnpm setup:household` against production
* [ ] Optional seed skipped in production
* [x] Next.js build succeeds
* [ ] `APP_URL` set to production URL

## Next Recommended Task

# Next Recommended Task

* **Goal:** Connect a real Supabase project and bring the app to a usable JT/Mary login state.
* **Files to inspect:** `.env.example`, `README.md`, `supabase/migrations/20260320000000_initial_schema.sql`, `scripts/setup-household.ts`
* **Suggested implementation order:**
  1. Create Supabase project; copy URL/anon/service keys into `.env.local`
  2. Apply migration (`supabase db push` or SQL editor)
  3. Create two Auth users matching `ALLOWED_EMAILS`
  4. Run `pnpm setup:household`
  5. Optionally `pnpm seed:dev`
  6. `pnpm dev` and verify week/recipes/grocery flows
  7. Add OpenAI/Resend keys if desired
  8. Deploy to Vercel with the same env vars
* **Potential pitfalls:** week_start must be Monday; service role only for setup; do not commit `.env.local`; RLS will block data without membership rows.
* **Dependencies:** Supabase project credentials; optional OpenAI/Resend.

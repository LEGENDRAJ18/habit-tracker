# AGENTS.md — HabitAI

Project-specific notes for agents working in this repo. Generic Next.js/React/Tailwind knowledge applies as normal — this file only covers things that aren't obvious from the code.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Auth + RLS) for data, Stripe for billing, Vercel for hosting/cron, Resend for email, web-push for push notifications, PostHog for analytics, Sentry for errors.

## Deploy

No separate deploy step. Vercel's git integration auto-deploys on push — `git push origin main` ships to production. Cron jobs are declared in `vercel.json`.

## Test account

`onboarding.test@habitai.com` / `HabitAI_Onboard_26!` — reset to a clean pre-onboarding state with `node scripts/reset-onboarding-test.cjs`.

The script writes via the anon-key client, so it can only reset `subscription_tier` back to `free` if it's *already* `free` — see "Billing/quota columns are server-write-only" below. If a session upgraded this account's tier to test paid features, downgrade it back to `free` via the Supabase dashboard (or a service-role script) before relying on the reset script again.

## Supabase quirks

- **Check column names before writing to an unfamiliar table.** The schema evolves via ad-hoc migrations (`supabase/migrations/`) and direct MCP `apply_migration` calls that don't always get a matching local file — don't assume a table's shape from memory or an old migration. Query `information_schema.columns` first.
- **`habits.verification_type` has no `'none'` value.** The CHECK constraint only allows `'counter' | 'duration' | 'photo' | 'reflection' | 'standard'` — use `'standard'` for "no special verification."
- **Billing/quota columns on `profiles` are server-write-only.** Two `BEFORE UPDATE` triggers (`protect_billing_columns`, `protect_quota_columns`) raise a hard exception if a non-`service_role` client touches them:
  - Billing: `subscription_tier`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_cancel_at_period_end`, `subscription_current_period_end`, `trial_end_date`
  - Quota: `streak_freezes`, `freeze_protected_date`, `last_freeze_used`, `skip_tokens_used`, `skip_week_start`, `ai_insight_count`, `ai_insight_date`, `goal_program_gen_count`, `goal_program_gen_date`

  Write these only from a server-side API route using the admin/service-role client. A browser-side write to any of these fields throws, it doesn't silently fail.
- A similar trigger (`enforce_commitment_contract_tier`) blocks setting `habits.is_public` or `habits.commitment_text` unless the user's `subscription_tier` is `plus`/`pro`.

## App shell vs. standalone pages

`src/components/layout/ConditionalAppShell.tsx` has one array, `APP_ROUTES`, that decides which routes get the shared chrome (`AppShell`: left sidebar + top nav with page title, global `BottomNav`, global `BackToDashboardButton`). Everything else renders with no wrapper at all — those pages hand-roll their own header.

- **In the shell today:** `/dashboard`, `/analytics`, `/calendar`, `/friends`, `/profile`, `/settings`, `/help`, `/organisations`, `/groups`, `/admin`.
- **Standalone (intentionally):** `/goal-program`, `/billing`, `/guide`, `/changelog` — each has its own breadcrumb-style header and no sidebar.

When adding a new authenticated page, prefer adding its route to `APP_ROUTES` over hand-rolling a new breadcrumb bar, unless there's a specific reason it should stay standalone. If a page is moved into the shell, remove any `BottomNav`/`BackToDashboardButton` it renders itself — `AppShell` already renders both globally, and doubling up shows two of each.

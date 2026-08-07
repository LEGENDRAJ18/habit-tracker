/**
 * Subscription tier gating tests for HabitAI.
 *
 * Sessions are injected via cookies (no real login UI). Three dedicated test
 * accounts are used; their passwords are set by the migration
 * `set_pw_test_account_passwords` using pgcrypto bcrypt.
 *
 * Run with:
 *   npx playwright test tests/tier-gating.spec.ts --project=chromium
 *
 * Prerequisites: `npm run dev` must be running on http://localhost:3000
 */

import { test, expect, type Browser, type BrowserContext, type Cookie } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Load SUPABASE_SERVICE_ROLE_KEY (and anything else in .env.local) into
// process.env — this test process is invoked via `npx playwright test`
// directly, not through `next dev`, so nothing loads .env.local for it
// otherwise. Node 20.6+ built-in loader; safe no-op if the file is absent.
try {
  process.loadEnvFile('.env.local');
} catch {
  // Fine to continue without it — only the service-role-backed setup helpers
  // (exhaustAiLimit/resetAiLimit) need it, everything else still works.
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://uacvjxisrjemphcaetvd.supabase.co';
const ANON_KEY     =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhY3ZqeGlzcmplbXBoY2FldHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjIzOTksImV4cCI6MjA5MjEzODM5OX0.5bRawbyY5Ujze7w60B5IPTu3dtoRDRcL5nL943spR0A';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE_NAME  = 'sb-uacvjxisrjemphcaetvd-auth-token';
const BASE         = 'http://localhost:3000';
const TEST_PASS    = 'HabitAI_PW_Test_2025';

const ACCT = {
  free: { email: 'pw-free-0627@habitai-test.com', id: '7e35ca05-476b-4e98-a668-2566275d3288' },
  plus: { email: 'pw-plus-0628@habitai-test.com', id: '6e82790a-6da2-4b23-8171-b2541565877c' },
  pro:  { email: 'pw-pro-0627@habitai-test.com',  id: '06abb4b9-6b0a-458f-8298-15868387c6f5' },
} as const;

type Tier = keyof typeof ACCT;
interface SupaSession { access_token: string; refresh_token: string; [k: string]: unknown }

// ─── Session helpers ──────────────────────────────────────────────────────────

async function signIn(tier: Tier): Promise<SupaSession> {
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({
    email:    ACCT[tier].email,
    password: TEST_PASS,
  });
  if (error || !data.session) throw new Error(`signIn(${tier}): ${error?.message}`);
  return data.session as SupaSession;
}

/**
 * Authenticated Supabase JS client for Node.js setup/assertion code.
 * Passes the access token as a global Authorization header — no setSession needed.
 */
function authedSb(session: SupaSession) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth:   { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Service-role client, mirroring src/lib/supabase/admin.ts's createAdminClient().
 * Bypasses RLS and the protect_quota_columns trigger's anon/authenticated-role
 * check — used only to SEED quota-state fixtures (e.g. "already used today")
 * the same way the real server routes write these columns, never to test the
 * gate itself.
 */
function adminSb() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set — add it to .env.local (this test process loads ' +
      'it via process.loadEnvFile, but the var itself must be present and a real key).'
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// ─── Cookie injection ─────────────────────────────────────────────────────────

/**
 * Encodes a session as @supabase/ssr expects and chunks it if needed.
 * Matches the chunking logic in the supabase/ssr package (max 3 180 encoded chars per cookie).
 */
function sessionCookies(s: SupaSession, domain = 'localhost'): Cookie[] {
  const encoded = 'base64-' + Buffer.from(JSON.stringify(s)).toString('base64url');
  const chunks: string[] = [];
  let rest = encoded;
  while (encodeURIComponent(rest).length > 3180) {
    let lo = 1, hi = rest.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (encodeURIComponent(rest.slice(0, mid)).length <= 3180) lo = mid;
      else hi = mid - 1;
    }
    chunks.push(rest.slice(0, lo));
    rest = rest.slice(lo);
  }
  const base: Omit<Cookie, 'name' | 'value'> = {
    path: '/', domain, httpOnly: false, secure: false, sameSite: 'Lax',
  };
  if (!chunks.length) return [{ name: COOKIE_NAME, value: encoded, ...base }];
  chunks.push(rest);
  return chunks.map((c, i) => ({ name: `${COOKIE_NAME}.${i}`, value: c, ...base }));
}

/** Raw Cookie header for plain Node.js fetch calls (no browser context needed). */
function cookieHeader(s: SupaSession): string {
  return sessionCookies(s).map(c => `${c.name}=${c.value}`).join('; ');
}

/** Creates a browser context with the session pre-injected and onboarding suppressed. */
async function authedCtx(browser: Browser, s: SupaSession): Promise<BrowserContext> {
  const ctx = await browser.newContext({ baseURL: BASE });
  await ctx.addCookies(sessionCookies(s));
  await ctx.addInitScript(() => {
    // Playwright's headless Chromium reports navigator.onLine = false when it
    // can't confirm internet connectivity. useHabits bails before fetching when
    // offline, leaving habits empty. Force it true so the Supabase fetch runs.
    Object.defineProperty(navigator, 'onLine', { get: () => true });
    localStorage.setItem('habitai-tour-done',       'true');
    localStorage.setItem('habitai_onboarding_done', 'true');
    sessionStorage.setItem('habitai_onboarding_done', 'true');
  });
  return ctx;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function createHabit(s: SupaSession, userId: string): Promise<string> {
  const { data, error } = await authedSb(s)
    .from('habits')
    .insert({
      user_id:          userId,
      name:             '__pw_tier_test__',
      frequency:        'daily',
      habit_type:       'standard',
      validity_score:   'valid',
      duration_minutes: 25,
    })
    .select('id')
    .single();
  if (error) throw new Error(`createHabit: ${error.message}`);
  return (data as { id: string }).id;
}

async function deleteHabit(s: SupaSession, habitId: string) {
  await authedSb(s).from('habits').delete().eq('id', habitId);
}

/**
 * Sets ai_insight_count to `count` with today's date so that the NEXT call
 * to /api/ai-insight immediately hits the 429 rate-limit response.
 *
 * Seeded via the service-role client — protect_quota_columns correctly
 * rejects this write from an anon/authenticated session (that's the point
 * of the trigger), so fixture setup has to go through the same privileged
 * path the real server routes use, same as the app's own createAdminClient().
 */
async function exhaustAiLimit(userId: string, count: number) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await adminSb()
    .from('profiles')
    .update({ ai_insight_count: count, ai_insight_date: today })
    .eq('id', userId);
  if (error) throw new Error(`exhaustAiLimit: ${error.message}`);
}

async function resetAiLimit(userId: string) {
  await adminSb().from('profiles').update({ ai_insight_count: 0, ai_insight_date: null }).eq('id', userId);
}

async function resetWeeklyEmail(s: SupaSession, userId: string) {
  await authedSb(s).from('profiles').update({ weekly_email_enabled: false }).eq('id', userId);
}

async function resetSmartTiming(s: SupaSession, habitId: string) {
  await authedSb(s).from('habits').update({ smart_timing: false, preferred_reminder_time: null }).eq('id', habitId);
}

// Both quota columns — protect_quota_columns rejects anon/authenticated
// writes here too, same as ai_insight_count/ai_insight_date. Seed via the
// service-role client, same reasoning as exhaustAiLimit/resetAiLimit above.
async function resetSkipTokens(userId: string) {
  await adminSb().from('profiles').update({ skip_tokens_used: 0, skip_week_start: null }).eq('id', userId);
}

async function resetStreakFreeze(userId: string) {
  await adminSb().from('profiles').update({ last_freeze_used: null, freeze_protected_date: null }).eq('id', userId);
}

// ─── Raw API helper ───────────────────────────────────────────────────────────

/**
 * Node.js fetch to a Next.js API route with the session cookies in the Cookie
 * header. No browser context needed — used for pure tier-gate status checks.
 */
async function api(
  method: 'GET' | 'POST',
  path: string,
  session: SupaSession,
  body?: object,
): Promise<Response> {
  const headers: Record<string, string> = { Cookie: cookieHeader(session) };
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUS TIER — UNLOCKED + BLOCKED
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Plus tier', () => {
  let sess: SupaSession;
  let habitId: string;

  test.beforeAll(async () => {
    sess    = await signIn('plus');
    habitId = await createHabit(sess, ACCT.plus.id);
  });

  test.afterAll(async () => {
    if (habitId) await deleteHabit(sess, habitId);
    await resetAiLimit(ACCT.plus.id);
    await resetSkipTokens(ACCT.plus.id);
    await resetStreakFreeze(ACCT.plus.id);
  });

  // ── UNLOCKED ─────────────────────────────────────────────────────────────

  test('Battles — POST not tier-blocked (400 for missing fields, not 403)', async () => {
    // Free users get 403; Plus/Pro pass the gate and fail at validation (400)
    const res = await api('POST', '/api/battles', sess, { opponent_id: 'non-existent-id', habit_name: 'Running' });
    expect(res.status).not.toBe(403);
    expect([400, 200]).toContain(res.status);
  });

  test('Commitment contracts — DB trigger allows Plus to set is_public=true', async () => {
    const { error } = await authedSb(sess)
      .from('habits')
      .update({ is_public: true, commitment_text: 'I will stay consistent!' })
      .eq('id', habitId);
    expect(error).toBeNull();
    // Reset so other tests see a clean habit
    await authedSb(sess)
      .from('habits')
      .update({ is_public: false, commitment_text: null })
      .eq('id', habitId);
  });

  test('Focus Timer — timer button visible on dashboard for Plus user', async ({ browser }) => {
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      // Habit has duration_minutes: 25 → button title "Start 25-min focus session"
      await expect(page.locator('button').filter({ hasText: /min focus/ }).first()).toBeVisible({ timeout: 15_000 });
    } finally {
      await ctx.close();
    }
  });

  test('Streak Freeze — "freeze available" indicator visible for Plus user', async ({ browser }) => {
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      // Dashboard renders "N freeze(s) available/left this week" for isPaid users with habits
      await expect(page.locator('text=/freeze.+week/i').first()).toBeVisible({ timeout: 15_000 });
    } finally {
      await ctx.close();
    }
  });

  test('AI coaching — daily limit is 5 (Plus message, not free message)', async () => {
    // Set count to the Plus daily limit so the next request returns 429
    await exhaustAiLimit(ACCT.plus.id, 5);
    const res  = await api('POST', '/api/ai-insight', sess, { mode: 'coaching' });
    const body = await res.json() as { error?: string };
    expect(res.status).toBe(429);
    // Plus message: "You've used all 5 AI insights for today."
    expect(body.error).toMatch(/5.*insights?/i);
    expect(body.error).not.toMatch(/\bfree\b.*insight/i);
  });

  test('Weekly Email Report — POST enables it for Plus (not tier-blocked)', async () => {
    const res  = await api('POST', '/api/settings/weekly-email', sess, { enabled: true });
    const body = await res.json() as { weekly_email_enabled?: boolean; error?: string };
    expect(res.status).toBe(200);
    expect(body.weekly_email_enabled).toBe(true);
    await resetWeeklyEmail(sess, ACCT.plus.id);
  });

  test('Groups — POST not tier-blocked (400 for missing habit_name, not 403)', async () => {
    // Free users get 403; Plus/Pro pass the gate and fail at validation (400).
    // Omits habit_name so this never actually creates a group.
    const res = await api('POST', '/api/groups', sess, { name: 'PW Test Group' });
    expect(res.status).not.toBe(403);
    expect([400, 200]).toContain(res.status);
  });

  test('Streak Freeze — POST /api/streak-freeze/apply succeeds for Plus', async () => {
    await resetStreakFreeze(ACCT.plus.id);
    const res  = await api('POST', '/api/streak-freeze/apply', sess);
    const body = await res.json() as { freeze_protected_date?: string; error?: string };
    expect(res.status).toBe(200);
    expect(body.freeze_protected_date).toBeTruthy();
    await resetStreakFreeze(ACCT.plus.id);
  });

  test('Skip token — Plus quota is 3/week (3rd succeeds, 4th is blocked)', async () => {
    await resetSkipTokens(ACCT.plus.id);
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await api('POST', `/api/habits/${habitId}/skip`, sess);
      statuses.push(res.status);
    }
    // First 3 skips consume the Plus weekly quota; the 4th must be blocked —
    // proves Plus gets more than Free's 1/week and less than Pro's unlimited.
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses[3]).toBe(403);
    await resetSkipTokens(ACCT.plus.id);
  });

  test('Habit DNA — no "Upgrade to Plus" paywall shown for Plus user', async ({ browser }) => {
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'View your Habit DNA' }).click();
      await expect(page.locator('text=Habit DNA').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('text=Upgrade to Plus')).not.toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test('Groups — page accessible, no Plus Feature upgrade gate', async ({ browser }) => {
    // Fresh context prevents any stale Web Lock from a prior navigation
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/groups', { waitUntil: 'networkidle' });
      await expect(page.locator('text=Plus or Pro required').first()).not.toBeVisible({ timeout: 5_000 });
    } finally {
      await ctx.close();
    }
  });

  // ── BLOCKED (Pro-only) ────────────────────────────────────────────────────

  test('Voice check-ins — POST returns 403 for Plus', async () => {
    const res = await api('POST', '/api/voice-checkin', sess, {
      habitId: habitId, habitLogId: null, habitName: 'Test', transcript: 'All done',
    });
    expect(res.status).toBe(403);
  });

  test('Monthly Wrapped — POST returns 403 for Plus', async () => {
    const res = await api('POST', '/api/monthly-wrap', sess);
    expect(res.status).toBe(403);
  });

  test('Weekly Game Plan — POST returns 403 for Plus', async () => {
    const res = await api('POST', '/api/weekly-plan', sess);
    expect(res.status).toBe(403);
  });

  test('Organisation Mode — POST returns 403 for Plus', async () => {
    const res = await api('POST', '/api/organisations', sess, { name: 'Test Org' });
    expect(res.status).toBe(403);
  });

  test('AI Goal Program — POST returns 403 for Plus (Pro-only)', async () => {
    // Tier check runs before body parsing, so no goal fields are needed.
    const res = await api('POST', '/api/goal-program/create', sess);
    expect(res.status).toBe(403);
  });

  test('Deep AI Memory (memory_coaching) — POST returns 403 for Plus', async () => {
    const res = await api('POST', '/api/ai-insight', sess, { mode: 'memory_coaching' });
    expect(res.status).toBe(403);
  });

  test('Pomodoro — no 🍅 label next to timer button for Plus (Pro-only label)', async ({ browser }) => {
    // HabitCard renders "🍅 Pomodoro" beside the timer button ONLY when tier === "pro"
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      await page.locator('button').filter({ hasText: /min focus/ }).first().waitFor({ timeout: 15_000 });
      await expect(page.locator('text=🍅 Pomodoro')).not.toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test('Smart Timing — toggle not rendered for Plus (Pro-only feature)', async ({ browser }) => {
    // HabitCard renders the smart timing toggle ONLY when tier === "pro"
    // For Plus there is no gate badge either — the feature is simply absent
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      await page.locator('button').filter({ hasText: /min focus/ }).first().waitFor({ timeout: 15_000 });
      await expect(page.locator('text=Smart timing')).not.toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test('Smart Timing — POST enable returns 403 for Plus (API, not just hidden UI)', async () => {
    const res = await api('POST', `/api/habits/${habitId}/smart-timing`, sess, { enabled: true });
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FREE TIER — ALL PLUS+PRO FEATURES BLOCKED
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Free tier — all Plus+Pro features blocked', () => {
  let sess: SupaSession;
  let habitId: string;

  test.beforeAll(async () => {
    sess    = await signIn('free');
    habitId = await createHabit(sess, ACCT.free.id);
  });

  test.afterAll(async () => {
    if (habitId) await deleteHabit(sess, habitId);
    await resetAiLimit(ACCT.free.id);
  });

  test('Battles — POST returns 403 for Free', async () => {
    const res = await api('POST', '/api/battles', sess, { opponent_id: 'any', habit_name: 'Running' });
    expect(res.status).toBe(403);
  });

  test('Voice check-ins — POST returns 403 for Free', async () => {
    const res = await api('POST', '/api/voice-checkin', sess, {
      habitId: habitId, habitLogId: null, habitName: 'Test', transcript: 'All done',
    });
    expect(res.status).toBe(403);
  });

  test('Monthly Wrapped — POST returns 403 for Free', async () => {
    const res = await api('POST', '/api/monthly-wrap', sess);
    expect(res.status).toBe(403);
  });

  test('Weekly Game Plan — POST returns 403 for Free', async () => {
    const res = await api('POST', '/api/weekly-plan', sess);
    expect(res.status).toBe(403);
  });

  test('Organisation Mode — POST returns 403 for Free', async () => {
    const res = await api('POST', '/api/organisations', sess, { name: 'Test Org' });
    expect(res.status).toBe(403);
  });

  test('Smart Timing — POST enable returns 403 for Free (API, not just hidden UI)', async () => {
    const res = await api('POST', `/api/habits/${habitId}/smart-timing`, sess, { enabled: true });
    expect(res.status).toBe(403);
  });

  test('Weekly Email Report — POST returns 403 for Free and does not enable it', async () => {
    const res  = await api('POST', '/api/settings/weekly-email', sess, { enabled: true });
    expect(res.status).toBe(403);
    const { data } = await authedSb(sess).from('profiles').select('weekly_email_enabled').eq('id', ACCT.free.id).single();
    expect((data as { weekly_email_enabled: boolean } | null)?.weekly_email_enabled).toBe(false);
  });

  test('Weekly Email Report — Plus badge shown instead of toggle for Free', async ({ browser }) => {
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/settings', { waitUntil: 'networkidle' });
      // Exact accessible-name match — a substring match on "Plan" would also hit the
      // "AI Goal Program … phased habit plan" upsell button in the sidebar.
      await page.getByRole('button', { name: 'Plan', exact: true }).click();
      await expect(page.locator('text=Weekly Email Report').first()).toBeVisible({ timeout: 15_000 });
      // Free sees the locked description, not the interactive ToggleRow
      await expect(page.locator('text=Available on Plus and Pro plans').first()).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test('Groups — Plus Feature upgrade gate visible for Free', async ({ browser }) => {
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/groups', { waitUntil: 'networkidle' });
      await expect(page.locator('text=Plus or Pro required').first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctx.close();
    }
  });

  test('AI coaching — daily limit is 1 (free tier rate-limit message)', async () => {
    // Set count to the Free daily limit so the next request returns 429
    await exhaustAiLimit(ACCT.free.id, 1);
    const res  = await api('POST', '/api/ai-insight', sess, { mode: 'coaching' });
    const body = await res.json() as { error?: string };
    expect(res.status).toBe(429);
    // Free message: "You've used your free AI insight for today."
    expect(body.error).toMatch(/free AI insight/i);
    expect(body.error).not.toMatch(/used all 5/i);  // "used all 5" only appears in the Plus-tier message
  });

  test('Streak Freeze — indicator NOT shown for Free user', async ({ browser }) => {
    // The freeze widget only renders for isPaid (plus | pro) users with at least one habit
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      // Wait for habit card to confirm page rendered; then assert absence of freeze text
      await page.locator('button').filter({ hasText: /min focus/ }).first().waitFor({ timeout: 15_000 });
      await expect(page.locator('text=/freeze.+week/i')).not.toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test('Commitment contracts — DB trigger blocks Free from setting is_public=true', async () => {
    // The enforce_commitment_contract_tier trigger raises an exception for free users
    const { error } = await authedSb(sess)
      .from('habits')
      .update({ is_public: true, commitment_text: 'Should be rejected' })
      .eq('id', habitId);
    expect(error).not.toBeNull();
    // Trigger RAISE message: "commitment_contract_requires_paid_tier"
    expect(error!.message).toContain('commitment_contract');
  });

  test('Pomodoro — Pro feature upgrade badge visible inside Focus Timer for Free user', async ({
    browser,
  }) => {
    // FocusTimer renders "Pomodoro mode — 4×25 min rounds with breaks. Pro feature."
    // ONLY for tier === "free" (not shown for Plus or Pro)
    const ctx = await authedCtx(browser, sess);
    const page = await ctx.newPage();
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      const timerBtn = page.locator('button').filter({ hasText: /min focus/ }).first();
      await timerBtn.waitFor({ timeout: 15_000 });
      await timerBtn.click();
      // FocusTimer modal opens; the Pomodoro upgrade badge is in the bottom section
      await expect(page.locator('text=Pomodoro mode')).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctx.close();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PRO TIER — features exclusive to Pro must still work for Pro
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Pro tier', () => {
  let sess: SupaSession;
  let habitId: string;

  test.beforeAll(async () => {
    sess    = await signIn('pro');
    habitId = await createHabit(sess, ACCT.pro.id);
  });

  test.afterAll(async () => {
    if (habitId) await deleteHabit(sess, habitId);
    await resetAiLimit(ACCT.pro.id);
    await resetWeeklyEmail(sess, ACCT.pro.id);
  });

  test('Smart Timing — POST enable returns 200 for Pro and sets smart_timing=true', async () => {
    const res  = await api('POST', `/api/habits/${habitId}/smart-timing`, sess, { enabled: true });
    const body = await res.json() as { smart_timing?: boolean };
    expect(res.status).toBe(200);
    expect(body.smart_timing).toBe(true);
    await resetSmartTiming(sess, habitId);
  });

  test('Weekly Email Report — POST enables it for Pro (not tier-blocked)', async () => {
    const res  = await api('POST', '/api/settings/weekly-email', sess, { enabled: true });
    const body = await res.json() as { weekly_email_enabled?: boolean };
    expect(res.status).toBe(200);
    expect(body.weekly_email_enabled).toBe(true);
  });
});

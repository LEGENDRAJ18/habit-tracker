# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tier-gating.spec.ts >> Plus tier >> Battles — POST not tier-blocked (400 for missing fields, not 403)
- Location: tests\tier-gating.spec.ts:186:7

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not 403
```

# Test source

```ts
  89  | function cookieHeader(s: SupaSession): string {
  90  |   return sessionCookies(s).map(c => `${c.name}=${c.value}`).join('; ');
  91  | }
  92  | 
  93  | /** Creates a browser context with the session pre-injected and onboarding suppressed. */
  94  | async function authedCtx(browser: Browser, s: SupaSession): Promise<BrowserContext> {
  95  |   const ctx = await browser.newContext({ baseURL: BASE });
  96  |   await ctx.addCookies(sessionCookies(s));
  97  |   await ctx.addInitScript(() => {
  98  |     localStorage.setItem('habitai-tour-done',       'true');
  99  |     localStorage.setItem('habitai_onboarding_done', 'true');
  100 |     sessionStorage.setItem('habitai_onboarding_done', 'true');
  101 |   });
  102 |   return ctx;
  103 | }
  104 | 
  105 | // ─── Data helpers ─────────────────────────────────────────────────────────────
  106 | 
  107 | async function createHabit(s: SupaSession, userId: string): Promise<string> {
  108 |   const { data, error } = await authedSb(s)
  109 |     .from('habits')
  110 |     .insert({
  111 |       user_id:          userId,
  112 |       name:             '__pw_tier_test__',
  113 |       frequency:        'daily',
  114 |       habit_type:       'build',
  115 |       validity_score:   'valid',
  116 |       duration_minutes: 25,
  117 |     })
  118 |     .select('id')
  119 |     .single();
  120 |   if (error) throw new Error(`createHabit: ${error.message}`);
  121 |   return (data as { id: string }).id;
  122 | }
  123 | 
  124 | async function deleteHabit(s: SupaSession, habitId: string) {
  125 |   await authedSb(s).from('habits').delete().eq('id', habitId);
  126 | }
  127 | 
  128 | /**
  129 |  * Sets ai_insight_count to `count` with today's date so that the NEXT call
  130 |  * to /api/ai-insight immediately hits the 429 rate-limit response.
  131 |  */
  132 | async function exhaustAiLimit(s: SupaSession, userId: string, count: number) {
  133 |   const today = new Date().toISOString().split('T')[0];
  134 |   const { error } = await authedSb(s)
  135 |     .from('profiles')
  136 |     .update({ ai_insight_count: count, ai_insight_date: today })
  137 |     .eq('id', userId);
  138 |   if (error) throw new Error(`exhaustAiLimit: ${error.message}`);
  139 | }
  140 | 
  141 | async function resetAiLimit(s: SupaSession, userId: string) {
  142 |   await authedSb(s).from('profiles').update({ ai_insight_count: 0, ai_insight_date: null }).eq('id', userId);
  143 | }
  144 | 
  145 | // ─── Raw API helper ───────────────────────────────────────────────────────────
  146 | 
  147 | /**
  148 |  * Node.js fetch to a Next.js API route with the session cookies in the Cookie
  149 |  * header. No browser context needed — used for pure tier-gate status checks.
  150 |  */
  151 | async function api(
  152 |   method: 'GET' | 'POST',
  153 |   path: string,
  154 |   session: SupaSession,
  155 |   body?: object,
  156 | ): Promise<Response> {
  157 |   const headers: Record<string, string> = { Cookie: cookieHeader(session) };
  158 |   if (body) headers['Content-Type'] = 'application/json';
  159 |   return fetch(`${BASE}${path}`, {
  160 |     method,
  161 |     headers,
  162 |     body: body ? JSON.stringify(body) : undefined,
  163 |   });
  164 | }
  165 | 
  166 | // ══════════════════════════════════════════════════════════════════════════════
  167 | // PLUS TIER — UNLOCKED + BLOCKED
  168 | // ══════════════════════════════════════════════════════════════════════════════
  169 | 
  170 | test.describe('Plus tier', () => {
  171 |   let sess: SupaSession;
  172 |   let habitId: string;
  173 | 
  174 |   test.beforeAll(async () => {
  175 |     sess    = await signIn('plus');
  176 |     habitId = await createHabit(sess, ACCT.plus.id);
  177 |   });
  178 | 
  179 |   test.afterAll(async () => {
  180 |     if (habitId) await deleteHabit(sess, habitId);
  181 |     await resetAiLimit(sess, ACCT.plus.id);
  182 |   });
  183 | 
  184 |   // ── UNLOCKED ─────────────────────────────────────────────────────────────
  185 | 
  186 |   test('Battles — POST not tier-blocked (400 for missing fields, not 403)', async () => {
  187 |     // Free users get 403; Plus/Pro pass the gate and fail at validation (400)
  188 |     const res = await api('POST', '/api/battles', sess, { opponent_id: 'non-existent-id', habit_name: 'Running' });
> 189 |     expect(res.status).not.toBe(403);
      |                            ^ Error: expect(received).not.toBe(expected) // Object.is equality
  190 |     expect([400, 200]).toContain(res.status);
  191 |   });
  192 | 
  193 |   test('Commitment contracts — DB trigger allows Plus to set is_public=true', async () => {
  194 |     const { error } = await authedSb(sess)
  195 |       .from('habits')
  196 |       .update({ is_public: true, commitment_text: 'I will stay consistent!' })
  197 |       .eq('id', habitId);
  198 |     expect(error).toBeNull();
  199 |     // Reset so other tests see a clean habit
  200 |     await authedSb(sess)
  201 |       .from('habits')
  202 |       .update({ is_public: false, commitment_text: null })
  203 |       .eq('id', habitId);
  204 |   });
  205 | 
  206 |   test('Focus Timer — timer button visible on dashboard for Plus user', async ({ browser }) => {
  207 |     const ctx = await authedCtx(browser, sess);
  208 |     const page = await ctx.newPage();
  209 |     try {
  210 |       await page.goto('/dashboard', { waitUntil: 'networkidle' });
  211 |       // Habit has duration_minutes: 25 → button reads "25 min focus"
  212 |       await expect(page.locator('button:has-text("min focus")').first()).toBeVisible({ timeout: 15_000 });
  213 |     } finally {
  214 |       await ctx.close();
  215 |     }
  216 |   });
  217 | 
  218 |   test('Streak Freeze — "freeze available" indicator visible for Plus user', async ({ browser }) => {
  219 |     const ctx = await authedCtx(browser, sess);
  220 |     const page = await ctx.newPage();
  221 |     try {
  222 |       await page.goto('/dashboard', { waitUntil: 'networkidle' });
  223 |       // Dashboard renders "N freeze(s) available/left this week" for isPaid users with habits
  224 |       await expect(page.locator('text=/freeze.+week/i').first()).toBeVisible({ timeout: 15_000 });
  225 |     } finally {
  226 |       await ctx.close();
  227 |     }
  228 |   });
  229 | 
  230 |   test('AI coaching — daily limit is 5 (Plus message, not free message)', async () => {
  231 |     // Set count to the Plus daily limit so the next request returns 429
  232 |     await exhaustAiLimit(sess, ACCT.plus.id, 5);
  233 |     const res  = await api('POST', '/api/ai-insight', sess, { mode: 'coaching' });
  234 |     const body = await res.json() as { error?: string };
  235 |     expect(res.status).toBe(429);
  236 |     // Plus message: "You've used all 5 AI insights for today."
  237 |     expect(body.error).toMatch(/5.*insights?/i);
  238 |     expect(body.error).not.toMatch(/\bfree\b.*insight/i);
  239 |   });
  240 | 
  241 |   test('Groups — page accessible, no Plus Feature upgrade gate', async ({ browser }) => {
  242 |     // Fresh context prevents any stale Web Lock from a prior navigation
  243 |     const ctx = await authedCtx(browser, sess);
  244 |     const page = await ctx.newPage();
  245 |     try {
  246 |       await page.goto('/groups', { waitUntil: 'networkidle' });
  247 |       await expect(page.locator('text=Plus Feature').first()).not.toBeVisible({ timeout: 5_000 });
  248 |     } finally {
  249 |       await ctx.close();
  250 |     }
  251 |   });
  252 | 
  253 |   // ── BLOCKED (Pro-only) ────────────────────────────────────────────────────
  254 | 
  255 |   test('Voice check-ins — POST returns 403 for Plus', async () => {
  256 |     const res = await api('POST', '/api/voice-checkin', sess, {
  257 |       habitId: habitId, habitLogId: null, habitName: 'Test', transcript: 'All done',
  258 |     });
  259 |     expect(res.status).toBe(403);
  260 |   });
  261 | 
  262 |   test('Monthly Wrapped — POST returns 403 for Plus', async () => {
  263 |     const res = await api('POST', '/api/monthly-wrap', sess);
  264 |     expect(res.status).toBe(403);
  265 |   });
  266 | 
  267 |   test('Weekly Game Plan — POST returns 403 for Plus', async () => {
  268 |     const res = await api('POST', '/api/weekly-plan', sess);
  269 |     expect(res.status).toBe(403);
  270 |   });
  271 | 
  272 |   test('Organisation Mode — POST returns 403 for Plus', async () => {
  273 |     const res = await api('POST', '/api/organisations', sess, { name: 'Test Org' });
  274 |     expect(res.status).toBe(403);
  275 |   });
  276 | 
  277 |   test('Pomodoro — no 🍅 label next to timer button for Plus (Pro-only label)', async ({ browser }) => {
  278 |     // HabitCard renders "🍅 Pomodoro" beside the timer button ONLY when tier === "pro"
  279 |     const ctx = await authedCtx(browser, sess);
  280 |     const page = await ctx.newPage();
  281 |     try {
  282 |       await page.goto('/dashboard', { waitUntil: 'networkidle' });
  283 |       await page.locator('button:has-text("min focus")').first().waitFor({ timeout: 15_000 });
  284 |       await expect(page.locator('text=🍅 Pomodoro')).not.toBeVisible();
  285 |     } finally {
  286 |       await ctx.close();
  287 |     }
  288 |   });
  289 | 
```
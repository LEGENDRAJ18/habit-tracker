# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tier-gating.spec.ts >> Free tier — all Plus+Pro features blocked >> AI coaching — daily limit is 1 (free tier rate-limit message)
- Location: tests\tier-gating.spec.ts:361:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 429
Received: 400
```

# Test source

```ts
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
  290 |   test('Smart Timing — toggle not rendered for Plus (Pro-only feature)', async ({ browser }) => {
  291 |     // HabitCard renders the smart timing toggle ONLY when tier === "pro"
  292 |     // For Plus there is no gate badge either — the feature is simply absent
  293 |     const ctx = await authedCtx(browser, sess);
  294 |     const page = await ctx.newPage();
  295 |     try {
  296 |       await page.goto('/dashboard', { waitUntil: 'networkidle' });
  297 |       await page.locator('button:has-text("min focus")').first().waitFor({ timeout: 15_000 });
  298 |       await expect(page.locator('text=Smart timing')).not.toBeVisible();
  299 |     } finally {
  300 |       await ctx.close();
  301 |     }
  302 |   });
  303 | });
  304 | 
  305 | // ══════════════════════════════════════════════════════════════════════════════
  306 | // FREE TIER — ALL PLUS+PRO FEATURES BLOCKED
  307 | // ══════════════════════════════════════════════════════════════════════════════
  308 | 
  309 | test.describe('Free tier — all Plus+Pro features blocked', () => {
  310 |   let sess: SupaSession;
  311 |   let habitId: string;
  312 | 
  313 |   test.beforeAll(async () => {
  314 |     sess    = await signIn('free');
  315 |     habitId = await createHabit(sess, ACCT.free.id);
  316 |   });
  317 | 
  318 |   test.afterAll(async () => {
  319 |     if (habitId) await deleteHabit(sess, habitId);
  320 |     await resetAiLimit(sess, ACCT.free.id);
  321 |   });
  322 | 
  323 |   test('Battles — POST returns 403 for Free', async () => {
  324 |     const res = await api('POST', '/api/battles', sess, { opponent_id: 'any', habit_name: 'Running' });
  325 |     expect(res.status).toBe(403);
  326 |   });
  327 | 
  328 |   test('Voice check-ins — POST returns 403 for Free', async () => {
  329 |     const res = await api('POST', '/api/voice-checkin', sess, {
  330 |       habitId: habitId, habitLogId: null, habitName: 'Test', transcript: 'All done',
  331 |     });
  332 |     expect(res.status).toBe(403);
  333 |   });
  334 | 
  335 |   test('Monthly Wrapped — POST returns 403 for Free', async () => {
  336 |     const res = await api('POST', '/api/monthly-wrap', sess);
  337 |     expect(res.status).toBe(403);
  338 |   });
  339 | 
  340 |   test('Weekly Game Plan — POST returns 403 for Free', async () => {
  341 |     const res = await api('POST', '/api/weekly-plan', sess);
  342 |     expect(res.status).toBe(403);
  343 |   });
  344 | 
  345 |   test('Organisation Mode — POST returns 403 for Free', async () => {
  346 |     const res = await api('POST', '/api/organisations', sess, { name: 'Test Org' });
  347 |     expect(res.status).toBe(403);
  348 |   });
  349 | 
  350 |   test('Groups — Plus Feature upgrade gate visible for Free', async ({ browser }) => {
  351 |     const ctx = await authedCtx(browser, sess);
  352 |     const page = await ctx.newPage();
  353 |     try {
  354 |       await page.goto('/groups', { waitUntil: 'networkidle' });
  355 |       await expect(page.locator('text=Plus Feature').first()).toBeVisible({ timeout: 10_000 });
  356 |     } finally {
  357 |       await ctx.close();
  358 |     }
  359 |   });
  360 | 
  361 |   test('AI coaching — daily limit is 1 (free tier rate-limit message)', async () => {
  362 |     // Set count to the Free daily limit so the next request returns 429
  363 |     await exhaustAiLimit(sess, ACCT.free.id, 1);
  364 |     const res  = await api('POST', '/api/ai-insight', sess, { mode: 'coaching' });
  365 |     const body = await res.json() as { error?: string };
> 366 |     expect(res.status).toBe(429);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  367 |     // Free message: "You've used your free AI insight for today."
  368 |     expect(body.error).toMatch(/free AI insight/i);
  369 |     expect(body.error).not.toMatch(/5.*insights?/i);
  370 |   });
  371 | 
  372 |   test('Streak Freeze — indicator NOT shown for Free user', async ({ browser }) => {
  373 |     // The freeze widget only renders for isPaid (plus | pro) users with at least one habit
  374 |     const ctx = await authedCtx(browser, sess);
  375 |     const page = await ctx.newPage();
  376 |     try {
  377 |       await page.goto('/dashboard', { waitUntil: 'networkidle' });
  378 |       // Wait for habit card to confirm page rendered; then assert absence of freeze text
  379 |       await page.locator('button:has-text("min focus")').first().waitFor({ timeout: 15_000 });
  380 |       await expect(page.locator('text=/freeze.+week/i')).not.toBeVisible();
  381 |     } finally {
  382 |       await ctx.close();
  383 |     }
  384 |   });
  385 | 
  386 |   test('Commitment contracts — DB trigger blocks Free from setting is_public=true', async () => {
  387 |     // The enforce_commitment_contract_tier trigger raises an exception for free users
  388 |     const { error } = await authedSb(sess)
  389 |       .from('habits')
  390 |       .update({ is_public: true, commitment_text: 'Should be rejected' })
  391 |       .eq('id', habitId);
  392 |     expect(error).not.toBeNull();
  393 |     // Trigger RAISE message: "commitment_contract_requires_paid_tier"
  394 |     expect(error!.message).toContain('commitment_contract');
  395 |   });
  396 | 
  397 |   test('Pomodoro — Pro feature upgrade badge visible inside Focus Timer for Free user', async ({
  398 |     browser,
  399 |   }) => {
  400 |     // FocusTimer renders "Pomodoro mode — 4×25 min rounds with breaks. Pro feature."
  401 |     // ONLY for tier === "free" (not shown for Plus or Pro)
  402 |     const ctx = await authedCtx(browser, sess);
  403 |     const page = await ctx.newPage();
  404 |     try {
  405 |       await page.goto('/dashboard', { waitUntil: 'networkidle' });
  406 |       const timerBtn = page.locator('button:has-text("min focus")').first();
  407 |       await timerBtn.waitFor({ timeout: 15_000 });
  408 |       await timerBtn.click();
  409 |       // FocusTimer modal opens; the Pomodoro upgrade badge is in the bottom section
  410 |       await expect(page.locator('text=Pomodoro mode')).toBeVisible({ timeout: 10_000 });
  411 |     } finally {
  412 |       await ctx.close();
  413 |     }
  414 |   });
  415 | });
  416 | 
```
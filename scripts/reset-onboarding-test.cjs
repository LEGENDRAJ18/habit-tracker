#!/usr/bin/env node
'use strict';

/**
 * Resets the onboarding test account back to a clean pre-onboarding state.
 *
 * Usage: node scripts/reset-onboarding-test.cjs
 *
 * Account: onboarding.test@habitai.com / HabitAI_Onboard_26!
 */

const fs   = require('fs');
const path = require('path');

// ── Load .env.local ────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found at ' + envPath);
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

// ── Constants ──────────────────────────────────────────────────────────────

const EMAIL    = 'onboarding.test@habitai.com';
const PASSWORD = 'HabitAI_Onboard_26!';

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const env             = loadEnv();
  const url             = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey         = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey  = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    console.error('❌  NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
    process.exit(1);
  }
  if (!serviceRoleKey) {
    console.error('❌  SUPABASE_SERVICE_ROLE_KEY not found in .env.local — required because the profile');
    console.error('    reset writes subscription_tier, which protect_billing_columns rejects from any');
    console.error('    non-service-role client.');
    process.exit(1);
  }

  // Dynamic import works for both CJS and ESM builds of supabase-js
  const { createClient } = await import('@supabase/supabase-js');
  const sb    = createClient(url, anonKey);
  // Service-role client, mirroring src/lib/supabase/admin.ts's createAdminClient() —
  // bypasses RLS and the protect_billing_columns trigger's non-service-role check,
  // needed because this reset writes subscription_tier back to 'free'.
  const admin = createClient(url, serviceRoleKey);

  // 1. Sign in (also verifies the documented test-account password still works)
  console.log('🔐  Signing in as ' + EMAIL + ' …');
  const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
    email: EMAIL, password: PASSWORD,
  });
  if (authErr || !authData?.user) {
    console.error('❌  Sign-in failed:', authErr?.message ?? 'no user returned');
    process.exit(1);
  }
  const uid = authData.user.id;
  console.log('✅  Signed in  (uid: ' + uid + ')');

  // 2. Reset profile (service-role client — subscription_tier is a protected column)
  console.log('🔄  Resetting profile …');
  const { error: updateErr } = await admin
    .from('profiles')
    .update({
      onboarding_completed: false,
      subscription_tier:    'free',
      persona:              null,
      goal:                 null,
      goals:                [],
      username:             null,
      avatar_id:            'ghost',
      user_mode:            'personal',
    })
    .eq('id', uid);

  if (updateErr) {
    console.error('❌  Profile reset failed:', updateErr.message);
    process.exit(1);
  }
  console.log('✅  Profile reset to clean onboarding state');

  // 3. Sign out
  await sb.auth.signOut();

  // 4. Summary
  console.log('');
  console.log('─────────────────────────────────────────────');
  console.log('  Test account ready');
  console.log('  Email   : ' + EMAIL);
  console.log('  Password: ' + PASSWORD);
  console.log('─────────────────────────────────────────────');
  console.log('');
  console.log('⚠️   If you previously completed onboarding in this browser,');
  console.log('    run these two lines in DevTools Console to clear the cache:');
  console.log('');
  console.log("    localStorage.removeItem('habitai_onboarding_done')");
  console.log("    sessionStorage.removeItem('habitai_onboarding_done')");
  console.log('');
  console.log('🚀  Then go to http://localhost:3000/auth/login and sign in.');
}

main().catch((err) => {
  console.error('❌  Unexpected error:', err.message ?? err);
  process.exit(1);
});

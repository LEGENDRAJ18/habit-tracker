import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import stripe from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

const PLUS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!;
const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;

function getTierFromPriceId(priceId: string): string {
  if (priceId === PLUS_PRICE_ID) return 'plus';
  if (priceId === PRO_PRICE_ID) return 'pro';
  return 'free';
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const tier = getTierFromPriceId(priceId);
      const isTrialing = subscription.status === 'trialing';

      await supabase.from('profiles').upsert({
        id: userId,
        email: session.customer_email,
        subscription_tier: tier,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_status: subscription.status,
        subscription_cancel_at_period_end: false,
        subscription_current_period_end: null,
        trial_end_date: isTrialing && subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        trial_reminder_sent: false,
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      const priceId = subscription.items.data[0]?.price.id;
      const tier = getTierFromPriceId(priceId);
      const { status, cancel_at_period_end } = subscription;
      const current_period_end = subscription.items.data[0]?.current_period_end ?? null;
      const isTrialing = status === 'trialing';

      // Downgrade immediately for past_due or canceled status
      if (status === 'past_due' || status === 'canceled') {
        await supabase.from('profiles').update({
          subscription_tier: 'free',
          subscription_status: status,
          subscription_cancel_at_period_end: false,
          subscription_current_period_end: null,
          trial_end_date: null,
          trial_reminder_sent: false,
        }).eq('id', userId);
        break;
      }

      // User scheduled a cancellation — keep access until period ends
      if (cancel_at_period_end) {
        await supabase.from('profiles').update({
          subscription_tier: tier,
          subscription_status: status,
          stripe_subscription_id: subscription.id,
          subscription_cancel_at_period_end: true,
          subscription_current_period_end: current_period_end
            ? new Date(current_period_end * 1000).toISOString()
            : null,
          trial_end_date: null,
          trial_reminder_sent: false,
        }).eq('id', userId);
        break;
      }

      // Trial is active — keep tier, store trial end date
      if (isTrialing) {
        await supabase.from('profiles').update({
          subscription_tier: tier,
          subscription_status: status,
          stripe_subscription_id: subscription.id,
          subscription_cancel_at_period_end: false,
          subscription_current_period_end: null,
          trial_end_date: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        }).eq('id', userId);
        break;
      }

      // Active with no special state (e.g. trial converted, resubscribed, plan changed)
      await supabase.from('profiles').update({
        subscription_tier: status === 'active' ? tier : 'free',
        subscription_status: status,
        stripe_subscription_id: subscription.id,
        subscription_cancel_at_period_end: false,
        subscription_current_period_end: null,
        trial_end_date: null,
        trial_reminder_sent: false,
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      await supabase.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
        subscription_cancel_at_period_end: false,
        subscription_current_period_end: null,
        trial_end_date: null,
        trial_reminder_sent: false,
      }).eq('id', userId);
      break;
    }

    case 'invoice.payment_failed': {
      // Payment failed — user is already downgraded via subscription.updated (past_due).
      // Send a notification email so they know to update their card.
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string | null;
      if (!customerId) break;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (!profile?.email) break;

      const name = (profile.display_name as string | null) ?? 'there';
      const manageUrl = 'https://habitaiapp.com/billing';

      const { Resend } = await import('resend');
      const resendClient = new Resend(process.env.RESEND_API_KEY);
      await resendClient.emails.send({
        from: 'HabitAI <noreply@habitaiapp.com>',
        to: profile.email as string,
        subject: 'Payment failed — update your card to keep Plus access',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09090f;color:#e2e8f0;border-radius:16px">
            <h2 style="color:#fff;font-size:20px;margin-bottom:8px">Payment failed 💳</h2>
            <p style="color:#94a3b8;margin-bottom:16px">Hey ${name}, we couldn't process your payment for HabitAI.</p>
            <p style="color:#94a3b8;margin-bottom:24px">Your Plus access has been paused. Update your payment method to restore it — your streaks and data are safe.</p>
            <a href="${manageUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Update payment method →</a>
            <p style="color:#475569;font-size:12px;margin-top:24px">You're receiving this because you have a HabitAI subscription. <a href="https://habitaiapp.com/settings" style="color:#6d28d9">Manage subscription</a></p>
          </div>`,
      }).catch(() => { /* non-blocking */ });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

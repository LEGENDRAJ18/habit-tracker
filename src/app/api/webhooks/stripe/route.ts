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

      await supabase.from('profiles').upsert({
        id: userId,
        email: session.customer_email,
        subscription_tier: tier,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_status: subscription.status,
        subscription_cancel_at_period_end: false,
        subscription_current_period_end: null,
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

      // Downgrade immediately for past_due or canceled status
      if (status === 'past_due' || status === 'canceled') {
        await supabase.from('profiles').update({
          subscription_tier: 'free',
          subscription_status: status,
          subscription_cancel_at_period_end: false,
          subscription_current_period_end: null,
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
        }).eq('id', userId);
        break;
      }

      // Active, no cancellation scheduled (e.g. resubscribed or plan changed)
      await supabase.from('profiles').update({
        subscription_tier: status === 'active' ? tier : 'free',
        subscription_status: status,
        stripe_subscription_id: subscription.id,
        subscription_cancel_at_period_end: false,
        subscription_current_period_end: null,
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      // Period ended — downgrade to free and clear all cancel fields
      await supabase.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
        subscription_cancel_at_period_end: false,
        subscription_current_period_end: null,
      }).eq('id', userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

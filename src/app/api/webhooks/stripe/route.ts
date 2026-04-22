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
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      const priceId = subscription.items.data[0]?.price.id;
      const tier = getTierFromPriceId(priceId);

      await supabase.from('profiles').update({
        subscription_tier: subscription.status === 'active' ? tier : 'free',
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
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
      }).eq('id', userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

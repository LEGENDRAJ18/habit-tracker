import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

const PLUS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!;

export async function POST(request: NextRequest) {
  try {
    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const isPlus = priceId === PLUS_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgrade=success`,
      cancel_url: `${origin}/dashboard?upgrade=cancel`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
        ...(isPlus ? { trial_period_days: 30 } : {}),
      },
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: isPlus
            ? `I agree to the [Payment Policy](${origin}/payment-policy) and [Terms of Service](${origin}/terms). Free for 30 days, then billed monthly. Cancel anytime before trial ends and you won't be charged.`
            : `I agree to the [Payment Policy](${origin}/payment-policy) and [Terms of Service](${origin}/terms). Billed monthly. Cancel anytime.`,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

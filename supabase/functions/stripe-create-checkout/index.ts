// supabase/functions/stripe-create-checkout/index.ts
import Stripe from 'npm:stripe';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    // 1) 사용자 인증
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2) 요청 바디에서 학기 정보 등 읽기 (지금은 optional)
    const body = await req.json().catch(() => ({}));
    const semester = body.semester ?? '2025-spring'; // TODO: 나중에 실제 학기 값 사용

    // 3) Stripe Checkout 세션 생성
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // TODO: 나중에 실제 가격 ID로 교체
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_SEMESTER')!, // 나중에 env에 넣기
          quantity: 1,
        },
      ],
      success_url: Deno.env.get('CHECKOUT_SUCCESS_URL') || 'https://uvain-app.vercel.app/member',
      cancel_url: Deno.env.get('CHECKOUT_CANCEL_URL') || 'https://uvain-app.vercel.app/member',
      metadata: {
        user_id: user.id,
        semester,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
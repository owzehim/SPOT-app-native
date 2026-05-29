// supabase/functions/stripe-webhook/index.ts
import Stripe from 'npm:stripe';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function addSemester(from: Date): Date {
  // TODO: 실제 학기 기준 날짜 계산 로직으로 교체 가능
  const d = new Date(from);
  d.setMonth(d.getMonth() + 6); // 임시로 6개월
  return d;
}

serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err);
    return new Response('Webhook Error', { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;
      const semester = session.metadata?.semester;

      if (!userId) {
        console.warn('No user_id in metadata');
        return new Response('ok', { status: 200 });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const now = new Date();
      const validUntil = addSemester(now); // TODO: semester 값에 따라 조정 가능

      const { error } = await supabase
        .from('members')
        .update({
          is_member: true,
          membership_valid_until: validUntil.toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update membership', error);
      }
    }

    // 다른 이벤트 타입도 나중에 필요하면 추가
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('Webhook handler error', err);
    return new Response('error', { status: 500 });
  }
});
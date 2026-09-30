import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';
import { bookingEmail } from './template.ts';
Deno.serve(async (request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('BOOKING_NOTIFICATION_SECRET');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return json({ error: 'Unauthorized' }, 401);
  const key = Deno.env.get('RESEND_API_KEY');
  const sender = Deno.env.get('SENDER_EMAIL');
  if (!key || !sender) return json({ error: 'Email service is not configured.' }, 503);
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  const { error: preparationError } = await db.rpc('prepare_live_booking_notifications');
  if (preparationError) return json({ error: 'Could not prepare notifications.' }, 500);
  const { data: events, error } = await db.rpc('claim_live_booking_notifications');
  if (error) return json({ error: 'Could not claim notifications.' }, 500);
  let delivered = 0,
    failed = 0;
  for (const event of events || []) {
    try {
      const { data: booking } = await db
        .from('live_bookings')
        .select('user_id,teacher_id,status')
        .eq('id', event.booking_id)
        .single();
      if (!booking) throw new Error('Booking unavailable.');
      if (event.event === 'reminder' && booking.status !== 'booked') {
        await db
          .from('live_booking_notifications')
          .update({
            delivered_at: new Date().toISOString(),
            locked_until: null,
            last_error: 'Superseded by a booking change.',
          })
          .eq('id', event.id);
        continue;
      }
      let to: string | undefined;
      if (event.audience === 'admin') to = Deno.env.get('CONTACT_EMAIL_TO');
      else if (event.audience === 'teacher') {
        const { data } = await db
          .from('live_teachers')
          .select('email')
          .eq('id', booking.teacher_id)
          .single();
        to = data?.email;
      } else {
        const { data } = await db.from('users').select('email').eq('id', booking.user_id).single();
        to = data?.email;
      }
      if (!to) throw new Error('Recipient is not configured.');
      const message = bookingEmail(event, Deno.env.get('SITE_URL') || 'https://eduway.academy');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `live-booking/${event.id}`,
        },
        body: JSON.stringify({ from: sender, to: [to], ...message }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
      const { error: saved } = await db
        .from('live_booking_notifications')
        .update({ delivered_at: new Date().toISOString(), locked_until: null, last_error: null })
        .eq('id', event.id);
      if (saved) throw new Error('Could not save delivery status.');
      delivered++;
    } catch (err) {
      failed++;
      await db
        .from('live_booking_notifications')
        .update({
          locked_until: null,
          available_at: new Date(
            Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(event.attempts, 6))
          ).toISOString(),
          last_error: err instanceof Error ? err.message : 'Delivery failed.',
        })
        .eq('id', event.id);
    }
  }
  return json({ delivered, failed });
});

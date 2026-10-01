import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
Deno.serve(async (request) => {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: identity, error: auth } = await db.auth.getUser(
      (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    );
    if (auth || !identity.user) return reply({ error: 'Sign in required.' }, 401);
    const { data: actor } = await db
      .from('users')
      .select('name,role,status')
      .eq('id', identity.user.id)
      .single();
    if (actor?.role !== 'admin' || actor.status !== 'active')
      return reply({ error: 'Administrator access required.' }, 403);
    const body = await request.json();
    const email = String(body.email || '')
        .trim()
        .toLowerCase(),
      name = String(body.name || '').trim();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      name.length < 1 ||
      name.length > 150
    )
      return reply({ error: 'Enter a name and valid email.' }, 400);
    const { data: existing, error: lookup } = await db
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (lookup) throw lookup;
    if (existing)
      return reply(
        { error: 'This account already exists. Find the student in Users to manage access.' },
        409
      );
    const { data: claim, error: limit } = await db.rpc('claim_student_invitation', {
      p_actor: identity.user.id,
      p_email: email,
    });
    if (limit || !claim)
      return reply(
        {
          error:
            'An invitation was recently sent, or the hourly invitation limit was reached. Try later.',
        },
        429
      );
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: `${Deno.env.get('SITE_URL') || 'https://eduway.academy'}/?auth=student-invite`,
    });
    if (error) {
      await db.from('student_invitation_attempts').delete().eq('id', claim);
      return reply({ error: error.message }, 400);
    }
    const { error: audit } = await db
      .from('audit_logs')
      .insert({
        action: 'user_invited',
        entity_type: 'user',
        entity_id: data.user.id,
        admin_id: identity.user.id,
        admin_name: actor.name || 'Admin',
        description: 'Student invitation sent',
      });
    return reply({
      message: audit
        ? 'Invitation sent, but the audit entry could not be saved.'
        : 'Invitation sent. Grant course access from the student’s profile.',
    });
  } catch {
    return reply(
      { error: 'Could not send the invitation. Check the email service and try again.' },
      500
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: identity, error: authError } = await service.auth.getUser(token);
    if (authError || !identity.user) return json({ error: 'Sign in required.' }, 401);
    const { data: actor } = await service
      .from('users')
      .select('role,status')
      .eq('id', identity.user.id)
      .single();
    if (actor?.role !== 'admin' || actor?.status !== 'active')
      return json({ error: 'Administrator access required.' }, 403);
    const { teacherId } = await req.json();
    if (typeof teacherId !== 'string' || !/^[0-9a-f-]{36}$/i.test(teacherId))
      return json({ error: 'Teacher ID required.' }, 400);
    const { data: teacher, error: teacherError } = await service
      .from('live_teachers')
      .select('id,email,user_id,invited_at,profile')
      .eq('id', teacherId)
      .single();
    if (teacherError || !teacher) return json({ error: 'Teacher not found.' }, 404);
    // Atomically rate-limit duplicate clicks. Restore the timestamp if sending fails.
    const prior = teacher.invited_at;
    let claim = service
      .from('live_teachers')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', teacherId);
    claim = prior
      ? claim.eq('invited_at', prior).lt('invited_at', new Date(Date.now() - 60000).toISOString())
      : claim.is('invited_at', null);
    const { data: claimed, error: claimError } = await claim.select('id');
    if (claimError || !claimed?.length)
      return json({ error: 'An invitation was sent recently. Please wait one minute.' }, 429);
    const site = Deno.env.get('SITE_URL') || 'https://eduway.academy';
    let accountId = teacher.user_id;
    let sentError: { message: string } | null = null;
    if (!accountId) {
      const { data: existing } = await service
        .from('users')
        .select('id')
        .ilike('email', teacher.email)
        .maybeSingle();
      if (existing) {
        const { data: authUser } = await service.auth.admin.getUserById(existing.id);
        if (authUser.user?.email?.toLowerCase() === teacher.email) accountId = existing.id;
      }
    }
    if (accountId) {
      const { error } = await service.auth.resetPasswordForEmail(teacher.email, {
        redirectTo: `${site}/?auth=teacher-invite`,
      });
      sentError = error;
    } else {
      const { data, error } = await service.auth.admin.inviteUserByEmail(teacher.email, {
        data: { name: teacher.profile.name },
        redirectTo: `${site}/?auth=teacher-invite`,
      });
      sentError = error;
      accountId = data?.user?.id;
    }
    if (sentError || !accountId) {
      await service.from('live_teachers').update({ invited_at: prior }).eq('id', teacherId);
      return json({ error: sentError?.message || 'Could not create invitation.' }, 400);
    }
    const { error: linkError } = await service
      .from('live_teachers')
      .update({ user_id: accountId })
      .eq('id', teacherId);
    if (linkError)
      return json(
        {
          error:
            'Invitation sent, but linking the teacher failed. Contact support before retrying.',
        },
        500
      );
    return json({
      message:
        'Invitation sent. The teacher can set a password and open My teaching calendar after signing in.',
    });
  } catch {
    return json({ error: 'Could not send the invitation.' }, 500);
  }
});

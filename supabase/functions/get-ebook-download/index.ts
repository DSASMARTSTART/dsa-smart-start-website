// Supabase Edge Function: get-ebook-download
// Issues a short-lived signed URL for a paid e-book file from the PRIVATE
// `ebooks` bucket, but ONLY after verifying the caller has an active enrollment
// in the course the file belongs to (admins/editors always allowed).
//
// Deploy with: supabase functions deploy get-ebook-download
//
// Input (POST JSON): { courseId: string, path: string }
//   - path is the object path inside the `ebooks` bucket, e.g. "<courseId>/a1.pdf".
// Output: { success: true, url: string } | { success: false, error: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SIGNED_URL_TTL_SECONDS = 300 // 5 minutes

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('get-ebook-download missing Supabase env')
    return json({ success: false, error: 'Download service is not configured' }, 500)
  }

  try {
    const authHeader = req.headers.get('authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceKey)

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ success: false, error: 'Authentication required.' }, 401)
    }
    const userId = userData.user.id

    const body = await req.json().catch(() => null)
    const courseId = (body?.courseId || '').toString().trim()
    const path = (body?.path || '').toString().trim()
    if (!courseId || !path) {
      return json({ success: false, error: 'courseId and path are required.' }, 400)
    }

    // Path must live under the course's own folder — blocks an enrolled user of
    // course A from signing a URL for course B by passing a foreign path.
    if (path.split('/')[0] !== courseId) {
      return json({ success: false, error: 'File does not belong to this course.' }, 403)
    }

    // Authorize: admins/editors always; otherwise require an active enrollment.
    const { data: profile } = await serviceClient
      .from('users').select('role').eq('id', userId).maybeSingle()
    const isStaff = profile?.role === 'admin' || profile?.role === 'editor'

    if (!isStaff) {
      const { data: enrollment } = await serviceClient
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .maybeSingle()
      if (!enrollment) {
        return json({ success: false, error: 'You do not have access to this e-book.' }, 403)
      }
    }

    // Confirm the requested path is actually one of the course's e-book files.
    const { data: course } = await serviceClient
      .from('courses').select('ebook_files, ebook_pdf_url').eq('id', courseId).maybeSingle()
    const files: Array<{ url?: string; path?: string }> = Array.isArray(course?.ebook_files) ? course!.ebook_files : []
    const knownPaths = new Set<string>()
    for (const f of files) {
      if (f?.path) knownPaths.add(f.path)
      if (f?.url && !/^https?:\/\//i.test(f.url)) knownPaths.add(f.url)
    }
    if (course?.ebook_pdf_url && !/^https?:\/\//i.test(course.ebook_pdf_url)) {
      knownPaths.add(course.ebook_pdf_url)
    }
    if (knownPaths.size > 0 && !knownPaths.has(path)) {
      return json({ success: false, error: 'Unknown e-book file for this course.' }, 404)
    }

    const { data: signed, error: signError } = await serviceClient
      .storage.from('ebooks').createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (signError || !signed?.signedUrl) {
      console.error('createSignedUrl failed:', signError)
      return json({ success: false, error: 'Could not prepare the download.' }, 500)
    }

    return json({ success: true, url: signed.signedUrl })
  } catch (err) {
    console.error('get-ebook-download error:', err)
    return json({ success: false, error: 'Unexpected error preparing the download.' }, 500)
  }
})

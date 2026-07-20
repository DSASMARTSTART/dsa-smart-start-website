// Supabase Edge Function: send-contact-email
// Sends contact form submission notifications via Resend
// Deploy with: supabase functions deploy send-contact-email
//
// REQUIRED SECRETS (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY      - Your Resend.com API key
//   CONTACT_EMAIL_TO    - Email address to receive contact form submissions
//   SENDER_EMAIL        - Verified sender email in Resend (e.g. noreply@yourdomain.com)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactEmailRequest {
  firstName: string
  lastName: string
  email: string
  message: string
}

// Escape user-supplied text before putting it in an HTML email so a submitter
// cannot inject clickable links / markup / tracking pixels into the staff inbox.
function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Remove CR/LF and trim, for values that end up in a subject / reply-to header.
function oneLine(value: string): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Max contact submissions allowed per email address within the window.
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MIN = 10

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const CONTACT_EMAIL_TO = Deno.env.get('CONTACT_EMAIL_TO')
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'Eduway Academy <noreply@eduway.academy>'

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!CONTACT_EMAIL_TO) {
      console.error('CONTACT_EMAIL_TO not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Recipient email not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ContactEmailRequest = await req.json()
    const firstName = oneLine(body.firstName)
    const lastName = oneLine(body.lastName)
    const email = oneLine(body.email)
    const message = String(body.message ?? '').trim()

    if (!firstName || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: firstName, email, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please provide a valid email address.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is too long.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Rate limit (per email address) ─────────────────────────────────
    // Prevents scripting the endpoint to flood the office inbox or to bounce
    // auto-replies at an arbitrary victim address. Best-effort: if the check
    // can't run (no DB creds) we still send, but log it.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (supabaseUrl && serviceKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceKey)
        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .eq('email', email)
          .gte('created_at', windowStart)
        if ((count || 0) >= RATE_LIMIT_MAX) {
          console.warn(`Contact rate limit hit for ${email} (${count} in ${RATE_LIMIT_WINDOW_MIN}m)`)
          return new Response(
            JSON.stringify({ success: false, error: 'Too many messages. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (rlErr) {
        console.warn('Contact rate-limit check failed (allowing send):', rlErr)
      }
    }

    const fullName = escapeHtml(`${firstName} ${lastName || ''}`.trim())
    const safeEmail = escapeHtml(email)
    const safeMessage = escapeHtml(message)
    const safeFirstName = escapeHtml(firstName)

    // 1. Send notification to admin/support
    const adminEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [CONTACT_EMAIL_TO],
        reply_to: email,
        subject: `New Contact Form Message from ${fullName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000000;">
            <!-- Header -->
            <div style="background: #000000; padding: 30px; border-bottom: 2px solid #AB8FFF; text-align: center;">
              <span style="font-size: 24px; font-weight: 800; color: #ffffff;">EDU</span><span style="font-size: 24px; font-weight: 800; color: #AB8FFF;">WAY</span>
              <h1 style="color: #ffffff; margin: 12px 0 0; font-size: 22px;">📩 New Contact Form Submission</h1>
            </div>

            <!-- Body -->
            <div style="background: #111111; padding: 30px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; font-weight: bold; color: #AB8FFF; width: 100px; font-size: 14px;">Name:</td>
                  <td style="padding: 12px 0; color: #e0e0e0; font-size: 14px;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-weight: bold; color: #AB8FFF; font-size: 14px;">Email:</td>
                  <td style="padding: 12px 0;"><a href="mailto:${safeEmail}" style="color: #AB8FFF;">${safeEmail}</a></td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 20px 0;" />
              <h3 style="color: #AB8FFF; margin-bottom: 10px; font-size: 15px;">Message:</h3>
              <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #2a2a2a; white-space: pre-wrap; color: #e0e0e0; font-size: 14px; line-height: 1.6;">
${safeMessage}
              </div>
              <p style="color: #666666; font-size: 12px; margin-top: 20px;">
                You can reply directly to this email — it will go to ${safeEmail}.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #000000; padding: 16px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="color: #555555; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Eduway Academy
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!adminEmailRes.ok) {
      const errBody = await adminEmailRes.text()
      console.error('Resend API error (admin notification):', errBody)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send notification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Send auto-reply to the user
    const autoReplyRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [email],
        subject: `We received your message — Eduway Academy`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000000;">
            <!-- Header -->
            <div style="background: #000000; padding: 40px 30px 30px; text-align: center; border-bottom: 2px solid #AB8FFF;">
              <div style="margin-bottom: 16px;">
                <span style="font-size: 32px; font-weight: 800; color: #ffffff;">EDU</span><span style="font-size: 32px; font-weight: 800; color: #AB8FFF;">WAY</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Thank you, ${safeFirstName}! 🎉</h1>
            </div>

            <!-- Body -->
            <div style="background: #111111; padding: 32px 30px;">
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.7; margin-top: 0;">
                We've received your message and will get back to you as soon as possible — usually within 24 hours.
              </p>
              <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                In the meantime, feel free to explore our courses at
                <a href="https://eduway.academy" style="color: #AB8FFF;">eduway.academy</a>.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #000000; padding: 24px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px;">
                <a href="https://www.instagram.com/eduway.academy/" style="color: #AB8FFF; text-decoration: none;">Follow us on Instagram</a>
              </p>
              <p style="color: #666666; font-size: 12px; margin: 0 0 8px;">
                This is an automated response. Please do not reply to this email.
              </p>
              <p style="color: #555555; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Eduway Academy. All rights reserved.<br />
                Belgrade, Serbia
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!autoReplyRes.ok) {
      // Auto-reply failing is non-critical — log but don't fail the request
      const errBody = await autoReplyRes.text()
      console.warn('Resend API warning (auto-reply):', errBody)
    }

    console.log(`Contact email sent successfully: to=${CONTACT_EMAIL_TO}`)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-contact-email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

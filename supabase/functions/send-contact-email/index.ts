// Supabase Edge Function: send-contact-email
// Sends contact form submission notifications via Resend
// Deploy with: supabase functions deploy send-contact-email
//
// REQUIRED SECRETS (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY      - Your Resend.com API key
//   CONTACT_EMAIL_TO    - Email address to receive contact form submissions
//   SENDER_EMAIL        - Verified sender email in Resend (e.g. noreply@yourdomain.com)

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
    const { firstName, lastName, email, message } = body

    if (!firstName || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: firstName, email, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fullName = `${firstName} ${lastName || ''}`.trim()

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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8e); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📩 New Contact Form Submission</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #475569; width: 120px;">Name:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #475569;">Email:</td>
                  <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <h3 style="color: #475569; margin-bottom: 10px;">Message:</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; color: #1e293b;">
${message}
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
                You can reply directly to this email — it will go to ${email}.
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8e); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Thank you, ${firstName}! 🎉</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                We've received your message and will get back to you as soon as possible — usually within 24 hours.
              </p>
              <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                In the meantime, feel free to explore our courses at 
                <a href="https://eduway.academy" style="color: #2563eb;">eduway.academy</a>.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 12px;">
                This is an automated response. Please do not reply to this email.
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

    console.log(`Contact email sent successfully: from=${email}, to=${CONTACT_EMAIL_TO}`)

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

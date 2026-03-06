// Supabase Edge Function: send-welcome-email
// Sends a welcome email to new users after signup via Resend
// Deploy with: supabase functions deploy send-welcome-email
//
// REQUIRED SECRETS (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  - Your Resend.com API key
//   SENDER_EMAIL    - Verified sender email in Resend (e.g. noreply@yourdomain.com)
//
// Can be triggered from:
//   - Client-side after successful signup
//   - A Supabase database trigger/webhook on auth.users insert (recommended)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WelcomeEmailRequest {
  email: string
  name: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'Eduway Academy <noreply@eduway.academy>'

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: WelcomeEmailRequest = await req.json()
    const { email, name } = body

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const firstName = (name || 'there').split(' ')[0]

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [email],
        subject: `Welcome to Eduway Academy! �`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000000;">
            <!-- Header -->
            <div style="background: #000000; padding: 40px 30px 30px; text-align: center; border-bottom: 2px solid #AB8FFF;">
              <div style="margin-bottom: 16px;">
                <span style="font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">EDU</span><span style="font-size: 32px; font-weight: 800; color: #AB8FFF; letter-spacing: 1px;">WAY</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Welcome, ${firstName}! 🎉</h1>
              <p style="color: #AB8FFF; margin: 10px 0 0; font-size: 15px;">Your English learning journey starts here</p>
            </div>

            <!-- Body -->
            <div style="background: #111111; padding: 32px 30px;">
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.7; margin-top: 0;">
                Hi ${firstName},
              </p>
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.7;">
                Thank you for creating your account at Eduway Academy! We're thrilled to have you on board.
              </p>

              <!-- Feature cards -->
              <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #AB8FFF; margin-top: 0; font-size: 17px;">Here's what you can do next:</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 10px 0; color: #e0e0e0; font-size: 15px; border-bottom: 1px solid #2a2a2a;">
                      📚 <strong style="color: #ffffff;">Browse our courses</strong> — Find the perfect level for you
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #e0e0e0; font-size: 15px; border-bottom: 1px solid #2a2a2a;">
                      📝 <strong style="color: #ffffff;">Take the assessment</strong> — Discover your English level
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #e0e0e0; font-size: 15px; border-bottom: 1px solid #2a2a2a;">
                      📖 <strong style="color: #ffffff;">Check out our e-books</strong> — Extra resources to boost your skills
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #e0e0e0; font-size: 15px;">
                      💬 <strong style="color: #ffffff;">Contact us</strong> — We're here to help anytime
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://eduway.academy/#courses" 
                   style="display: inline-block; background: #AB8FFF; color: #000000; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
                  Explore Courses →
                </a>
              </div>

              <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                If you have any questions, don't hesitate to reach out. We're here to support you every step of the way.
              </p>

              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.7;">
                Happy learning! 🚀<br />
                <strong style="color: #AB8FFF;">The Eduway Academy Team</strong>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #000000; padding: 24px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px;">
                <a href="https://www.instagram.com/eduway.academy/" style="color: #AB8FFF; text-decoration: none;">Follow us on Instagram</a>
              </p>
              <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0 0 8px;">
                You're receiving this email because you signed up at 
                <a href="https://eduway.academy" style="color: #AB8FFF;">eduway.academy</a>. 
                If you didn't create this account, you can safely ignore this email.
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

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      console.error('Resend API error (welcome email):', errBody)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send welcome email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Welcome email sent to ${email} (name: ${name || 'N/A'})`)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-welcome-email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

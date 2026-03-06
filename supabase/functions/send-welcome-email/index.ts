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
        subject: `Welcome to Eduway Academy! 🇬🇧`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8e); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome, ${firstName}! 🎉</h1>
              <p style="color: #93c5fd; margin: 10px 0 0; font-size: 16px;">Your English learning journey starts here</p>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                Thank you for creating your account at Eduway Academy! We're thrilled to have you on board.
              </p>

              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #1e3a5f; margin-top: 0;">Here's what you can do next:</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 15px;">
                      📚 <strong>Browse our courses</strong> — Find the perfect level for you
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 15px;">
                      📝 <strong>Take the assessment</strong> — Discover your English level
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 15px;">
                      📖 <strong>Check out our e-books</strong> — Extra resources to boost your skills
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 15px;">
                      💬 <strong>Contact us</strong> — We're here to help anytime
                    </td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://eduway.academy/#courses" 
                   style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Explore Courses →
                </a>
              </div>

              <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                If you have any questions, don't hesitate to reach out. We're here to support you every step of the way.
              </p>

              <p style="color: #1e293b; font-size: 16px; line-height: 1.6;">
                Happy learning! 🚀<br />
                <strong>The Eduway Academy Team</strong>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
                You're receiving this email because you signed up at 
                <a href="https://eduway.academy" style="color: #2563eb;">eduway.academy</a>. 
                If you didn't create this account, you can safely ignore this email.
              </p>
            </div>
            <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
              © ${new Date().getFullYear()} Eduway Academy. All rights reserved.
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

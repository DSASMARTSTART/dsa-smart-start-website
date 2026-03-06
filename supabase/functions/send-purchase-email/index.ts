// Supabase Edge Function: send-purchase-email
// Sends purchase confirmation emails via Resend after successful payment
// Deploy with: supabase functions deploy send-purchase-email
//
// REQUIRED SECRETS (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  - Your Resend.com API key
//   SENDER_EMAIL    - Verified sender email in Resend (e.g. noreply@yourdomain.com)
//
// Called from:
//   - payment-webhook (after confirming a purchase)
//   - Client-side CheckoutPage (as a fallback after successful PayPal payment)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurchaseEmailRequest {
  userId: string
  purchaseIds?: string[]       // Specific purchase IDs to include
  transactionId?: string       // Or find purchases by transaction ID
  // Alternatively, pass details directly (for webhook calls)
  customerEmail?: string
  customerName?: string
  items?: Array<{
    courseName: string
    amount: number
    currency: string
    includesTeachingMaterials?: boolean
  }>
  totalAmount?: number
  paymentMethod?: string
  discountCode?: string
  discountAmount?: number
}

function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: PurchaseEmailRequest = await req.json()
    const { userId } = body

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve customer details
    let customerEmail = body.customerEmail
    let customerName = body.customerName
    let items = body.items
    let totalAmount = body.totalAmount
    const paymentMethod = body.paymentMethod || 'card'
    const discountCode = body.discountCode
    const discountAmount = body.discountAmount || 0

    // If items not provided directly, look up from DB
    if (!items || items.length === 0) {
      // Get user info
      const { data: userData } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (userData) {
        customerEmail = customerEmail || userData.email
        customerName = customerName || userData.name
      }

      // Get recent purchases
      let query = supabase
        .from('purchases')
        .select(`
          id,
          amount,
          original_amount,
          discount_amount,
          currency,
          payment_method,
          transaction_id,
          teaching_materials_included,
          teaching_materials_price,
          course_id,
          courses (title)
        `)
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false })

      if (body.transactionId) {
        query = query.eq('transaction_id', body.transactionId)
      } else if (body.purchaseIds && body.purchaseIds.length > 0) {
        query = query.in('id', body.purchaseIds)
      } else {
        // Fallback: get purchases from the last 5 minutes
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        query = query.gte('purchased_at', fiveMinAgo)
      }

      const { data: purchases, error: purchaseError } = await query

      if (purchaseError) {
        console.error('Error fetching purchases:', purchaseError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch purchase details' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!purchases || purchases.length === 0) {
        console.warn('No purchases found for email notification')
        return new Response(
          JSON.stringify({ success: false, error: 'No purchases found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      items = purchases.map((p: any) => ({
        courseName: p.courses?.title || 'Course',
        amount: Number(p.amount),
        currency: p.currency || 'EUR',
        includesTeachingMaterials: p.teaching_materials_included,
      }))

      totalAmount = purchases.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    }

    if (!customerEmail) {
      console.error('No customer email available')
      return new Response(
        JSON.stringify({ success: false, error: 'No customer email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currency = items[0]?.currency || 'EUR'
    const firstName = (customerName || 'there').split(' ')[0]
    const paymentMethodLabel = paymentMethod === 'paypal' ? 'PayPal' : 'Credit/Debit Card'

    // Send purchase confirmation email
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [customerEmail],
        subject: `Order Confirmation — Eduway Academy`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000000;">
            <!-- Header -->
            <div style="background: #000000; padding: 40px 30px 30px; text-align: center; border-bottom: 2px solid #AB8FFF;">
              <div style="margin-bottom: 16px;">
                <span style="font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">EDU</span><span style="font-size: 32px; font-weight: 800; color: #AB8FFF; letter-spacing: 1px;">WAY</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Thank you for your purchase! 🎉</h1>
            </div>

            <!-- Body -->
            <div style="background: #111111; padding: 32px 30px;">
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.7; margin-top: 0;">
                Hi ${firstName},
              </p>
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.7;">
                Your order has been confirmed. Here's a summary of your purchase:
              </p>

              <!-- Order Table -->
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #1a1a1a; border-radius: 8px; overflow: hidden; border: 1px solid #2a2a2a;">
                <thead>
                  <tr style="background: #1a1a1a;">
                    <th style="padding: 14px 12px; text-align: left; color: #AB8FFF; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #2a2a2a;">Item</th>
                    <th style="padding: 14px 12px; text-align: right; color: #AB8FFF; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #2a2a2a;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 14px 12px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0; font-size: 14px;">
                        ${item.courseName}
                        ${item.includesTeachingMaterials ? '<br><span style="color: #999999; font-size: 12px;">+ Teaching Materials</span>' : ''}
                      </td>
                      <td style="padding: 14px 12px; border-bottom: 1px solid #2a2a2a; text-align: right; color: #e0e0e0; white-space: nowrap; font-size: 14px;">
                        ${formatCurrency(item.amount, item.currency)}
                      </td>
                    </tr>
                  `).join('')}
                  ${discountAmount > 0 ? `
                    <tr>
                      <td style="padding: 14px 12px; border-bottom: 1px solid #2a2a2a; color: #4ade80; font-size: 14px;">
                        Discount${discountCode ? ` (${discountCode})` : ''}
                      </td>
                      <td style="padding: 14px 12px; border-bottom: 1px solid #2a2a2a; text-align: right; color: #4ade80; white-space: nowrap; font-size: 14px;">
                        -${formatCurrency(discountAmount, currency)}
                      </td>
                    </tr>
                  ` : ''}
                  <tr style="background: #0a0a0a;">
                    <td style="padding: 16px 12px; font-weight: bold; color: #ffffff; font-size: 16px;">Total</td>
                    <td style="padding: 16px 12px; text-align: right; font-weight: bold; color: #AB8FFF; font-size: 16px; white-space: nowrap;">
                      ${formatCurrency(totalAmount || 0, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style="color: #999999; font-size: 14px;">
                <strong style="color: #e0e0e0;">Payment method:</strong> ${paymentMethodLabel}
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://eduway.academy/#dashboard" 
                   style="display: inline-block; background: #AB8FFF; color: #000000; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
                  Go to My Dashboard →
                </a>
              </div>

              <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                Your courses are now available in your dashboard. You can start learning right away!
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #000000; padding: 24px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px;">
                <a href="https://www.instagram.com/eduway.academy/" style="color: #AB8FFF; text-decoration: none;">Follow us on Instagram</a>
              </p>
              <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0 0 8px;">
                If you have any questions about your purchase, please contact us at 
                <a href="mailto:office@eduway.academy" style="color: #AB8FFF;">office@eduway.academy</a>.
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
      console.error('Resend API error (purchase confirmation):', errBody)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send confirmation email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Purchase confirmation email sent to ${customerEmail} (${items.length} item(s), ${formatCurrency(totalAmount || 0, currency)})`)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-purchase-email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

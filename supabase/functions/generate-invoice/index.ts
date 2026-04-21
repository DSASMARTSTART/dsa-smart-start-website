// Supabase Edge Function: generate-invoice
// Generates a legally-formatted HTML invoice for a completed purchase (cart order),
// persists an immutable `invoices` row, and emails it to the customer (To:)
// with the accountant address(es) in BCC, via Resend.
//
// Deploy with: supabase functions deploy generate-invoice
//
// REQUIRED SECRETS (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY           - Resend.com API key
//   SUPABASE_URL             - (auto)
//   SUPABASE_SERVICE_ROLE_KEY- (auto)
//
// Input:
//   { transactionId: string, userId?: string, paymentMethod?: string }
//
// Idempotency:
//   If an invoice already exists for transactionId, we do NOT create a new one.
//   Pass `resend: true` to re-send the existing invoice email.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceRequest {
  transactionId: string
  userId?: string
  paymentMethod?: string
  resend?: boolean
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtRsd(n: number): string {
  return new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n) + ' RSD'
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderInvoiceHtml(inv: any): string {
  const seller = inv.seller_snapshot || {}
  const buyerCompanyLine = inv.buyer_company_name
    ? `<div style="font-weight:700;">${escapeHtml(inv.buyer_company_name)}</div>`
    : ''
  const buyerPibLine = inv.buyer_pib
    ? `<div>Tax ID (PIB): ${escapeHtml(inv.buyer_pib)}</div>`
    : ''
  const buyerVatLine = inv.buyer_vat_id
    ? `<div>VAT ID: ${escapeHtml(inv.buyer_vat_id)}</div>`
    : ''

  const items = (inv.line_items as Array<{
    description: string
    qty: number
    unit_price_net_eur: number
    vat_rate: number
    vat_amount_eur: number
    total_eur: number
  }>) || []

  const itemRows = items.map((it) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${escapeHtml(it.description)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:center;">${it.qty}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;">${fmtEur(it.unit_price_net_eur)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;">${it.vat_rate.toFixed(0)}%</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;">${fmtEur(it.vat_amount_eur)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;font-weight:700;">${fmtEur(it.total_eur)}</td>
    </tr>`).join('')

  const vatRegisteredNote = inv.vat_registered
    ? `VAT (${Number(inv.vat_rate).toFixed(0)}%) included as per Serbian Law on VAT.`
    : `VAT not calculated (seller not in VAT system, per Art. 33 of the Law on VAT).`

  const issued = new Date(inv.issued_at).toISOString().slice(0, 10)
  const paidAt = inv.paid_at ? new Date(inv.paid_at).toISOString().slice(0, 10) : issued

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(inv.invoice_number)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:680px;margin:0 auto;background:#ffffff;padding:0;">

  <!-- Header -->
  <div style="background:#111827;color:#ffffff;padding:28px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:top;">
          <div style="font-size:22px;font-weight:800;letter-spacing:1px;">
            <span style="color:#ffffff;">EDU</span><span style="color:#AB8FFF;">WAY</span>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${escapeHtml(seller.legal_name || '')}</div>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <div style="font-size:13px;letter-spacing:3px;color:#AB8FFF;text-transform:uppercase;">Invoice · Račun</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px;">${escapeHtml(inv.invoice_number)}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Issued: ${issued}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Seller / Buyer -->
  <div style="padding:28px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:top;width:50%;padding-right:16px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin-bottom:8px;">Seller / Prodavac</div>
          <div style="font-size:14px;color:#111827;font-weight:700;">${escapeHtml(seller.legal_name || '')}</div>
          <div style="font-size:12px;color:#374151;line-height:1.6;margin-top:4px;">
            ${escapeHtml(seller.address || '')}<br/>
            ${escapeHtml(seller.postal_code || '')} ${escapeHtml(seller.city || '')}<br/>
            ${escapeHtml(seller.country || '')}
            ${seller.pib ? `<br/>PIB: ${escapeHtml(seller.pib)}` : ''}
            ${seller.maticni_broj ? `<br/>MB: ${escapeHtml(seller.maticni_broj)}` : ''}
            ${seller.vat_id ? `<br/>VAT ID: ${escapeHtml(seller.vat_id)}` : ''}
            ${seller.email ? `<br/>${escapeHtml(seller.email)}` : ''}
          </div>
        </td>
        <td style="vertical-align:top;width:50%;padding-left:16px;border-left:1px solid #e5e7eb;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin-bottom:8px;">Buyer / Kupac</div>
          ${buyerCompanyLine}
          <div style="font-size:14px;color:#111827;font-weight:${inv.buyer_company_name ? '400' : '700'};">${escapeHtml(inv.buyer_name)}</div>
          <div style="font-size:12px;color:#374151;line-height:1.6;margin-top:4px;">
            ${inv.buyer_address ? `${escapeHtml(inv.buyer_address)}<br/>` : ''}
            ${inv.buyer_postal_code ? `${escapeHtml(inv.buyer_postal_code)} ` : ''}${inv.buyer_city ? `${escapeHtml(inv.buyer_city)}<br/>` : ''}
            ${inv.buyer_country ? `${escapeHtml(inv.buyer_country)}<br/>` : ''}
            ${escapeHtml(inv.buyer_email)}
            ${buyerPibLine}
            ${buyerVatLine}
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Line Items -->
  <div style="padding:0 36px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Description</th>
          <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Qty</th>
          <th style="padding:10px 8px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Unit (net)</th>
          <th style="padding:10px 8px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">VAT %</th>
          <th style="padding:10px 8px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">VAT</th>
          <th style="padding:10px 8px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <!-- Totals (dual currency) -->
  <div style="padding:16px 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="width:55%;vertical-align:top;padding-right:16px;">
          <div style="font-size:11px;color:#6b7280;line-height:1.6;">
            ${vatRegisteredNote}<br/>
            Exchange rate: 1 EUR = ${Number(inv.exchange_rate).toFixed(4)} RSD<br/>
            Place of issue: ${escapeHtml(seller.city || '')}, ${escapeHtml(seller.country || '')}<br/>
            Payment method: ${escapeHtml(inv.payment_method || '—')}${inv.transaction_id ? ` · Ref: ${escapeHtml(inv.transaction_id)}` : ''}<br/>
            Paid on: ${paidAt}
          </div>
        </td>
        <td style="width:45%;vertical-align:top;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#6b7280;">Subtotal (net)</td>
              <td style="padding:6px 0;font-size:12px;color:#111827;text-align:right;">${fmtEur(Number(inv.subtotal_eur))}</td>
              <td style="padding:6px 0 6px 12px;font-size:11px;color:#9ca3af;text-align:right;">${fmtRsd(Number(inv.subtotal_rsd))}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#6b7280;">VAT (${Number(inv.vat_rate).toFixed(0)}%)</td>
              <td style="padding:6px 0;font-size:12px;color:#111827;text-align:right;">${fmtEur(Number(inv.vat_amount_eur))}</td>
              <td style="padding:6px 0 6px 12px;font-size:11px;color:#9ca3af;text-align:right;">${fmtRsd(Number(inv.vat_amount_rsd))}</td>
            </tr>
            <tr style="border-top:2px solid #111827;">
              <td style="padding:10px 0 6px;font-size:14px;color:#111827;font-weight:800;">Total</td>
              <td style="padding:10px 0 6px;font-size:16px;color:#111827;font-weight:800;text-align:right;">${fmtEur(Number(inv.total_eur))}</td>
              <td style="padding:10px 0 6px 12px;font-size:13px;color:#6b7280;text-align:right;font-weight:700;">${fmtRsd(Number(inv.total_rsd))}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding:4px 0 0;font-size:10px;color:#9ca3af;text-align:right;">
                Charged in ${escapeHtml(inv.currency_charged)} · Status: <strong style="color:#059669;">PAID</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div style="padding:20px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <div style="font-size:10px;color:#6b7280;line-height:1.6;">
      ${seller.iban ? `Bank: ${escapeHtml(seller.bank_name || '')} · IBAN: ${escapeHtml(seller.iban)}<br/>` : ''}
      This invoice was issued electronically and is valid without a signature or seal, per Art. 9 of the Serbian Law on Accounting.<br/>
      Questions? Contact <a href="mailto:${escapeHtml(seller.email || '')}" style="color:#7c3aed;">${escapeHtml(seller.email || '')}</a>
    </div>
  </div>

</div>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: InvoiceRequest = await req.json()
    const { transactionId, paymentMethod, resend } = body
    if (!transactionId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing transactionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Load settings ──
    const { data: settings, error: settingsErr } = await supabase
      .from('app_settings').select('*').eq('id', 'singleton').single()
    if (settingsErr || !settings) {
      console.error('app_settings missing:', settingsErr)
      return new Response(JSON.stringify({ success: false, error: 'App settings not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Check for existing invoice (idempotency) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingInv } = await supabase
      .from('invoices').select('*').eq('transaction_id', transactionId).maybeSingle()

    let invoice = existingInv
    if (!invoice) {
      // ── Load completed purchases for this transaction ──
      const { data: purchases, error: purchErr } = await supabase
        .from('purchases')
        .select(`
          id, user_id, amount, original_amount, discount_amount, currency,
          payment_method, transaction_id, purchased_at, status,
          teaching_materials_included, teaching_materials_price,
          billing_name, billing_address, billing_city, billing_postal_code,
          billing_country, billing_company_name, billing_pib, billing_vat_id,
          course_id, courses(title)
        `)
        .eq('transaction_id', transactionId)

      if (purchErr || !purchases || purchases.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'No purchases found for transaction' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Allow issuing only for completed purchases (at least one must be completed)
      const anyCompleted = purchases.some((p: Record<string, unknown>) => p.status === 'completed')
      if (!anyCompleted) {
        return new Response(JSON.stringify({ success: false, error: 'Transaction not yet completed' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // ── Buyer info: prefer billing snapshot on purchases; fall back to user record ──
      const firstP = purchases[0] as Record<string, unknown> & { user_id: string }
      const { data: userRow } = await supabase
        .from('users').select('email, name').eq('id', firstP.user_id).single()

      const buyerName = (firstP.billing_name as string) || userRow?.name || 'Customer'
      const buyerEmail = userRow?.email || ''

      // ── Compute totals ──
      const vatRate: number = Number(settings.vat_rate) || 20
      const vatRegistered: boolean = !!settings.vat_registered
      const exchangeRate: number = Number(settings.eur_to_rsd_rate) || 117.15

      // Each purchase row amount = final price after discount. Treat that as gross (VAT-inclusive).
      // Net = gross / (1 + vatRate/100); VAT = gross - net. If not VAT-registered, VAT = 0, net = gross.
      const lineItems = purchases.map((p: Record<string, unknown>) => {
        const gross = Number(p.amount) || 0
        const net = vatRegistered ? round2(gross / (1 + vatRate / 100)) : round2(gross)
        const vat = round2(gross - net)
        const courseTitle = (p as { courses?: { title?: string } }).courses?.title || 'Course'
        const tmIncluded = (p as { teaching_materials_included?: boolean }).teaching_materials_included
        const desc = tmIncluded ? `${courseTitle} (incl. Teaching Materials)` : courseTitle
        return {
          description: desc,
          qty: 1,
          unit_price_net_eur: net,
          vat_rate: vatRegistered ? vatRate : 0,
          vat_amount_eur: vat,
          total_eur: gross,
        }
      })

      const subtotalEur = round2(lineItems.reduce((s, it) => s + it.unit_price_net_eur, 0))
      const vatAmountEur = round2(lineItems.reduce((s, it) => s + it.vat_amount_eur, 0))
      const totalEur = round2(subtotalEur + vatAmountEur)
      const subtotalRsd = round2(subtotalEur * exchangeRate)
      const vatAmountRsd = round2(vatAmountEur * exchangeRate)
      const totalRsd = round2(totalEur * exchangeRate)

      // ── Allocate invoice number ──
      const year = new Date().getUTCFullYear()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: numData, error: numErr } = await supabase.rpc('next_invoice_number', { p_year: year }) as any
      if (numErr || !numData || !numData[0]) {
        console.error('next_invoice_number failed:', numErr)
        return new Response(JSON.stringify({ success: false, error: 'Failed to allocate invoice number' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { invoice_number, year: numYear, sequence } = numData[0]

      const sellerSnapshot = {
        legal_name: settings.company_legal_name,
        address: settings.company_address,
        city: settings.company_city,
        postal_code: settings.company_postal_code,
        country: settings.company_country,
        pib: settings.company_pib,
        maticni_broj: settings.company_maticni_broj,
        vat_id: settings.company_vat_id,
        phone: settings.company_phone,
        email: settings.company_email,
        iban: settings.company_iban,
        bank_name: settings.company_bank_name,
      }

      const currencyCharged = (firstP as { currency?: string }).currency || 'EUR'
      const methodLabel = paymentMethod || (firstP as { payment_method?: string }).payment_method || 'card'
      const paidAt = (firstP as { purchased_at?: string }).purchased_at || new Date().toISOString()

      const { data: inserted, error: insErr } = await supabase
        .from('invoices')
        .insert({
          invoice_number,
          invoice_year: numYear,
          invoice_sequence: sequence,
          transaction_id: transactionId,
          user_id: firstP.user_id,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_address: firstP.billing_address as string | null,
          buyer_city: firstP.billing_city as string | null,
          buyer_postal_code: firstP.billing_postal_code as string | null,
          buyer_country: firstP.billing_country as string | null,
          buyer_company_name: firstP.billing_company_name as string | null,
          buyer_pib: firstP.billing_pib as string | null,
          buyer_vat_id: firstP.billing_vat_id as string | null,
          seller_snapshot: sellerSnapshot,
          line_items: lineItems,
          currency_charged: currencyCharged,
          exchange_rate: exchangeRate,
          subtotal_eur: subtotalEur,
          vat_amount_eur: vatAmountEur,
          total_eur: totalEur,
          subtotal_rsd: subtotalRsd,
          vat_amount_rsd: vatAmountRsd,
          total_rsd: totalRsd,
          vat_rate: vatRegistered ? vatRate : 0,
          vat_registered: vatRegistered,
          payment_method: methodLabel,
          paid_at: paidAt,
        })
        .select()
        .single()

      if (insErr || !inserted) {
        console.error('Failed to insert invoice:', insErr)
        return new Response(JSON.stringify({ success: false, error: 'Failed to create invoice' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      invoice = inserted
    } else if (!resend) {
      // Invoice exists, caller didn't request resend — return info without sending.
      return new Response(JSON.stringify({ success: true, invoice, alreadyExists: true, skippedEmail: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Render & send ──
    const html = renderInvoiceHtml(invoice)
    const subject = `Invoice ${invoice.invoice_number} · Eduway Academy`
    const accountantEmails: string[] = Array.isArray(settings.accountant_emails)
      ? settings.accountant_emails.filter((e: string) => !!e)
      : []

    const emailPayload: Record<string, unknown> = {
      from: settings.invoice_email_from,
      to: [invoice.buyer_email],
      subject,
      html,
    }
    if (settings.invoice_email_reply_to) emailPayload.reply_to = settings.invoice_email_reply_to
    if (accountantEmails.length > 0) emailPayload.bcc = accountantEmails

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    })

    const now = new Date().toISOString()
    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      console.error('Resend API error (invoice):', errBody)
      await supabase.from('invoices').update({ email_error: errBody.slice(0, 500) }).eq('id', invoice.id)
      return new Response(JSON.stringify({ success: false, error: 'Failed to send invoice email', invoice }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('invoices').update({
      email_sent_to_customer_at: now,
      email_sent_to_accountant_at: accountantEmails.length > 0 ? now : null,
      email_error: null,
    }).eq('id', invoice.id)

    console.log(`Invoice ${invoice.invoice_number} sent to ${invoice.buyer_email} (BCC: ${accountantEmails.length})`)
    return new Response(JSON.stringify({ success: true, invoice }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('generate-invoice error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

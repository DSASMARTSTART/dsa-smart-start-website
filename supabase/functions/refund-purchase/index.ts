// Supabase Edge Function: refund-purchase
// Admin-only. Records a (full or partial) refund against a purchase with strict
// guards (no double-refund, no over-refund), revokes course access on a full
// refund, and writes an audit-log entry — all atomically via the record_refund
// SECURITY DEFINER RPC.
//
// ⚠️ PROVIDER MONEY MOVEMENT: the actual refund at Raiffeisen RaiAccept must be
// triggered here BEFORE record_refund is called, using RaiAccept's refund API.
// That endpoint is not yet confirmed against the bank's documentation, so this
// function currently supports two modes via REFUND_MODE:
//   - "manual"  (default): the admin has already refunded in the RaiAccept
//                merchant portal; this call only records it + revokes access.
//   - "auto":   attempts the provider refund call first (endpoint must be filled
//                in below once confirmed with the bank) and aborts if it fails.
// Set REFUND_MODE=auto only after the provider call is implemented and tested.
//
// Deploy: supabase functions deploy refund-purchase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
  const refundMode = (Deno.env.get('REFUND_MODE') || 'manual').toLowerCase()
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('refund-purchase missing Supabase env')
    return json({ success: false, error: 'Refund service is not configured' }, 500)
  }

  try {
    // ── Verify the caller is an admin ──────────────────────────────────
    const authHeader = req.headers.get('authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceKey)

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return json({ success: false, error: 'Authentication required.' }, 401)
    }
    const adminId = userData.user.id
    const { data: profile } = await serviceClient
      .from('users').select('role').eq('id', adminId).maybeSingle()
    if (profile?.role !== 'admin') {
      return json({ success: false, error: 'Admin role required.' }, 403)
    }

    // ── Parse + validate input ─────────────────────────────────────────
    const body = await req.json().catch(() => null)
    const purchaseId = (body?.purchaseId || '').toString().trim()
    const amount = Number(body?.amount)
    const reason = body?.reason ? String(body.reason).slice(0, 500) : null
    let providerRef = body?.providerRef ? String(body.providerRef).slice(0, 200) : null
    if (!purchaseId) return json({ success: false, error: 'purchaseId is required.' }, 400)
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ success: false, error: 'A positive refund amount is required.' }, 400)
    }

    // Load the purchase for the provider call + sanity checks.
    const { data: purchase, error: pErr } = await serviceClient
      .from('purchases')
      .select('id, amount, refunded_amount, status, transaction_id, payment_method, currency')
      .eq('id', purchaseId)
      .maybeSingle()
    if (pErr || !purchase) return json({ success: false, error: 'Purchase not found.' }, 404)

    // ── Provider money movement ────────────────────────────────────────
    if (refundMode === 'auto') {
      // TODO: implement the RaiAccept refund API call here using the merchant
      // credentials + purchase.transaction_id, and abort on failure:
      //   const ok = await raiAcceptRefund(purchase.transaction_id, amount, currency)
      //   if (!ok) return json({ success:false, error:'Provider refund failed' }, 502)
      // Until the endpoint is confirmed with the bank, 'auto' is not available.
      return json({
        success: false,
        error: 'Automated provider refund is not configured. Refund in the RaiAccept portal and use manual mode.',
        code: 'auto_refund_not_implemented',
      }, 501)
    }
    // manual mode: the admin has refunded in the RaiAccept portal; record it here.
    if (!providerRef) providerRef = `manual:${adminId}`

    // ── Record atomically (guards double/over-refund, revokes access, audits) ──
    const { data: result, error: rErr } = await serviceClient.rpc('record_refund', {
      p_purchase_id: purchaseId,
      p_amount: amount,
      p_provider_ref: providerRef,
      p_reason: reason,
      p_admin_id: adminId,
    })
    if (rErr) {
      console.error('record_refund failed:', rErr)
      return json({ success: false, error: 'Could not record the refund.' }, 500)
    }
    if (!result?.success) {
      return json({ success: false, error: result?.error || 'Refund rejected.' }, 400)
    }

    return json({ success: true, ...result })
  } catch (err) {
    console.error('refund-purchase error:', err)
    return json({ success: false, error: 'Unexpected error processing the refund.' }, 500)
  }
})

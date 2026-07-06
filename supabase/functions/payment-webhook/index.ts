// Supabase Edge Function for Payment Webhook Verification
// Handles callbacks from RaiAccept (card payments) and PayPal
// Deploy with: supabase functions deploy payment-webhook
//
// RaiAccept webhook sends JSON POST to: /functions/v1/payment-webhook?provider=raiaccept
// PayPal webhook sends JSON POST to: /functions/v1/payment-webhook?provider=paypal

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RaiAccept API constants (same as in create-raiaccept-session)
const AUTH_URL = 'https://authenticate.raiaccept.com';
const API_URL = 'https://trapi.raiaccept.com';
const AUTH_CLIENT_ID = 'kr2gs4117arvbnaperqff5dml';

// Authenticate with RaiAccept to verify order status
async function getRaiAcceptToken(): Promise<string | null> {
  const username = Deno.env.get('RAIACCEPT_API_USERNAME');
  const password = Deno.env.get('RAIACCEPT_API_PASSWORD');
  if (!username || !password) return null;

  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: username, PASSWORD: password },
        ClientId: AUTH_CLIENT_ID,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.AuthenticationResult?.IdToken || null;
  } catch {
    return null;
  }
}

// Verify order status by calling RaiAccept Retrieve Order Details API
async function verifyRaiAcceptOrder(
  token: string,
  orderIdentification: string
): Promise<{ status: string; merchantOrderReference: string } | null> {
  try {
    const response = await fetch(`${API_URL}/orders/${orderIdentification}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      console.error('RaiAccept verify order failed:', response.status);
      return null;
    }
    const data = await response.json();
    return {
      status: data?.status || '',
      merchantOrderReference: data?.invoice?.merchantOrderReference || '',
    };
  } catch (err) {
    console.error('RaiAccept verify order error:', err);
    return null;
  }
}

const RAIACCEPT_PAID_STATUSES = ['PAID', 'SUCCESS'];

// Validate required env up-front. Missing secrets are an operator config
// problem, not a customer-facing one — surface a generic 500 to the
// provider so it can retry, but log loudly for the dashboard.
function getRequiredEnv(): { url: string; key: string } | { error: string } {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const missing: string[] = []
  if (!url) missing.push('SUPABASE_URL')
  if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missing.length > 0) {
    return { error: `Missing required edge function secrets: ${missing.join(', ')}` }
  }
  return { url, key }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const env = getRequiredEnv()
  if ('error' in env) {
    console.error('payment-webhook env config error:', env.error)
    return new Response(
      JSON.stringify({ success: false, error: 'Webhook receiver is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = env.url
    const supabaseServiceKey = env.key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const provider = url.searchParams.get('provider') || 'raiaccept'

    let transactionId: string | null = null
    let isSuccess = false
    // Set when RaiAccept says "paid" in the raw payload but we were unable to
    // independently re-verify it (no creds, or the merchant API was unreachable).
    // Such a claim is NEVER auto-confirmed — it is orphaned for admin reconciliation.
    let raiaUnverifiedPaidClaim = false
    let providerResponse: Record<string, unknown> = {}
    // Number of items the provider says were paid for in this single
    // transaction. Used to detect partial confirmation (multi-item txns).
    let providerItemCount = 1

    // ── RaiAccept webhook (JSON POST) ──────────────────────────────────
    if (provider === 'raiaccept' && req.method === 'POST') {
      const body = await req.json()
      providerResponse = body

      // RaiAccept notification webhook structure:
      // { order: { orderIdentification, invoice: { merchantOrderReference, ... }, ... },
      //   transaction: { transactionId, status, ... },
      //   merchant: { ... },
      //   card: { ... } }
      const orderIdentification = body?.order?.orderIdentification || ''
      const webhookTransactionId = body?.transaction?.transactionId || ''
      const transactionStatus = body?.transaction?.status || ''
      const merchantOrderReference =
        body?.order?.invoice?.merchantOrderReference ||
        body?.invoice?.merchantOrderReference || ''

      // Log raw provider + transactionId immediately for audit (Phase 2 plan).
      const raiaItems = body?.order?.invoice?.items || body?.invoice?.items || []
      providerItemCount = Array.isArray(raiaItems) && raiaItems.length > 0 ? raiaItems.length : 1
      console.log(`[webhook:raiaccept] order=${orderIdentification} tx=${webhookTransactionId} status=${transactionStatus} merchantRef=${merchantOrderReference} items=${providerItemCount}`)

      // Use merchantOrderReference as our transactionId (matches our orderId from checkout)
      transactionId = merchantOrderReference || orderIdentification

      // SECURITY: Verify the order status by calling RaiAccept API directly
      // Don't just trust the webhook payload — call Retrieve Order Details to confirm
      const payloadClaimsPaid = RAIACCEPT_PAID_STATUSES.includes(transactionStatus.toUpperCase())
      const token = await getRaiAcceptToken()
      if (token && orderIdentification) {
        const verified = await verifyRaiAcceptOrder(token, orderIdentification)
        if (verified) {
          console.log(`RaiAccept API-verified order status: ${verified.status}`)
          isSuccess = RAIACCEPT_PAID_STATUSES.includes(verified.status.toUpperCase())
          if (verified.merchantOrderReference) {
            transactionId = verified.merchantOrderReference
          }
        } else {
          // SECURITY: the merchant API re-fetch failed. We must NOT trust the raw
          // webhook body — a forged POST could otherwise confirm a purchase. Leave
          // isSuccess=false; if the payload *claimed* paid, flag it for orphaning so
          // an admin can reconcile against the RaiAccept portal.
          console.warn('RaiAccept API verification failed — NOT trusting webhook payload')
          if (payloadClaimsPaid) raiaUnverifiedPaidClaim = true
        }
      } else {
        // No credentials / no order id → cannot verify. Same policy: never confirm
        // on an unverified paid claim.
        console.warn('RaiAccept verification unavailable (missing creds or orderIdentification) — NOT trusting webhook payload')
        if (payloadClaimsPaid) raiaUnverifiedPaidClaim = true
      }

    // ── PayPal webhook (JSON POST) ─────────────────────────────────────
    } else if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        const body = await req.json()
        providerResponse = body

        if (body.event_type) {
          // PayPal sends different IDs depending on the event type:
          // - PAYMENT.CAPTURE.COMPLETED: resource.id is the capture ID
          // - CHECKOUT.ORDER.APPROVED: resource.id is the order ID  
          // Try multiple fields to find the transaction ID that matches our purchase
          transactionId = body.resource?.id || 
                          body.resource?.invoice_id || 
                          body.resource?.supplementary_data?.related_ids?.order_id ||
                          body.resource?.purchase_units?.[0]?.reference_id ||
                          null
          isSuccess = body.event_type === 'PAYMENT.CAPTURE.COMPLETED' ||
                      body.event_type === 'CHECKOUT.ORDER.APPROVED'
          const units = body.resource?.purchase_units
          if (Array.isArray(units) && units.length > 0) providerItemCount = units.length
          console.log(`[webhook:paypal] event=${body.event_type} tx=${transactionId} units=${providerItemCount}`)
        }
      }

    // ── GET callback (legacy / redirect-based) ─────────────────────────
    } else if (req.method === 'GET') {
      const params = Object.fromEntries(url.searchParams)
      providerResponse = params
      transactionId = params.oid || params.transactionId || params.tx || null
      isSuccess = params.status === 'success'
    }

    // Helper: record an unmatched-but-paid event so admins can manually
    // reconcile (refund or grant access). Best-effort — never throw.
    // Defined before first use (the missing_transaction_id path below) so it is
    // not called inside its own temporal dead zone.
    const recordOrphan = async (
      reason: string,
      notes: string,
      extra: Record<string, unknown> = {}
    ) => {
      try {
        const resource = (providerResponse as Record<string, any>)?.resource || {}
        const order = (providerResponse as Record<string, any>)?.order || {}
        const txn = (providerResponse as Record<string, any>)?.transaction || {}
        const consumer = order?.consumer || resource?.payer || {}
        const invoice = order?.invoice || resource?.purchase_units?.[0] || {}

        const orphan = {
          provider,
          transaction_id: transactionId,
          order_identification: order?.orderIdentification || resource?.id || null,
          merchant_order_reference:
            order?.invoice?.merchantOrderReference ||
            resource?.purchase_units?.[0]?.reference_id ||
            null,
          amount: Number(invoice?.amount ?? resource?.amount?.value ?? txn?.amount ?? 0) || null,
          currency: invoice?.currency || resource?.amount?.currency_code || null,
          customer_email:
            consumer?.email ||
            consumer?.email_address ||
            resource?.payer?.email_address ||
            null,
          customer_name: [consumer?.firstName, consumer?.lastName].filter(Boolean).join(' ') || null,
          reason,
          notes,
          provider_response: providerResponse,
          ...extra,
        }
        const { error: orphanErr } = await supabase.from('payment_orphans').insert(orphan)
        if (orphanErr) {
          console.error('Failed to record payment orphan:', orphanErr)
        } else {
          console.warn('Recorded payment orphan for manual reconciliation:', reason, transactionId)
        }
      } catch (err) {
        console.error('recordOrphan threw:', err)
      }
    }

    // ── Process the result ─────────────────────────────────────────────
    if (!transactionId) {
      // Record as orphan so an admin can investigate, then ACK 200 so the
      // provider does not retry forever (Phase 2: always-200 policy).
      console.error('No transaction ID in webhook payload:', JSON.stringify(providerResponse).substring(0, 500))
      await recordOrphan(
        'missing_transaction_id',
        'Webhook payload had no recognizable transaction/order identifier.'
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Missing transaction ID — recorded for review' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing webhook: provider=${provider}, transactionId=${transactionId}, success=${isSuccess}`)

    // Helper: did the RPC confirm at least one row, AND did it cover every
    // item the provider charged for? Treat partial confirmation as orphaned
    // remainder so admins can reconcile.
    const isFullyConfirmed = (data: any): boolean => {
      if (!data?.success) return false
      const confirmed = Number(data.purchases_confirmed ?? 0)
      return confirmed > 0 && confirmed >= providerItemCount
    }

    // SECURITY GATE (audit B2): a RaiAccept webhook claimed the order was paid but
    // we could not independently verify it via the merchant API. Do NOT confirm the
    // purchase from an unverifiable payload — record an orphan and ACK 200. If the
    // charge is real, the dashboard self-heal / admin orphan UI will reconcile it.
    if (raiaUnverifiedPaidClaim) {
      await recordOrphan(
        'raiaccept_unverified_paid_claim',
        'RaiAccept webhook reported a paid status but the merchant-API re-verification ' +
          'could not be performed (missing credentials or API unreachable). Not auto-confirmed. ' +
          'Verify the charge in the RaiAccept merchant portal and reconcile manually.'
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Payment could not be verified — recorded for review' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result
    if (isSuccess) {
      const { data, error } = await supabase.rpc('confirm_purchase_webhook', {
        p_transaction_id: transactionId,
        p_provider_response: providerResponse
      })

      if (error) {
        // Includes RAISE EXCEPTION from partial-failure rollback inside the RPC.
        console.error('Error confirming purchase:', error)
        await recordOrphan(
          'rpc_error',
          `confirm_purchase_webhook returned error: ${error.message}`
        )
        result = { success: false, error: error.message }
      } else if (data?.success && !isFullyConfirmed(data)) {
        // Partial confirmation — provider charged for N items but we only
        // matched M < N pending purchases. Record the gap as an orphan.
        const confirmed = Number(data.purchases_confirmed ?? 0)
        console.warn(`Partial confirmation: confirmed=${confirmed}, providerItems=${providerItemCount}, tx=${transactionId}`)
        await recordOrphan(
          'partial_confirmation',
          `Provider charged for ${providerItemCount} item(s) but only ${confirmed} pending purchase(s) matched.`,
          { merchant_order_reference: transactionId }
        )
        result = data
      } else if (!data?.success) {
        // Purchase not found by transaction_id — try broader lookup
        // This handles PayPal where the webhook sends a different ID (capture ID)
        // than our orderId stored in the purchase row
        console.warn(`Purchase not found for transactionId=${transactionId}, attempting user+course fallback...`)
        
        // Extract user/course info from provider response for fallback matching
        // PayPal: reference_id in purchase_units contains our orderId
        // RaiAccept: merchantOrderReference contains our orderId
        let fallbackUserId: string | null = null
        let fallbackCourseId: string | null = null
        
        if (provider === 'paypal' || !provider) {
          // Try to find the pending purchase by PayPal's reference_id (our orderId)
          const resource = providerResponse?.resource as Record<string, any> | undefined
          const purchaseUnits = (resource?.purchase_units || []) as Array<Record<string, any>>
          const referenceId = purchaseUnits[0]?.reference_id ||
                              resource?.supplementary_data?.related_ids?.order_id ||
                              resource?.invoice_id || null
          
          if (referenceId) {
            // Try confirming with the reference_id instead
            console.log(`PayPal fallback: trying reference_id=${referenceId} as transaction_id`)
            const { data: refData, error: refError } = await supabase.rpc('confirm_purchase_webhook', {
              p_transaction_id: referenceId,
              p_provider_response: providerResponse
            })
            
            if (!refError && refData?.success) {
              console.log('PayPal fallback succeeded via reference_id:', referenceId)
              if (!isFullyConfirmed(refData)) {
                const confirmed = Number(refData.purchases_confirmed ?? 0)
                await recordOrphan(
                  'partial_confirmation',
                  `PayPal reference_id matched ${confirmed}/${providerItemCount} items.`,
                  { merchant_order_reference: referenceId }
                )
              }
              result = refData
            } else {
              // Last resort: try to find by custom_id (we set this to userId|courseId)
              const customId: string = purchaseUnits[0]?.custom_id || ''
              if (customId && customId.includes('|')) {
                const [uid, cid] = customId.split('|')
                fallbackUserId = uid
                fallbackCourseId = cid
              }
            }
          }
          
          // If we have user+course from custom_id, do the broader match
          if (!result && fallbackUserId && fallbackCourseId) {
            console.log(`PayPal fallback: trying user_course match uid=${fallbackUserId}, cid=${fallbackCourseId}`)
            const { data: ucData, error: ucError } = await supabase.rpc('confirm_purchase_by_user_course', {
              p_user_id: fallbackUserId,
              p_course_id: fallbackCourseId,
              p_provider_transaction_id: transactionId,
              p_provider_response: providerResponse
            })
            
            if (!ucError && ucData?.success) {
              console.log('PayPal fallback succeeded via user+course match')
              result = ucData
            } else {
              console.error('All PayPal fallback attempts failed')
              await recordOrphan(
                'paypal_no_match',
                'PayPal reported a captured payment but no purchase row matched ' +
                  'transaction_id, reference_id, or user+course custom_id.'
              )
              result = data // Return original "not found" response
            }
          }
          
          if (!result) {
            await recordOrphan(
              'paypal_no_reference',
              'PayPal webhook had no reference_id or custom_id we could match on.'
            )
            result = data
          }
        } else if (provider === 'raiaccept') {
          // RaiAccept fallback: the webhook normally already gives us the
          // merchantOrderReference (our orderId) and we re-fetch via the API
          // for security. If the RPC still says "not found", it means
          // create-raiaccept-session never created the pending row (silent
          // failure on a previous deploy, or a DB outage at session-create
          // time). We record an orphan so an admin can reconcile manually.
          await recordOrphan(
            'raiaccept_no_pending_purchase',
            'RaiAccept reported a paid order but no matching pending purchase row exists. ' +
              'Likely cause: create-raiaccept-session failed to insert the pending row before redirect. ' +
              'Verify the charge in the RaiAccept merchant portal and grant access manually.'
          )
          result = data
        } else {
          await recordOrphan(
            'unknown_provider_no_match',
            `Provider "${provider}" reported success but no purchase row matched.`
          )
          result = data
        }
      } else {
        result = data
        console.log('Purchase confirmed successfully:', transactionId)
      }
    } else {
      const { data, error } = await supabase.rpc('fail_purchase_webhook', {
        p_transaction_id: transactionId,
        p_provider_response: providerResponse
      })

      if (error) {
        console.error('Error failing purchase:', error)
        result = { success: false, error: error.message }
      } else {
        result = data
        console.log('Purchase marked as failed:', transactionId)
      }
    }

    // Return 200 to acknowledge receipt (most providers require this).
    // Only fire invoice generation when we are FULLY confirmed (every paid
    // item has a matching enrollment). Partial confirmations / orphans must
    // not trigger an invoice — admin reconciliation will re-trigger later.
    if (isSuccess && isFullyConfirmed(result)) {
      try {
        const invoiceFnUrl = `${supabaseUrl}/functions/v1/generate-invoice`
        fetch(invoiceFnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            transactionId,
            paymentMethod: provider,
          }),
        }).catch(err => console.warn('Non-blocking: invoice generation trigger failed:', err))
      } catch (invoiceErr) {
        console.warn('Non-blocking: could not trigger invoice generation:', invoiceErr)
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    // Phase 2 policy: always ACK 200 so the provider stops retrying. The
    // failure is logged for ops; if any state was persisted it will be
    // reconciled by ensure_enrollment_exists (dashboard self-heal) or by
    // the admin orphan UI.
    console.error('Webhook error (returning 200 to suppress provider retries):', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error — recorded for review' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

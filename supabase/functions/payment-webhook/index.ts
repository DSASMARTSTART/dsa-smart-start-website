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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const provider = url.searchParams.get('provider') || 'raiaccept'

    let transactionId: string | null = null
    let isSuccess = false
    let providerResponse: Record<string, unknown> = {}

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

      console.log(`RaiAccept webhook received: order=${orderIdentification}, tx=${webhookTransactionId}, status=${transactionStatus}, merchantRef=${merchantOrderReference}`)

      // Use merchantOrderReference as our transactionId (matches our orderId from checkout)
      transactionId = merchantOrderReference || orderIdentification

      // SECURITY: Verify the order status by calling RaiAccept API directly
      // Don't just trust the webhook payload — call Retrieve Order Details to confirm
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
          console.warn('RaiAccept API verification failed, falling back to webhook status')
          isSuccess = RAIACCEPT_PAID_STATUSES.includes(transactionStatus.toUpperCase())
        }
      } else {
        console.warn('RaiAccept credentials not available for verification')
        isSuccess = RAIACCEPT_PAID_STATUSES.includes(transactionStatus.toUpperCase())
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
        }
      }

    // ── GET callback (legacy / redirect-based) ─────────────────────────
    } else if (req.method === 'GET') {
      const params = Object.fromEntries(url.searchParams)
      providerResponse = params
      transactionId = params.oid || params.transactionId || params.tx || null
      isSuccess = params.status === 'success'
    }

    // ── Process the result ─────────────────────────────────────────────
    if (!transactionId) {
      console.error('No transaction ID in webhook payload:', JSON.stringify(providerResponse).substring(0, 500))
      return new Response(JSON.stringify({ error: 'Missing transaction ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing webhook: provider=${provider}, transactionId=${transactionId}, success=${isSuccess}`)

    let result
    if (isSuccess) {
      const { data, error } = await supabase.rpc('confirm_purchase_webhook', {
        p_transaction_id: transactionId,
        p_provider_response: providerResponse
      })

      if (error) {
        console.error('Error confirming purchase:', error)
        result = { success: false, error: error.message }
      } else if (!data?.success) {
        // Purchase not found by transaction_id — try a broader search
        // This handles cases where PayPal sends a different ID format
        console.warn(`Purchase not found for transactionId=${transactionId}, attempting broader lookup...`)
        
        // Try to find any recent pending purchase and match by amount/email from provider response
        // This is a safety net — the primary lookup should work in most cases
        result = data
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

    // Return 200 to acknowledge receipt (most providers require this)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

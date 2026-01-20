// Supabase Edge Function for Payment Webhook Verification
// This endpoint receives callbacks from payment providers (Raiffeisen/PayPal)
// and confirms or fails purchases accordingly

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Raiffeisen/Nestpay hash verification
function verifyRaiffeisenHash(params: Record<string, string>, storeKey: string): boolean {
  // Nestpay sends: hashparams contains list of fields to hash
  // Hash = base64(sha512(params joined by |))
  const hashParams = params.hashparams || '';
  const receivedHash = params.hash || params.HASH || '';
  
  if (!hashParams || !receivedHash) {
    console.log('Missing hash params or hash');
    return false;
  }

  // Build string from params in order specified by hashparams
  const paramList = hashParams.split(':');
  const values = paramList
    .map(param => params[param] || params[param.toLowerCase()] || '')
    .join('|');
  
  const hashInput = values + '|' + storeKey;
  
  // Create SHA-512 hash and base64 encode
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  
  // Note: In production, use SubtleCrypto for proper hash verification
  // This is a simplified version - implement full verification as needed
  console.log('Hash verification attempted for Raiffeisen payment');
  
  // For now, log and return true if we have the expected success indicators
  // TODO: Implement proper SHA-512 hash verification
  return true;
}

// PayPal webhook verification (simplified - implement full verification in production)
async function verifyPayPalWebhook(body: string, headers: Headers): Promise<boolean> {
  // In production, verify using PayPal's verification endpoint
  // https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
  console.log('PayPal webhook received - verification pending full implementation');
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const raiffeisenStoreKey = Deno.env.get('RAIFFEISEN_STORE_KEY') || ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Determine payment provider from URL path or headers
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider') || 'raiffeisen'

    let transactionId: string | null = null
    let isSuccess = false
    let providerResponse: Record<string, unknown> = {}

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        // PayPal sends JSON
        const body = await req.json()
        providerResponse = body
        
        // PayPal webhook structure
        if (body.event_type) {
          transactionId = body.resource?.id || body.resource?.invoice_id || null
          isSuccess = body.event_type === 'PAYMENT.CAPTURE.COMPLETED' || 
                      body.event_type === 'CHECKOUT.ORDER.APPROVED'
          
          // Verify PayPal webhook signature
          const isValid = await verifyPayPalWebhook(JSON.stringify(body), req.headers)
          if (!isValid) {
            console.error('PayPal webhook verification failed')
            return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
      } else {
        // Raiffeisen sends form data
        const formData = await req.formData()
        const params: Record<string, string> = {}
        formData.forEach((value, key) => {
          params[key] = value.toString()
        })
        providerResponse = params
        
        // Raiffeisen/Nestpay response fields
        transactionId = params.oid || params.OrderId || params.TransId || null
        const response = params.Response || params.ProcReturnCode || ''
        isSuccess = response === 'Approved' || params.ProcReturnCode === '00'
        
        // Verify Raiffeisen hash
        if (raiffeisenStoreKey) {
          const isValid = verifyRaiffeisenHash(params, raiffeisenStoreKey)
          if (!isValid) {
            console.error('Raiffeisen hash verification failed')
            return new Response(JSON.stringify({ error: 'Invalid hash' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
      }
    } else if (req.method === 'GET') {
      // Some providers send GET requests for callbacks
      const params = Object.fromEntries(url.searchParams)
      providerResponse = params
      transactionId = params.oid || params.transactionId || params.tx || null
      isSuccess = params.Response === 'Approved' || params.status === 'success'
    }

    if (!transactionId) {
      console.error('No transaction ID in webhook payload:', providerResponse)
      return new Response(JSON.stringify({ error: 'Missing transaction ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing webhook for transaction ${transactionId}, success: ${isSuccess}`)

    // Call the appropriate database function
    let result
    if (isSuccess) {
      const { data, error } = await supabase.rpc('confirm_purchase_webhook', {
        p_transaction_id: transactionId,
        p_provider_response: providerResponse
      })
      
      if (error) {
        console.error('Error confirming purchase:', error)
        result = { success: false, error: error.message }
      } else {
        result = data
        console.log('Purchase confirmed:', data)
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
        console.log('Purchase marked as failed:', data)
      }
    }

    // Return success to payment provider
    // Most providers expect a 200 response to confirm receipt
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

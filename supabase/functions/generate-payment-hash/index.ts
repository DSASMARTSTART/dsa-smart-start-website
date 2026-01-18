// Supabase Edge Function: generate-payment-hash
// This function securely generates the payment hash for Raiffeisen/Nestpay
// Deploy with: supabase functions deploy generate-payment-hash
//
// IMPORTANT: Set the RAIFFEISEN_STORE_KEY secret in Supabase Dashboard:
// Edge Functions → generate-payment-hash → Settings → Secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentHashRequest {
  clientid: string;
  oid: string;
  amount: string;
  okUrl: string;
  failUrl: string;
  islemtipi: string;
  taksit?: string;
  rnd: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get store key from environment (set in Supabase dashboard secrets)
    // This is the ONLY place the store key should exist - NEVER on client
    const storeKey = Deno.env.get('RAIFFEISEN_STORE_KEY');
    if (!storeKey) {
      console.error('RAIFFEISEN_STORE_KEY not configured in Edge Function secrets');
      return new Response(
        JSON.stringify({ 
          error: 'Payment service not configured', 
          success: false 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const body: PaymentHashRequest = await req.json();

    // Validate required fields
    const requiredFields: (keyof PaymentHashRequest)[] = [
      'clientid', 'oid', 'amount', 'okUrl', 'failUrl', 'islemtipi', 'rnd'
    ];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ 
            error: `Missing required field: ${field}`, 
            success: false 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }

    // Generate hash string in the exact order required by Nestpay/ALLSECURE
    // Order: clientid + oid + amount + okUrl + failUrl + islemtipi + taksit + rnd + storeKey
    const hashString = [
      body.clientid,
      body.oid,
      body.amount,
      body.okUrl,
      body.failUrl,
      body.islemtipi,
      body.taksit || '',
      body.rnd,
      storeKey, // Store key is ONLY on server - never exposed to client!
    ].join('');

    // Generate SHA-512 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    
    // Base64 encode the hex string (Nestpay requirement)
    const hash = encode(new TextEncoder().encode(hashHex));

    console.log('Payment hash generated successfully for order:', body.oid);

    return new Response(
      JSON.stringify({ hash, success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating payment hash:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

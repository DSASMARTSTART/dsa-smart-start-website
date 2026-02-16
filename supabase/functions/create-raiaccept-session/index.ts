// Supabase Edge Function: create-raiaccept-session
// Creates a RaiAccept order and payment session, returns the payment form URL
// ALSO creates pending purchase records server-side to eliminate race conditions
// Deploy with: supabase functions deploy create-raiaccept-session
//
// IMPORTANT: Set these secrets in Supabase Dashboard → Edge Functions → Secrets:
//   RAIACCEPT_API_USERNAME
//   RAIACCEPT_API_PASSWORD

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RaiAccept API endpoints (discovered from official WooCommerce plugin source)
const AUTH_URL = 'https://authenticate.raiaccept.com';
const API_URL = 'https://trapi.raiaccept.com';
const AUTH_CLIENT_ID = 'kr2gs4117arvbnaperqff5dml';

interface SessionRequest {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  language?: string;
  // Purchase creation fields (for server-side pending purchase — auth required)
  userId?: string;
  purchaseItems?: Array<{
    courseId: string;
    amount: number;
    originalAmount: number;
    discountAmount?: number;
    discountCodeId?: string;
    teachingMaterialsIncluded?: boolean;
    teachingMaterialsPrice?: number;
  }>;
  paymentMethod?: string;
}

// Step 1: Authenticate with RaiAccept via Amazon Cognito
async function authenticate(username: string, password: string): Promise<string> {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
      ClientId: AUTH_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('RaiAccept auth failed:', response.status, errorText);
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  const idToken = data?.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error('No IdToken in authentication response');
  }
  return idToken;
}

// Step 2: Create order entry in RaiAccept
async function createOrderEntry(token: string, payload: SessionRequest): Promise<string> {
  const [firstName, ...lastParts] = payload.customerName.trim().split(' ');
  const lastName = lastParts.join(' ') || firstName;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const notificationUrl = `${supabaseUrl}/functions/v1/payment-webhook?provider=raiaccept`;

  const orderBody = {
    consumer: {
      firstName: firstName.substring(0, 32),
      lastName: lastName.substring(0, 32),
      email: payload.customerEmail.substring(0, 255),
      phone: '',
      mobilePhone: '',
      workPhone: '',
      ipAddress: '',
    },
    invoice: {
      amount: payload.amount,
      currency: payload.currency,
      description: (payload.description || '').substring(0, 200),
      merchantOrderReference: payload.orderId,
      items: payload.items.map(item => ({
        description: item.name.substring(0, 100),
        numberOfItems: item.quantity,
        price: item.price,
      })),
    },
    urls: {
      successUrl: payload.successUrl,
      failUrl: payload.failureUrl,
      cancelUrl: payload.cancelUrl,
      notificationUrl,
    },
    paymentMethodPreference: 'CARD',
  };

  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(orderBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('RaiAccept create order failed:', response.status, errorText);
    throw new Error(`Create order failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const orderIdentification = data?.orderIdentification;
  if (!orderIdentification) {
    throw new Error('No orderIdentification in create order response');
  }

  console.log('RaiAccept order created:', orderIdentification);
  return orderIdentification;
}

// Step 3: Create payment session (get payment form URL)
async function createPaymentSession(
  token: string,
  payload: SessionRequest,
  orderIdentification: string
): Promise<string> {
  const [firstName, ...lastParts] = payload.customerName.trim().split(' ');
  const lastName = lastParts.join(' ') || firstName;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const notificationUrl = `${supabaseUrl}/functions/v1/payment-webhook?provider=raiaccept`;

  // The payment session request must contain the same payload as the order entry
  const sessionBody = {
    consumer: {
      firstName: firstName.substring(0, 32),
      lastName: lastName.substring(0, 32),
      email: payload.customerEmail.substring(0, 255),
      phone: '',
      mobilePhone: '',
      workPhone: '',
      ipAddress: '',
    },
    invoice: {
      amount: payload.amount,
      currency: payload.currency,
      description: (payload.description || '').substring(0, 200),
      merchantOrderReference: payload.orderId,
      items: payload.items.map(item => ({
        description: item.name.substring(0, 100),
        numberOfItems: item.quantity,
        price: item.price,
      })),
    },
    urls: {
      successUrl: payload.successUrl,
      failUrl: payload.failureUrl,
      cancelUrl: payload.cancelUrl,
      notificationUrl,
    },
    paymentMethodPreference: 'CARD',
  };

  const response = await fetch(`${API_URL}/orders/${orderIdentification}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(sessionBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('RaiAccept create session failed:', response.status, errorText);
    throw new Error(`Create payment session failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const paymentRedirectURL = data?.paymentRedirectURL;
  if (!paymentRedirectURL) {
    throw new Error('No paymentRedirectURL in session response');
  }

  console.log('RaiAccept payment session created for order:', orderIdentification);
  return paymentRedirectURL;
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const username = Deno.env.get('RAIACCEPT_API_USERNAME');
    const password = Deno.env.get('RAIACCEPT_API_PASSWORD');

    if (!username || !password) {
      console.error('RAIACCEPT_API_USERNAME or RAIACCEPT_API_PASSWORD not configured in Edge Function secrets');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const body: SessionRequest = await req.json();

    // Validate required fields
    const missingFields: string[] = [];
    if (!body.orderId) missingFields.push('orderId');
    if (!body.amount) missingFields.push('amount');
    if (!body.currency) missingFields.push('currency');
    if (!body.customerEmail) missingFields.push('customerEmail');
    if (!body.customerName) missingFields.push('customerName');
    if (!body.successUrl) missingFields.push('successUrl');
    if (!body.failureUrl) missingFields.push('failureUrl');
    if (!body.cancelUrl) missingFields.push('cancelUrl');

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}`, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ── Create pending purchase records server-side (RACE CONDITION FIX) ──
    // This ensures the purchase record exists BEFORE the webhook fires
    // Requires authenticated user — no guest path
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (body.purchaseItems && body.purchaseItems.length > 0) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const userId = body.userId;
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required. Please log in before purchasing.', success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      for (const item of body.purchaseItems) {
        try {
          const { data, error } = await supabase.rpc('create_pending_purchase', {
            p_user_id: userId,
            p_course_id: item.courseId,
            p_amount: item.amount,
            p_original_amount: item.originalAmount,
            p_discount_amount: item.discountAmount || 0,
            p_discount_code_id: item.discountCodeId || null,
            p_currency: body.currency,
            p_payment_method: body.paymentMethod || 'card',
            p_transaction_id: body.orderId,
            p_teaching_materials_included: item.teachingMaterialsIncluded || false,
            p_teaching_materials_price: item.teachingMaterialsPrice || 0,
          });
          
          if (error) {
            console.error('Error creating pending purchase for course', item.courseId, ':', error);
          } else {
            console.log('Pending purchase created for course', item.courseId, ':', data);
          }
        } catch (purchaseErr) {
          // Log but don't fail - the payment should still proceed
          // Client-side handlePaymentSuccess will also try to create the purchase
          console.error('Failed to create server-side pending purchase:', purchaseErr);
        }
      }
    }

    // Step 1: Authenticate with RaiAccept
    console.log('Authenticating with RaiAccept...');
    const token = await authenticate(username, password);

    // Step 2: Create order entry
    console.log('Creating order entry for:', body.orderId);
    const orderIdentification = await createOrderEntry(token, body);

    // Step 3: Create payment session
    console.log('Creating payment session for:', orderIdentification);
    const paymentFormUrl = await createPaymentSession(token, body, orderIdentification);

    return new Response(
      JSON.stringify({
        success: true,
        paymentFormUrl,
        orderIdentification,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error creating RaiAccept session:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

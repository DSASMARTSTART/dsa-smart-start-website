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
  // Billing details snapshot for invoicing
  billing?: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    companyName?: string;
    pib?: string;
    vatId?: string;
  };
}

// Step 1: Authenticate with RaiAccept via Amazon Cognito.
// Retries up to 3 times with exponential backoff to absorb transient Cognito
// blips (Phase 2 plan). Throws after the final attempt.
async function authenticate(username: string, password: string): Promise<string> {
  const maxAttempts = 3;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
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
        // 4xx (esp. 400 NotAuthorizedException for bad creds) is not a
        // transient error — fail fast, don't burn the retry budget.
        if (response.status >= 400 && response.status < 500) {
          console.error('RaiAccept auth failed (non-retryable):', response.status, errorText);
          throw new Error(`Authentication failed: ${response.status}`);
        }
        lastErr = new Error(`Authentication failed: ${response.status} ${errorText}`);
        console.warn(`RaiAccept auth attempt ${attempt}/${maxAttempts} failed (${response.status}); will retry`);
      } else {
        const data = await response.json();
        const idToken = data?.AuthenticationResult?.IdToken;
        if (!idToken) {
          throw new Error('No IdToken in authentication response');
        }
        return idToken;
      }
    } catch (err) {
      lastErr = err;
      // Only retry on network-style failures, not on the bad-creds throw above.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('Authentication failed: 4')) throw err;
      console.warn(`RaiAccept auth attempt ${attempt}/${maxAttempts} threw: ${msg}`);
    }

    if (attempt < maxAttempts) {
      // Exponential backoff: 250ms, 750ms
      const delay = 250 * Math.pow(3, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('RaiAccept authentication exhausted retries');
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
    // Validate ALL required env at boot — fail fast with a single explicit
    // error rather than half-configured behaviour deeper in the flow.
    const username = Deno.env.get('RAIACCEPT_API_USERNAME');
    const password = Deno.env.get('RAIACCEPT_API_PASSWORD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const missingEnv: string[] = [];
    if (!username) missingEnv.push('RAIACCEPT_API_USERNAME');
    if (!password) missingEnv.push('RAIACCEPT_API_PASSWORD');
    if (!supabaseUrl) missingEnv.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingEnv.length > 0) {
      console.error('create-raiaccept-session missing env:', missingEnv.join(', '));
      // Operator-level error — do not leak which secrets are missing.
      return new Response(
        JSON.stringify({ error: 'Payment service not configured', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Idempotency key: client should send a stable UUID per checkout attempt
    // so rapid double-clicks do not create two pending purchases. Falls back
    // to body.orderId for backward compatibility.
    const idempotencyKey = (req.headers.get('idempotency-key') || '').trim() || null;

    const body: SessionRequest = await req.json();

    // Prefer the header-supplied idempotency key as the canonical orderId.
    if (idempotencyKey) {
      if (!body.orderId) {
        body.orderId = idempotencyKey;
      } else if (body.orderId !== idempotencyKey) {
        console.log(
          `Idempotency-Key header (${idempotencyKey}) differs from body.orderId (${body.orderId}); using header value`
        );
        body.orderId = idempotencyKey;
      }
    }

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
    if (body.purchaseItems && body.purchaseItems.length > 0) {
      const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
      const userId = body.userId;
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required. Please log in before purchasing.', success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // CRITICAL: every pending purchase MUST be created BEFORE we hand the
      // user off to RaiAccept's payment form. If even one RPC call fails we
      // abort the whole session — otherwise the customer would be charged
      // with no `purchases` row to confirm against on the webhook (orphan
      // payment, no access granted, no admin visibility).
      for (const item of body.purchaseItems) {
        let rpcResult: { data: any; error: any };
        try {
          rpcResult = await supabase.rpc('create_pending_purchase', {
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
            p_billing_name: body.billing?.name || null,
            p_billing_address: body.billing?.address || null,
            p_billing_city: body.billing?.city || null,
            p_billing_postal_code: body.billing?.postalCode || null,
            p_billing_country: body.billing?.country || null,
            p_billing_company_name: body.billing?.companyName || null,
            p_billing_pib: body.billing?.pib || null,
            p_billing_vat_id: body.billing?.vatId || null,
          });
        } catch (purchaseErr) {
          console.error('Failed to call create_pending_purchase for course', item.courseId, ':', purchaseErr);
          // Sanitized: do NOT include the raw DB / network error in the
          // response body — it can leak schema or infra details to the browser.
          return new Response(
            JSON.stringify({
              success: false,
              error: 'We could not start your order. Please try again or contact support if the problem persists.',
              code: 'pending_purchase_rpc_threw',
              courseId: item.courseId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        const { data, error } = rpcResult;

        if (error) {
          console.error('create_pending_purchase RPC error for course', item.courseId, ':', error);
          // Sanitized: drop `detail` so DB error text never reaches the client.
          return new Response(
            JSON.stringify({
              success: false,
              error: 'We could not start your order. Please try again or contact support if the problem persists.',
              code: 'pending_purchase_rpc_error',
              courseId: item.courseId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        if (!data || data.success !== true) {
          // Already enrolled is a graceful soft-fail surfaced as 409 so the
          // client can suggest visiting the dashboard instead of redirecting.
          if (data?.already_enrolled) {
            return new Response(
              JSON.stringify({
                success: false,
                error: data.error || 'You already own this item.',
                code: 'already_enrolled',
                courseId: item.courseId,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
            );
          }

          console.error('create_pending_purchase returned failure for course', item.courseId, ':', data);
          return new Response(
            JSON.stringify({
              success: false,
              error: data?.error || 'We could not start your order. Please try again.',
              code: 'pending_purchase_failed',
              courseId: item.courseId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        console.log('Pending purchase ready for course', item.courseId, ':', data);
      }
    } else {
      // Defensive: refuse to create a payment session without purchaseItems.
      // The client always sends them; an empty payload would mean the webhook
      // has nothing to confirm and we'd create another orphan.
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No items to purchase.',
          code: 'no_purchase_items',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
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
    // Sanitized 5xx response: log full detail server-side, return generic
    // message to the browser so we don't leak infra/DB internals.
    console.error('Error creating RaiAccept session:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'We could not start your payment session. Please try again.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

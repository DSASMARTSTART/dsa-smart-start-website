/**
 * Payment Service for DSA Smart Start
 *
 * Supports two payment processors:
 * 1. RaiAccept (Raiffeisen Bank) — Card payments via REST API + iframe
 * 2. PayPal — PayPal wallet payments
 *
 * Configuration required in .env:
 * - VITE_RAIACCEPT_ENABLED=true   (enables RaiAccept card payments)
 * - VITE_PAYPAL_CLIENT_ID
 * - VITE_PAYPAL_MODE (sandbox or live)
 *
 * Server-side secrets (Supabase Edge Functions):
 * - RAIACCEPT_API_USERNAME
 * - RAIACCEPT_API_PASSWORD
 */

export type PaymentMethod = 'card' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentConfig {
  raiaccept: {
    enabled: boolean;
    isConfigured: boolean;
  };
  paypal: {
    clientId: string;
    mode: 'sandbox' | 'live';
    isConfigured: boolean;
  };
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  // Server-side purchase creation fields (for RaiAccept race condition fix)
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
  guestEmail?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: PaymentStatus;
  message: string;
  redirectUrl?: string;
  error?: string;
}

/** Result returned by the create-raiaccept-session Edge Function */
export interface RaiAcceptSessionResult {
  paymentFormUrl: string;
  orderIdentification: string;
}

// ── Configuration helpers ───────────────────────────────────────────

export function getPaymentConfig(): PaymentConfig {
  const raiAcceptEnabled = import.meta.env.VITE_RAIACCEPT_ENABLED === 'true';
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const paypalMode = (import.meta.env.VITE_PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox';

  return {
    raiaccept: {
      enabled: raiAcceptEnabled,
      isConfigured: raiAcceptEnabled,
    },
    paypal: {
      clientId: paypalClientId,
      mode: paypalMode,
      isConfigured: !!paypalClientId,
    },
  };
}

export function getAvailablePaymentMethods(): PaymentMethod[] {
  const config = getPaymentConfig();
  const methods: PaymentMethod[] = [];
  if (config.raiaccept.isConfigured) methods.push('card');
  if (config.paypal.isConfigured) methods.push('paypal');
  return methods;
}

export function isPaymentConfigured(): boolean {
  return getAvailablePaymentMethods().length > 0;
}

// ── RaiAccept Payment (REST API + iframe) ───────────────────────────

/**
 * RaiAccept (Raiffeisen Bank Serbia) Payment Integration
 *
 * Flow:
 * 1. Client calls createPaymentSession() with order details
 * 2. Edge Function authenticates with RaiAccept Cognito, creates order,
 *    creates checkout session → returns paymentFormUrl
 * 3. Client displays paymentFormUrl inside an iframe (mode=frameless)
 * 4. Customer completes card entry inside the iframe
 * 5. Iframe posts a `message` event with { name: "orderResult", payload }
 * 6. Webhook also fires server-side to confirm/fail the purchase
 */
export class RaiAcceptPayment {
  private config: PaymentConfig['raiaccept'];

  constructor() {
    this.config = getPaymentConfig().raiaccept;
  }

  /**
   * Call the Supabase Edge Function to create a RaiAccept payment session.
   * Returns the iframe-ready payment URL and the RaiAccept orderIdentification.
   */
  async createPaymentSession(request: PaymentRequest): Promise<RaiAcceptSessionResult> {
    if (!this.config.isConfigured) {
      throw new Error('RaiAccept card payment is not enabled');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing for payment processing');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-raiaccept-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          orderId: request.orderId,
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          customerEmail: request.customerEmail,
          customerName: request.customerName,
          items: request.items,
          successUrl: request.returnUrl,
          failureUrl: request.cancelUrl,
          cancelUrl: request.cancelUrl,
          // Server-side purchase creation (race condition fix)
          userId: request.userId,
          purchaseItems: request.purchaseItems,
          paymentMethod: request.paymentMethod || 'card',
          guestEmail: request.guestEmail,
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errBody.error || `RaiAccept session creation failed (${response.status})`);
    }

    const data = await response.json();

    if (!data.paymentFormUrl || !data.orderIdentification) {
      throw new Error('Invalid response from RaiAccept session service');
    }

    return {
      paymentFormUrl: data.paymentFormUrl,
      orderIdentification: data.orderIdentification,
    };
  }
}

/**
 * PayPal Payment Integration
 * 
 * Uses PayPal JavaScript SDK for client-side integration.
 * Flow:
 * 1. Load PayPal SDK with client ID
 * 2. Render PayPal buttons
 * 3. Create order on button click
 * 4. Capture payment on approval
 */
export class PayPalPayment {
  private config: PaymentConfig['paypal'];
  private sdkLoaded: boolean = false;

  constructor() {
    this.config = getPaymentConfig().paypal;
  }

  // Load PayPal SDK with timeout
  async loadSDK(): Promise<boolean> {
    if (this.sdkLoaded) return true;
    if (!this.config.isConfigured) return false;

    const TIMEOUT_MS = 15000; // 15 second timeout

    return new Promise((resolve) => {
      // Check if already loaded
      if (window.paypal) {
        this.sdkLoaded = true;
        resolve(true);
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector(`script[src*="paypal.com/sdk/js"]`);
      if (existingScript) {
        // Wait for existing script to load
        const checkInterval = setInterval(() => {
          if (window.paypal) {
            clearInterval(checkInterval);
            this.sdkLoaded = true;
            resolve(true);
          }
        }, 100);
        // Timeout for existing script
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!this.sdkLoaded) {
            console.error('PayPal SDK loading timeout (existing script)');
            resolve(false);
          }
        }, TIMEOUT_MS);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${this.config.clientId}&currency=EUR&intent=capture`;
      script.async = true;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        console.error('PayPal SDK loading timeout');
        resolve(false);
      }, TIMEOUT_MS);

      script.onload = () => {
        clearTimeout(timeoutId);
        this.sdkLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        console.error('Failed to load PayPal SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  // Check if SDK is ready
  isReady(): boolean {
    return this.sdkLoaded && !!window.paypal;
  }

  // Create PayPal order (returns order ID)
  async createOrder(request: PaymentRequest): Promise<string> {
    if (!this.config.isConfigured) {
      throw new Error('PayPal is not configured');
    }

    // In production, this should call your backend to create the order
    // The backend then calls PayPal's Create Order API
    // For now, we'll use client-side order creation
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: request.orderId,
        description: request.description,
        amount: {
          currency_code: request.currency,
          value: request.amount.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: request.currency,
              value: request.amount.toFixed(2),
            },
          },
        },
        items: request.items.map(item => ({
          name: item.name,
          unit_amount: {
            currency_code: request.currency,
            value: item.price.toFixed(2),
          },
          quantity: item.quantity.toString(),
          category: 'DIGITAL_GOODS',
        })),
      }],
      application_context: {
        brand_name: 'DSA Smart Start',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
      },
    };

    // This data structure is for PayPal's createOrder callback
    return JSON.stringify(orderData);
  }

  // Get PayPal button render options
  getButtonOptions(request: PaymentRequest, callbacks: {
    onApprove: (transactionId: string) => void;
    onError: (error: Error) => void;
    onCancel: () => void;
  }) {
    return {
      style: {
        layout: 'vertical' as const,
        color: 'blue' as const,
        shape: 'pill' as const,
        label: 'paypal' as const,
        height: 55,
      },
      createOrder: async (_data: unknown, actions: { order: { create: (data: unknown) => Promise<string> } }) => {
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: request.orderId,
            description: request.description,
            amount: {
              currency_code: request.currency,
              value: request.amount.toFixed(2),
            },
          }],
        });
      },
      onApprove: async (_data: { orderID: string }, actions: { order: { capture: () => Promise<{ id: string }> } }) => {
        try {
          const details = await actions.order.capture();
          callbacks.onApprove(details.id);
        } catch (error) {
          callbacks.onError(error as Error);
        }
      },
      onError: (err: Error) => {
        callbacks.onError(err);
      },
      onCancel: () => {
        callbacks.onCancel();
      },
    };
  }
}

// Generate unique order ID
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `DSA-${timestamp}-${random}`.toUpperCase();
}

// Format price for display
export function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
  }).format(amount);
}

// PayPal type declaration for window
declare global {
  interface Window {
    paypal?: {
      Buttons: (options: ReturnType<PayPalPayment['getButtonOptions']>) => {
        render: (container: string | HTMLElement) => Promise<void>;
        close: () => void;
      };
    };
  }
}

// Export singleton instances
export const raiAcceptPayment = new RaiAcceptPayment();
export const paypalPayment = new PayPalPayment();

// Backward-compatible alias so existing imports keep working
export const raiffeisenPayment = raiAcceptPayment;

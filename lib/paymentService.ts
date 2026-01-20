/**
 * Payment Service for DSA Smart Start
 * 
 * Supports two payment processors:
 * 1. Raiffeisen Bank (via Nestpay/ALLSECURE gateway) - Card payments
 * 2. PayPal - PayPal wallet payments
 * 
 * Configuration required in .env:
 * - VITE_RAIFFEISEN_MERCHANT_ID
 * - VITE_RAIFFEISEN_TERMINAL_ID  
 * - VITE_RAIFFEISEN_STORE_KEY
 * - VITE_RAIFFEISEN_API_URL (sandbox or production)
 * - VITE_PAYPAL_CLIENT_ID
 * - VITE_PAYPAL_MODE (sandbox or live)
 */

export type PaymentMethod = 'card' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentConfig {
  raiffeisen: {
    merchantId: string;
    terminalId: string;
    apiUrl: string;
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
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: PaymentStatus;
  message: string;
  redirectUrl?: string;
  error?: string;
}

// Get payment configuration from environment
// NOTE: Store key is NOT included here - it's only on server-side Edge Function
export function getPaymentConfig(): PaymentConfig {
  const raiffeisenMerchantId = import.meta.env.VITE_RAIFFEISEN_MERCHANT_ID || '';
  const raiffeisenTerminalId = import.meta.env.VITE_RAIFFEISEN_TERMINAL_ID || '';
  const raiffeisenApiUrl = import.meta.env.VITE_RAIFFEISEN_API_URL || 'https://entegrasyon.asseco-see.com.tr/fim/est3Dgate'; // Nestpay test URL
  
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const paypalMode = (import.meta.env.VITE_PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox';

  return {
    raiffeisen: {
      merchantId: raiffeisenMerchantId,
      terminalId: raiffeisenTerminalId,
      apiUrl: raiffeisenApiUrl,
      isConfigured: !!(raiffeisenMerchantId && raiffeisenTerminalId),
    },
    paypal: {
      clientId: paypalClientId,
      mode: paypalMode,
      isConfigured: !!paypalClientId,
    },
  };
}

// Check which payment methods are available
export function getAvailablePaymentMethods(): PaymentMethod[] {
  const config = getPaymentConfig();
  const methods: PaymentMethod[] = [];
  
  if (config.raiffeisen.isConfigured) {
    methods.push('card');
  }
  if (config.paypal.isConfigured) {
    methods.push('paypal');
  }
  
  return methods;
}

// Check if any payment method is configured
export function isPaymentConfigured(): boolean {
  return getAvailablePaymentMethods().length > 0;
}

/**
 * Raiffeisen/Nestpay Payment Integration
 * 
 * The Nestpay gateway uses 3D Secure authentication.
 * Flow:
 * 1. Generate hash via server-side Edge Function (store key never exposed to client)
 * 2. Redirect customer to Nestpay 3D Secure page
 * 3. Customer enters card details on bank's secure page
 * 4. Bank redirects back to our returnUrl with result
 */
export class RaiffeisenPayment {
  private config: PaymentConfig['raiffeisen'];

  constructor() {
    this.config = getPaymentConfig().raiffeisen;
  }

  // Generate hash for Nestpay request via server-side Edge Function
  // SECURITY: The store key is ONLY on the server - never exposed to client
  private async generateHash(params: Record<string, string>): Promise<string> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing for payment processing');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-payment-hash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        clientid: params.clientid,
        oid: params.oid,
        amount: params.amount,
        okUrl: params.okUrl,
        failUrl: params.failUrl,
        islemtipi: params.islemtipi,
        taksit: params.taksit || '',
        rnd: params.rnd,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to generate payment hash');
    }

    const { hash, success } = await response.json();
    
    if (!success || !hash) {
      throw new Error('Invalid response from payment hash service');
    }

    return hash;
  }

  // Create payment form data for Nestpay 3D redirect
  async createPaymentRequest(request: PaymentRequest): Promise<{ formData: Record<string, string>; actionUrl: string }> {
    if (!this.config.isConfigured) {
      throw new Error('Raiffeisen payment is not configured');
    }

    const rnd = Date.now().toString();
    const amount = request.amount.toFixed(2);

    const formData: Record<string, string> = {
      clientid: this.config.merchantId,
      storetype: '3D_PAY_HOSTING', // 3D Secure with hosted payment page
      islemtipi: 'Auth', // Authorization
      amount: amount,
      currency: '978', // EUR currency code
      oid: request.orderId,
      okUrl: request.returnUrl,
      failUrl: request.cancelUrl,
      lang: 'en',
      rnd: rnd,
      encoding: 'UTF-8',
      email: request.customerEmail,
      BillToName: request.customerName,
      // hash will be added after generation
    };

    formData.hash = await this.generateHash(formData);

    return {
      formData,
      actionUrl: this.config.apiUrl,
    };
  }

  // Verify callback from Nestpay
  verifyCallback(params: Record<string, string>): PaymentResult {
    // Response codes: Approved, Declined, Error
    const response = params.Response;
    const transactionId = params.TransId;
    const errorMessage = params.ErrMsg;

    if (response === 'Approved') {
      return {
        success: true,
        transactionId,
        status: 'completed',
        message: 'Payment successful',
      };
    } else {
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: errorMessage || 'Payment failed',
        error: errorMessage,
      };
    }
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
export const raiffeisenPayment = new RaiffeisenPayment();
export const paypalPayment = new PayPalPayment();

/**
 * Email Service for DSA Smart Start
 * 
 * Provides functions to trigger transactional emails via Supabase Edge Functions.
 * All actual email sending is done server-side via Resend.
 * These functions are fire-and-forget — they log errors but don't throw.
 */

import { supabase } from './supabase';

/**
 * Generate and send an invoice after successful payment.
 * This replaces the legacy purchase-confirmation email: the invoice IS the receipt,
 * and it is sent to the customer (To:) with the accountant(s) in BCC.
 *
 * Idempotent: if an invoice already exists for the transaction, no new one is created.
 * Pass `resend: true` to re-send an existing invoice.
 */
export async function generateAndSendInvoice(params: {
  transactionId: string;
  userId?: string;
  paymentMethod?: string;
  resend?: boolean;
  force?: boolean;
}): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase.functions.invoke('generate-invoice', {
      body: {
        transactionId: params.transactionId,
        userId: params.userId,
        paymentMethod: params.paymentMethod,
        resend: params.resend,
        force: params.force,
      }
    });

    if (error) {
      // Surface the real response body so gateway-level 401s are diagnosable.
      // supabase.functions.invoke wraps a Response on `error.context`.
      let detail = '';
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = (error as any).context as Response | undefined;
        if (ctx && typeof ctx.text === 'function') detail = await ctx.text();
      } catch { /* ignore */ }
      console.error('Failed to generate/send invoice:', error.message, detail);
    }
  } catch (err) {
    console.error('Error generating/sending invoice:', err);
  }
}

/**
 * @deprecated Use generateAndSendInvoice instead. Kept as a thin wrapper
 * so existing call sites continue to work during migration.
 */
export async function sendPurchaseConfirmationEmail(params: {
  userId: string;
  transactionId?: string;
  customerEmail?: string;
  customerName?: string;
  paymentMethod?: string;
  discountCode?: string;
  discountAmount?: number;
}): Promise<void> {
  if (!params.transactionId) {
    console.warn('sendPurchaseConfirmationEmail: no transactionId, cannot generate invoice');
    return;
  }
  return generateAndSendInvoice({
    transactionId: params.transactionId,
    userId: params.userId,
    paymentMethod: params.paymentMethod,
  });
}

/**
 * Send a welcome email to a newly registered user.
 */
export async function sendWelcomeEmail(params: {
  email: string;
  name: string;
}): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: params.email,
        name: params.name,
      }
    });

    if (error) {
      console.error('Failed to send welcome email:', error.message);
    }
  } catch (err) {
    console.error('Error sending welcome email:', err);
  }
}

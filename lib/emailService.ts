/**
 * Email Service for DSA Smart Start
 * 
 * Provides functions to trigger transactional emails via Supabase Edge Functions.
 * All actual email sending is done server-side via Resend.
 * These functions are fire-and-forget — they log errors but don't throw.
 */

import { supabase } from './supabase';

/**
 * Send a purchase confirmation email after successful payment.
 * Looks up purchase details from the DB by userId + transactionId.
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
  if (!supabase) return;

  try {
    const { error } = await supabase.functions.invoke('send-purchase-email', {
      body: {
        userId: params.userId,
        transactionId: params.transactionId,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        paymentMethod: params.paymentMethod,
        discountCode: params.discountCode,
        discountAmount: params.discountAmount,
      }
    });

    if (error) {
      console.error('Failed to send purchase confirmation email:', error.message);
    }
  } catch (err) {
    console.error('Error sending purchase confirmation email:', err);
  }
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

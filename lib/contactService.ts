/**
 * Contact Service for DSA Smart Start
 * 
 * Handles contact form submissions:
 * 1. Stores messages in Supabase database
 * 2. Sends email notifications (when configured)
 * 
 * Email Configuration (add to .env when ready):
 * - VITE_CONTACT_EMAIL_TO - Where to send contact form submissions
 * - VITE_RESEND_API_KEY - Resend.com API key (or use another provider)
 * 
 * Alternatively, you can use:
 * - Supabase Edge Functions with email provider
 * - EmailJS for client-side email
 * - Formspree or similar service
 */

import { supabase } from './supabase';

export interface ContactMessage {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  status?: 'new' | 'read' | 'replied' | 'archived';
  createdAt?: string;
}

export interface ContactConfig {
  emailTo: string;
  isConfigured: boolean;
  provider: 'none' | 'resend' | 'emailjs' | 'formspree';
}

// Get contact configuration from environment
export function getContactConfig(): ContactConfig {
  const emailTo = import.meta.env.VITE_CONTACT_EMAIL_TO || '';
  const resendKey = import.meta.env.VITE_RESEND_API_KEY || '';
  const emailjsKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
  const formspreeId = import.meta.env.VITE_FORMSPREE_ID || '';

  let provider: ContactConfig['provider'] = 'none';
  let isConfigured = false;

  if (resendKey && emailTo) {
    provider = 'resend';
    isConfigured = true;
  } else if (emailjsKey) {
    provider = 'emailjs';
    isConfigured = true;
  } else if (formspreeId) {
    provider = 'formspree';
    isConfigured = true;
  }

  return {
    emailTo,
    isConfigured,
    provider,
  };
}

// Save contact message to Supabase
export async function saveContactMessage(message: ContactMessage): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured, message not saved to database');
    return { success: true, id: 'local-' + Date.now() };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('contact_messages')
      .insert({
        first_name: message.firstName,
        last_name: message.lastName,
        email: message.email,
        message: message.message,
        status: 'new',
      })
      .select('id')
      .single();

    if (error) {
      // If table doesn't exist, that's okay - we'll still try email
      if (error.code === '42P01') {
        console.warn('contact_messages table does not exist, skipping database save');
        return { success: true, id: 'no-table' };
      }
      throw error;
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Error saving contact message:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save message' };
  }
}

// Send email notification (when configured)
export async function sendContactEmail(message: ContactMessage): Promise<{ success: boolean; error?: string }> {
  const config = getContactConfig();

  if (!config.isConfigured) {
    console.log('Email not configured, message saved to database only');
    return { success: true };
  }

  try {
    switch (config.provider) {
      case 'resend':
        return await sendViaResend(message, config);
      case 'emailjs':
        return await sendViaEmailJS(message);
      case 'formspree':
        return await sendViaFormspree(message);
      default:
        return { success: true };
    }
  } catch (err) {
    console.error('Error sending email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// Resend.com integration
async function sendViaResend(message: ContactMessage, config: ContactConfig): Promise<{ success: boolean; error?: string }> {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  
  // Note: Resend requires server-side API calls for security
  // This would typically be done via a Supabase Edge Function
  // For now, we'll log that it needs server-side implementation
  console.warn('Resend requires server-side implementation. Configure a Supabase Edge Function.');
  
  // Example Edge Function call:
  // const { data, error } = await supabase.functions.invoke('send-contact-email', {
  //   body: { message, to: config.emailTo }
  // });
  
  return { success: true };
}

// EmailJS integration (client-side)
async function sendViaEmailJS(message: ContactMessage): Promise<{ success: boolean; error?: string }> {
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

  if (!publicKey || !serviceId || !templateId) {
    return { success: false, error: 'EmailJS not fully configured' };
  }

  // Load EmailJS SDK if not already loaded
  if (!window.emailjs) {
    await loadEmailJSScript();
  }

  if (window.emailjs) {
    await window.emailjs.send(serviceId, templateId, {
      from_name: `${message.firstName} ${message.lastName}`,
      from_email: message.email,
      message: message.message,
    });
  }

  return { success: true };
}

// Formspree integration
async function sendViaFormspree(message: ContactMessage): Promise<{ success: boolean; error?: string }> {
  const formId = import.meta.env.VITE_FORMSPREE_ID;
  
  if (!formId) {
    return { success: false, error: 'Formspree ID not configured' };
  }

  const response = await fetch(`https://formspree.io/f/${formId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${message.firstName} ${message.lastName}`,
      email: message.email,
      message: message.message,
    }),
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to submit form' };
  }

  return { success: true };
}

// Helper to load EmailJS script
function loadEmailJSScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.onload = () => {
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (window.emailjs && publicKey) {
        window.emailjs.init(publicKey);
      }
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load EmailJS'));
    document.body.appendChild(script);
  });
}

// Main function to submit contact form
export async function submitContactForm(message: ContactMessage): Promise<{ success: boolean; error?: string }> {
  // First, save to database
  const saveResult = await saveContactMessage(message);
  
  if (!saveResult.success) {
    return { success: false, error: saveResult.error };
  }

  // Then, try to send email notification
  const emailResult = await sendContactEmail(message);
  
  // We consider it successful if saved to database, even if email fails
  if (!emailResult.success) {
    console.warn('Email notification failed, but message was saved:', emailResult.error);
  }

  return { success: true };
}

// Type declaration for EmailJS
declare global {
  interface Window {
    emailjs?: {
      init: (publicKey: string) => void;
      send: (serviceId: string, templateId: string, params: Record<string, string>) => Promise<void>;
    };
  }
}

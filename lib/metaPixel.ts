// ============================================
// Meta Pixel (Facebook) — consent-gated tracking
// ============================================
// The pixel script is loaded ONLY after the visitor accepts marketing cookies
// (GDPR). Before consent, every call here is a no-op and nothing is sent to Meta.

export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '1659927192416403';

const CONSENT_KEY = 'eduway_cookie_consent'; // 'granted' | 'denied'
const SENT_PURCHASES_KEY = 'eduway_pixel_purchases_sent';

type ConsentValue = 'granted' | 'denied';
type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

let initialized = false;
let lastPageViewKey = '';

export function getConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked — consent applies to this page load only */
  }
  if (value === 'granted') {
    initMetaPixel();
    trackPageView();
  }
}

/** Injects the official Meta Pixel base code. Safe to call repeatedly. */
export function initMetaPixel(): void {
  if (initialized || typeof window === 'undefined' || !META_PIXEL_ID) return;
  if (getConsent() !== 'granted') return;
  initialized = true;

  if (!window.fbq) {
    const n: FbqFn = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue!.push(args);
    } as FbqFn;
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const s = document.getElementsByTagName('script')[0];
    s?.parentNode?.insertBefore(t, s);
  }
  window.fbq('init', META_PIXEL_ID);
}

function canTrack(): boolean {
  if (getConsent() !== 'granted') return false;
  initMetaPixel();
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/** SPA PageView — call on every route change. Deduplicated per URL hash. */
export function trackPageView(): void {
  if (!canTrack()) return;
  const key = window.location.pathname + window.location.hash;
  if (key === lastPageViewKey) return;
  lastPageViewKey = key;
  window.fbq!('track', 'PageView');
}

export function trackViewContent(p: { id: string; name: string; value: number; currency?: string }): void {
  if (!canTrack()) return;
  window.fbq!('track', 'ViewContent', {
    content_ids: [p.id],
    content_name: p.name,
    content_type: 'product',
    value: p.value,
    currency: p.currency || 'EUR',
  });
}

export function trackInitiateCheckout(ids: string[]): void {
  if (!canTrack() || ids.length === 0) return;
  window.fbq!('track', 'InitiateCheckout', {
    content_ids: ids,
    content_type: 'product',
    num_items: ids.length,
  });
}

/**
 * Purchase — sent once per confirmed purchase (status 'completed').
 * The purchase id is used as eventID and remembered locally so reloading the
 * success page never counts the same sale twice.
 */
export function trackPurchase(p: { purchaseId: string; courseId: string; value: number; currency?: string }): void {
  if (!canTrack()) return;
  let sent: string[] = [];
  try {
    sent = JSON.parse(localStorage.getItem(SENT_PURCHASES_KEY) || '[]');
  } catch {
    sent = [];
  }
  if (sent.includes(p.purchaseId)) return;
  window.fbq!(
    'track',
    'Purchase',
    {
      content_ids: [p.courseId],
      content_type: 'product',
      num_items: 1,
      value: p.value,
      currency: (p.currency || 'EUR').toUpperCase(),
    },
    { eventID: `purchase_${p.purchaseId}` }
  );
  try {
    localStorage.setItem(SENT_PURCHASES_KEY, JSON.stringify([...sent, p.purchaseId].slice(-50)));
  } catch {
    /* ignore */
  }
}

// Supabase Edge Function: create-raiffeisen-installment-session
// Creates pending purchases and returns a signed Raiffeisen/UPC hosted-payment
// form payload for bank-managed installment payments.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface SessionRequest {
  orderId: string
  amount: number
  currency: string
  description: string
  customerEmail: string
  customerName: string
  items: Array<{ id: string; name: string; price: number; quantity: number }>
  userId?: string
  purchaseItems?: Array<{
    courseId: string
    amount: number
    originalAmount: number
    discountAmount?: number
    discountCodeId?: string
    teachingMaterialsIncluded?: boolean
    teachingMaterialsPrice?: number
  }>
  billing?: {
    name: string
    address: string
    city: string
    postalCode: string
    country: string
    companyName?: string
    pib?: string
    vatId?: string
  }
}

const textEncoder = new TextEncoder()

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function b64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s+/g, '')
  const binary = atob(normalized)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
  return b64ToBytes(base64)
}

function derLength(length: number): Uint8Array {
  if (length < 128) return Uint8Array.of(length)
  const bytes: number[] = []
  let remaining = length
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff)
    remaining >>= 8
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes)
}

function derWrap(tag: number, payload: Uint8Array): Uint8Array {
  const len = derLength(payload.length)
  const out = new Uint8Array(1 + len.length + payload.length)
  out[0] = tag
  out.set(len, 1)
  out.set(payload, 1 + len.length)
  return out
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function pkcs1PrivateKeyToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = Uint8Array.of(0x02, 0x01, 0x00)
  const rsaEncryptionAlgId = Uint8Array.of(
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  )
  return derWrap(0x30, concatBytes([
    version,
    rsaEncryptionAlgId,
    derWrap(0x04, pkcs1),
  ]))
}

async function importPrivateKey(pem: string, hash: 'SHA-1' | 'SHA-256'): Promise<CryptoKey> {
  const isPkcs1 = pem.includes('BEGIN RSA PRIVATE KEY')
  const der = isPkcs1 ? pkcs1PrivateKeyToPkcs8(pemToDer(pem)) : pemToDer(pem)
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash },
    false,
    ['sign'],
  )
}

async function signData(data: string, privateKeyPem: string, hash: 'SHA-1' | 'SHA-256'): Promise<string> {
  const key = await importPrivateKey(privateKeyPem, hash)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, textEncoder.encode(data))
  const bytes = new Uint8Array(signature)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function purchaseTime(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${String(now.getUTCFullYear()).slice(2)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
}

function toRsd(eurAmount: number, rate: number): number {
  return Math.round(eurAmount * rate * 100) / 100
}

function cents(amount: number): number {
  return Math.round(amount * 100)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const merchantId = Deno.env.get('RAIFFEISEN_UPC_MERCHANT_ID') || ''
    const terminalId = Deno.env.get('RAIFFEISEN_UPC_TERMINAL_ID') || ''
    const gatewayUrl = Deno.env.get('RAIFFEISEN_UPC_GATEWAY_URL') || ''
    const privateKeyPem = Deno.env.get('RAIFFEISEN_UPC_PRIVATE_KEY_PEM') || ''
    const currencyCode = Deno.env.get('RAIFFEISEN_UPC_CURRENCY_CODE') || '941'
    const locale = Deno.env.get('RAIFFEISEN_UPC_LOCALE') || 'RS'
    const version = Deno.env.get('RAIFFEISEN_UPC_VERSION') || '1'
    const delay = Deno.env.get('RAIFFEISEN_UPC_DELAY') || ''
    const signatureHash = (Deno.env.get('RAIFFEISEN_UPC_SIGNATURE_HASH') || 'SHA-1').toUpperCase() === 'SHA-256'
      ? 'SHA-256'
      : 'SHA-1'
    const eurToRsdRate = Number(Deno.env.get('RAIFFEISEN_UPC_EUR_TO_RSD_RATE') || '117.15')
    const amountMultiplier = Number(Deno.env.get('RAIFFEISEN_UPC_AMOUNT_MULTIPLIER') || '100')

    const missing = []
    if (!supabaseUrl) missing.push('SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY')
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    if (!merchantId) missing.push('RAIFFEISEN_UPC_MERCHANT_ID')
    if (!terminalId) missing.push('RAIFFEISEN_UPC_TERMINAL_ID')
    if (!gatewayUrl) missing.push('RAIFFEISEN_UPC_GATEWAY_URL')
    if (!privateKeyPem) missing.push('RAIFFEISEN_UPC_PRIVATE_KEY_PEM')
    if (missing.length > 0) {
      console.error('create-raiffeisen-installment-session missing env:', missing.join(', '))
      return json({ success: false, error: 'Installment payment service is not configured' }, 500)
    }

    const authHeader = req.headers.get('authorization') || ''
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ success: false, error: 'Authentication required. Please log in before purchasing.' }, 401)
    }

    const body: SessionRequest = await req.json()
    const idempotencyKey = (req.headers.get('idempotency-key') || '').trim() || null
    if (idempotencyKey) body.orderId = idempotencyKey

    if (!body.orderId || body.orderId.length > 20) {
      return json({ success: false, error: 'Order ID is required and must be 20 characters or fewer.' }, 400)
    }
    if (body.userId && body.userId !== userData.user.id) {
      return json({ success: false, error: 'Authenticated user does not match checkout user.' }, 403)
    }
    if (!body.purchaseItems?.length) {
      return json({ success: false, error: 'No items to purchase.' }, 400)
    }
    if (!Number.isFinite(body.amount) || body.amount <= 0) {
      return json({ success: false, error: 'Invalid order amount.' }, 400)
    }
    if (body.currency !== 'EUR') {
      return json({ success: false, error: 'Installment checkout expects EUR cart amounts before bank RSD conversion.' }, 400)
    }

    const billing = body.billing
    if (
      !billing?.name?.trim() ||
      !billing.address?.trim() ||
      !billing.city?.trim() ||
      !billing.postalCode?.trim() ||
      !billing.country?.trim()
    ) {
      return json({ success: false, error: 'Billing details are required for installment checkout.' }, 400)
    }

    const invalidItem = body.purchaseItems.find(item =>
      !item.courseId ||
      !Number.isFinite(item.amount) ||
      item.amount <= 0 ||
      !Number.isFinite(item.originalAmount) ||
      item.originalAmount < 0 ||
      (item.discountAmount != null && (!Number.isFinite(item.discountAmount) || item.discountAmount < 0)) ||
      (item.teachingMaterialsPrice != null && (!Number.isFinite(item.teachingMaterialsPrice) || item.teachingMaterialsPrice < 0))
    )
    if (invalidItem) {
      return json({ success: false, error: 'Invalid cart item amount.' }, 400)
    }

    const itemTotal = body.purchaseItems.reduce((sum, item) => sum + item.amount, 0)
    if (Math.abs(cents(itemTotal) - cents(body.amount)) > 1) {
      return json({ success: false, error: 'Cart total does not match order total.' }, 400)
    }

    const courseIds = [...new Set(body.purchaseItems.map(item => item.courseId))]
    const { data: courses, error: coursesError } = await serviceClient
      .from('courses')
      .select('id, allowed_payment_methods')
      .in('id', courseIds)

    if (coursesError) {
      console.error('Course eligibility query failed:', coursesError)
      return json({ success: false, error: 'Could not validate payment eligibility.' }, 500)
    }

    const courseMap = new Map((courses || []).map((course: any) => [course.id, course]))
    const ineligible = courseIds.filter(id => {
      const allowed = courseMap.get(id)?.allowed_payment_methods
      return !Array.isArray(allowed) || !allowed.includes('card_installments')
    })

    if (ineligible.length > 0 || courseMap.size !== courseIds.length) {
      return json({
        success: false,
        error: 'Installment payment is not available for every item in this cart.',
        code: 'installments_not_allowed',
      }, 400)
    }

    const rsdPurchaseItems = body.purchaseItems.map(item => ({
      ...item,
      amount: toRsd(item.amount, eurToRsdRate),
      originalAmount: toRsd(item.originalAmount, eurToRsdRate),
      discountAmount: item.discountAmount ? toRsd(item.discountAmount, eurToRsdRate) : 0,
      teachingMaterialsPrice: item.teachingMaterialsPrice ? toRsd(item.teachingMaterialsPrice, eurToRsdRate) : 0,
    }))

    for (const item of rsdPurchaseItems) {
      const { data, error } = await serviceClient.rpc('create_pending_purchase', {
        p_user_id: userData.user.id,
        p_course_id: item.courseId,
        p_amount: item.amount,
        p_original_amount: item.originalAmount,
        p_discount_amount: item.discountAmount || 0,
        p_discount_code_id: item.discountCodeId || null,
        p_currency: 'RSD',
        p_payment_method: 'card_installments',
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
      })

      if (error || !data?.success) {
        console.error('create_pending_purchase failed for installment item:', item.courseId, error || data)
        return json({
          success: false,
          error: data?.already_enrolled ? data.error : 'We could not start your installment order. Please try again.',
          code: data?.already_enrolled ? 'already_enrolled' : 'pending_purchase_failed',
          courseId: item.courseId,
        }, data?.already_enrolled ? 409 : 500)
      }
    }

    // Persist the EUR→RSD rate used for this order so the charged RSD amount can be
    // reproduced for reconciliation and invoices (audit B7/I3). Best-effort.
    const { error: rateErr } = await serviceClient
      .from('purchases')
      .update({ currency_exchange_rate: eurToRsdRate })
      .eq('transaction_id', body.orderId)
    if (rateErr) console.error('Could not persist currency_exchange_rate:', rateErr)

    const rsdTotal = toRsd(body.amount, eurToRsdRate)
    const totalAmount = String(Math.round(rsdTotal * amountMultiplier))
    const time = purchaseTime()
    const sd = userData.user.id
    const orderField = delay === '1' ? `${body.orderId},1` : body.orderId
    const signatureData = `${merchantId};${terminalId};${time};${orderField};${currencyCode};${totalAmount};${sd};`
    const signature = await signData(signatureData, privateKeyPem, signatureHash)

    const fields: Record<string, string> = {
      Version: version,
      MerchantID: merchantId,
      TerminalID: terminalId,
      TotalAmount: totalAmount,
      Currency: currencyCode,
      locale,
      PurchaseTime: time,
      OrderID: body.orderId,
      SD: sd,
      PurchaseDesc: (body.description || 'Eduway Academy').substring(0, 125),
      Signature: signature,
    }

    if (delay === '1') fields.Delay = '1'

    return json({
      success: true,
      actionUrl: gatewayUrl,
      fields,
      orderId: body.orderId,
    })
  } catch (error) {
    console.error('Error creating installment session:', error)
    return json({ success: false, error: 'We could not start your installment payment session. Please try again.' }, 500)
  }
})

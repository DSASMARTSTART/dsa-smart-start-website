// Supabase Edge Function: raiffeisen-installment-notify
// Receives Raiffeisen/UPC NOTIFY_URL callbacks for the installment payment rail.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const textEncoder = new TextEncoder()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type NotifyParams = Record<string, string>

function formResponse(params: NotifyParams, action: 'approve' | 'reverse', reason = '', forwardUrl = '') {
  const lines = [
    `MerchantID=${params.MerchantID || ''}`,
    `TerminalID=${params.TerminalID || ''}`,
    `OrderID=${params.OrderID || ''}`,
    `Currency=${params.Currency || ''}`,
    `TotalAmount=${params.TotalAmount || ''}`,
    `XID=${params.XID || ''}`,
    `PurchaseTime=${params.PurchaseTime || ''}`,
    `Response.action=${action}`,
    `Response.reason=${reason}`,
    `Response.forwardUrl=${forwardUrl}`,
  ]

  return new Response(lines.join('\n'), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function b64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/[\s-]/g, match => match === '-' ? '+' : '').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
  return b64ToBytes(base64)
}

interface Asn1Node {
  tag: number
  start: number
  headerLength: number
  length: number
  valueStart: number
  end: number
}

function readAsn1(bytes: Uint8Array, start: number): Asn1Node {
  const tag = bytes[start]
  let offset = start + 1
  let length = bytes[offset++]
  if (length & 0x80) {
    const count = length & 0x7f
    length = 0
    for (let i = 0; i < count; i++) {
      length = (length << 8) | bytes[offset++]
    }
  }
  return {
    tag,
    start,
    headerLength: offset - start,
    length,
    valueStart: offset,
    end: offset + length,
  }
}

function children(bytes: Uint8Array, node: Asn1Node): Asn1Node[] {
  const result: Asn1Node[] = []
  let offset = node.valueStart
  while (offset < node.end) {
    const child = readAsn1(bytes, offset)
    result.push(child)
    offset = child.end
  }
  return result
}

function spkiFromCertificate(certPem: string): Uint8Array {
  const der = pemToDer(certPem)
  const cert = readAsn1(der, 0)
  const certChildren = children(der, cert)
  const tbs = certChildren[0]
  const tbsChildren = children(der, tbs)

  let index = 0
  if (tbsChildren[index]?.tag === 0xa0) index += 1 // explicit version
  index += 5 // serial, signature, issuer, validity, subject
  const spki = tbsChildren[index]
  if (!spki) throw new Error('Could not locate public key in certificate')
  return der.slice(spki.start, spki.end)
}

async function importPublicKey(pem: string, hash: 'SHA-1' | 'SHA-256'): Promise<CryptoKey> {
  const spki = pem.includes('BEGIN CERTIFICATE') ? spkiFromCertificate(pem) : pemToDer(pem)
  return crypto.subtle.importKey(
    'spki',
    spki,
    { name: 'RSASSA-PKCS1-v1_5', hash },
    false,
    ['verify'],
  )
}

function signatureData(params: NotifyParams): string {
  const delay = params.Delay ? `,${params.Delay}` : ''
  const orderField = `${params.OrderID || ''}${delay}`
  const currencyField = params.AltCurrency ? `${params.Currency || ''},${params.AltCurrency}` : (params.Currency || '')
  const amountField = params.AltTotalAmount ? `${params.TotalAmount || ''},${params.AltTotalAmount}` : (params.TotalAmount || '')
  return [
    params.MerchantID || '',
    params.TerminalID || '',
    params.PurchaseTime || '',
    orderField,
    params.XID || '',
    currencyField,
    amountField,
    params.SD || '',
    params.TranCode || '',
    params.ApprovalCode || '',
  ].join(';') + ';'
}

async function verifySignature(params: NotifyParams, publicKeyPem: string, hash: 'SHA-1' | 'SHA-256') {
  const signature = params.Signature || ''
  if (!signature) return false
  const key = await importPublicKey(publicKeyPem, hash)
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64ToBytes(signature),
    textEncoder.encode(signatureData(params)),
  )
}

async function parseParams(req: Request): Promise<NotifyParams> {
  const contentType = req.headers.get('content-type') || ''
  const params: NotifyParams = {}
  if (contentType.includes('application/json')) {
    const body = await req.json()
    for (const [key, value] of Object.entries(body || {})) {
      params[key] = value == null ? '' : String(value)
    }
    return params
  }

  const formData = await req.formData()
  for (const [key, value] of formData.entries()) {
    params[key] = String(value)
  }
  return params
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const publicKeyPem =
    Deno.env.get('RAIFFEISEN_UPC_SERVER_PUBLIC_KEY_PEM') ||
    Deno.env.get('RAIFFEISEN_UPC_SERVER_CERT_PEM') ||
    ''
  // Signature verification may only be skipped in an explicitly non-production
  // sandbox: BOTH the skip flag AND RAIFFEISEN_UPC_ENV=sandbox must be set (audit
  // I2). This prevents a single stray env var from silently disabling the only
  // authentication on the installment rail in production.
  const skipRequested = Deno.env.get('RAIFFEISEN_UPC_SKIP_SIGNATURE_VERIFY') === 'true'
  const isSandbox = (Deno.env.get('RAIFFEISEN_UPC_ENV') || '').toLowerCase() === 'sandbox'
  const skipSignatureVerify = skipRequested && isSandbox
  if (skipRequested && !isSandbox) {
    console.error('SECURITY: RAIFFEISEN_UPC_SKIP_SIGNATURE_VERIFY is set but RAIFFEISEN_UPC_ENV is not "sandbox" — signature verification will NOT be skipped.')
  }
  if (skipSignatureVerify) {
    console.warn('SECURITY: installment NOTIFY signature verification is DISABLED (sandbox mode).')
  }
  const signatureHash = (Deno.env.get('RAIFFEISEN_UPC_SIGNATURE_HASH') || 'SHA-1').toUpperCase() === 'SHA-256'
    ? 'SHA-256'
    : 'SHA-1'

  let params: NotifyParams = {}

  try {
    params = await parseParams(req)
    const transactionId = params.OrderID || ''
    const tranCode = params.TranCode || ''
    const providerResponse = params as Record<string, unknown>

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('raiffeisen-installment-notify missing Supabase env')
      return formResponse(params, 'reverse', 'Webhook receiver is not configured')
    }
    if (!skipSignatureVerify && !publicKeyPem) {
      console.error('raiffeisen-installment-notify missing verification key/cert')
      return formResponse(params, 'reverse', 'Signature verification is not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (!transactionId) {
      await supabase.from('payment_orphans').insert({
        provider: 'raiffeisen_installments',
        transaction_id: null,
        reason: 'missing_order_id',
        notes: 'Raiffeisen installment notify payload had no OrderID.',
        provider_response: providerResponse,
      })
      return formResponse(params, 'reverse', 'Missing OrderID')
    }

    if (!skipSignatureVerify) {
      const signatureOk = await verifySignature(params, publicKeyPem, signatureHash)
      if (!signatureOk) {
        await supabase.from('payment_orphans').insert({
          provider: 'raiffeisen_installments',
          transaction_id: transactionId,
          merchant_order_reference: transactionId,
          amount: Number(params.TotalAmount || 0) || null,
          currency: params.Currency || null,
          reason: 'signature_verification_failed',
          notes: 'Notify signature could not be verified with configured server certificate/public key.',
          provider_response: providerResponse,
        })
        return formResponse(params, 'reverse', 'Signature verification failed')
      }
    }

    if (tranCode === '000') {
      const { data, error } = await supabase.rpc('confirm_purchase_webhook', {
        p_transaction_id: transactionId,
        p_provider_response: providerResponse,
      })

      if (error || !data?.success || Number(data.purchases_confirmed || 0) === 0) {
        console.error('Installment confirmation failed:', error || data)
        await supabase.from('payment_orphans').insert({
          provider: 'raiffeisen_installments',
          transaction_id: transactionId,
          merchant_order_reference: transactionId,
          order_identification: params.XID || null,
          amount: Number(params.TotalAmount || 0) || null,
          currency: params.Currency || null,
          customer_email: params.Email || null,
          reason: error ? 'rpc_error' : 'no_pending_purchase',
          notes: error?.message || 'Raiffeisen reported success but no pending purchase was confirmed.',
          provider_response: providerResponse,
        })
        return formResponse(params, 'reverse', 'Could not confirm purchase')
      }

      try {
        const invoiceFnUrl = `${supabaseUrl}/functions/v1/generate-invoice`
        fetch(invoiceFnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            transactionId,
            paymentMethod: 'card_installments',
          }),
        }).catch(err => console.warn('Non-blocking invoice trigger failed:', err))
      } catch (invoiceErr) {
        console.warn('Could not trigger invoice generation:', invoiceErr)
      }

      return formResponse(params, 'approve')
    }

    if (['601', '602', '999'].includes(tranCode)) {
      await supabase
        .from('purchases')
        .update({ payment_provider_response: providerResponse })
        .eq('transaction_id', transactionId)
        .eq('status', 'pending')
      return formResponse(params, 'approve', 'Payment is still processing')
    }

    await supabase
      .from('purchases')
      .update({
        status: 'failed',
        payment_provider_response: providerResponse,
      })
      .eq('transaction_id', transactionId)
      .eq('status', 'pending')

    return formResponse(params, 'approve', `Transaction code ${tranCode || 'unknown'}`)
  } catch (error) {
    console.error('raiffeisen-installment-notify error:', error)
    return formResponse(params, 'reverse', 'Internal notify error')
  }
})

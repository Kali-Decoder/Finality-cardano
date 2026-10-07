'use client'

/**
 * Browser paid-fetch using @odatano/x402 client (Cardano exact scheme).
 * Deep-imports client modules so Next.js does not pull Express / CAP server code.
 */
import { x402Fetch } from '../../x402/srv/client/fetch'
import { X402PaymentError } from '../../x402/srv/client/errors'
import type { PaymentRequirements } from '../../x402/srv/core/types'
import { merchantUrl as defaultMerchantUrl } from './paths'

export type PaymentState = 'idle' | 'requesting' | 'signing' | 'settling' | 'settled' | 'rejected' | 'degraded'
export { defaultMerchantUrl as merchantUrl }

export type CardanoPayContext = {
  buyerBech32: string
  /** Extra CIP-30 used addresses to try when the primary has no / insufficient UTxOs. */
  buyerCandidates?: string[]
  signTx: (unsignedTxCborHex: string) => Promise<string>
}

function friendlyIntentError(raw: string): string {
  if (/no UTxOs/i.test(raw)) {
    return 'Connected wallet address has no Preprod UTxOs on-chain. Fund this address (ADA + USDM) or reconnect the account that holds them.'
  }
  if (/Insufficient|not enough/i.test(raw)) {
    return 'Not enough USDM (or ADA for fees/min-UTxO) on the connected address. Top up Preprod USDM and try again.'
  }
  return raw
}

async function buildAndSign(
  ctx: CardanoPayContext,
  requirement: PaymentRequirements,
  onState?: (state: PaymentState) => void,
): Promise<{ signedTxCborHex: string; nonceRef: string }> {
  // Stay on "requesting" until the unsigned tx exists — only then open the wallet.
  onState?.('requesting')

  const candidates = Array.from(
    new Set(
      [ctx.buyerBech32, ...(ctx.buyerCandidates || [])]
        .map((a) => (a || '').trim())
        .filter(Boolean),
    ),
  )
  if (candidates.length === 0) {
    throw new Error('Connect a Cardano wallet first')
  }

  let lastError = 'pay/intent failed'
  for (const buyer of candidates) {
    const res = await fetch(`${defaultMerchantUrl}/pay/intent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ buyer, requirement }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      lastError = String((err as { error?: string }).error || `pay/intent failed (${res.status})`)
      // Try the next CIP-30 address when this one cannot fund the payment.
      if (/insufficient|not enough|no utxo/i.test(lastError) && candidates.length > 1) {
        continue
      }
      throw new Error(friendlyIntentError(lastError))
    }

    const intent = (await res.json()) as { unsignedTxCborHex: string; nonceRef: string }
    onState?.('signing')
    const signedTxCborHex = await ctx.signTx(intent.unsignedTxCborHex)
    onState?.('settling')
    return { signedTxCborHex, nonceRef: intent.nonceRef }
  }

  throw new Error(friendlyIntentError(lastError))
}

export function createPaidFetch(ctx: CardanoPayContext, onState?: (state: PaymentState) => void) {
  return x402Fetch({
    errorOnFailure: true,
    pay: (requirement) => buildAndSign(ctx, requirement, onState),
  })
}

function paymentErrorMessage(error: unknown): string {
  if (error instanceof X402PaymentError) {
    if (error.kind === 'pay_handler_failed' && error.cause instanceof Error) {
      return error.cause.message
    }
    return error.serverError || error.message || `Payment failed (${error.kind})`
  }
  if (error instanceof Error) return error.message
  return String(error)
}

export async function callPaidResource(
  ctx: CardanoPayContext,
  path: string,
  init: RequestInit,
  onState?: (state: PaymentState) => void,
) {
  onState?.('requesting')
  try {
    const response = await createPaidFetch(ctx, onState)(`${defaultMerchantUrl}${path}`, init)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        (body as { error?: { message?: string } })?.error?.message ||
          `Request failed with HTTP ${response.status}`,
      )
    }
    if ((body as { meta?: { synthetic?: boolean } })?.meta?.synthetic) onState?.('degraded')
    else onState?.('settled')
    return {
      body,
      receipt: response.headers.get('Payment-Response') || response.headers.get('PAYMENT-RESPONSE'),
    }
  } catch (error) {
    onState?.('rejected')
    throw new Error(paymentErrorMessage(error))
  }
}

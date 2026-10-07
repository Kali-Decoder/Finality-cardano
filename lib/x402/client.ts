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
  signTx: (unsignedTxCborHex: string) => Promise<string>
}

async function buildAndSign(
  ctx: CardanoPayContext,
  requirement: PaymentRequirements,
  onState?: (state: PaymentState) => void,
): Promise<{ signedTxCborHex: string; nonceRef: string }> {
  onState?.('signing')
  const res = await fetch(`${defaultMerchantUrl}/pay/intent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ buyer: ctx.buyerBech32, requirement }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `pay/intent failed (${res.status})`)
  }
  const intent = (await res.json()) as { unsignedTxCborHex: string; nonceRef: string }
  const signedTxCborHex = await ctx.signTx(intent.unsignedTxCborHex)
  onState?.('settling')
  return { signedTxCborHex, nonceRef: intent.nonceRef }
}

export function createPaidFetch(ctx: CardanoPayContext, onState?: (state: PaymentState) => void) {
  return x402Fetch({
    errorOnFailure: true,
    pay: (requirement) => buildAndSign(ctx, requirement, onState),
  })
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
    if (error instanceof X402PaymentError) {
      throw new Error(error.serverError || error.message || `Payment failed (${error.kind})`)
    }
    throw error
  }
}

import { USDM_UNIT, USDM_X402_ASSET, settlementAsset } from './usdm'

/** Cardano x402 identity for the Finality UI. Settlement runs in-process via @odatano/x402. */
export const CARDANO = {
  docs: 'https://developers.cardano.org/x402/',
  payTo:
    process.env.NEXT_PUBLIC_X402_PAYTO ||
    'addr_test1vpujgcun6m9y4k75p4slfy5kxwgw2452l2ec6fnryuja42cw9v92z',
  /** Paid routes settle in USDM only (Cardano native stablecoin). */
  asset: settlementAsset(process.env.NEXT_PUBLIC_X402_ASSET || process.env.X402_ASSET),
  assetLabel: 'USDM',
  usdmUnit: USDM_UNIT,
  usdmX402Asset: USDM_X402_ASSET,
  network: (process.env.NEXT_PUBLIC_X402_NETWORK || 'cardano:preprod') as 'cardano:preprod',
  brand: {
    usdm: '/brand/usdm.png',
    cardano: '/brand/cardano.png',
  },
} as const

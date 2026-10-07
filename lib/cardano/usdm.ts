/**
 * Mehen USDM on Cardano Preprod — settlement asset for Finality (USDM only).
 * x402 asset form uses a dot; Blockfrost / CIP-30 `unit` is concatenated.
 */
export const USDM_POLICY_ID = '16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde'
export const USDM_ASSET_NAME_HEX = '0014df10745553444d'
/** x402 `asset` string: policyId.assetNameHex */
export const USDM_X402_ASSET = `${USDM_POLICY_ID}.${USDM_ASSET_NAME_HEX}`
/** Blockfrost / wallet multiasset unit */
export const USDM_UNIT = `${USDM_POLICY_ID}${USDM_ASSET_NAME_HEX}`
export const USDM_DECIMALS = 6

/** Resolve settlement asset — always USDM (never lovelace). */
export function settlementAsset(envValue?: string | null): string {
  const v = (envValue || '').trim()
  if (!v || v === 'lovelace' || v.toLowerCase() === 'ada') return USDM_X402_ASSET
  return v
}

export function usdmFromUnits(units: string | bigint | number): number {
  return Number(BigInt(units)) / 10 ** USDM_DECIMALS
}

export function formatUsdm(units: string | bigint | number, decimals = 2): string {
  const n = usdmFromUnits(units)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export function sumUsdmUnits(
  amounts: Array<{ unit: string; quantity: string }>,
  unit: string = USDM_UNIT,
): bigint {
  return amounts
    .filter((a) => a.unit === unit || a.unit === USDM_UNIT)
    .reduce((sum, a) => sum + BigInt(a.quantity || '0'), 0n)
}

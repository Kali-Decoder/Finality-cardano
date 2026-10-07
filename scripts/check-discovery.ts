/**
 * Probe a merchant 402 and require Cardano Preprod lovelace.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/check-discovery.ts
 */
const merchantBase = (
  process.env.X402_PUBLIC_URL ||
  process.env.X402_SERVER_URL ||
  'https://x402-server-w7qy.onrender.com'
).replace(/\/$/, '')

async function main() {
  const probe = await fetch(`${merchantBase}/v1/market/quotes?symbols=BTC`, {
    signal: AbortSignal.timeout(30_000),
  })
  const header = probe.headers.get('payment-required') || probe.headers.get('PAYMENT-REQUIRED')
  if (probe.status !== 402 || !header) {
    throw new Error(`Expected HTTP 402 with PAYMENT-REQUIRED from ${merchantBase}, got ${probe.status}`)
  }

  const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as {
    accepts?: Array<{ scheme?: string; network?: string; asset?: string; payTo?: string; amount?: string }>
  }
  const accept = decoded.accepts?.[0]
  const ok = accept?.network === 'cardano:preprod' && accept?.asset === 'lovelace'
  console.log(JSON.stringify({
    merchantBase,
    status: probe.status,
    scheme: accept?.scheme,
    network: accept?.network,
    asset: accept?.asset,
    amount: accept?.amount,
    payTo: accept?.payTo,
    ok,
  }, null, 2))

  if (!ok) {
    throw new Error(
      `Payment requirement is not Cardano lovelace (network=${accept?.network ?? 'missing'} asset=${accept?.asset ?? 'missing'})`,
    )
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

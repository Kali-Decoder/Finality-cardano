/**
 * Parallel live catalog burst for demos (~1s window).
 *
 *   npm run demo:burst
 *
 * Uses local merchant by default. Attributes output to the Preprod buyer wallet.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MERCHANT = (
  process.env.X402_SERVER_URL ||
  process.env.X402_PUBLIC_URL ||
  'http://127.0.0.1:4021'
).replace(/\/$/, '')
const WALLET_PATH = resolve(process.env.WALLET_FILE || 'scripts/preprod-buyer-wallet.json')

type CatalogEndpoint = {
  operationId: string
  method: 'GET' | 'POST'
  path: string
  price: string
  requestExample?: Record<string, unknown>
}

function loadWalletAddress(): string {
  if (existsSync(WALLET_PATH)) {
    const w = JSON.parse(readFileSync(WALLET_PATH, 'utf8')) as { address?: string }
    if (w.address) return w.address
  }
  return (process.env.X402_PAYTO_ADDRESS || 'demo-wallet').trim()
}

function buildRequest(ep: CatalogEndpoint): { url: string; init: RequestInit } {
  const example = ep.requestExample ?? {}
  if (ep.method === 'GET') {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(example)) {
      if (v == null || v === '') continue
      if (typeof v === 'object') qs.set(k, JSON.stringify(v))
      else qs.set(k, String(v))
    }
    const q = qs.toString()
    return { url: `${MERCHANT}${ep.path}${q ? `?${q}` : ''}`, init: { method: 'GET' } }
  }
  return {
    url: `${MERCHANT}${ep.path}`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(example),
    },
  }
}

async function main() {
  const wallet = loadWalletAddress()
  console.log(`wallet  ${wallet}`)
  console.log(`merchant ${MERCHANT}`)

  const health = await fetch(`${MERCHANT}/health`).then((r) => r.json()) as {
    demoLiveUnpaid?: boolean
    allowMockFallback?: boolean
  }
  console.log(
    `mode    demoLiveUnpaid=${Boolean(health.demoLiveUnpaid)} mock=${Boolean(health.allowMockFallback)}\n`,
  )

  const catalogRes = await fetch(`${MERCHANT}/v1/catalog`)
  const catalogJson = (await catalogRes.json()) as { data: CatalogEndpoint[] }
  const endpoints = catalogJson.data || []
  console.log(`bursting ${endpoints.length} endpoints in parallel…\n`)

  const t0 = performance.now()
  const settled = await Promise.all(
    endpoints.map(async (ep) => {
      const { url, init } = buildRequest(ep)
      const t = performance.now()
      try {
        const res = await fetch(url, init)
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean
          meta?: { synthetic?: boolean; dataMode?: string }
          data?: unknown
          error?: { message?: string } | string
        }
        const ms = Math.round(performance.now() - t)
        const ok = res.ok && body.success !== false
        const err =
          typeof body.error === 'string'
            ? body.error
            : body.error?.message
        return {
          operationId: ep.operationId,
          ok,
          ms,
          http: res.status,
          dataMode: body.meta?.dataMode,
          synthetic: body.meta?.synthetic,
          error: ok ? undefined : err || `HTTP ${res.status}`,
        }
      } catch (e) {
        return {
          operationId: ep.operationId,
          ok: false,
          ms: Math.round(performance.now() - t),
          error: e instanceof Error ? e.message : String(e),
        }
      }
    }),
  )
  const elapsed = Math.round(performance.now() - t0)

  for (const row of settled.sort((a, b) => a.operationId.localeCompare(b.operationId))) {
    const mark = row.ok ? '✓' : '✗'
    const mode = row.ok ? ` ${row.dataMode || 'live'}${row.synthetic ? '·synthetic' : ''}` : ''
    const detail = row.ok ? `${row.ms}ms` : `${row.ms}ms ${row.error}`
    console.log(`${mark} ${row.operationId.padEnd(28)} ${detail}${mode}`)
  }

  const ok = settled.filter((r) => r.ok).length
  console.log(`\n${ok}/${settled.length} ok in ${elapsed}ms  wallet=${wallet.slice(0, 24)}…`)
  if (elapsed > 2500) {
    console.warn('Burst took longer than a demo second — check provider latency.')
  }
  if (ok < settled.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

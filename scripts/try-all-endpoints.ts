/**
 * Pay every Finality catalog endpoint once (Preprod buyer wallet).
 *
 *   node --import tsx --env-file=x402-server/.env scripts/try-all-endpoints.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrivateKey, Tx } from '@harmoniclabs/buildooor'
import { x402Fetch } from '../x402/srv/client/fetch'
import { createBridgePayHandler } from '../x402/srv/client/pay-handlers'
import { readSettlement } from '../x402/srv/client/protocol'
import * as bridge from '../x402/srv/bridge'

const MERCHANT = (process.env.X402_PUBLIC_URL || 'https://x402-server-w7qy.onrender.com').replace(/\/$/, '')
const WALLET_PATH = resolve(process.env.WALLET_FILE || 'scripts/preprod-buyer-wallet.json')

type CatalogEndpoint = {
  operationId: string
  method: 'GET' | 'POST'
  path: string
  price: string
  requestExample?: Record<string, unknown>
}

type WalletFile = { privateKeyHex: string; address: string }

function loadWallet(): WalletFile {
  if (!existsSync(WALLET_PATH)) throw new Error(`Missing wallet ${WALLET_PATH}`)
  return JSON.parse(readFileSync(WALLET_PATH, 'utf8')) as WalletFile
}

function createSignTx(privateKeyHex: string) {
  const bytes = Buffer.from(privateKeyHex, 'hex')
  const signer: PrivateKey | Uint8Array =
    bytes.length >= 64 ? new Uint8Array(bytes.subarray(0, 64)) : new PrivateKey(bytes)
  return async (unsignedTxCborHex: string) => {
    const tx = Tx.fromCbor(unsignedTxCborHex)
    tx.signWith(signer)
    return Buffer.from(tx.toCborBytes()).toString('hex')
  }
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
  process.env.NETWORK ||= 'preprod'
  process.env.BACKENDS ||= 'blockfrost'
  if (!(process.env.BLOCKFROST_API_KEY || '').trim()) {
    throw new Error('BLOCKFROST_API_KEY required')
  }

  const wallet = loadWallet()
  console.log(`buyer: ${wallet.address}`)
  console.log(`merchant: ${MERCHANT}\n`)

  const catalogRes = await fetch(`${MERCHANT}/v1/catalog`)
  const catalogJson = (await catalogRes.json()) as { data: CatalogEndpoint[] }
  const endpoints = catalogJson.data || []
  console.log(`catalog: ${endpoints.length} endpoints\n`)

  const payHandler = createBridgePayHandler({
    buyerBech32: wallet.address,
    signTx: createSignTx(wallet.privateKeyHex),
  })
  const paidFetch = x402Fetch({
    errorOnFailure: true,
    pay: (requirement, paymentRequired) => payHandler(requirement, paymentRequired),
  })

  const results: Array<{
    operationId: string
    status: 'ok' | 'fail'
    http?: number
    tx?: string
    error?: string
  }> = []

  for (const ep of endpoints) {
    const { url, init } = buildRequest(ep)
    process.stdout.write(`→ ${ep.method} ${ep.path} (${ep.price}) … `)
    try {
      const res = await paidFetch(url, init)
      const receipt = readSettlement(res.headers.get('PAYMENT-RESPONSE'))
      const body = await res.json().catch(() => ({}))
      if (!res.ok || (body as { success?: boolean }).success === false) {
        const msg =
          (body as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`
        console.log(`FAIL ${msg}`)
        results.push({ operationId: ep.operationId, status: 'fail', http: res.status, error: msg })
      } else {
        const tx = receipt?.transaction || (body as { payment?: { settlementId?: string } }).payment?.settlementId
        console.log(`OK ${res.status}${tx ? ` tx=${tx.slice(0, 12)}…` : ''}`)
        results.push({ operationId: ep.operationId, status: 'ok', http: res.status, tx })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`FAIL ${msg}`)
      results.push({ operationId: ep.operationId, status: 'fail', error: msg })
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length
  const fail = results.filter((r) => r.status === 'fail').length
  console.log(`\n=== summary: ${ok} ok / ${fail} fail / ${results.length} total ===`)
  if (fail) {
    for (const r of results.filter((x) => x.status === 'fail')) {
      console.log(`  ✗ ${r.operationId}: ${r.error}`)
    }
    process.exitCode = 1
  }
}

main()
  .then(async () => {
    try {
      await bridge.shutdown()
    } catch {
      /* ignore */
    }
  })
  .catch(async (err) => {
    console.error(err)
    try {
      await bridge.shutdown()
    } catch {
      /* ignore */
    }
    process.exit(1)
  })

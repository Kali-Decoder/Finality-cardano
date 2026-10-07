import { NextResponse } from 'next/server'
import { USDM_UNIT, formatUsdm, settlementAsset, sumUsdmUnits } from '@/lib/cardano/usdm'

export const dynamic = 'force-dynamic'

type BfTx = {
  tx_hash: string
  tx_index: number
  block_height: number
  block_time: number
}

type BfUtxo = {
  hash: string
  inputs: Array<{ address: string; amount: Array<{ unit: string; quantity: string }> }>
  outputs: Array<{ address: string; amount: Array<{ unit: string; quantity: string }> }>
}

function blockfrostHost() {
  const net = (process.env.NETWORK || 'preprod').toLowerCase()
  if (net === 'mainnet') return 'https://cardano-mainnet.blockfrost.io/api/v0'
  if (net === 'preview') return 'https://cardano-preview.blockfrost.io/api/v0'
  return 'https://cardano-preprod.blockfrost.io/api/v0'
}

export async function GET() {
  const payTo =
    process.env.X402_PAYTO_ADDRESS ||
    process.env.NEXT_PUBLIC_X402_PAYTO ||
    ''
  const key = process.env.BLOCKFROST_API_KEY || ''
  const asset = settlementAsset(process.env.X402_ASSET)

  if (!payTo) {
    return NextResponse.json(
      { success: false, error: { code: 'missing_payto', message: 'X402_PAYTO_ADDRESS is not set' } },
      { status: 500 },
    )
  }

  if (!key) {
    return NextResponse.json(
      {
        success: true,
        payTo,
        network: process.env.X402_NETWORK || 'cardano:preprod',
        asset,
        asOf: new Date().toISOString(),
        transactions: [],
        warning: 'BLOCKFROST_API_KEY missing — live chain feed unavailable',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const host = blockfrostHost()
  const headers = { project_id: key }

  try {
    const listRes = await fetch(
      `${host}/addresses/${encodeURIComponent(payTo)}/transactions?order=desc&count=40`,
      { headers, signal: AbortSignal.timeout(20_000), cache: 'no-store' },
    )

    if (listRes.status === 404) {
      return NextResponse.json(
        {
          success: true,
          payTo,
          network: process.env.X402_NETWORK || 'cardano:preprod',
          asset,
          asOf: new Date().toISOString(),
          transactions: [],
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (!listRes.ok) {
      const text = await listRes.text().catch(() => '')
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'blockfrost_error',
            message: `Blockfrost ${listRes.status}: ${text.slice(0, 200)}`,
          },
        },
        { status: 502 },
      )
    }

    const list = (await listRes.json()) as BfTx[]
    const recent = list.slice(0, 25)

    const details = await Promise.all(
      recent.map(async (row) => {
        try {
          const utxoRes = await fetch(`${host}/txs/${row.tx_hash}/utxos`, {
            headers,
            signal: AbortSignal.timeout(15_000),
            cache: 'no-store',
          })
          if (!utxoRes.ok) {
            return {
              txHash: row.tx_hash,
              blockHeight: row.block_height,
              blockTime: row.block_time,
              receivedUsdmUnits: '0',
              receivedUsdm: '0',
              from: [] as string[],
            }
          }
          const utxo = (await utxoRes.json()) as BfUtxo
          const received = utxo.outputs
            .filter((o) => o.address === payTo)
            .reduce((sum, o) => sum + sumUsdmUnits(o.amount, USDM_UNIT), 0n)
          const from = [...new Set(utxo.inputs.map((i) => i.address).filter(Boolean))]
          return {
            txHash: row.tx_hash,
            blockHeight: row.block_height,
            blockTime: row.block_time,
            receivedUsdmUnits: received.toString(),
            receivedUsdm: formatUsdm(received),
            from,
          }
        } catch {
          return {
            txHash: row.tx_hash,
            blockHeight: row.block_height,
            blockTime: row.block_time,
            receivedUsdmUnits: '0',
            receivedUsdm: '0',
            from: [] as string[],
          }
        }
      }),
    )

    const afterRaw = process.env.LIVE_TXS_AFTER
    const afterEnv = afterRaw === undefined || afterRaw === '' ? NaN : Number(afterRaw)
    const afterSec =
      afterRaw === '0'
        ? 0
        : Number.isFinite(afterEnv) && afterEnv > 0
          ? afterEnv
          : Math.floor(Date.UTC(2026, 9, 7, 12, 0, 0) / 1000)

    const transactions = details
      .filter((t) => t.receivedUsdmUnits !== '0' && t.blockTime >= afterSec)
      .map((t) => ({
        ...t,
        // Keep legacy field names used by Live UI (amount displayed as USDM)
        receivedAda: t.receivedUsdm,
        receivedLovelace: t.receivedUsdmUnits,
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${t.txHash}`,
        fromShort: t.from[0]
          ? `${t.from[0].slice(0, 12)}…${t.from[0].slice(-8)}`
          : '—',
        at: new Date(t.blockTime * 1000).toISOString(),
      }))

    return NextResponse.json(
      {
        success: true,
        payTo,
        network: process.env.X402_NETWORK || 'cardano:preprod',
        asset,
        asOf: new Date().toISOString(),
        count: transactions.length,
        transactions,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'live_feed_failed',
          message: err instanceof Error ? err.message : 'Failed to load live transactions',
        },
      },
      { status: 502 },
    )
  }
}

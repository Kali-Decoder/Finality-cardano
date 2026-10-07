'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CARDANO } from '@/lib/cardano/config'
import { cn } from '@/lib/utils'

type LiveTx = {
  txHash: string
  blockHeight: number
  blockTime: number
  receivedLovelace: string
  receivedAda: string
  from: string[]
  fromShort: string
  at: string
  explorerUrl: string
}

type LivePayload = {
  success: boolean
  payTo?: string
  network?: string
  asOf?: string
  count?: number
  transactions?: LiveTx[]
  warning?: string
  error?: { message?: string }
}

const REFRESH_MS = 12_000

export default function LiveTransactionsPage() {
  const [data, setData] = useState<LivePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const payTo = data?.payTo || CARDANO.payTo
  const addressExplorer = `https://preprod.cardanoscan.io/address/${payTo}`

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/live-txs', { cache: 'no-store' })
      const json = (await res.json()) as LivePayload
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `HTTP ${res.status}`)
      }
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live feed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  async function copyAddress() {
    await navigator.clipboard.writeText(payTo)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const txs = data?.transactions ?? []

  return (
    <div className="dash-page">
      <div className="dash-head">
        <div>
          <span className="label">
            <span className="n">06</span>Live
          </span>
          <h1>Live settlements</h1>
          <p>On-chain hits to the merchant payTo address on Cardano Preprod.</p>
        </div>
        <button type="button" className="pill line" onClick={() => void load()}>
          Refresh <span className="pill__ic">↻</span>
        </button>
      </div>

      <section className="dash-panel" style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        <span className="label plain">Hit address (payTo)</span>
        <div className="mono" style={{ fontSize: 13.5, wordBreak: 'break-all' }}>
          {payTo}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" className="pill dark" onClick={() => void copyAddress()}>
            {copied ? 'Copied' : 'Copy address'} <span className="pill__ic">→</span>
          </button>
          <a href={addressExplorer} target="_blank" rel="noreferrer" className="pill line">
            Open in Cardanoscan <span className="pill__ic">↗</span>
          </a>
          <span className={cn('chip', txs.length ? 'live' : '')}>
            {data?.network || CARDANO.network} · lovelace
          </span>
          {data?.asOf && (
            <span className="mono muted" style={{ fontSize: 12 }}>
              Updated {new Date(data.asOf).toLocaleTimeString()}
            </span>
          )}
        </div>
        {data?.warning && (
          <p style={{ color: 'var(--bad)', margin: 0, fontSize: 14 }}>
            {data.warning}
          </p>
        )}
      </section>

      {loading && !data ? (
        <div className="dash-empty">
          <p>Loading live transactions…</p>
        </div>
      ) : error ? (
        <div className="dash-empty">
          <p>{error}</p>
          <button type="button" className="pill green" onClick={() => void load()}>
            Retry <span className="pill__ic">→</span>
          </button>
        </div>
      ) : txs.length === 0 ? (
        <div className="dash-empty">
          <p>No incoming lovelace transactions on this address yet. Pay a route from Run to see it here.</p>
          <Link href="/explore/run" className="pill green">
            Run a paid call <span className="pill__ic">→</span>
          </Link>
        </div>
      ) : (
        <div className="dash-tablewrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Amount</th>
                <th>From</th>
                <th>Tx</th>
                <th>Block</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.txHash}>
                  <td>
                    <b>{new Date(tx.at).toLocaleString()}</b>
                    <span className="mono muted dash-table__sub">{tx.at}</span>
                  </td>
                  <td>
                    <b>{tx.receivedAda} ADA</b>
                    <span className="mono muted dash-table__sub">{tx.receivedLovelace} lovelace</span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 13 }} title={tx.from[0]}>
                      {tx.fromShort}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 13 }} title={tx.txHash}>
                      {tx.txHash.slice(0, 10)}…{tx.txHash.slice(-8)}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {tx.blockHeight}
                    </span>
                  </td>
                  <td>
                    <a
                      href={tx.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="pill line"
                      style={{ height: 36, paddingLeft: 14, fontSize: 13.5 }}
                    >
                      View <span className="pill__ic" style={{ width: 24, height: 24, fontSize: 13 }}>↗</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

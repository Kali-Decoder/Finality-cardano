'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchCatalog, fetchHealth, metaFor, type CatalogEndpoint } from '@/lib/dashboard/catalog'
import { loadTransactions, spendTotal, type DashboardTx } from '@/lib/dashboard/history'
import { useCardanoWallet } from '@/lib/cardano/wallet'

export default function OverviewPage() {
  const { connected, adaBalance, networkLabel, shortAddress } = useCardanoWallet()
  const [catalog, setCatalog] = useState<CatalogEndpoint[]>([])
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [txs, setTxs] = useState<DashboardTx[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const refreshTx = () => setTxs(loadTransactions())
    refreshTx()
    window.addEventListener('finality:tx', refreshTx)
    window.addEventListener('storage', refreshTx)
    return () => {
      window.removeEventListener('finality:tx', refreshTx)
      window.removeEventListener('storage', refreshTx)
    }
  }, [])

  useEffect(() => {
    let live = true
    ;(async () => {
      setLoading(true)
      try {
        const [c, h] = await Promise.all([fetchCatalog(), fetchHealth().catch(() => null)])
        if (!live) return
        setCatalog(c)
        setHealth(h)
        setError('')
      } catch (e: any) {
        if (live) setError(e.message || 'Merchant unavailable')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => {
      live = false
    }
  }, [])

  const spent = useMemo(() => spendTotal(txs), [txs])
  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of catalog) {
      const cat = metaFor(item.operationId).category
      map.set(cat, (map.get(cat) || 0) + 1)
    }
    return [...map.entries()]
  }, [catalog])

  const recent = txs.slice(0, 6)
  const status = String((health as any)?.status || (error ? 'offline' : loading ? '…' : 'ok'))

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <span className="label">
          <span className="n">01</span>Dashboard
        </span>
        <h1>Pay per call on Cardano.</h1>
        <p className="lede">
          Connect a Preprod wallet, pick an endpoint, and settle each request in ADA via x402. No subscriptions.
        </p>
        <div className="dash-page__cta">
          <Link href="/explore/run" className="pill dark">
            Run an endpoint <span className="pill__ic">→</span>
          </Link>
          <Link href="/explore/endpoints" className="pill line">
            Browse catalog <span className="pill__ic">→</span>
          </Link>
        </div>
      </header>

      <ol className="dash-stats">
        <li className="dash-stat">
          <span className="dash-stat__k">
            <span>Spend</span>
            <span>01</span>
          </span>
          <div className="dash-stat__vis">
            <span className="mf__tag">{spent.toFixed(2)} ADA</span>
          </div>
          <h3>Session total</h3>
          <p>ADA settled from paid calls in this browser.</p>
          <span className="dash-stat__foot">
            <span className="dot" />
            Local history
          </span>
        </li>
        <li className="dash-stat">
          <span className="dash-stat__k">
            <span>Catalog</span>
            <span>02</span>
          </span>
          <div className="dash-stat__vis">
            <span className="mf__tag">{loading ? '…' : `${catalog.length} live`}</span>
          </div>
          <h3>Endpoints</h3>
          <p>{categories.length} categories across market, AI, and on-chain.</p>
          <span className="dash-stat__foot">
            <span className="dot" />
            Merchant catalog
          </span>
        </li>
        <li className="dash-stat">
          <span className="dash-stat__k">
            <span>Wallet</span>
            <span>03</span>
          </span>
          <div className="dash-stat__vis">
            <span className="mf__tag">{connected ? networkLabel ?? 'Preprod' : 'Not connected'}</span>
          </div>
          <h3>{connected ? `${adaBalance ?? '…'} ADA` : 'Connect to see balance'}</h3>
          <p>{connected ? shortAddress : 'Lace or Nami on Preprod. CIP-30 signing only.'}</p>
          <span className="dash-stat__foot">
            <span className="dot" />
            {connected ? 'CIP-30 session' : 'Waiting for wallet'}
          </span>
        </li>
        <li className="dash-stat">
          <span className="dash-stat__k">
            <span>Merchant</span>
            <span>04</span>
          </span>
          <div className="dash-stat__vis">
            <span className="mf__tag">{status.toUpperCase()}</span>
          </div>
          <h3>x402 status</h3>
          <p>Facilitator and catalog reachability for paid calls.</p>
          <span className="dash-stat__foot">
            <span className="dot" />
            @odatano/x402
          </span>
        </li>
      </ol>

      {error && <div className="dash-alert">{error}</div>}

      <section className="dash-section">
        <span className="label">
          <span className="n">02</span>Recent activity
        </span>
        <h2>Settlements from this session.</h2>
        {recent.length === 0 ? (
          <div className="dash-empty">
            <p>
              No paid calls yet. Run an endpoint with a Preprod wallet. Settlements appear here with ADA amount and
              status.
            </p>
            <Link href="/explore/run" className="pill green">
              Try a paid call <span className="pill__ic">→</span>
            </Link>
          </div>
        ) : (
          <ul className="dash-rows">
            {recent.map((tx) => (
              <li key={tx.id}>
                <div>
                  <b>{tx.title}</b>
                  <span className="mono muted">
                    {tx.method} · {tx.operationId}
                  </span>
                </div>
                <div className="dash-rows__meta">
                  <b>{tx.price} ADA</b>
                  <span className="mono muted">{tx.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="dash-bar">
        <p>
          <b>Same path as the landing.</b> Request → 402 → CIP-30 sign → settle on Cardano. Agents and humans share the
          catalog.
        </p>
        <span className="dash-bar__links">
          <Link href="/explore/run" className="pill green">
            Run endpoint <span className="pill__ic">→</span>
          </Link>
          <Link href="/explore/settings" className="pill ghost">
            Wallet &amp; balance <span className="pill__ic">→</span>
          </Link>
        </span>
      </div>
    </div>
  )
}

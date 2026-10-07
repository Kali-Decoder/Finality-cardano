'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { loadTransactions, type DashboardTx } from '@/lib/dashboard/history'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'settled' | 'rejected' | 'degraded'

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'settled', label: 'Settled' },
  { id: 'degraded', label: 'Degraded' },
  { id: 'rejected', label: 'Rejected' },
]

export default function TransactionsPage() {
  const [txs, setTxs] = useState<DashboardTx[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  useEffect(() => {
    const refresh = () => setTxs(loadTransactions())
    refresh()
    window.addEventListener('finality:tx', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('finality:tx', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return txs.filter((tx) => {
      if (status !== 'all' && tx.status !== status) return false
      if (!q) return true
      const hay = `${tx.title} ${tx.operationId} ${tx.path} ${tx.wallet || ''} ${tx.id} ${tx.receipt || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [txs, query, status])

  return (
    <div className="dash-page">
      <div className="dash-head">
        <div>
          <span className="label">
            <span className="n">04</span>Settlements
          </span>
          <h1>Transactions</h1>
          <p>Monitor wallet-paid x402 settlements from this browser.</p>
        </div>
        <Link href="/explore/run" className="pill dark">
          Run endpoint <span className="pill__ic">→</span>
        </Link>
      </div>

      <div className="checks" role="tablist" aria-label="Status filter" style={{ marginBottom: 16 }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={status === tab.id}
            onClick={() => setStatus(tab.id)}
            className={cn('chip click', status === tab.id && 'on')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label className="field dash-search">
        <span className="hint">Search</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Wallet, receipt, or operation id"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="dash-empty" style={{ marginTop: 24 }}>
          <p>
            {txs.length === 0
              ? 'No settlements yet. Run a paid endpoint with a Preprod wallet. Receipts land here.'
              : 'No transactions match this filter.'}
          </p>
          <Link href="/explore/run" className="pill green">
            Try a paid call <span className="pill__ic">→</span>
          </Link>
        </div>
      ) : (
        <div className="dash-tablewrap" style={{ marginTop: 20 }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Amount</th>
                <th>Endpoint</th>
                <th>Wallet</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span className={cn('chip', statusChip(tx.status))}>{tx.status}</span>
                    <span className="mono muted dash-table__sub">{new Date(tx.at).toLocaleString()}</span>
                  </td>
                  <td>
                    <b>{tx.price} ADA</b>
                  </td>
                  <td>
                    <b>{tx.title}</b>
                    <span className="mono muted dash-table__sub">
                      {tx.method} {tx.path}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {tx.wallet ? `${tx.wallet.slice(0, 8)}…${tx.wallet.slice(-6)}` : '—'}
                    </span>
                  </td>
                  <td>
                    {tx.receipt ? (
                      <button
                        type="button"
                        className="pill line"
                        style={{ height: 36, paddingLeft: 14, fontSize: 13.5 }}
                        onClick={() => navigator.clipboard.writeText(tx.receipt || '')}
                      >
                        Copy receipt <span className="pill__ic" style={{ width: 24, height: 24, fontSize: 13 }}>→</span>
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: 13 }}>
                        —
                      </span>
                    )}
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

function statusChip(status: DashboardTx['status']) {
  if (status === 'settled') return 'live'
  if (status === 'degraded') return 'demo'
  return ''
}

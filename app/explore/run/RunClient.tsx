'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useCardanoWallet } from '@/lib/cardano/wallet'
import { callPaidResource, merchantUrl, type PaymentState } from '@/lib/x402/client'
import { fetchCatalog, metaFor, isProEndpoint, type CatalogEndpoint } from '@/lib/dashboard/catalog'
import { saveTransaction } from '@/lib/dashboard/history'
import ResultPresentation, { sampleResultFor, type ResultEnvelope } from '@/components/ResultPresentation'
import { cn } from '@/lib/utils'
import { CARDANO } from '@/lib/cardano/config'

export default function RunClient() {
  const searchParams = useSearchParams()
  const opParam = searchParams.get('op')
  const { activeAddress, signTx } = useCardanoWallet()

  const [catalog, setCatalog] = useState<CatalogEndpoint[]>([])
  const [selected, setSelected] = useState('market.quotes')
  const [input, setInput] = useState('{}')
  const [result, setResult] = useState<ResultEnvelope | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [state, setState] = useState<PaymentState>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showExample, setShowExample] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const data = await fetchCatalog()
        if (!live) return
        setCatalog(data)
        const initial =
          opParam && data.some((d) => d.operationId === opParam)
            ? opParam
            : data.find((d) => d.operationId === 'demo.ping')?.operationId ||
              data[0]?.operationId ||
              'market.quotes'
        setSelected(initial)
      } catch (e: any) {
        if (live) setError(e.message || 'Catalog unavailable')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => {
      live = false
    }
  }, [opParam])

  const endpoint = useMemo(() => catalog.find((v) => v.operationId === selected), [catalog, selected])
  const meta = endpoint ? metaFor(endpoint.operationId) : null
  const example = useMemo(() => (endpoint ? sampleResultFor(endpoint.operationId) : null), [endpoint])

  useEffect(() => {
    if (endpoint) {
      setInput(JSON.stringify(endpoint.requestExample ?? {}, null, 2))
      setResult(null)
      setReceipt(null)
      setError('')
      setShowExample(false)
      setState('idle')
    }
  }, [endpoint])

  const busy = ['signing', 'settling', 'requesting'].includes(state)
  const runLabel =
    state === 'requesting'
      ? 'Requesting…'
      : state === 'signing'
        ? 'Approve in wallet…'
        : state === 'settling'
          ? 'Settling…'
          : 'Pay now'

  const invoke = useCallback(async () => {
    if (!activeAddress) {
      setError('Connect a Cardano wallet first.')
      return
    }
    if (!endpoint) return
    setError('')
    setResult(null)
    setReceipt(null)
    setShowExample(false)
    try {
      const parsed = JSON.parse(input)
      let path = endpoint.path
      let init: RequestInit = { method: endpoint.method }
      if (endpoint.method === 'GET') {
        const qs = new URLSearchParams()
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)))
          else qs.set(k, String(v))
        }
        path += `?${qs}`
      } else {
        init = { ...init, headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed) }
      }
      const response = await callPaidResource(
        { buyerBech32: activeAddress, signTx },
        path,
        init,
        setState,
      )
      setResult(response.body)
      setReceipt(response.receipt)
      saveTransaction({
        id: `${Date.now()}`,
        at: new Date().toISOString(),
        operationId: endpoint.operationId,
        title: meta?.title || endpoint.operationId,
        method: endpoint.method,
        path: endpoint.path,
        price: endpoint.price,
        status: response.body?.meta?.synthetic && !isProEndpoint(endpoint.operationId) ? 'degraded' : 'settled',
        wallet: activeAddress,
        receipt: response.receipt,
      })
    } catch (e: any) {
      const message = e.message || 'Payment request failed'
      setError(message)
      if (endpoint) {
        saveTransaction({
          id: `${Date.now()}`,
          at: new Date().toISOString(),
          operationId: endpoint.operationId,
          title: meta?.title || endpoint.operationId,
          method: endpoint.method,
          path: endpoint.path,
          price: endpoint.price,
          status: 'rejected',
          wallet: activeAddress,
          error: message,
        })
      }
    }
  }, [activeAddress, endpoint, input, meta, signTx])

  return (
    <div className="dash-page">
      <div className="dash-head">
        <div>
          <Link href="/explore" className="pill line" style={{ marginBottom: 14, height: 36, paddingLeft: 14, fontSize: 13.5 }}>
            ← Overview
          </Link>
          <span className="label">
            <span className="n">02</span>Pay per call
          </span>
          <h1>Run endpoint</h1>
          <p>Configure a paid request and settle USDM via Cardano x402.</p>
        </div>
      </div>

      <div className="dash-run">
        <section className="dash-panel">
          <span className="label plain">Configuration</span>
          <p className="muted" style={{ margin: '8px 0 20px', fontSize: 14.5 }}>
            Pick a catalog resource and payload for the paid call.
          </p>

          <label className="field">
            Endpoint
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loading || catalog.length === 0}
            >
              {catalog.map((item) => {
                const m = metaFor(item.operationId)
                return (
                  <option key={item.operationId} value={item.operationId}>
                    {m.title} · {item.price} USDM
                  </option>
                )
              })}
            </select>
          </label>

          {endpoint && (
            <>
              <div className="dash-run__meta">
                <div>
                  <span className="mono muted">Method</span>
                  <b>{endpoint.method}</b>
                </div>
                <div>
                  <span className="mono muted">Price</span>
                  <b>{endpoint.price} USDM</b>
                </div>
              </div>

              <label className="field" style={{ marginTop: 18 }}>
                {endpoint.method === 'GET' ? 'Query (JSON)' : 'Body (JSON)'}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                  rows={10}
                  className="mono"
                />
              </label>

              <div className="dash-run__wallet">
                <div className="dash-run__wallet-head">
                  <b>Wallet payment</b>
                  <span className={cn('chip', activeAddress ? 'live' : 'demo')}>
                    {activeAddress ? 'Ready' : 'Required'}
                  </span>
                </div>
                <p className="muted" style={{ margin: '10px 0 0', fontSize: 14 }}>
                  Unpaid calls return HTTP 402. Your CIP-30 wallet signs the USDM payment; settlement is on Cardano via
                  @odatano/x402.
                </p>
                <div className="mono muted" style={{ marginTop: 10, fontSize: 12, wordBreak: 'break-all' }}>
                  {activeAddress || 'Not connected. Use Connect wallet in the header'}
                </div>
              </div>
            </>
          )}

          {error && <div className="dash-alert">{error}</div>}
        </section>

        <section className="dash-panel dash-run__pay">
          <span className="label plain">Live preview</span>

          <div className="dash-run__gateway">
            <span className="chip live">
              <span className="dot" />
              Payment gateway
            </span>
            <span className="chip">Secure · CIP-30</span>
          </div>

          <div className="dash-run__amount">
            <h2>{meta?.title || 'Select endpoint'}</h2>
            <p className="muted">
              {endpoint?.description || 'Choose an endpoint to preview the paid request.'}
            </p>
            <div className="dash-run__price">
              {endpoint?.price ?? '—'} <span>USDM</span>
            </div>
            <div className="mono muted" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8 }}>
              {CARDANO.asset} · {CARDANO.network}
            </div>
          </div>

          <button
            type="button"
            className="pill green lg"
            style={{ width: '100%', justifyContent: 'space-between' }}
            onClick={invoke}
            disabled={!endpoint || busy || loading}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {runLabel}
            {!busy && <span className="pill__ic">→</span>}
          </button>

          <div className="dash-run__foot">
            <span className={cn('mono', state === 'rejected' && 'bad', state === 'settled' && 'ok')}>
              State · {state}
            </span>
            <button type="button" className="linkish" onClick={() => setShowExample((v) => !v)}>
              {showExample ? 'Hide example' : 'Show example'}
            </button>
          </div>

          {(result || (showExample && example)) && (
            <div className="dash-run__result">
              <span className="label plain">{result ? 'Result' : 'Example response'}</span>
              <ResultPresentation
                result={(result || example)!}
                receipt={result ? receipt : null}
                title={result ? 'Result' : 'Example'}
              />
            </div>
          )}

          {!result && !showExample && (
            <div className="dash-empty" style={{ padding: '28px 20px', width: '100%', alignItems: 'center', textAlign: 'center' }}>
              <p style={{ maxWidth: '28rem' }}>Press Pay now to settle and fetch a live response.</p>
            </div>
          )}

          {endpoint && (
            <div className="mono muted" style={{ fontSize: 11, wordBreak: 'break-all', marginTop: 8 }}>
              {merchantUrl}
              {endpoint.path}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

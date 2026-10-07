'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { UsdmPrice } from '@/components/brand/AssetIcons'
import { cn } from '@/lib/utils'
import { fetchCatalog, metaFor, isProEndpoint, CATEGORY_ORDER, type CatalogEndpoint } from '@/lib/dashboard/catalog'

type CategoryFilter = 'All' | (typeof CATEGORY_ORDER)[number]

const CATEGORY_TABS: CategoryFilter[] = ['All', ...CATEGORY_ORDER]

export default function EndpointsPage() {
  const [catalog, setCatalog] = useState<CatalogEndpoint[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const data = await fetchCatalog()
        if (live) setCatalog(data)
      } catch (e: any) {
        if (live) setError(e.message || 'Failed to load catalog')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => {
      live = false
    }
  }, [])

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of catalog) {
      const cat = metaFor(item.operationId).category
      counts.set(cat, (counts.get(cat) || 0) + 1)
    }
    return counts
  }, [catalog])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((item) => {
      const m = metaFor(item.operationId)
      if (category !== 'All' && m.category !== category) return false
      if (!q) return true
      return `${m.title} ${m.category} ${item.operationId} ${item.path} ${item.description}${isProEndpoint(item.operationId) ? ' pro-endpoints' : ''}`.toLowerCase().includes(q)
    })
  }, [catalog, query, category])

  return (
    <div className="dash-page">
      <div className="dash-head">
        <div>
          <span className="label">
            <span className="n">03</span>Catalog
          </span>
          <h1>Endpoints</h1>
          <p>Browse paid API resources from the merchant catalog.</p>
        </div>
        <Link href="/explore/run" className="pill dark">
          Run endpoint <span className="pill__ic">→</span>
        </Link>
      </div>

      <div className="checks" role="tablist" aria-label="Endpoint categories" style={{ marginBottom: 16 }}>
        {CATEGORY_TABS.map((tab) => {
          const active = category === tab
          const count = tab === 'All' ? catalog.length : categoryCounts.get(tab) || 0
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(tab)}
              className={cn('chip click', active && 'on')}
            >
              {tab}
              <span className="mono" style={{ opacity: 0.7, fontSize: 12 }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <label className="field dash-search">
        <span className="hint">Filter</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, path, or operation id"
        />
      </label>

      {error && <div className="dash-alert">{error}</div>}

      <div className="dash-tablewrap" style={{ marginTop: 20 }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Route</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Category</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="dash-table__empty">
                  Loading catalog…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="dash-table__empty">
                  No endpoints found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const m = metaFor(item.operationId)
                const pro = isProEndpoint(item.operationId)
                return (
                  <tr key={item.operationId}>
                    <td>
                      <b>{m.title}</b>
                      {pro && <span className="chip live" style={{ marginLeft: 8 }}>pro</span>}
                      <span className="mono muted dash-table__sub">{item.operationId}</span>
                    </td>
                    <td>
                      <span className="chip live">
                        <span className="dot" />
                        Live
                      </span>
                    </td>
                    <td>
                      <span className={cn('mf__tag', item.method === 'GET' ? '' : 'amber')}>{item.method}</span>
                      <span className="mono muted dash-table__sub">{item.path}</span>
                    </td>
                    <td>
                      <b>
                        <UsdmPrice amount={item.price} size={14} />
                      </b>
                    </td>
                    <td>
                      <span className="mono muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {item.availabilityTrack || 'paid'}
                      </span>
                    </td>
                    <td>{m.category}</td>
                    <td>
                      <Link href={`/explore/run?op=${encodeURIComponent(item.operationId)}`} className="pill line" style={{ height: 36, paddingLeft: 14, fontSize: 13.5 }}>
                        Run <span className="pill__ic" style={{ width: 24, height: 24, fontSize: 13 }}>→</span>
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

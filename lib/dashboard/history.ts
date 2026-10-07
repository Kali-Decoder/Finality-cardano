export type DashboardTx = {
  id: string
  at: string
  operationId: string
  title: string
  method: string
  path: string
  price: string
  status: 'settled' | 'rejected' | 'degraded'
  wallet?: string
  receipt?: string | null
  error?: string
}

/** v2 — USDM pricing; bumps wipe pre-USDM browser history. */
const KEY = 'finality.dashboard.transactions.v2'

export function loadTransactions(): DashboardTx[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DashboardTx[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTransaction(tx: DashboardTx) {
  if (typeof window === 'undefined') return
  const prev = loadTransactions()
  const next = [tx, ...prev].slice(0, 100)
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('finality:tx'))
}

export function clearTransactions() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('finality:tx'))
}

export function spendTotal(txs: DashboardTx[]) {
  return txs
    .filter((t) => t.status === 'settled' || t.status === 'degraded')
    .reduce((sum, t) => sum + (Number.parseFloat(t.price) || 0), 0)
}

import { merchantUrl } from '@/lib/x402/client'

export type CatalogEndpoint = {
  operationId: string
  method: 'GET' | 'POST'
  path: string
  price: string
  description: string
  availabilityTrack: string
  limits: Record<string, number>
  requestExample: Record<string, unknown>
}

export type EndpointMeta = { title: string; category: string; use: string }

export const ENDPOINT_DETAILS: Record<string, EndpointMeta> = {
  'market.quotes': { title: 'Live Quotes', category: 'Market data', use: 'Current spot price, 24h change and volume' },
  'market.assets': { title: 'Asset Search', category: 'Market data', use: 'Find and normalize supported symbols' },
  'market.candles': { title: 'Price Candles', category: 'Market data', use: 'Bounded OHLCV history for analysis' },
  'market.trending': { title: 'Trending Markets', category: 'Market data', use: 'Rank liquid assets by current volume' },
  'market.categories': { title: 'Coin Categories', category: 'Market data', use: 'Categories ranked by 24h market-cap change' },
  'market.tokenPrices': { title: 'Token Prices', category: 'Market data', use: 'On-chain token USD prices' },
  'market.fearGreed': { title: 'Fear & Greed', category: 'Market data', use: 'Daily crypto market sentiment' },
  'intelligence.signals': { title: 'Trading Signals', category: 'Intelligence', use: 'Directional signal with score and regime' },
  'intelligence.technicals': { title: 'Technical Snapshot', category: 'Intelligence', use: 'SMA, RSI, momentum and market regime' },
  'intelligence.report': { title: 'Market Report', category: 'Intelligence', use: 'Combined technical signal and risk view' },
  'intelligence.volume': { title: 'Volume Analysis', category: 'Intelligence', use: 'Participation, average volume and spike detection' },
  'intelligence.events': { title: 'Price Events', category: 'Intelligence', use: 'Detect statistically meaningful price moves' },
  'intelligence.backtest': { title: 'Strategy Backtest', category: 'Intelligence', use: 'Test a moving-average strategy on history' },
  'agent.decision': { title: 'Agent Decision', category: 'Agent tools', use: 'Bounded action, confidence and position limit' },
  'agent.briefing': { title: 'Agent Briefing', category: 'Agent tools', use: 'Compact machine-readable market context' },
  'agent.strategyParse': { title: 'Strategy Parser', category: 'Agent tools', use: 'Turn plain language into validated rules' },
  'ai.chat': { title: 'AI Market Analyst', category: 'AI analyst', use: 'Ask a concise market question' },
  'onchain.cardanoAddress': { title: 'Cardano Address', category: 'Cardano', use: 'Inspect an address via Cardano chain data' },
  'onchain.cardanoPortfolio': { title: 'Token Portfolio', category: 'Cardano', use: 'Review ADA and native token holdings' },
  'onchain.cardanoAsset': { title: 'Asset Intelligence', category: 'Cardano', use: 'Retrieve native asset metadata' },
  'onchain.cardanoTip': { title: 'Chain Tip', category: 'Cardano', use: 'Latest block / tip' },
  'onchain.cardanoHealth': { title: 'Node Health', category: 'Cardano', use: 'Chain data provider health check' },
}

export const CATEGORY_ORDER = ['Market data', 'Intelligence', 'Agent tools', 'AI analyst', 'Cardano'] as const

/** Hidden from Explore catalog UI (internal probe route). */
const HIDDEN_OPERATION_IDS = new Set(['demo.ping'])

export const PRO_CATEGORIES = new Set(['Intelligence', 'Agent tools', 'AI analyst'])

export function metaFor(operationId: string): EndpointMeta {
  return ENDPOINT_DETAILS[operationId] || { title: operationId, category: 'Other', use: '' }
}

export function isProEndpoint(operationId: string): boolean {
  return PRO_CATEGORIES.has(metaFor(operationId).category)
}

export async function fetchCatalog(): Promise<CatalogEndpoint[]> {
  const r = await fetch(`${merchantUrl}/v1/catalog`)
  const v = await r.json()
  if (!r.ok) throw new Error(v?.error?.message || `HTTP ${r.status}`)
  const rows = (v.data ?? []) as CatalogEndpoint[]
  return rows.filter((e) => !HIDDEN_OPERATION_IDS.has(e.operationId))
}

export async function fetchHealth(): Promise<Record<string, unknown>> {
  const r = await fetch(`${merchantUrl}/health`)
  const v = await r.json()
  if (!r.ok) throw new Error(v?.error?.message || `HTTP ${r.status}`)
  return v
}

export async function fetchInfo(): Promise<Record<string, unknown>> {
  const r = await fetch(`${merchantUrl}/info`)
  const v = await r.json()
  if (!r.ok) throw new Error(v?.error?.message || `HTTP ${r.status}`)
  return v
}

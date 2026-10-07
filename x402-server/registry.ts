/**
 * Finality merchant endpoint registry — Cardano Preprod.
 * Settlement asset: USDM (6 decimals). Catalog prices are 0.01–0.10 USDM (2 dp).
 */
export type HttpMethod = 'GET' | 'POST'

export type EndpointDef = {
  operationId: string
  method: HttpMethod
  path: string
  /** Atomic USDM units (6 decimals): 0.01 USDM = 10_000 */
  priceLovelace: string
  /** Display amount (2 decimals), shown as USDM in the UI */
  priceAda: string
  description: string
  availabilityTrack: 'durable' | 'quota-limited'
  limits: Record<string, number>
  requestExample: Record<string, unknown>
}

/** USDM base units per 1.00 USDM (6 decimals). */
const USDM = 1_000_000n

/**
 * Catalog tiers in USDM (0.01–0.10, two decimal places).
 * market / onchain / demo → 0.01 · intelligence → 0.05 · report → 0.08 · agent → 0.07 · ai → 0.10
 */
function priceFor(operationId: string): Pick<EndpointDef, 'priceAda' | 'priceLovelace'> {
  const usdm =
    operationId.startsWith('demo.') ? 0.01 :
    operationId.startsWith('ai.') ? 0.1 :
    operationId.startsWith('agent.') ? 0.07 :
    operationId === 'intelligence.report' ? 0.08 :
    operationId.startsWith('intelligence.') ? 0.05 :
    0.01
  const units = BigInt(Math.round(usdm * Number(USDM)))
  return {
    priceAda: usdm.toFixed(2),
    priceLovelace: units.toString(),
  }
}

type EndpointSeed = Omit<EndpointDef, 'priceAda' | 'priceLovelace'>

const SEEDS: EndpointSeed[] = [
  {
    operationId: 'demo.ping',
    method: 'GET',
    path: '/v1/demo/ping',
    description: 'Probe route for Lace / UI settlement tests (returns fixed JSON)',
    availabilityTrack: 'durable',
    limits: {},
    requestExample: {},
  },
  {
    operationId: 'market.quotes',
    method: 'GET',
    path: '/v1/market/quotes',
    description: 'Bounded spot quotes',
    availabilityTrack: 'durable',
    limits: { symbols: 20 },
    requestExample: { symbols: 'BTC,ETH' },
  },
  {
    operationId: 'market.assets',
    method: 'GET',
    path: '/v1/market/assets',
    description: 'Asset search and normalization',
    availabilityTrack: 'durable',
    limits: { limit: 50 },
    requestExample: { query: 'BTC', limit: 10 },
  },
  {
    operationId: 'market.candles',
    method: 'POST',
    path: '/v1/market/candles',
    description: 'Bounded OHLCV history',
    availabilityTrack: 'durable',
    limits: { limit: 500 },
    requestExample: { symbol: 'BTC', interval: '1h', limit: 100 },
  },
  {
    operationId: 'market.trending',
    method: 'GET',
    path: '/v1/market/trending',
    description: 'Ranked liquid assets',
    availabilityTrack: 'durable',
    limits: { limit: 50 },
    requestExample: { limit: 10 },
  },
  {
    operationId: 'market.categories',
    method: 'GET',
    path: '/v1/market/categories',
    description: 'Coin categories by 24h market-cap change',
    availabilityTrack: 'durable',
    limits: {},
    requestExample: {},
  },
  {
    operationId: 'market.tokenPrices',
    method: 'GET',
    path: '/v1/market/token-prices',
    description: 'On-chain token USD prices',
    availabilityTrack: 'durable',
    limits: { ids: 50 },
    // Live token_price needs a real contract — WETH on Ethereum.
    requestExample: {
      network: 'eth',
      addresses: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
  },
  {
    operationId: 'market.fearGreed',
    method: 'GET',
    path: '/v1/market/fear-greed',
    description: 'Fear and Greed index',
    availabilityTrack: 'durable',
    limits: { limit: 30 },
    requestExample: { limit: 1 },
  },
  {
    operationId: 'intelligence.signals',
    method: 'POST',
    path: '/v1/signals',
    description: 'Multi-market trading signals',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC' },
  },
  {
    operationId: 'intelligence.technicals',
    method: 'POST',
    path: '/v1/technicals',
    description: 'Technical indicators and regime',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC' },
  },
  {
    operationId: 'intelligence.report',
    method: 'POST',
    path: '/v1/analysis/report',
    description: 'Combined intelligence report',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC' },
  },
  {
    operationId: 'intelligence.volume',
    method: 'POST',
    path: '/v1/analysis/volume',
    description: 'Volume participation analysis',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC' },
  },
  {
    operationId: 'intelligence.events',
    method: 'POST',
    path: '/v1/analysis/events',
    description: 'Price event detection',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC' },
  },
  {
    operationId: 'intelligence.backtest',
    method: 'POST',
    path: '/v1/backtest',
    description: 'Bounded MA strategy backtest',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC', fast: 10, slow: 30 },
  },
  {
    operationId: 'agent.decision',
    method: 'POST',
    path: '/v1/agent/decision',
    description: 'Risk-aware agent decision',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC', risk: 'medium' },
  },
  {
    operationId: 'agent.briefing',
    method: 'POST',
    path: '/v1/agent/briefing',
    description: 'Machine-readable market briefing',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { symbol: 'BTC' },
  },
  {
    operationId: 'agent.strategyParse',
    method: 'POST',
    path: '/v1/agent/strategy/parse',
    description: 'Natural-language strategy parser',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { text: 'Buy when SMA10 crosses above SMA30' },
  },
  {
    operationId: 'ai.chat',
    method: 'POST',
    path: '/v1/ai/chat',
    description: 'Data-grounded AI market analyst',
    availabilityTrack: 'quota-limited',
    limits: {},
    requestExample: { question: 'What is the short-term bias for BTC?' },
  },
  {
    operationId: 'onchain.cardanoAddress',
    method: 'POST',
    path: '/v1/onchain/cardano/address',
    description: 'Cardano address intelligence (Blockfrost)',
    availabilityTrack: 'durable',
    limits: {},
    requestExample: {
      address:
        'addr_test1qpw7euev3vk3rx3j8etky36j3qj5rdwurnyw2pmxkq00vhjw30738vaw6ugqzsm4xfq707gsx5awnjuxfn3yftflzf8qa7n27w',
    },
  },
  {
    operationId: 'onchain.cardanoPortfolio',
    method: 'POST',
    path: '/v1/onchain/cardano/portfolio',
    description: 'ADA and native asset portfolio',
    availabilityTrack: 'durable',
    limits: {},
    requestExample: {
      address:
        'addr_test1qpw7euev3vk3rx3j8etky36j3qj5rdwurnyw2pmxkq00vhjw30738vaw6ugqzsm4xfq707gsx5awnjuxfn3yftflzf8qa7n27w',
    },
  },
  {
    operationId: 'onchain.cardanoAsset',
    method: 'POST',
    path: '/v1/onchain/cardano/asset',
    description: 'Native asset metadata',
    availabilityTrack: 'durable',
    limits: {},
    // Preprod USDM (Mehen) unit — concatenated policy + asset name hex
    requestExample: {
      asset: '16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d',
    },
  },
  {
    operationId: 'onchain.cardanoTip',
    method: 'GET',
    path: '/v1/onchain/cardano/tip',
    description: 'Chain tip / latest block',
    availabilityTrack: 'durable',
    limits: {},
    requestExample: {},
  },
  {
    operationId: 'onchain.cardanoHealth',
    method: 'GET',
    path: '/v1/onchain/cardano/health',
    description: 'Blockfrost / node health',
    availabilityTrack: 'durable',
    limits: {},
    requestExample: {},
  },
]

export const ENDPOINTS: EndpointDef[] = SEEDS.map((seed) => ({
  ...seed,
  ...priceFor(seed.operationId),
}))

export function findEndpoint(method: string, path: string): EndpointDef | undefined {
  const clean = path.split('?')[0] || path
  return ENDPOINTS.find((e) => e.method === method.toUpperCase() && e.path === clean)
}

export function catalogProjection() {
  return ENDPOINTS.map((e) => ({
    operationId: e.operationId,
    method: e.method,
    path: e.path,
    price: e.priceAda,
    description: e.description,
    availabilityTrack: e.availabilityTrack,
    limits: e.limits,
    requestExample: e.requestExample,
  }))
}

import { randomUUID } from 'node:crypto'
import type { Request } from 'express'
import type { EndpointDef } from './registry'
import {
  fetchMarketQuotes,
  fetchMarketTrending,
  fetchMarketCandles,
  fetchMarketCategories,
  fetchMarketTokenPrices,
  fetchMarketCoinsList,
} from '../lib/providers/market'
import { mockQuotes, mockCandles, mockMeta } from '../lib/providers/mock'

import { settlementAsset } from '../lib/cardano/usdm'

const allowMock = () => process.env.ALLOW_MOCK_FALLBACK !== 'false'
const network = () => process.env.X402_NETWORK || 'cardano:preprod'
const paymentAsset = () => settlementAsset(process.env.X402_ASSET)

function envelope(operationId: string, data: unknown, meta: Record<string, unknown>, payment?: { settlementId?: string }) {
  return {
    success: true as const,
    operationId,
    requestId: randomUUID(),
    data,
    meta,
    payment: {
      network: network(),
      asset: paymentAsset(),
      settlementId: payment?.settlementId || 'pending',
    },
  }
}

async function blockfrost(path: string) {
  const key = process.env.BLOCKFROST_API_KEY
  const net = (process.env.NETWORK || 'preprod').toLowerCase()
  const host =
    net === 'mainnet'
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : net === 'preview'
        ? 'https://cardano-preview.blockfrost.io/api/v0'
        : 'https://cardano-preprod.blockfrost.io/api/v0'
  if (!key) throw new Error('BLOCKFROST_API_KEY missing')
  const res = await fetch(`${host}${path}`, {
    headers: { project_id: key },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Blockfrost ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

function bodyOf(req: Request): Record<string, unknown> {
  return (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
}

export async function runEndpoint(ep: EndpointDef, req: Request, settlementId?: string) {
  const q = req.query as Record<string, string>
  const body = bodyOf(req)
  const opts = {
    coingeckoApiKey: process.env.COINGECKO_API_KEY,
    coingeckoProApiKey: process.env.COINGECKO_PRO_API_KEY,
  }

  try {
    switch (ep.operationId) {
      case 'demo.ping': {
        return envelope(
          ep.operationId,
          {
            ok: true,
            message: 'Finality ping — payment accepted on Cardano Preprod',
            echo: {
              query: q,
              body,
            },
            tip: 'Use Explore → Run to settle USDM via CIP-30 + x402.',
          },
          {
            source: 'finality',
            synthetic: false,
            dataMode: 'live',
            availabilityTrack: 'durable',
            freshnessSeconds: 0,
            limitations: ['probe endpoint'],
          },
          { settlementId },
        )
      }
      case 'market.quotes': {
        const symbols = String(q.symbols || body.symbols || 'BTC')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        try {
          const r = await fetchMarketQuotes(symbols, opts)
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        } catch (e) {
          if (!allowMock()) throw e
          const r = mockQuotes(symbols)
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        }
      }
      case 'market.trending': {
        const limit = Number(q.limit || body.limit || 10)
        try {
          const r = await fetchMarketTrending(limit, opts)
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        } catch (e) {
          if (!allowMock()) throw e
          const r = mockQuotes(['BTC', 'ETH', 'SOL', 'ADA'].slice(0, limit))
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        }
      }
      case 'market.candles': {
        const symbol = String(body.symbol || q.symbol || 'BTC')
        const limit = Number(body.limit || q.limit || 100)
        try {
          const r = await fetchMarketCandles(symbol, String(body.interval || '1h'), limit, opts)
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        } catch (e) {
          if (!allowMock()) throw e
          const r = mockCandles(symbol, limit)
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        }
      }
      case 'market.categories': {
        try {
          const r = await fetchMarketCategories(opts)
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(ep.operationId, [], mockMeta() as unknown as Record<string, unknown>, { settlementId })
        }
      }
      case 'market.tokenPrices': {
        const networkName = String(q.network || body.network || 'eth')
        const addresses = String(q.addresses || body.addresses || body.ids || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        try {
          const r = await fetchMarketTokenPrices(networkName, addresses.length ? addresses : ['0x0000000000000000000000000000000000000000'], opts)
          return envelope(ep.operationId, r.data, r.meta as unknown as Record<string, unknown>, { settlementId })
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(ep.operationId, {}, mockMeta() as unknown as Record<string, unknown>, { settlementId })
        }
      }
      case 'market.assets': {
        const query = String(q.query || body.query || 'BTC').toLowerCase()
        const limit = Number(q.limit || body.limit || 10)
        try {
          const r = await fetchMarketCoinsList(opts)
          const list = Array.isArray(r.data) ? r.data : []
          const filtered = list
            .filter((c: { id?: string; symbol?: string; name?: string }) => {
              const hay = `${c.id || ''} ${c.symbol || ''} ${c.name || ''}`.toLowerCase()
              return hay.includes(query)
            })
            .slice(0, limit)
          return envelope(ep.operationId, filtered, r.meta as unknown as Record<string, unknown>, { settlementId })
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(
            ep.operationId,
            [{ symbol: query.toUpperCase(), name: query, id: query.toLowerCase() }],
            mockMeta() as unknown as Record<string, unknown>,
            { settlementId },
          )
        }
      }
      case 'market.fearGreed': {
        const limit = Number(q.limit || 1)
        try {
          const res = await fetch(`https://api.alternative.me/fng/?limit=${limit}`, {
            signal: AbortSignal.timeout(15_000),
          })
          const json = (await res.json()) as { data?: unknown }
          return envelope(
            ep.operationId,
            json.data ?? json,
            {
              source: 'alternative.me',
              provider: 'alternative.me',
              asOf: new Date().toISOString(),
              freshnessSeconds: 3600,
              limitations: [],
              availabilityTrack: 'durable',
              dataMode: 'live',
              synthetic: false,
            },
            { settlementId },
          )
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(
            ep.operationId,
            [{ value: '50', value_classification: 'Neutral', timestamp: String(Math.floor(Date.now() / 1000)) }],
            mockMeta() as unknown as Record<string, unknown>,
            { settlementId },
          )
        }
      }
      case 'intelligence.signals':
      case 'intelligence.technicals':
      case 'intelligence.report':
      case 'intelligence.volume':
      case 'intelligence.events':
      case 'intelligence.backtest':
      case 'agent.decision':
      case 'agent.briefing':
      case 'agent.strategyParse':
      case 'ai.chat': {
        const symbol = String(body.symbol || 'BTC').toUpperCase()
        // Derive from live OHLCV — never mock candles for showcase.
        const candles = await fetchMarketCandles(symbol, String(body.interval || '1h'), 60, opts)
        const closes = candles.data.map((c) => c.close)
        const last = closes[closes.length - 1] ?? 0
        const prev = closes[closes.length - 2] ?? last
        const mom = last - prev
        const liveMeta = {
          ...(candles.meta as unknown as Record<string, unknown>),
          synthetic: false,
          dataMode: 'live',
          derivedFrom: 'live-ohlcv',
          limitations: [
            ...(((candles.meta as { limitations?: string[] })?.limitations) || []),
            'Deterministic analysis over live candles (not an LLM). Not financial advice.',
          ],
        }
        const data =
          ep.operationId === 'ai.chat'
            ? {
                answer: `Live briefing for ${symbol}: last ${last.toFixed(2)}, momentum ${mom.toFixed(2)}. Not financial advice.`,
                generatedByModel: false,
                symbol,
                price: last,
              }
            : ep.operationId === 'agent.strategyParse'
              ? {
                  rules: { fast: Number(body.fast) || 10, slow: Number(body.slow) || 30, side: mom >= 0 ? 'long' : 'short' },
                  text: String(body.text || ''),
                  generatedByModel: false,
                  price: last,
                }
              : {
                  symbol,
                  action: mom >= 0 ? 'BUY' : 'SELL',
                  score: Number((50 + Math.tanh(mom) * 40).toFixed(1)),
                  price: last,
                  regime: mom >= 0 ? 'bull' : 'bear',
                  answer: `Live ${ep.operationId} for ${symbol} from current OHLCV.`,
                  generatedByModel: false,
                }
        return envelope(ep.operationId, data, liveMeta, { settlementId })
      }
      case 'onchain.cardanoTip': {
        try {
          const tip = await blockfrost('/blocks/latest')
          return envelope(
            ep.operationId,
            tip,
            {
              source: 'blockfrost',
              provider: 'blockfrost',
              asOf: new Date().toISOString(),
              freshnessSeconds: 20,
              limitations: [],
              availabilityTrack: 'durable',
              dataMode: 'live',
              synthetic: false,
            },
            { settlementId },
          )
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(
            ep.operationId,
            { height: 0, hash: 'synthetic', note: 'Blockfrost unavailable' },
            mockMeta() as unknown as Record<string, unknown>,
            { settlementId },
          )
        }
      }
      case 'onchain.cardanoHealth': {
        try {
          const health = await blockfrost('/health')
          return envelope(
            ep.operationId,
            health,
            {
              source: 'blockfrost',
              provider: 'blockfrost',
              asOf: new Date().toISOString(),
              freshnessSeconds: 20,
              limitations: [],
              availabilityTrack: 'durable',
              dataMode: 'live',
              synthetic: false,
            },
            { settlementId },
          )
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(ep.operationId, { is_healthy: false }, mockMeta() as unknown as Record<string, unknown>, {
            settlementId,
          })
        }
      }
      case 'onchain.cardanoAddress':
      case 'onchain.cardanoPortfolio': {
        const address = String(body.address || q.address || '')
        if (!address) throw new Error('address is required')
        try {
          const info = await blockfrost(`/addresses/${address}`)
          return envelope(
            ep.operationId,
            info,
            {
              source: 'blockfrost',
              provider: 'blockfrost',
              asOf: new Date().toISOString(),
              freshnessSeconds: 30,
              limitations: [],
              availabilityTrack: 'durable',
              dataMode: 'live',
              synthetic: false,
            },
            { settlementId },
          )
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(
            ep.operationId,
            { address, amount: [{ unit: 'lovelace', quantity: '0' }], synthetic: true },
            mockMeta() as unknown as Record<string, unknown>,
            { settlementId },
          )
        }
      }
      case 'onchain.cardanoAsset': {
        const asset = String(body.asset || q.asset || '')
        if (!asset) throw new Error('asset is required')
        try {
          const info = await blockfrost(`/assets/${asset}`)
          return envelope(
            ep.operationId,
            info,
            {
              source: 'blockfrost',
              provider: 'blockfrost',
              asOf: new Date().toISOString(),
              freshnessSeconds: 60,
              limitations: [],
              availabilityTrack: 'durable',
              dataMode: 'live',
              synthetic: false,
            },
            { settlementId },
          )
        } catch (e) {
          if (!allowMock()) throw e
          return envelope(ep.operationId, { asset, synthetic: true }, mockMeta() as unknown as Record<string, unknown>, {
            settlementId,
          })
        }
      }
      default:
        throw new Error(`Unhandled operation ${ep.operationId}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false as const,
      operationId: ep.operationId,
      requestId: randomUUID(),
      error: { code: 'handler_error', message, retryable: true },
    }
  }
}

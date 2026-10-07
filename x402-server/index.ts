/**
 * Finality Cardano x402 merchant (resource server).
 * Network: cardano:preprod · Asset: lovelace · Settlement: localFacilitator + Blockfrost.
 */
import express from 'express'
import {
  buildUnsignedPaymentTx,
  httpFacilitator,
  localFacilitator,
  x402Middleware,
  type Facilitator,
  type PricingContext,
} from '../x402/srv/index'
import { ENDPOINTS, catalogProjection, findEndpoint } from './registry'
import { runEndpoint } from './handlers'

const PORT = Number(process.env.X402_SERVER_PORT || 4021)
const PAY_TO = process.env.X402_PAYTO_ADDRESS || process.env.NEXT_PUBLIC_X402_PAYTO || ''
const NETWORK = (process.env.X402_NETWORK || 'cardano:preprod') as 'cardano:preprod'
const ASSET = process.env.X402_ASSET || 'lovelace'
const PUBLIC_URL = (process.env.X402_PUBLIC_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '')
const ORIGINS = (process.env.X402_ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function makeFacilitator(): Facilitator {
  const url = (process.env.X402_FACILITATOR_URL || '').trim()
  if (url) {
    return httpFacilitator({
      url,
      apiKey: process.env.X402_FACILITATOR_API_KEY || undefined,
    })
  }
  return localFacilitator()
}

if (!PAY_TO) {
  console.error('X402_PAYTO_ADDRESS is required')
  process.exit(1)
}

const app = express()
app.use(express.json({ limit: '1mb' }))

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  } else if (ORIGINS.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, PAYMENT-SIGNATURE, Payment-Signature, X-PAYMENT-GRANT',
  )
  res.setHeader(
    'Access-Control-Expose-Headers',
    'PAYMENT-REQUIRED, PAYMENT-RESPONSE, Payment-Required, Payment-Response, X-PAYMENT-GRANT, X-PAYMENT-GRANT-EXPIRES',
  )
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  next()
})

app.get('/health', (_req, res) => {
  const blockfrost = Boolean((process.env.BLOCKFROST_API_KEY || '').trim())
  res.json({
    status: 'ok',
    network: NETWORK,
    asset: ASSET,
    facilitator: process.env.X402_FACILITATOR_URL || 'local',
    blockfrostConfigured: blockfrost,
    backends: process.env.BACKENDS || 'blockfrost',
    endpoints: ENDPOINTS.length,
    x402: 'local:@odatano/x402 (./x402/srv)',
  })
})

app.get('/info', (_req, res) => {
  res.json({
    name: 'Finality',
    protocol: 'x402',
    network: NETWORK,
    asset: ASSET,
    payTo: PAY_TO,
    publicUrl: PUBLIC_URL,
    facilitator: process.env.X402_FACILITATOR_URL || 'local',
  })
})

app.get('/v1/catalog', (_req, res) => {
  res.json({ success: true, data: catalogProjection() })
})

app.get('/v1/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Finality Cardano x402 API', version: '1.0.0' },
    servers: [{ url: PUBLIC_URL }],
    paths: Object.fromEntries(
      ENDPOINTS.map((e) => [
        e.path,
        {
          [e.method.toLowerCase()]: {
            operationId: e.operationId,
            summary: e.description,
            'x-finality-price-usdm': e.priceAda,
            'x-finality-price-units': e.priceLovelace,
          },
        },
      ]),
    ),
  })
})

/** CIP-30 browser buyers (Lace/Nami): build unsigned payment tx via local @odatano/x402. */
app.post('/pay/intent', async (req, res) => {
  try {
    if (!(process.env.BLOCKFROST_API_KEY || '').trim()) {
      res.status(503).json({
        error:
          'BLOCKFROST_API_KEY is required to build unsigned Preprod payments for Lace. Set a preprod_… key in x402-server/.env and restart npm run dev:merchant.',
      })
      return
    }
    const buyer = String(req.body?.buyer || '')
    const requirement = req.body?.requirement
    if (!buyer || !requirement) {
      res.status(400).json({ error: 'buyer and requirement are required' })
      return
    }
    const built = await buildUnsignedPaymentTx({
      buyerBech32: buyer,
      requirements: requirement,
    })
    res.json({
      unsignedTxCborHex: built.unsignedTxCborHex,
      nonceRef: built.nonceRef,
      txHashHex: built.txHashHex,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ error: message })
  }
})

const fac = makeFacilitator()

app.use(
  '/v1',
  x402Middleware({
    payTo: PAY_TO,
    network: NETWORK,
    asset: ASSET,
    facilitator: fac,
    serviceName: 'Finality',
    description: 'Finality pay-per-call Cardano x402 API',
    skipPaths: /^\/(catalog|openapi\.json)(\/|$)/i,
    routePricing: (ctx: PricingContext) => {
      const raw = ctx.path || ''
      const full = raw.startsWith('/v1/') ? raw : `/v1${raw.startsWith('/') ? raw : `/${raw}`}`
      const method = (ctx.method || 'GET').toUpperCase()
      const ep = findEndpoint(method, full)
      if (!ep) return null
      // Local UI testing without Blockfrost: allow demo.ping unpaid so Run still returns JSON.
      // With a Preprod Blockfrost key, demo.ping stays a normal paid x402 route.
      if (
        ep.operationId === 'demo.ping' &&
        !(process.env.BLOCKFROST_API_KEY || '').trim()
      ) {
        return null
      }
      return ep.priceLovelace
    },
    onAccepted: (claim) => {
      console.log('[x402] settled', claim.txHash, claim.amountUnits, claim.asset)
    },
  }),
)

for (const ep of ENDPOINTS) {
  const rel = ep.path.replace(/^\/v1/, '') || '/'
  const handler = async (req: express.Request, res: express.Response) => {
    const result = await runEndpoint(ep, req, req.payment?.txHash)
    if (!result.success) {
      res.status(502).json(result)
      return
    }
    res.json(result)
  }
  if (ep.method === 'GET') app.get(`/v1${rel}`, handler)
  else app.post(`/v1${rel}`, handler)
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({
    success: false,
    error: { code: 'internal', message: err instanceof Error ? err.message : 'internal error' },
  })
})

app.listen(PORT, () => {
  const blockfrost = Boolean((process.env.BLOCKFROST_API_KEY || '').trim())
  console.log(
    JSON.stringify({
      service: 'finality-x402-merchant',
      port: PORT,
      network: NETWORK,
      asset: ASSET,
      payTo: `${PAY_TO.slice(0, 24)}…`,
      facilitator: process.env.X402_FACILITATOR_URL || 'local',
      blockfrostConfigured: blockfrost,
      endpoints: ENDPOINTS.length,
      x402: './x402/srv',
    }),
  )
  if (!blockfrost) {
    console.warn(
      '[x402] BLOCKFROST_API_KEY missing — /health and 402 work, but Lace /pay/intent + settle need a Preprod Blockfrost key.',
    )
  }
})

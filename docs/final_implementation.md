# Finality Production Implementation Handoff

Implementation contract for coding agents working on Finality.
Read this before changing routes, providers, wallet code, or x402 behavior.

## Product definition

Finality is a market-intelligence resource server for humans and agents:

- Crypto / meme / equity / forex market data
- Sentiment, OHLCV, technicals, signals, backtests
- AI analyst and agent-oriented tools
- Cardano on-chain intelligence (addresses, assets, tip, mempool)

**Cardano** is the x402 payment rail (`cardano:preprod`, `lovelace` / ADA). Every paid request is verified and settled in-process by `@odatano/x402` (`localFacilitator` + Blockfrost). Public product language is **Finality Market Intelligence**, not a single-chain trading brand.

## Non-negotiable architecture

### Merchant / resource server

Finality is the x402 resource server. It is **not** a facilitator.

- Use `@odatano/x402` (exact Cardano scheme) for middleware and settlement wiring.
- Leave `X402_FACILITATOR_URL` empty. Verify and settle in-process with `localFacilitator` and Blockfrost.
- Do not point the merchant at an external facilitator.
- Do not add a second payment rail or payment fallback.
- Exact ADA (lovelace) payments only — no signed-message proofs as payment.
- Network: `cardano:preprod` for the current release.
- Merchant `payTo` must be a dedicated Cardano address (`X402_PAYTO_ADDRESS`).
- Never receive or persist a wallet mnemonic / private key.

### Client custody

- Browser: CIP-30 (`lib/cardano`) — Lace / Nami on Preprod.
- Agents: their own Cardano signer + x402 client loop.

Reference flow:

1. Client requests a paid resource.
2. Server returns HTTP 402 + `PAYMENT-REQUIRED`.
3. Merchant builds unsigned payment (`/pay/intent`); wallet signs (CIP-30).
4. Client retries with payment proof.
5. The merchant verifies and settles the lovelace payment on Cardano.
6. Only then does Finality fetch providers and return data + `PAYMENT-RESPONSE`.

Never accept opaque “payment proof” strings, payer-address headers, or message signatures as settlement evidence.

### Service boundary

- Canonical public API: **Express** merchant (`x402-server/`, default port **4021**).
- Next.js: UI + **`/api/x402/*`** proxy + **`/api/live-txs`** (Blockfrost payTo feed).
- Handlers call **`lib/providers/*`** directly — no paid HTTP loop back into the merchant from Next route handlers.

Typical layout:

```text
x402-server/
  index.ts            # Express: CORS, public routes, x402Middleware, route registration
  registry.ts         # Endpoint catalog + lovelace prices (single source of truth)
  handlers.ts         # Provider calls + JSON envelope
app/
  api/x402/[...path]/ # Proxy to X402_SERVER_URL
  api/live-txs/       # Live settlements table (Blockfrost)
  explore/            # Dashboard including /explore/live
lib/cardano/          # CIP-30 connector + config
lib/x402/             # Browser paid fetch
x402/                 # Vendored @odatano/x402 (srv middleware, facilitator, client)
```

### Code-organization rules

- One registry for route names, methods, prices, limits, discovery metadata.
- One handler + schema + service + contract test per endpoint.
- Handlers do not implement payment decisions; middleware does.
- One success envelope and one error envelope for all routes.
- Stable operation IDs (`market.quotes`, …) in logs, metrics, and Bazaar metadata.

## Payment configuration

```env
X402_NETWORK=cardano:preprod
X402_ASSET=lovelace
X402_FACILITATOR_URL=
X402_PAYTO_ADDRESS=addr_test1...
NEXT_PUBLIC_X402_NETWORK=cardano:preprod
NEXT_PUBLIC_X402_PAYTO=addr_test1...
NETWORK=preprod
BACKENDS=blockfrost
BLOCKFROST_API_KEY=
```

## Catalog categories

| Category | Examples |
|----------|----------|
| Market data | quotes, assets, candles, trending, fear-greed |
| Intelligence | signals, technicals, report, volume, events, backtest |
| Agent tools | decision, briefing, strategy parse |
| AI analyst | chat |
| Cardano | address / portfolio / asset / node / mempool style reads |

Exact paths and ADA prices: `/v1/catalog` and [api-endpoints.md](./api-endpoints.md).

## UI requirements

- Explore dashboard: catalog, Run (paid call), transactions, settings (balance + network).
- Navbar: CIP-30 connect, trimmed address, ADA balance, copy, disconnect.
- No custodial key storage.
- Label synthetic / fallback responses clearly.

## Testing expectations

- Unit/contract tests for unpaid 402, validation, catalog, OpenAPI.
- Paid smoke only with a funded Preprod wallet — never commit mnemonics.
- Provider failures must either fail closed (`503`) or return labeled synthetic data per `DATA_MODE` / `ALLOW_MOCK_FALLBACK`.

## Explicitly forbidden

- Second facilitator or dual-rail settlement.
- Accepting non-x402 payment evidence.
- Shipping Mainnet as the default product network without an explicit product decision.
- Invented DeFi TVL / liquidity metrics on on-chain routes.

## Definition of done

- Paid endpoints settle ADA on Cardano Preprod in-process via `@odatano/x402`.
- UI and agents share the same catalog and payment headers.
- CIP-30 session restores after refresh when the wallet authorizes the origin.
- Docs and README describe Cardano only (no other L1 payment rail).

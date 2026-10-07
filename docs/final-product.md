# Finality — Product Guide

## Product

Finality is a pay-per-result market-intelligence service for people and autonomous agents. A browser user connects a non-custodial **Cardano** wallet (CIP-30); an agent supplies its own signer. Both call the same catalog of HTTP resources and pay the displayed **USDM** amount through **x402**. The merchant verifies and settles in-process with `@odatano/x402` on **Cardano Preprod** (`cardano:preprod`, asset `lovelace`) before Finality runs the provider operation.

The application never receives a wallet mnemonic or private key. Browser signing uses CIP-30 (`lib/cardano`). Supported wallets in the UI: **Lace** and **Nami** on Preprod. The merchant builds an unsigned payment; the wallet signs; `@odatano/x402` completes the 402 → pay → retry loop.

## Run the product

```bash
npm install
npm run dev
```

| Surface | URL |
|---|---|
| Landing | [https://finality.accuracy.wtf](https://finality.accuracy.wtf) (local: `http://localhost:3000`) |
| Explore dashboard | [https://finality.accuracy.wtf/explore](https://finality.accuracy.wtf/explore) |
| Merchant health | [https://finality-x402-backend.onrender.com/health](https://finality-x402-backend.onrender.com/health) |
| Agent catalog | [https://finality-x402-backend.onrender.com/v1/catalog](https://finality-x402-backend.onrender.com/v1/catalog) |
| OpenAPI | [https://finality-x402-backend.onrender.com/v1/openapi.json](https://finality-x402-backend.onrender.com/v1/openapi.json) |

The frontend calls `/api/x402/*`, a same-origin proxy to the merchant, preserving x402 payment headers.

## User journey

1. Open the landing page and choose **Open dashboard**.
2. **Connect wallet** — Lace or Nami on **Preprod**.
3. Select a resource. The explorer shows the request example and USDM price.
4. Choose **Pay now** and approve the payment in the wallet.
5. Inspect the result, live/synthetic status, and settlement receipt.

The wallet needs Preprod ADA (enough lovelace for the route price plus fees).

## Agent journey

1. Read `/v1/catalog` or `/v1/openapi.json`.
2. Request the resource without payment → HTTP `402` + `PAYMENT-REQUIRED`.
3. Build/sign the exact Cardano payment (merchant `/pay/intent` + CIP-30 or agent key).
4. Retry with payment proof.
5. Consume the JSON envelope and keep `PAYMENT-RESPONSE` as the receipt.

## Paid resources

| Resource | Approx. price | Primary source | Useful result |
|---|---:|---|---|
| `GET /v1/market/quotes` | 0.15 USDM | Binance spot REST | Price, 24h change, volume |
| `GET /v1/market/assets` | 0.15 USDM | Supported universe | Normalized symbol |
| `POST /v1/market/candles` | 0.25 USDM | Binance klines | OHLCV history |
| `GET /v1/market/trending` | 0.20 USDM | Binance, ranked | Liquid-asset snapshot |
| `GET /v1/market/fear-greed` | 0.10 USDM | Alternative.me | Sentiment index |
| `POST /v1/signals` | 1.85 USDM | Candles + LLM | BUY/SELL/HOLD + regime |
| `POST /v1/technicals` | 1.85 USDM | Candles + LLM | SMA, RSI, momentum |
| `POST /v1/analysis/report` | 3.10 USDM | Combined + LLM | Technical + risk |
| `POST /v1/analysis/volume` | 1.00 USDM | Volume calc + LLM | Participation / spikes |
| `POST /v1/analysis/events` | 1.85 USDM | OHLCV + LLM | Price events |
| `POST /v1/backtest` | 3.10 USDM | MA simulation + LLM | Equity / trades |
| `POST /v1/agent/decision` | 2.40 USDM | Risk rules + LLM | Action + confidence |
| `POST /v1/agent/briefing` | 3.10 USDM | Summary + LLM | Bias / regime |
| `POST /v1/agent/strategy/parse` | 2.40 USDM | LLM parse | Validated MA rules |
| `POST /v1/ai/chat` | 4.00 USDM | Gemini / Groq / Ollama | Analyst answer |
| Cardano on-chain catalog | 0.10–0.45 USDM | Blockfrost, Koios, Maestro, Nexus, Ogmios, UTxORPC | Address, assets, tip, mempool |

Exact prices and paths: see [api-endpoints.md](./api-endpoints.md) and `/v1/catalog`.

## Result contract

```json
{
  "success": true,
  "operationId": "market.quotes",
  "requestId": "uuid",
  "data": {},
  "meta": {
    "source": "binance",
    "asOf": "ISO timestamp",
    "freshnessSeconds": 15,
    "limitations": [],
    "availabilityTrack": "durable",
    "dataMode": "live",
    "synthetic": false
  },
  "payment": {
    "network": "cardano:preprod",
    "asset": "lovelace",
    "settlementId": "receipt"
  }
}
```

Clients must respect `meta.synthetic` / `meta.fallback`; never treat synthetic data as live truth.

## Provider fallback

```env
DATA_MODE=auto
ALLOW_MOCK_FALLBACK=true
LLM_PROVIDER=gemini
```

| Failure | Behavior |
|---|---|
| LLM quota / outage | Groq → Ollama → deterministic fields |
| Binance unavailable | Schema-valid market fixture |
| Alternative.me unavailable | Sentiment fixture |
| Chain data provider unavailable | Schema-valid on-chain fixture |

Synthetic responses set `meta.synthetic: true` and a `fallbackReason`.

## Data limitations

- Public market routes are not authenticated trading.
- Backtests exclude fees, slippage, and market impact.
- On-chain DeFi-style routes report observed activity only — no invented TVL/liquidity.
- AI output is analysis, not financial advice.

## Verification

```bash
npx tsc --noEmit
npm run test
npm run build
```

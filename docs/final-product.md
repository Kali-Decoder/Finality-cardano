# Finality — Product Guide (Cardano)

## Product

Finality is pay-per-result **market intelligence on Cardano**. Humans connect a non-custodial wallet (**CIP-30**: Lace or Nami on **Preprod**). Agents use the same HTTP catalog with their own Cardano signer. Each call pays the quoted **ADA (lovelace)** amount through **x402** before the merchant runs the handler.

Settlement is **in-process** on the merchant: `@odatano/x402` + **Blockfrost** on **`cardano:preprod`**. The app never receives a mnemonic or private key.

## Run the product

```bash
npm install
cp .env.example .env.local && cp .env.example x402-server/.env
# BLOCKFROST_API_KEY + X402_PAYTO_ADDRESS in both

npm run dev:all    # merchant :4021 + UI :3000
```

| Surface | URL |
|---|---|
| Production | https://finality-cardano.vercel.app |
| Landing (local) | http://localhost:3000 |
| Explore | https://finality-cardano.vercel.app/explore |
| Run paid calls | https://finality-cardano.vercel.app/explore/run |
| Live payTo feed | https://finality-cardano.vercel.app/explore/live |
| Merchant (Render) | https://x402-server-w7qy.onrender.com |
| Merchant health | https://x402-server-w7qy.onrender.com/health |
| Catalog | https://x402-server-w7qy.onrender.com/v1/catalog |
| OpenAPI | https://x402-server-w7qy.onrender.com/v1/openapi.json |

The UI calls **`/api/x402/*`**, a same-origin proxy that preserves x402 payment headers.

Production proxy: **`X402_SERVER_URL=https://x402-server-w7qy.onrender.com`**. Local merchant only: `http://127.0.0.1:4021`.

## User journey

1. Open **Explore** and **Connect wallet** (Lace / Nami, **Preprod**).
2. Pick an endpoint (Run or Endpoints tab). Catalog shows **ADA** price and example request.
3. **Pay now** — wallet signs the lovelace payment built by `/pay/intent`.
4. Read JSON result, check `meta.synthetic`, and save the **PAYMENT-RESPONSE** receipt.
5. Optional: **Live** tab shows on-chain hits to the merchant **payTo** address via Blockfrost.

Fund the wallet with **Preprod ADA** (route price + fees).

## Agent journey

1. `GET /v1/catalog` or `/v1/openapi.json`.
2. Call a paid path without payment → **402** + **`PAYMENT-REQUIRED`** (`cardano:preprod`, `lovelace`).
3. `POST /pay/intent` or build tx with your signer; sign exact requirement.
4. Retry with **`PAYMENT-SIGNATURE`**.
5. Parse JSON envelope; store **`PAYMENT-RESPONSE`** as receipt.

## Paid resources

Prices are defined in **`x402-server/registry.ts`** (typically **0.01–0.10 ADA** per route in the current catalog). Always use **`GET /v1/catalog`** for authoritative amounts.

| Category | Example paths | Data source |
|---|---|---|
| Market | `/v1/market/quotes`, `candles`, `trending`, `fear-greed` | Binance, Alternative.me |
| Intelligence | `/v1/signals`, `/v1/technicals`, `/v1/analysis/*`, `/v1/backtest` | Candles + LLM / deterministic fallback |
| Agents / AI | `/v1/agent/*`, `/v1/ai/chat` | Rules + LLM |
| Cardano | `/v1/onchain/cardano/*` | Blockfrost (Preprod) |

See [api-endpoints.md](./api-endpoints.md) for the full route list.

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
    "settlementId": "tx-hash-or-receipt"
  }
}
```

Respect **`meta.synthetic`** — do not treat fallback data as live market truth.

## Provider fallback

```env
DATA_MODE=auto
ALLOW_MOCK_FALLBACK=true
LLM_PROVIDER=groq
```

| Failure | Behavior |
|---|---|
| LLM quota / outage | Groq → Ollama → deterministic fields |
| Binance unavailable | Schema-valid market fixture |
| Alternative.me unavailable | Sentiment fixture |
| Blockfrost unavailable | Schema-valid on-chain fixture |

## Data limitations

- Market routes are not exchange trading APIs.
- Backtests omit fees, slippage, and impact.
- On-chain routes report observed chain state only.
- AI output is analysis, not financial advice.

## Verification

```bash
npm run check:discovery
npm run test
npm run build
```

Architecture: [architecture.md](./architecture.md).

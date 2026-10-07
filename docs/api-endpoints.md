# Finality Market Intelligence API (Cardano)

Merchant: **https://x402-server-w7qy.onrender.com** (local: `http://127.0.0.1:4021`). Explore UI proxies via **`/api/x402`**.

**Network:** `cardano:preprod` · **Asset:** `lovelace` (ADA) · **Scheme:** x402 exact

## Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Readiness, network, settlement mode |
| GET | `/info` | `payTo`, network, asset, public URL |
| GET | `/v1/catalog` | Paid catalog (ADA display prices) |
| GET | `/v1/openapi.json` | OpenAPI stub |
| POST | `/pay/intent` | Build unsigned Cardano payment (CIP-30 buyers) |

## Paid (Cardano x402)

Unpaid request → **HTTP 402** + **`PAYMENT-REQUIRED`**. After lovelace settlement → JSON body + **`PAYMENT-RESPONSE`**.

Settlement: in-process **`@odatano/x402`** + **Blockfrost** (`X402_FACILITATOR_URL` empty).

| Category | Paths | Typical catalog price |
|---|---|---:|
| Market | `/v1/market/*` | 0.01–0.10 ADA |
| Intelligence | `/v1/signals`, `/v1/technicals`, `/v1/analysis/*`, `/v1/backtest` | 0.01–0.10 ADA |
| Agents / AI | `/v1/agent/*`, `/v1/ai/chat` | 0.01–0.10 ADA |
| Cardano on-chain | `/v1/onchain/cardano/*` | 0.01–0.10 ADA |

Exact lovelace amounts: **`GET /v1/catalog`**.

## Live monitoring (UI)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/live-txs` | Blockfrost feed of incoming txs to `X402_PAYTO_ADDRESS` |

Explore: **`/explore/live`**

## Run locally

```bash
npm run dev:merchant   # :4021
npm run dev            # :3000 → proxy /api/x402
```

```bash
curl -i 'https://x402-server-w7qy.onrender.com/v1/market/quotes?symbols=BTC'
# → HTTP 402, network cardano:preprod, asset lovelace
```

```bash
npm run check:discovery
# → fails if PAYMENT-REQUIRED is not Cardano lovelace
```

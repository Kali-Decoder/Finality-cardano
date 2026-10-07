# Finality Market Intelligence API

Merchant: local `x402-server` (default `http://127.0.0.1:4021`). UI proxies via `/api/x402`.

## Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Readiness |
| GET | `/info` | Network / asset / payTo |
| GET | `/v1/catalog` | Paid catalog |
| GET | `/v1/openapi.json` | OpenAPI stub |
| POST | `/pay/intent` | Build unsigned Cardano payment (CIP-30) |

## Paid (Cardano x402)

Network **`cardano:preprod`**. Catalog prices are in **USDM**. Unpaid → **402** + `PAYMENT-REQUIRED`. Settlement is in-process (`@odatano/x402` + Blockfrost).

| Category | Paths | Price |
|---|---|---:|
| Market | `/v1/market/*` | ≥ 1 USDM |
| Intelligence | `/v1/signals`, `/v1/technicals`, `/v1/analysis/*`, `/v1/backtest` | 2–3 USDM |
| Agents / AI | `/v1/agent/*`, `/v1/ai/chat` | 2.5–4 USDM |
| Cardano | `/v1/onchain/cardano/*` | 1 USDM |

Exact prices: `GET /v1/catalog`.

## Run

```bash
npm run dev:merchant   # :4021
npm run dev            # :3000 → proxy /api/x402
```

```bash
curl -i 'http://127.0.0.1:4021/v1/market/quotes?symbols=BTC'
# → HTTP 402, network cardano:preprod, asset lovelace
```

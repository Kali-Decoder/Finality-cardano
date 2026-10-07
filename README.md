# Finality (Cardano)

Pay-per-call market, AI, and Cardano on-chain intelligence. Each request settles in **ADA (lovelace)** on **Cardano Preprod** via x402 (`@odatano/x402`) and the **GoPlausible** facilitator.

## Stack

| Layer | Role |
|-------|------|
| Next.js (`app/`) | Landing + Explore (CIP-30, catalog, Run) |
| `/api/x402/*` | Proxy → local merchant |
| `x402-server/` | Cardano x402 resource server (402 → settle → handler) |
| Facilitator | `https://facilitator.goplausible.xyz` |
| Wallets | Lace / Nami on Preprod |

## Quick start

```bash
cp .env.example .env.local
cp .env.example x402-server/.env
# set BLOCKFROST_API_KEY and X402_PAYTO_ADDRESS in both

npm install
npm run dev:all   # merchant :4021 + Next :3000
```

Or separately:

```bash
npm run dev:merchant
npm run dev:frontend
```

| Surface | URL |
|---------|-----|
| App | http://localhost:3000 |
| Explore | http://localhost:3000/explore |
| Merchant health | http://127.0.0.1:4021/health |
| Catalog | http://127.0.0.1:4021/v1/catalog |

## Payment flow

1. Client hits a paid route unpaid → **HTTP 402** + `PAYMENT-REQUIRED` (`cardano:preprod`, lovelace).
2. `POST /pay/intent` builds an unsigned tx; CIP-30 wallet signs.
3. Client retries with payment proof; facilitator verifies + settles.
4. Merchant returns data + `PAYMENT-RESPONSE`.

Prices are **≥ 1 ADA** so lovelace outputs clear Cardano min-UTxO.

## Docs

- [Product guide](docs/final-product.md)
- [API endpoints](docs/api-endpoints.md)
- [Implementation contract](docs/final_implementation.md)
- [CIP-30 wallet](lib/cardano/README.md)

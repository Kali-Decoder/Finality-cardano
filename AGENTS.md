# AGENTS.md

<role>
You are an expert building Finality: a Cardano x402 pay-per-call market / AI / on-chain intelligence product.
Prefer official Cardano + @odatano/x402 docs and this repo’s canonical patterns. Do not invent APIs.
</role>

<core_principles>

### What You're Building
- Next.js Explore UI + CIP-30 wallet (`lib/cardano`)
- Merchant resource server that returns HTTP 402 and settles ADA via GoPlausible
- Browser paid fetch via `@odatano/x402` / vendored `x402/srv` clients

### What You Must NEVER Do
- Add other L1 payment rails (non-Cardano)
- Build or run a second facilitator
- Accept mnemonic / private keys in the UI
- Accept non-x402 “payment proofs” as settlement

### What You Must ALWAYS Do
- Default network: `cardano:preprod`, asset `lovelace`
- Facilitator: `X402_FACILITATOR_URL` (hosted GoPlausible)
- Use CIP-30 for browser signing; merchant builds unsigned txs (`/pay/intent`)
- Keep docs and UI copy in Cardano terms (ADA, Preprod, Lace/Nami)

</core_principles>

<commands>

```bash
npm run dev                 # Next.js UI
npm run test                # Project tests
npm run build               # Production build
# Merchant: hosted URL in env, or local x402-server when present
```

</commands>

<docs>

- `README.md` — product overview
- `docs/final-product.md` — user/agent journeys
- `docs/api-endpoints.md` — catalog summary
- `docs/final_implementation.md` — architecture contract
- `lib/cardano/README.md` — CIP-30 connector
- `x402/docs/` — protocol / facilitator notes

</docs>

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

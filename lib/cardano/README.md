# Cardano CIP-30 wallet (Finality)

Zero-dependency browser connector used by the dashboard.

## Files

| File | Role |
|------|------|
| [`cardano-wallet.ts`](./cardano-wallet.ts) | Discovery, connect, addresses, balance, UTXOs, sign tx, CIP-8 sign message, submit. Built-in bech32 + CBOR parsers (no npm wallet libs). |
| [`wallet.tsx`](./wallet.tsx) | Shared React context + `useCardanoWallet()` so header / Run / settings share one session. |
| [`../../components/WalletButton.tsx`](../../components/WalletButton.tsx) | Connect button + picker modal. |

## Usage

```ts
import { listWallets, connectWallet } from '@/lib/cardano/cardano-wallet'

const session = await connectWallet('eternl')
const address = await session.getChangeAddress() // addr1... / addr_test1...
const balance = await session.getBalance()       // { lovelace, ada, assets }
const witness = await session.signTransaction(unsignedTxCborHex, true)
const signedTx = toSignedTransaction(unsignedTxCborHex, witness)
```

In React (inside `CardanoWalletProvider`):

```tsx
const { connected, address, adaBalance, connect, signTx } = useCardanoWallet()
```

Paid API calls use `signTx` after the merchant builds an unsigned tx via `POST /api/x402/pay/intent`.
`useCardanoWallet().signTx` already merges the CIP-30 witness set into a full signed tx.

## Testnet notes

- Product network is **Cardano Preprod** (`cardano:preprod`, CIP-30 `networkId = 0`).
- Set the browser wallet (Eternl / Lace / Nami) to **Preprod**, then Connect — the header shows **ADA balance** + Preprod.
- Balance refreshes every 15s and on window focus; use the refresh control to pull immediately.
- Mainnet wallets are rejected for signing paid calls until you switch to Preprod.
- Extensions inject asynchronously — the hook waits up to 5s via `waitForWallets`.
- CIP-30 has no standard disconnect; `disconnect()` only clears dApp session state. Revoke access in the extension if needed.
- Guard SSR: all `window.cardano` access is behind `typeof window !== 'undefined'`.

## Gotchas

1. **Injection timing** — open the picker after focus / `waitForWallets`, not only on first paint.
2. **Hex vs bech32** — CIP-30 returns address bytes as hex; the connector converts to `addr` / `addr_test`.
3. **Partial sign** — `signTransaction(tx, true)` for unsigned txs that only need the buyer’s witnesses.
4. **Witness set ≠ signed tx** — CIP-30 `signTx` returns a witness-set map. Always `toSignedTransaction(unsigned, witness)` before settle / `PAYMENT-SIGNATURE` (the React `signTx` helper does this).
5. **Tx building** — coin selection stays server-side (`buildUnsignedPaymentTx` / `@odatano/core`). For a full client-side builder later, Mesh SDK is the usual path.

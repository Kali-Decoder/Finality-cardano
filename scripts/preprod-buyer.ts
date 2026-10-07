/**
 * Preprod headless buyer for Finality merchant.
 *
 *   npx tsx --env-file=x402-server/.env scripts/preprod-buyer.ts generate
 *   npx tsx --env-file=x402-server/.env scripts/preprod-buyer.ts balance
 *   npx tsx --env-file=x402-server/.env scripts/preprod-buyer.ts buy [url]
 *
 * Default buy URL: http://127.0.0.1:4021/v1/demo/ping
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  Address,
  Credential,
  PubKeyHash,
  PrivateKey,
  Tx,
  blake2b_224,
  deriveEd25519PublicKey_sync,
} from '@harmoniclabs/buildooor'
import { x402Fetch } from '../x402/srv/client/fetch'
import { createBridgePayHandler } from '../x402/srv/client/pay-handlers'
import { readPaymentRequired, readSettlement } from '../x402/srv/client/protocol'
import * as bridge from '../x402/srv/bridge'
import type { PaymentRequirements } from '../x402/srv/core/types'

const WALLET_PATH = resolve(process.env.WALLET_FILE || 'scripts/preprod-buyer-wallet.json')
const DEFAULT_URL = process.env.BUY_URL || 'http://127.0.0.1:4021/v1/demo/ping'
const ADA = 1_000_000n

type WalletFile = { privateKeyHex: string; address: string }

function loadWallet(): WalletFile {
  if (!existsSync(WALLET_PATH)) {
    throw new Error(`No wallet at ${WALLET_PATH}. Run: npx tsx --env-file=x402-server/.env scripts/preprod-buyer.ts generate`)
  }
  const raw = JSON.parse(readFileSync(WALLET_PATH, 'utf8')) as WalletFile
  if (!raw.privateKeyHex || !raw.address?.startsWith('addr')) {
    throw new Error(`${WALLET_PATH} is not a valid wallet file`)
  }
  return raw
}

function createSignTx(privateKeyHex: string) {
  const bytes = Buffer.from(privateKeyHex, 'hex')
  const signer: PrivateKey | Uint8Array =
    bytes.length >= 64 ? new Uint8Array(bytes.subarray(0, 64)) : new PrivateKey(bytes)
  return async (unsignedTxCborHex: string) => {
    const tx = Tx.fromCbor(unsignedTxCborHex)
    tx.signWith(signer)
    return Buffer.from(tx.toCborBytes()).toString('hex')
  }
}

function fmtPrice(r: PaymentRequirements): string {
  return r.asset === 'lovelace'
    ? `${Number(r.amount) / 1_000_000} ADA`
    : `${r.amount} of ${r.asset}`
}

function generate() {
  if (existsSync(WALLET_PATH) && !process.argv.includes('--force')) {
    const existing = loadWallet()
    console.log(`Wallet already exists at ${WALLET_PATH}`)
    console.log(`\n  FUND THIS ADDRESS (Cardano Preprod):\n`)
    console.log(`  ${existing.address}\n`)
    console.log('Faucet: https://docs.cardano.org/cardano-testnets/tools/faucet')
    console.log('Send ≥ 5 ADA so you cover 1 ADA endpoint + fees + change.')
    return
  }

  const priv = randomBytes(32)
  const pub = deriveEd25519PublicKey_sync(priv)
  const keyHash = blake2b_224(Buffer.from(pub))
  const address = new Address({
    network: 'testnet',
    paymentCreds: Credential.keyHash(new PubKeyHash(Buffer.from(keyHash))),
  }).toString()

  const wallet: WalletFile = { privateKeyHex: priv.toString('hex'), address }
  writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2) + '\n', 'utf8')

  console.log(`Wallet written to ${WALLET_PATH}\n`)
  console.log(`  FUND THIS ADDRESS (Cardano Preprod):\n`)
  console.log(`  ${address}\n`)
  console.log('Next:')
  console.log('  1. Fund from faucet: https://docs.cardano.org/cardano-testnets/tools/faucet')
  console.log('     Network: Preprod · amount ≥ 5 tADA')
  console.log('  2. Check: npx tsx --env-file=x402-server/.env scripts/preprod-buyer.ts balance')
  console.log('  3. Pay:   npx tsx --env-file=x402-server/.env scripts/preprod-buyer.ts buy')
}

async function balance() {
  const wallet = loadWallet()
  console.log(`address: ${wallet.address}\n`)
  const utxos = await bridge.getUtxosAtAddress(wallet.address).catch((err: Error) => {
    if (/not found/i.test(err?.message ?? '')) return []
    throw err
  })
  if (utxos.length === 0) {
    console.log('No UTxOs yet. Fund the address from the Preprod faucet:')
    console.log('  https://docs.cardano.org/cardano-testnets/tools/faucet')
    console.log(`\n  ${wallet.address}`)
    return
  }
  let total = 0n
  for (const u of utxos) {
    total += BigInt(u.lovelace)
    console.log(`  ${u.txHash}#${u.outputIndex}  ${u.lovelace} lovelace`)
  }
  console.log(`\ntotal: ${total} lovelace (${Number(total) / Number(ADA)} ADA)`)
}

async function buy(url: string) {
  if (!(process.env.BLOCKFROST_API_KEY || '').trim()) {
    throw new Error('BLOCKFROST_API_KEY missing — set it in x402-server/.env')
  }
  process.env.NETWORK ||= 'preprod'
  process.env.BACKENDS ||= 'blockfrost'

  const wallet = loadWallet()
  console.log(`buyer:  ${wallet.address}`)
  console.log(`target: ${url}\n`)

  const probe = await fetch(url)
  if (probe.status !== 402) {
    console.log(`Endpoint answered ${probe.status} (expected 402 for a paid route).`)
    console.log(await probe.text())
    if (probe.ok) return
    throw new Error(`Unexpected status ${probe.status}`)
  }

  const required = readPaymentRequired(probe.headers.get('PAYMENT-REQUIRED'))
  const offer = required?.accepts[0]
  if (!offer) throw new Error('402 without PAYMENT-REQUIRED')
  console.log('402 Payment Required:')
  console.log(`  price:   ${fmtPrice(offer)}`)
  console.log(`  payTo:   ${offer.payTo}`)
  console.log(`  network: ${offer.network}\n`)

  let chosen: PaymentRequirements | undefined
  const payHandler = createBridgePayHandler({
    buyerBech32: wallet.address,
    signTx: createSignTx(wallet.privateKeyHex),
  })
  const paidFetch = x402Fetch({
    errorOnFailure: true,
    pay: async (requirement, paymentRequired) => {
      chosen = requirement
      console.log(`Paying ${fmtPrice(requirement)}: build → sign → retry …`)
      return payHandler(requirement, paymentRequired)
    },
  })

  const res = await paidFetch(url)
  console.log(`\n${res.status} ${res.statusText}`)
  const receipt = readSettlement(res.headers.get('PAYMENT-RESPONSE'))
  if (receipt && chosen) {
    console.log(`settled tx: ${receipt.transaction}`)
    console.log(`explorer:   https://preprod.cardanoscan.io/transaction/${receipt.transaction}\n`)
  }
  const data = await res.text()
  console.log(data.length > 800 ? data.slice(0, 800) + ' …' : data)
}

async function main() {
  const cmd = process.argv[2] || 'generate'
  if (cmd === 'generate') {
    generate()
    return
  }
  if (cmd === 'balance') {
    await balance()
    return
  }
  if (cmd === 'buy') {
    const url = process.argv[3] || DEFAULT_URL
    await buy(url)
    return
  }
  console.error(`Unknown command: ${cmd}`)
  console.error('Usage: generate | balance | buy [url]')
  process.exit(1)
}

main()
  .then(async () => {
    try {
      await bridge.shutdown()
    } catch {
      /* ignore */
    }
  })
  .catch(async (err) => {
    console.error(`\nfailed: ${(err as Error)?.message ?? err}`)
    if (/not found|insufficient/i.test(String((err as Error)?.message ?? err))) {
      console.error('Wallet looks unfunded. Fund Preprod faucet, then re-run balance / buy.')
    }
    try {
      await bridge.shutdown()
    } catch {
      /* ignore */
    }
    process.exit(1)
  })

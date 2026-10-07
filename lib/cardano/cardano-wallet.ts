/**
 * Zero-dependency CIP-30 Cardano wallet connector for the browser.
 * Works with Eternl, Lace, Nami, Flint, Typhon, Yoroi, Vespr and any
 * other wallet that injects itself into `window.cardano`.
 *
 * The dApp never sees private keys. All signing happens inside the wallet.
 */

export type DiscoveredWallet = {
  key: string
  name: string
  icon: string | null
  version: string | null
  apiVersion: string | null
  installed: boolean
  installUrl: string | null
}

/** Well-known CIP-30 wallets shown in the connect modal (installed or not). */
export type KnownWallet = {
  key: string
  name: string
  installUrl: string
  /** Static icon under /public (always shown even if extension missing). */
  icon: string
}

export const KNOWN_WALLETS: readonly KnownWallet[] = [
  { key: 'lace', name: 'Lace', installUrl: 'https://www.lace.io/', icon: '/wallets/lace.svg' },
  { key: 'nami', name: 'Nami', installUrl: 'https://namiwallet.io/', icon: '/wallets/nami.svg' },
  { key: 'eternl', name: 'Eternl', installUrl: 'https://eternl.io/', icon: '/wallets/eternl.svg' },
] as const

const KNOWN_BY_KEY = Object.fromEntries(KNOWN_WALLETS.map((w) => [w.key, w])) as Record<
  string,
  KnownWallet
>

export type WalletAsset = {
  policyId: string
  assetNameHex: string
  assetName: string | null
  amount: string
  unit: string
}

export type WalletBalance = {
  lovelace: string
  ada: number
  assets: WalletAsset[]
  raw: string | null
}

export type WalletUtxo = {
  txHash: string
  index: number
  raw: string
}

export type Cip30Api = {
  getNetworkId(): Promise<number>
  getChangeAddress(): Promise<string>
  getUsedAddresses(): Promise<string[]>
  getRewardAddresses(): Promise<string[]>
  getBalance(): Promise<string>
  getUtxos(): Promise<string[] | null>
  getCollateral?: () => Promise<string[] | null>
  signTx(tx: string, partial?: boolean): Promise<string>
  submitTx(tx: string): Promise<string>
  signData(addr: string, payload: string): Promise<{ signature: string; key: string }>
}

type InjectedWallet = {
  name: string
  icon?: string
  version?: string
  apiVersion?: string
  enable: (extensions?: unknown) => Promise<Cip30Api>
  isEnabled?: () => Promise<boolean>
}

declare global {
  interface Window {
    cardano?: Record<string, InjectedWallet | undefined>
  }
}

// ---------------------------------------------------------------------------
// Wallet discovery
// ---------------------------------------------------------------------------

function isInjectedWallet(w: InjectedWallet | undefined): w is InjectedWallet {
  return !!w && typeof w.enable === 'function' && typeof w.name === 'string'
}

function readInjected(key: string): DiscoveredWallet | null {
  const w = typeof window !== 'undefined' && window.cardano ? window.cardano[key] : undefined
  if (!isInjectedWallet(w)) return null
  const known = KNOWN_BY_KEY[key]
  return {
    key,
    name: w.name || known?.name || key,
    icon: w.icon || known?.icon || null,
    version: w.version || null,
    apiVersion: w.apiVersion || null,
    installed: true,
    installUrl: known?.installUrl ?? null,
  }
}

/** Installed CIP-30 wallets only (from `window.cardano`). */
export function listInstalledWallets(): DiscoveredWallet[] {
  if (typeof window === 'undefined' || !window.cardano) return []
  return Object.keys(window.cardano)
    .filter((key) => isInjectedWallet(window.cardano![key]))
    .map((key) => readInjected(key)!)
}

/**
 * All known wallets for the connect UI, plus any other installed CIP-30
 * wallets. Missing extensions are included with `installed: false`.
 * Installed wallets are listed first.
 */
export function listWallets(): DiscoveredWallet[] {
  const installed = listInstalledWallets()
  const byKey = new Map(installed.map((w) => [w.key, w]))
  const known: DiscoveredWallet[] = KNOWN_WALLETS.map((k) => {
    const found = byKey.get(k.key)
    if (found) {
      return { ...found, icon: found.icon || k.icon, installUrl: found.installUrl || k.installUrl }
    }
    return {
      key: k.key,
      name: k.name,
      icon: k.icon,
      version: null,
      apiVersion: null,
      installed: false,
      installUrl: k.installUrl,
    }
  })
  const installedKnown = known.filter((w) => w.installed)
  const missingKnown = known.filter((w) => !w.installed)
  // Only Lace + Nami — ignore other CIP-30 extensions even if installed.
  return [...installedKnown, ...missingKnown]
}

export function waitForWallets(timeoutMs = 5000, intervalMs = 250): Promise<DiscoveredWallet[]> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      if (listInstalledWallets().length > 0 || Date.now() - started >= timeoutMs) {
        resolve(listWallets())
      } else {
        setTimeout(tick, intervalMs)
      }
    }
    tick()
  })
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export async function connectWallet(key: string, extensions?: unknown): Promise<WalletSession> {
  const wallet =
    typeof window !== 'undefined' && window.cardano ? window.cardano[key] : undefined
  if (!wallet) {
    throw new Error(`Wallet "${key}" not found. Is the extension installed and enabled?`)
  }
  let api: Cip30Api
  try {
    api = await wallet.enable(extensions)
  } catch (err) {
    throw new Error(
      `Wallet connection rejected or failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (!api || typeof api.getNetworkId !== 'function') {
    throw new Error(`Wallet "${key}" did not return a valid CIP-30 API.`)
  }
  return createSession(key, wallet, api)
}

export async function isWalletEnabled(key: string): Promise<boolean> {
  const wallet =
    typeof window !== 'undefined' && window.cardano ? window.cardano[key] : undefined
  if (!wallet || typeof wallet.isEnabled !== 'function') return false
  try {
    return await wallet.isEnabled()
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export const NETWORK_MAINNET = 1
export const NETWORK_TESTNET = 0

export function networkName(networkId: number): 'mainnet' | 'testnet' | 'unknown' {
  if (networkId === NETWORK_MAINNET) return 'mainnet'
  if (networkId === NETWORK_TESTNET) return 'testnet'
  return 'unknown'
}

export type WalletSession = {
  key: string
  name: string
  icon: string | null
  api: Cip30Api
  getNetworkId(): Promise<number>
  getChangeAddress(): Promise<string>
  getUsedAddresses(): Promise<string[]>
  getRewardAddress(): Promise<string | null>
  getBalance(): Promise<WalletBalance>
  getUtxos(): Promise<WalletUtxo[]>
  getCollateral(): Promise<WalletUtxo[]>
  signTransaction(unsignedTxCborHex: string, partialSign?: boolean): Promise<string>
  submitTransaction(signedTxCborHex: string): Promise<string>
  signMessage(
    addressBech32: string,
    message: string,
  ): Promise<{ signature: string; key: string }>
  disconnect(): void
  readonly isClosed: boolean
}

function createSession(key: string, walletMeta: InjectedWallet, api: Cip30Api): WalletSession {
  let closed = false

  const guard = () => {
    if (closed) throw new Error('Wallet session is closed. Connect again.')
  }

  return {
    key,
    name: walletMeta.name,
    icon: walletMeta.icon || null,
    api,

    async getNetworkId() {
      guard()
      return api.getNetworkId()
    },

    async getChangeAddress() {
      guard()
      return addressBytesToBech32(hexToBytes(await api.getChangeAddress()))
    },

    async getUsedAddresses() {
      guard()
      const addrs = (await api.getUsedAddresses()) || []
      return addrs.map((h) => addressBytesToBech32(hexToBytes(h)))
    },

    async getRewardAddress() {
      guard()
      const addrs = (await api.getRewardAddresses()) || []
      if (!addrs.length) return null
      return addressBytesToBech32(hexToBytes(addrs[0]))
    },

    async getBalance() {
      guard()
      const raw = await api.getBalance()
      if (!raw) return { lovelace: '0', ada: 0, assets: [], raw: null }
      return parseValue(raw)
    },

    async getUtxos() {
      guard()
      const utxos = (await api.getUtxos()) || []
      return utxos.map(parseUtxo)
    },

    async getCollateral() {
      guard()
      if (typeof api.getCollateral !== 'function') return []
      const utxos = (await api.getCollateral()) || []
      return utxos.map(parseUtxo)
    },

    /**
     * CIP-30 `signTx` returns a *witness set* CBOR hex, not a full signed tx.
     * Call `toSignedTransaction(unsigned, result)` before submit / PAYMENT-SIGNATURE.
     */
    async signTransaction(unsignedTxCborHex: string, partialSign = false) {
      guard()
      return api.signTx(unsignedTxCborHex, partialSign)
    },

    async submitTransaction(signedTxCborHex: string) {
      guard()
      return api.submitTx(signedTxCborHex)
    },

    async signMessage(addressBech32: string, message: string) {
      guard()
      const addressHex = bytesToHex(bech32Decode(addressBech32).bytes)
      const payloadHex = bytesToHex(new TextEncoder().encode(message))
      return api.signData(addressHex, payloadHex)
    },

    disconnect() {
      closed = true
    },

    get isClosed() {
      return closed
    },
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function lovelaceToAda(lovelace: string | bigint | number): number {
  return Number(BigInt(lovelace)) / 1_000_000
}

export function formatAda(lovelace: string | bigint | number, decimals = 2): string {
  return lovelaceToAda(lovelace).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ---------------------------------------------------------------------------
// Bech32 (BIP-173)
// ---------------------------------------------------------------------------

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const v of values) {
    const b = chk >> 25
    chk = ((chk & 0x1ffffff) << 5) ^ v
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i]
    }
  }
  return chk
}

function bech32HrpExpand(hrp: string): number[] {
  const out: number[] = []
  for (const c of hrp) out.push(c.charCodeAt(0) >> 5)
  out.push(0)
  for (const c of hrp) out.push(c.charCodeAt(0) & 31)
  return out
}

function bech32VerifyChecksum(hrp: string, data: number[]): boolean {
  return bech32Polymod([...bech32HrpExpand(hrp), ...data]) === 1
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]
  const mod = bech32Polymod(values) ^ 1
  const out: number[] = []
  for (let p = 0; p < 6; p++) out.push((mod >> (5 * (5 - p))) & 31)
  return out
}

function convertBits(data: ArrayLike<number>, fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0
  let bits = 0
  const out: number[] = []
  const maxv = (1 << toBits) - 1
  for (let i = 0; i < data.length; i++) {
    const value = data[i]!
    acc = (acc << fromBits) | value
    bits += fromBits
    while (bits >= toBits) {
      bits -= toBits
      out.push((acc >> bits) & maxv)
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (toBits - bits)) & maxv)
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    throw new Error('Invalid bech32 padding')
  }
  return out
}

export function bech32Encode(hrp: string, bytes: Uint8Array): string {
  const data = convertBits(bytes, 8, 5, true)
  const combined = [...data, ...bech32CreateChecksum(hrp, data)]
  return hrp + '1' + combined.map((i) => BECH32_CHARSET[i]).join('')
}

export function bech32Decode(str: string): { hrp: string; bytes: Uint8Array } {
  const s = str.toLowerCase()
  const pos = s.lastIndexOf('1')
  if (pos < 1 || pos + 7 > s.length) throw new Error('Invalid bech32 string')
  const hrp = s.slice(0, pos)
  const data: number[] = []
  for (let i = pos + 1; i < s.length; i++) {
    const idx = BECH32_CHARSET.indexOf(s[i]!)
    if (idx === -1) throw new Error('Invalid bech32 character')
    data.push(idx)
  }
  if (!bech32VerifyChecksum(hrp, data)) throw new Error('Invalid bech32 checksum')
  return { hrp, bytes: Uint8Array.from(convertBits(data.slice(0, -6), 5, 8, false)) }
}

export function addressBytesToBech32(addrBytes: Uint8Array): string {
  const network = addrBytes[0]! & 0x0f
  return bech32Encode(network === 1 ? 'addr' : 'addr_test', addrBytes)
}

// ---------------------------------------------------------------------------
// Minimal CBOR reader
// ---------------------------------------------------------------------------

export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') throw new Error('Expected hex string')
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  if (h.length % 2 !== 0) throw new Error('Odd-length hex string')
  if (!/^[0-9a-f]*$/i.test(h)) throw new Error('Invalid hex string')
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * True when CBOR is a CIP-30 witness set (map) rather than a full transaction (array).
 * Per CIP-30, `api.signTx` returns `cbor<transaction_witness_set>`.
 */
export function isWitnessSetCbor(cborHex: string): boolean {
  const h = cborHex.startsWith('0x') ? cborHex.slice(2) : cborHex
  if (!/^[0-9a-f]{2}/i.test(h)) return false
  return (Number.parseInt(h.slice(0, 2), 16) >> 5) === 5
}

/** Skip one CBOR data item; preserves nested tags / floats without full decode. */
function skipCborItem(bytes: Uint8Array, offset: number): number {
  if (offset >= bytes.length) throw new Error('Unexpected end of CBOR')
  const ib = bytes[offset]!
  const major = ib >> 5
  const info = ib & 31

  if (info === 31) {
    // Indefinite-length: break (0xff) terminated.
    let o = offset + 1
    if (major === 2 || major === 3) {
      while (bytes[o] !== 0xff) o = skipCborItem(bytes, o)
      return o + 1
    }
    if (major === 4 || major === 5) {
      while (bytes[o] !== 0xff) {
        o = skipCborItem(bytes, o)
        if (major === 5) o = skipCborItem(bytes, o)
      }
      return o + 1
    }
    throw new Error(`Unsupported indefinite CBOR major type ${major}`)
  }

  if (major === 0 || major === 1) {
    const { next } = readLength(info, bytes, offset + 1)
    return next
  }
  if (major === 2 || major === 3) {
    const { length, next } = readLength(info, bytes, offset + 1)
    return next + Number(length)
  }
  if (major === 4) {
    const { length, next } = readLength(info, bytes, offset + 1)
    let o = next
    for (let i = 0; i < Number(length); i++) o = skipCborItem(bytes, o)
    return o
  }
  if (major === 5) {
    const { length, next } = readLength(info, bytes, offset + 1)
    let o = next
    for (let i = 0; i < Number(length); i++) {
      o = skipCborItem(bytes, o)
      o = skipCborItem(bytes, o)
    }
    return o
  }
  if (major === 6) {
    const { next } = readLength(info, bytes, offset + 1)
    return skipCborItem(bytes, next)
  }
  if (major === 7) {
    if (info < 24) return offset + 1
    if (info === 24) return offset + 2
    if (info === 25) return offset + 3
    if (info === 26) return offset + 5
    if (info === 27) return offset + 9
    throw new Error(`Unsupported CBOR simple/float info ${info}`)
  }
  throw new Error(`Unsupported CBOR major type ${major}`)
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}

/**
 * Replace CBOR array element `index` while leaving other elements' bytes untouched
 * (critical so the tx body hash the wallet signed stays identical).
 */
function replaceCborArrayElement(txBytes: Uint8Array, index: number, replacement: Uint8Array): Uint8Array {
  const ib = txBytes[0]!
  if (ib >> 5 !== 4) throw new Error('Expected CBOR array (Cardano transaction)')
  const info = ib & 31
  if (info === 31) throw new Error('Indefinite-length transaction arrays are not supported')
  const { length, next: headerEnd } = readLength(info, txBytes, 1)
  const n = Number(length)
  if (index < 0 || index >= n) throw new Error(`CBOR array index ${index} out of range (len ${n})`)

  const starts: number[] = []
  let o = headerEnd
  for (let i = 0; i < n; i++) {
    starts.push(o)
    o = skipCborItem(txBytes, o)
  }
  const ends = [...starts.slice(1), o]

  const chunks: Uint8Array[] = [txBytes.slice(0, headerEnd)]
  for (let i = 0; i < n; i++) {
    chunks.push(i === index ? replacement : txBytes.slice(starts[i], ends[i]))
  }
  return concatBytes(chunks)
}

/**
 * Combine an unsigned tx with the witness set CIP-30 `signTx()` returns.
 * Preserves the original body bytes so the signed body hash stays valid.
 */
export function combineUnsignedTxWithWitnessSet(
  unsignedTxCborHex: string,
  witnessSetCborHex: string,
): string {
  const txBytes = hexToBytes(unsignedTxCborHex)
  const witnessBytes = hexToBytes(witnessSetCborHex)
  if ((witnessBytes[0]! >> 5) !== 5) {
    throw new Error('CIP-30 witness set must be a CBOR map')
  }
  // Empty map `a0` is not a signature — wallets that decline still shouldn't reach here.
  if (witnessBytes.length === 1 && witnessBytes[0] === 0xa0) {
    throw new Error('Wallet returned an empty witness set (no signature)')
  }
  return bytesToHex(replaceCborArrayElement(txBytes, 1, witnessBytes))
}

/** Full signed tx CBOR: as given, or unsigned tx + CIP-30 witness set. */
export function toSignedTransaction(
  unsignedTxCborHex: string,
  signedTxOrWitnessSetHex: string,
): string {
  if (!isWitnessSetCbor(signedTxOrWitnessSetHex)) return signedTxOrWitnessSetHex
  return combineUnsignedTxWithWitnessSet(unsignedTxCborHex, signedTxOrWitnessSetHex)
}

function readLength(info: number, bytes: Uint8Array, offset: number): { length: number | bigint; next: number } {
  if (info < 24) return { length: info, next: offset }
  if (info === 24) return { length: bytes[offset]!, next: offset + 1 }
  if (info === 25) return { length: (bytes[offset]! << 8) | bytes[offset + 1]!, next: offset + 2 }
  if (info === 26) {
    const v =
      bytes[offset]! * 16777216 +
      bytes[offset + 1]! * 65536 +
      bytes[offset + 2]! * 256 +
      bytes[offset + 3]!
    return { length: v, next: offset + 4 }
  }
  if (info === 27) {
    let v = 0n
    for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(bytes[offset + i]!)
    return { length: v, next: offset + 8 }
  }
  throw new Error('Unsupported CBOR length encoding')
}

type CborValue = bigint | Uint8Array | CborValue[] | [CborValue, CborValue][]

function decodeItem(bytes: Uint8Array, offset: number): { value: CborValue; next: number } {
  const ib = bytes[offset]!
  const major = ib >> 5
  const info = ib & 31

  if (major === 0 || major === 1) {
    const { length, next } = readLength(info, bytes, offset + 1)
    const value = major === 0 ? BigInt(length) : -1n - BigInt(length)
    return { value, next }
  }
  if (major === 2 || major === 3) {
    const { length, next } = readLength(info, bytes, offset + 1)
    const n = Number(length)
    return { value: bytes.slice(next, next + n), next: next + n }
  }
  if (major === 4) {
    const { length, next } = readLength(info, bytes, offset + 1)
    const arr: CborValue[] = []
    let o = next
    for (let i = 0; i < Number(length); i++) {
      const r = decodeItem(bytes, o)
      arr.push(r.value)
      o = r.next
    }
    return { value: arr, next: o }
  }
  if (major === 5) {
    const { length, next } = readLength(info, bytes, offset + 1)
    const entries: [CborValue, CborValue][] = []
    let o = next
    for (let i = 0; i < Number(length); i++) {
      const k = decodeItem(bytes, o)
      o = k.next
      const v = decodeItem(bytes, o)
      o = v.next
      entries.push([k.value, v.value])
    }
    return { value: entries, next: o }
  }
  throw new Error(`Unsupported CBOR major type ${major}`)
}

function tryUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

export function parseValue(cborHex: string): WalletBalance {
  const bytes = hexToBytes(cborHex)
  const { value } = decodeItem(bytes, 0)

  let coin: bigint
  let multiasset: [CborValue, CborValue][] = []
  if (Array.isArray(value)) {
    coin = value[0] as bigint
    multiasset = (value[1] as [CborValue, CborValue][]) || []
  } else {
    coin = value as bigint
  }

  const assets: WalletAsset[] = []
  for (const [policyId, tokenMap] of multiasset) {
    for (const [assetName, amount] of tokenMap as [CborValue, CborValue][]) {
      const policyHex = bytesToHex(policyId as Uint8Array)
      const nameHex = bytesToHex(assetName as Uint8Array)
      assets.push({
        policyId: policyHex,
        assetNameHex: nameHex,
        assetName: tryUtf8(assetName as Uint8Array),
        amount: (amount as bigint).toString(),
        unit: policyHex + nameHex,
      })
    }
  }

  return {
    lovelace: coin.toString(),
    ada: lovelaceToAda(coin),
    assets,
    raw: cborHex,
  }
}

export function parseUtxo(cborHex: string): WalletUtxo {
  const bytes = hexToBytes(cborHex)
  const { value } = decodeItem(bytes, 0)
  const [input] = value as CborValue[]
  const [txId, index] = input as CborValue[]
  return {
    txHash: bytesToHex(txId as Uint8Array),
    index: Number(index),
    raw: cborHex,
  }
}

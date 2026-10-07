'use client'

/**
 * Shared Cardano wallet context built on the zero-dep CIP-30 connector.
 * Targets Cardano Preprod (testnet) — balance + network are refreshed while connected.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  listWallets,
  connectWallet,
  waitForWallets,
  networkName,
  shortenAddress,
  formatAda,
  toSignedTransaction,
  NETWORK_MAINNET,
  NETWORK_TESTNET,
  type DiscoveredWallet,
  type WalletBalance,
  type WalletSession,
} from './cardano-wallet'
import { USDM_UNIT, formatUsdm } from './usdm'

/** Product network: Preprod testnet (CIP-30 networkId 0). */
export const EXPECTED_NETWORK_ID = NETWORK_TESTNET
export const EXPECTED_NETWORK_LABEL = 'Preprod'
export const EXPECTED_X402_NETWORK = 'cardano:preprod'

type Status = 'idle' | 'connecting' | 'connected' | 'error'

export type CardanoNetworkLabel = 'Preprod' | 'Preview' | 'Mainnet' | 'Unknown'

type CardanoWalletContextValue = {
  wallets: DiscoveredWallet[]
  session: WalletSession | null
  status: Status
  error: Error | null
  connected: boolean
  address: string | null
  shortAddress: string | null
  networkId: number | null
  /** Raw CIP-30 family: mainnet | testnet | unknown */
  network: 'mainnet' | 'testnet' | 'unknown' | null
  /** UI label — Preprod when on testnet (product default). */
  networkLabel: CardanoNetworkLabel | null
  /** True when wallet is on a test network (Preprod / Preview). */
  isTestnet: boolean
  /** True when wallet network matches product expectation (Preprod). */
  isExpectedNetwork: boolean
  balance: WalletBalance | null
  adaBalance: string | null
  lovelace: string | null
  /** Raw USDM base units (6 decimals). */
  usdmUnits: string | null
  /** Formatted USDM balance for display. */
  usdmBalance: string | null
  connect: (walletKey: string) => Promise<WalletSession>
  disconnect: () => void
  refreshWallets: () => void
  refreshBalance: () => Promise<WalletBalance | null>
  activeAddress: string | null
  activeWallet: WalletSession | null
  signTx: (unsignedTxCborHex: string) => Promise<string>
}

const CardanoWalletContext = createContext<CardanoWalletContextValue | null>(null)

const STORAGE_KEY = 'finality:cardano-wallet'

function labelFor(networkId: number | null, address: string | null): CardanoNetworkLabel | null {
  if (address?.startsWith('addr1')) return 'Mainnet'
  if (address?.startsWith('addr_test')) {
    // CIP-30 cannot distinguish Preprod vs Preview; product targets Preprod.
    return 'Preprod'
  }
  if (networkId === NETWORK_MAINNET) return 'Mainnet'
  if (networkId === NETWORK_TESTNET) return 'Preprod'
  if (networkId == null) return null
  return 'Unknown'
}

export function CardanoWalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [session, setSession] = useState<WalletSession | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [networkId, setNetworkId] = useState<number | null>(null)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    waitForWallets(5000).then((found) => {
      if (mounted.current) setWallets(found)
    })
    const onFocus = () => setWallets(listWallets())
    window.addEventListener('focus', onFocus)
    return () => {
      mounted.current = false
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const refreshWallets = useCallback(() => {
    setWallets(listWallets())
  }, [])

  const applySession = useCallback(async (s: WalletSession) => {
    const [addr, net] = await Promise.all([s.getChangeAddress(), s.getNetworkId()])
    let bal: WalletBalance | null = null
    try {
      bal = await s.getBalance()
    } catch {
      bal = { lovelace: '0', ada: 0, assets: [], raw: null }
    }
    if (!mounted.current) return
    setSession(s)
    setAddress(addr)
    setNetworkId(net)
    setBalance(bal)
    setStatus('connected')
    setError(null)
    try {
      localStorage.setItem(STORAGE_KEY, s.key)
    } catch {
      /* ignore */
    }
  }, [])

  const connect = useCallback(
    async (walletKey: string) => {
      setStatus('connecting')
      setError(null)
      try {
        const s = await connectWallet(walletKey)
        await applySession(s)
        return s
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        if (mounted.current) {
          setError(e)
          setStatus('error')
        }
        throw e
      }
    },
    [applySession],
  )

  // Reconnect last wallet after CIP-30 injects (page refresh / remount).
  // Do not gate on isEnabled() — Lace/Nami often report false after reload even when
  // the origin is still authorized; enable() restores silently or prompts once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let key: string | null = null
      try {
        key = localStorage.getItem(STORAGE_KEY)
      } catch {
        return
      }
      if (!key) return

      await waitForWallets(5000)
      if (cancelled || !mounted.current) return

      const installed = listWallets().find((w) => w.key === key && w.installed)
      if (!installed) return

      try {
        if (mounted.current) setStatus('connecting')
        await connect(key)
      } catch {
        if (!cancelled && mounted.current) {
          // Keep the saved key so a manual connect (or next visit) can retry.
          setStatus('idle')
          setError(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // Run once on mount — connect is stable (depends on applySession []).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const disconnect = useCallback(() => {
    if (session) session.disconnect()
    setSession(null)
    setAddress(null)
    setNetworkId(null)
    setBalance(null)
    setError(null)
    setStatus('idle')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [session])

  const refreshBalance = useCallback(async () => {
    if (!session || session.isClosed) return null
    try {
      const bal = await session.getBalance()
      if (mounted.current) setBalance(bal)
      return bal
    } catch {
      return null
    }
  }, [session])

  // Keep balance fresh while connected.
  useEffect(() => {
    if (!session || status !== 'connected') return
    refreshBalance()
    const id = window.setInterval(() => {
      refreshBalance()
    }, 15_000)
    const onFocus = () => refreshBalance()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [session, status, refreshBalance])

  const signTx = useCallback(
    async (unsignedTxCborHex: string) => {
      if (!session || session.isClosed) throw new Error('Connect a Cardano wallet first')
      const net = await session.getNetworkId()
      if (net === NETWORK_MAINNET) {
        throw new Error('Wallet is on Mainnet. Switch the extension to Preprod (testnet), then reconnect.')
      }
      let witnessOrSigned: string
      try {
        // partialSign=true: payment txs only need the buyer's vkeys (CIP-30).
        witnessOrSigned = await session.signTransaction(unsignedTxCborHex, true)
      } catch (err) {
        const code = typeof err === 'object' && err && 'code' in err ? Number((err as { code: unknown }).code) : NaN
        const info =
          typeof err === 'object' && err && 'info' in err ? String((err as { info: unknown }).info) : ''
        const msg = err instanceof Error ? err.message : String(err)
        // CIP-30 TxSignError: 1 = ProofGeneration, 2 = UserDeclined
        if (code === 2 || /declin|reject|denied|cancel/i.test(`${info} ${msg}`)) {
          throw new Error('Wallet signature declined. Approve the payment in your extension, then try again.')
        }
        if (code === 1 || /proof|cannot sign|unable to sign/i.test(`${info} ${msg}`)) {
          throw new Error(
            'Wallet could not sign this payment. Confirm Preprod, USDM + ADA for fees, and that the connected address matches the funded account.',
          )
        }
        throw err instanceof Error ? err : new Error(msg)
      }
      // CIP-30 returns a witness set — merge into the unsigned tx for PAYMENT-SIGNATURE.
      return toSignedTransaction(unsignedTxCborHex, witnessOrSigned)
    },
    [session],
  )

  const networkLabel = labelFor(networkId, address)
  const isTestnet =
    networkId === NETWORK_TESTNET || Boolean(address?.startsWith('addr_test'))
  const isExpectedNetwork = isTestnet && networkId !== NETWORK_MAINNET

  const usdmUnits = useMemo(() => {
    if (!balance?.assets?.length) return null
    const hit = balance.assets.find((a) => a.unit === USDM_UNIT || a.unit.toLowerCase() === USDM_UNIT)
    return hit?.amount ?? '0'
  }, [balance])

  const value = useMemo<CardanoWalletContextValue>(
    () => ({
      wallets,
      session,
      status,
      error,
      connected: status === 'connected' && !!session && !session.isClosed,
      address,
      shortAddress: address ? shortenAddress(address) : null,
      networkId,
      network: networkId == null ? null : networkName(networkId),
      networkLabel,
      isTestnet,
      isExpectedNetwork,
      balance,
      adaBalance: balance ? formatAda(balance.lovelace) : null,
      lovelace: balance?.lovelace ?? null,
      usdmUnits,
      usdmBalance: usdmUnits != null ? formatUsdm(usdmUnits) : null,
      connect,
      disconnect,
      refreshWallets,
      refreshBalance,
      activeAddress: address,
      activeWallet: session,
      signTx,
    }),
    [
      wallets,
      session,
      status,
      error,
      address,
      networkId,
      networkLabel,
      isTestnet,
      isExpectedNetwork,
      balance,
      usdmUnits,
      connect,
      disconnect,
      refreshWallets,
      refreshBalance,
      signTx,
    ],
  )

  return <CardanoWalletContext.Provider value={value}>{children}</CardanoWalletContext.Provider>
}

export function useCardanoWallet(): CardanoWalletContextValue {
  const ctx = useContext(CardanoWalletContext)
  if (!ctx) throw new Error('useCardanoWallet must be used within CardanoWalletProvider')
  return ctx
}

export {
  listWallets,
  listInstalledWallets,
  connectWallet,
  waitForWallets,
  networkName,
  shortenAddress,
  formatAda,
  lovelaceToAda,
  isWitnessSetCbor,
  toSignedTransaction,
  combineUnsignedTxWithWitnessSet,
  KNOWN_WALLETS,
  NETWORK_MAINNET,
  NETWORK_TESTNET,
} from './cardano-wallet'

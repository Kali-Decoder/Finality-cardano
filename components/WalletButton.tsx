'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { useCardanoWallet, KNOWN_WALLETS } from '@/lib/cardano/wallet'

const KNOWN_ICON = Object.fromEntries(KNOWN_WALLETS.map((w) => [w.key, w.icon])) as Record<
  string,
  string
>

/**
 * CIP-30 connect button — when connected: ADA balance + trimmed address + copy.
 * Disconnect lives in Explore → Settings. Modal lists Lace/Nami with install state.
 */
export default function WalletButton() {
  const {
    wallets,
    connected,
    status,
    error,
    address,
    shortAddress,
    adaBalance,
    networkLabel,
    activeWallet,
    connect,
    refreshWallets,
  } = useCardanoWallet()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyAddress() {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // ignore clipboard failures
    }
  }

  if (connected) {
    return (
      <div
        className="wallet-nav"
        title={[activeWallet?.name, networkLabel, address].filter(Boolean).join(' · ')}
      >
        <span className="wallet-nav__bal mono">
          {adaBalance != null ? `${adaBalance} ADA` : '… ADA'}
        </span>
        <span className="wallet-nav__sep" aria-hidden />
        <span className="wallet-nav__addr mono">{shortAddress}</span>
        <button
          type="button"
          className="wallet-nav__copy"
          onClick={copyAddress}
          aria-label={copied ? 'Address copied' : 'Copy address'}
          title={copied ? 'Copied' : 'Copy address'}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    )
  }

  const installedCount = wallets.filter((w) => w.installed).length
  const missingCount = wallets.length - installedCount

  return (
    <>
      <button
        type="button"
        className="pill dark"
        disabled={status === 'connecting'}
        onClick={() => {
          refreshWallets()
          setOpen(true)
        }}
      >
        {status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center p-4"
          style={{ background: 'rgba(19,39,28,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto"
            style={{
              background: '#FBF9F4',
              color: '#13271C',
              borderRadius: 28,
              border: '1px solid #E7E2D6',
              boxShadow: '0 2px 4px rgba(19,39,28,0.04), 0 28px 64px -28px rgba(19,39,28,0.32)',
              padding: 28,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
          >
            <div className="flex justify-between gap-4 items-start">
              <div style={{ minWidth: 0 }}>
                <h2
                  id="wallet-modal-title"
                  style={{ margin: 0, fontSize: 24, letterSpacing: '-0.03em', color: '#13271C', fontWeight: 650 }}
                >
                  Connect a Cardano wallet
                </h2>
                <p style={{ fontSize: 15, marginTop: 8, marginBottom: 0, color: '#66726A', lineHeight: 1.5 }}>
                  Use <b style={{ color: '#13271C' }}>Preprod</b> (testnet) in your extension. Finality never sees your
                  keys.
                </p>
              </div>
              <button
                type="button"
                className="pill line"
                aria-label="Close"
                onClick={() => setOpen(false)}
                style={{ flexShrink: 0, height: 40, paddingLeft: 12 }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="mono"
              style={{
                marginTop: 18,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                padding: '12px 14px',
                borderRadius: 14,
                background: '#F3F0E7',
                fontSize: 12,
                color: '#3E4B42',
              }}
            >
              <span>
                <b style={{ color: '#2E7A38' }}>{installedCount}</b>
                {' installed'}
              </span>
              <span>
                <b style={{ color: '#13271C' }}>{missingCount}</b>
                {' not installed'}
              </span>
            </div>

            <div className="grid gap-3" style={{ marginTop: 16 }}>
              {wallets.map((wallet) => {
                const installed = wallet.installed
                const iconSrc =
                  (installed && wallet.icon) ||
                  KNOWN_ICON[wallet.key] ||
                  wallet.icon ||
                  '/wallets/generic.svg'
                return (
                  <button
                    key={wallet.key}
                    type="button"
                    disabled={!installed || status === 'connecting'}
                    onClick={async () => {
                      if (!installed) return
                      try {
                        await connect(wallet.key)
                        setOpen(false)
                      } catch {
                        // error in hook state
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      textAlign: 'left',
                      borderRadius: 16,
                      border: `1px solid ${installed ? '#E7E2D6' : '#D8D1C0'}`,
                      background: installed ? '#FFFFFF' : '#F3F0E7',
                      color: '#13271C',
                      cursor: installed ? 'pointer' : 'default',
                      minHeight: 72,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconSrc}
                      alt=""
                      width={44}
                      height={44}
                      className="shrink-0"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        objectFit: 'cover',
                        background: '#fff',
                        border: '1px solid #E7E2D6',
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        style={{
                          fontWeight: 650,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                          color: '#13271C',
                        }}
                      >
                        <span className="truncate" style={{ fontSize: 15 }}>
                          {wallet.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            padding: '4px 8px',
                            borderRadius: 999,
                            background: installed ? '#ECF6E2' : '#E8E3D6',
                            color: installed ? '#2E7A38' : '#3E4B42',
                          }}
                        >
                          {installed ? 'Installed' : 'Not installed'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4, color: '#66726A', lineHeight: 1.4 }}>
                        {installed
                          ? 'Ready · set network to Preprod, then connect'
                          : 'Install the extension, then reopen this picker'}
                      </div>
                    </div>
                    {installed ? (
                      <span
                        className="mono"
                        style={{ fontSize: 12, color: '#2E7A38', fontWeight: 650, flexShrink: 0 }}
                      >
                        Connect
                      </span>
                    ) : (
                      wallet.installUrl && (
                        <a
                          href={wallet.installUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1"
                          style={{ fontSize: 13, fontWeight: 600, color: '#13271C', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Install
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )
                    )}
                  </button>
                )
              })}
            </div>

            {error && (
              <p style={{ color: '#C2412D', fontSize: 14, marginTop: 16, marginBottom: 0 }}>{error.message}</p>
            )}
            <p className="mono" style={{ fontSize: 11, marginTop: 20, marginBottom: 0, color: '#66726A' }}>
              Preprod ADA balance appears in Dashboard → Settings after you connect.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

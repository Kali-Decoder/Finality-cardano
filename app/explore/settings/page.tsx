'use client'

import Link from 'next/link'
import { useCardanoWallet } from '@/lib/cardano/wallet'
import { ExternalLink } from 'lucide-react'
import { clearTransactions } from '@/lib/dashboard/history'
import { CARDANO } from '@/lib/cardano/config'
import { merchantUrl } from '@/lib/x402/client'

export default function SettingsPage() {
  const {
    activeAddress,
    disconnect,
    adaBalance,
    lovelace,
    network,
    networkLabel,
    isExpectedNetwork,
    isTestnet,
    refreshBalance,
  } = useCardanoWallet()

  return (
    <div className="dash-page" style={{ maxWidth: 720 }}>
      <div className="dash-head" style={{ marginBottom: 8 }}>
        <div>
          <span className="label">
            <span className="n">06</span>Settings
          </span>
          <h1>Wallet &amp; network</h1>
          <p>Preprod balance, x402 discovery, and local session data.</p>
        </div>
      </div>

      <section className="dash-panel" style={{ display: 'grid', gap: 16, marginBottom: 18 }}>
        <span className="label plain">Wallet</span>
        <div className="mono" style={{ fontSize: 14, wordBreak: 'break-all' }}>
          {activeAddress || 'Not connected'}
        </div>
        {activeAddress && (
          <div className="dash-run__meta">
            <div>
              <span className="mono muted">ADA balance</span>
              <b>{adaBalance != null ? `${adaBalance} ADA` : '…'}</b>
              {lovelace != null && (
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {lovelace} lovelace
                </span>
              )}
            </div>
            <div>
              <span className="mono muted">Network</span>
              <b>{networkLabel ?? network ?? '—'}</b>
              <span className="mono muted" style={{ fontSize: 12 }}>
                {isExpectedNetwork
                  ? 'Matches cardano:preprod'
                  : isTestnet
                    ? 'Testnet (confirm Preprod in wallet)'
                    : 'Wrong network. Switch to Preprod'}
              </span>
            </div>
          </div>
        )}
        {!isExpectedNetwork && activeAddress && (
          <p style={{ color: 'var(--bad)', margin: 0, fontSize: 14.5 }}>
            Finality payments run on Cardano Preprod. Switch your wallet to Preprod, disconnect, then reconnect.
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {activeAddress ? (
            <>
              <button type="button" className="pill line" onClick={() => refreshBalance()}>
                Refresh balance
              </button>
              <button type="button" className="pill line" onClick={() => disconnect()}>
                Disconnect
              </button>
            </>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
              Use Connect wallet in the header.
            </p>
          )}
        </div>
      </section>

      <section className="dash-panel" style={{ display: 'grid', gap: 16, marginBottom: 18 }}>
        <span className="label plain">Network</span>
        <div className="dash-run__meta" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <InfoRow label="Chain" value="Cardano Preprod (testnet)" />
          <InfoRow label="x402 network" value={CARDANO.network} />
          <InfoRow label="Asset" value={CARDANO.asset} />
          <InfoRow label="Protocol" value="x402 exact (Cardano)" />
          <InfoRow label="Proxy" value={merchantUrl} />
        </div>
        <span className="chip live">Settlement · @odatano/x402</span>
      </section>

      <section className="dash-panel" style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
        <span className="label plain">Discovery</span>
        {[
          ['Catalog', `${merchantUrl}/v1/catalog`],
          ['OpenAPI', `${merchantUrl}/v1/openapi.json`],
          ['Health', `${merchantUrl}/health`],
          ['Info', `${merchantUrl}/info`],
          ['Cardano x402', CARDANO.docs],
        ].map(([label, href]) => (
          <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="dash-linkrow">
            <span className="mono muted">{label}</span>
            <span className="mono">
              {href}
              <ExternalLink className="h-3 w-3" style={{ display: 'inline', marginLeft: 8, verticalAlign: 'middle' }} />
            </span>
          </a>
        ))}
      </section>

      <section className="dash-panel" style={{ display: 'grid', gap: 14 }}>
        <span className="label plain">Local data</span>
        <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
          Clear browser-stored transaction history from Run sessions.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="pill line" onClick={() => clearTransactions()}>
            Clear transactions
          </button>
          <Link href="/explore/transactions" className="pill dark">
            View transactions <span className="pill__ic">→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mono muted">{label}</span>
      <b style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-all' }}>{value}</b>
    </div>
  )
}

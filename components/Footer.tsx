'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot__in">
        <div className="foot__brand">
          <Logo size={30} light />
          <p>
            Market intelligence and Cardano on-chain data for people and agents. Pay per request in
            USDM via x402. No subscriptions, no API keys.
          </p>
        </div>
        <div>
          <h5 className="mono">Product</h5>
          <ul>
            <li>
              <Link href="/explore">Dashboard</Link>
            </li>
            <li>
              <Link href="/explore/run">Run endpoint</Link>
            </li>
            <li>
              <Link href="/explore/endpoints">Endpoints</Link>
            </li>
            <li>
              <Link href="/explore/transactions">Transactions</Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="mono">Catalog</h5>
          <ul>
            <li>
              <Link href="/#catalog">Market data</Link>
            </li>
            <li>
              <Link href="/#catalog">Intelligence</Link>
            </li>
            <li>
              <Link href="/#catalog">AI &amp; agents</Link>
            </li>
            <li>
              <Link href="/#catalog">Cardano on-chain</Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="mono">Protocol</h5>
          <ul>
            <li>
              <a href="https://developers.cardano.org/x402/" target="_blank" rel="noreferrer">
                Cardano x402 ↗
              </a>
            </li>
            <li>
              <Link href="/#pay">CIP-30 wallets</Link>
            </li>
            <li>
              <Link href="/#how">How payment works</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="foot__base mono">
        <span>© {new Date().getFullYear()} Finality</span>
        <span>Settled in USDM on Cardano · @odatano/x402</span>
      </div>
    </footer>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCardanoWallet } from '@/lib/cardano/wallet'
import { cn } from '@/lib/utils'
import Logo from '@/components/Logo'
import WalletButton from '@/components/WalletButton'

const TABS: { href: string; label: string; n: string; exact?: boolean }[] = [
  { href: '/explore', label: 'Overview', n: '01', exact: true },
  { href: '/explore/run', label: 'Run', n: '02' },
  { href: '/explore/endpoints', label: 'Endpoints', n: '03' },
  { href: '/explore/transactions', label: 'Transactions', n: '04' },
  { href: '/explore/live', label: 'Live', n: '05' },
  { href: '/explore/settings', label: 'Settings', n: '06' },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { connected, networkLabel, isExpectedNetwork } = useCardanoWallet()

  return (
    <div className="dashboard-shell">
      <header className="dash-nav">
        <div className="dash-nav__bar">
          <Link href="/explore" className="dash-nav__logo" aria-label="Finality dashboard">
            <Logo size={28} />
          </Link>
          <nav className="dash-nav__links">
            {TABS.map((tab) => {
              const active = tab.exact
                ? pathname === tab.href
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              return (
                <Link key={tab.href} href={tab.href} className={cn(active && 'active')}>
                  {tab.label}
                </Link>
              )
            })}
          </nav>
          <span className="dash-nav__sp" />
          <span className="dash-nav__status">
            <span className={cn('dot', connected && isExpectedNetwork && 'live')} />
            {connected ? `${networkLabel ?? 'Preprod'} · connected` : 'Preprod · disconnected'}
          </span>
          <div className="dash-nav__cta">
            <WalletButton />
            <Link href="/explore/run" className="pill dark">
              Run endpoint <span className="pill__ic">→</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="dash-body">
        <aside className="dash-side" aria-label="Sections">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            return (
              <Link key={tab.href} href={tab.href} className={cn('dash-side__item', active && 'on')}>
                <span className="mono">{tab.n}</span>
                {tab.label}
              </Link>
            )
          })}
          <Link href="/" className="dash-side__home">
            ← Back to home
          </Link>
        </aside>
        <main className="dash-main">{children}</main>
      </div>
    </div>
  )
}

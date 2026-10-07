'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'
import WalletButton from '@/components/WalletButton'

const LINKS: [string, string][] = [
  ['/#protocol', 'Protocol'],
  ['/#pay', 'Payments'],
  ['/#how', 'How it works'],
  ['/#catalog', 'Catalog'],
]

export default function Nav() {
  const path = usePathname()
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => setMenu(false), [path])

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}${menu ? ' open' : ''}`}>
      <div className="nav__bar">
        <Link href="/" className="nav__logo" aria-label="Finality home">
          <Logo size={28} />
        </Link>
        <nav className="nav__links">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={!href.includes('#') && path.startsWith(href) ? 'active' : ''}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="nav__sp" />
        <span className="nav__status">
          <span className="dot" />
          Cardano · x402
        </span>
        <div className="nav__cta" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <WalletButton />
          <Link href="/explore" className="pill dark">
            Open dashboard <span className="pill__ic">→</span>
          </Link>
        </div>
        <button
          className="pill dark nav__menu"
          aria-label="Menu"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
        >
          Menu <span className="pill__ic">{menu ? '×' : '='}</span>
        </button>
      </div>
      <nav className="nav__sheet" aria-hidden={!menu}>
        {LINKS.map(([href, label], i) => (
          <Link key={href} href={href} style={{ transitionDelay: `${menu ? 0.04 * i : 0}s` }}>
            <span className="mono">0{i + 1}</span>
            {label}
          </Link>
        ))}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <WalletButton />
          <Link href="/explore" className="pill dark">
            Open dashboard <span className="pill__ic">→</span>
          </Link>
        </div>
      </nav>
    </header>
  )
}

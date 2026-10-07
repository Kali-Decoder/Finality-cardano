'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import WalletButton from '@/components/WalletButton'

const NAV_LINKS = [
  { href: '/explore', label: 'Dashboard' },
  { href: '/explore/run', label: 'Run' },
] as const

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/explore') {
      return pathname === '/explore' || pathname.startsWith('/explore/')
    }
    if (href === '/explore/run') {
      return pathname === '/explore/run' || pathname.startsWith('/explore/run/')
    }
    return pathname === href
  }

  return (
    <header className="border-b border-border p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="flex items-center justify-between px-2 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Image src="/logo.webp" alt="Finality" width={32} height={32} className="w-8 h-8" />
          <span>FINALITY</span>
        </Link>

        <nav className="hidden md:flex gap-12 text-sm ml-auto mr-12">
          {NAV_LINKS.map((link) =>
            'external' in link && link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground hover:underline decoration-2 underline-offset-4 transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className={`hover:underline decoration-2 underline-offset-4 transition-colors ${
                  isActive(link.href)
                    ? 'font-bold text-foreground underline'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-background border-b border-border p-6 md:hidden flex flex-col gap-4 shadow-lg">
          {NAV_LINKS.map((link) =>
            'external' in link && link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="text-lg text-muted-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`text-lg ${isActive(link.href) ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
              >
                {link.label}
              </Link>
            ),
          )}
          <div className="pt-4 border-t border-border">
            <WalletButton />
          </div>
        </div>
      )}
    </header>
  )
}

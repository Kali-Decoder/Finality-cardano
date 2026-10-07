'use client'

import { usePathname } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = pathname === '/explore' || pathname.startsWith('/explore/')

  if (isDashboard) {
    return <>{children}</>
  }

  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  )
}

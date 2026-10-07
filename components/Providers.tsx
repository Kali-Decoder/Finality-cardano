'use client'

import { CardanoWalletProvider } from '@/lib/cardano/wallet'
import { Providers as MotionProviders } from '@/components/motion'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionProviders>
      <CardanoWalletProvider>{children}</CardanoWalletProvider>
    </MotionProviders>
  )
}

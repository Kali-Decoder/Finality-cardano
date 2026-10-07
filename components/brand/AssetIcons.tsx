import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Mehen USDM — settlement asset for paid routes. */
export function UsdmIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/usdm.png"
      alt="USDM"
      width={size}
      height={size}
      className={cn('brand-icon brand-icon--usdm', className)}
      unoptimized
    />
  )
}

/** Cardano (ADA) mark — network / wallet balance. */
export function CardanoIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/cardano.png"
      alt="Cardano"
      width={size}
      height={size}
      className={cn('brand-icon brand-icon--cardano', className)}
      unoptimized
    />
  )
}

/** Route price in USDM with mark. */
export function UsdmPrice({
  amount,
  size = 16,
  className,
}: {
  amount: string | number
  size?: number
  className?: string
}) {
  return (
    <span className={cn('asset-amt', className)}>
      <UsdmIcon size={size} />
      <span>
        {amount} <span className="asset-amt__unit">USDM</span>
      </span>
    </span>
  )
}

/** Wallet / fee balance in ADA with Cardano mark. */
export function AdaBalance({
  amount,
  size = 16,
  className,
}: {
  amount: string | number
  size?: number
  className?: string
}) {
  return (
    <span className={cn('asset-amt', className)}>
      <CardanoIcon size={size} />
      <span>
        {amount} <span className="asset-amt__unit">ADA</span>
      </span>
    </span>
  )
}

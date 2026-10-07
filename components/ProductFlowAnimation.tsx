'use client'

import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Bot,
  Briefcase,
  Building2,
  Cpu,
  Factory,
  Globe2,
  Landmark,
  Layers,
  Rocket,
  Shield,
  Sparkles,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/** Varied subscription plans shown on provider logos (stable shuffle). */
const PROVIDER_PLANS = [
  '$99/mo',
  '$249/mo',
  'Enterprise',
  'Pro seat',
  '$499/mo',
  'Team plan',
  '$79/mo',
  'Unlimited',
  '$1.2k/mo',
  'Annual+',
] as const

/** Left: Cardano chain data providers — circular, scattered. */
const PROVIDERS: {
  id: string
  label: string
  plan: string
  left: string
  top: string
  size: 'sm' | 'md' | 'lg'
}[] = [
  { id: 'blockfrost', label: 'Blockfrost', plan: PROVIDER_PLANS[0], left: '8%', top: '4%', size: 'lg' },
  { id: 'koios', label: 'Koios', plan: PROVIDER_PLANS[1], left: '54%', top: '12%', size: 'md' },
  { id: 'maestro', label: 'Maestro', plan: PROVIDER_PLANS[2], left: '16%', top: '30%', size: 'md' },
  { id: 'nexus', label: 'Nexus', plan: PROVIDER_PLANS[5], left: '56%', top: '42%', size: 'lg' },
  { id: 'ogmios', label: 'Ogmios', plan: PROVIDER_PLANS[6], left: '6%', top: '58%', size: 'md' },
  { id: 'utxorpc', label: 'UTxORPC', plan: PROVIDER_PLANS[4], left: '48%', top: '74%', size: 'lg' },
]

/** Right: orgs / projects — circular, scattered (every org has ≥1 endpoint). */
const ORGS: {
  id: string
  label: string
  Icon: LucideIcon
  left: string
  top: string
  size: 'sm' | 'md' | 'lg'
}[] = [
  { id: 'desk', label: 'Trading Desk', Icon: Building2, left: '4%', top: '1%', size: 'md' },
  { id: 'hedge', label: 'Hedge Fund', Icon: Landmark, left: '42%', top: '0%', size: 'sm' },
  { id: 'exchange', label: 'Exchange', Icon: Store, left: '76%', top: '3%', size: 'sm' },
  { id: 'defi', label: 'DeFi Protocol', Icon: Layers, left: '58%', top: '14%', size: 'md' },
  { id: 'agent', label: 'Agent Swarm', Icon: Bot, left: '14%', top: '16%', size: 'sm' },
  { id: 'lab', label: 'Research Lab', Icon: Rocket, left: '82%', top: '22%', size: 'md' },
  { id: 'quant', label: 'Quant Shop', Icon: Cpu, left: '32%', top: '28%', size: 'sm' },
  { id: 'fintech', label: 'Fintech App', Icon: Wallet, left: '6%', top: '38%', size: 'md' },
  { id: 'mm', label: 'Market Maker', Icon: Briefcase, left: '68%', top: '40%', size: 'sm' },
  { id: 'infra', label: 'Infra Team', Icon: Factory, left: '40%', top: '48%', size: 'sm' },
  { id: 'custody', label: 'Custody Desk', Icon: Shield, left: '84%', top: '52%', size: 'md' },
  { id: 'dao', label: 'DAO Treasury', Icon: Building2, left: '18%', top: '58%', size: 'sm' },
  { id: 'wallet', label: 'Wallet Co', Icon: Globe2, left: '54%', top: '64%', size: 'sm' },
  { id: 'studio', label: 'Game Studio', Icon: Sparkles, left: '78%', top: '74%', size: 'sm' },
  { id: 'nft', label: 'NFT Market', Icon: Store, left: '8%', top: '76%', size: 'sm' },
  { id: 'bank', label: 'Onchain Bank', Icon: Landmark, left: '36%', top: '84%', size: 'md' },
]

/** Endpoint catalog — assigned round-robin so every org gets connections. */
const ENDPOINT_POOL: { endpoint: string; price: string }[] = [
  { endpoint: 'market.quotes', price: '1 ADA' },
  { endpoint: 'market.candles', price: '1 ADA' },
  { endpoint: 'market.trending', price: '1 ADA' },
  { endpoint: 'market.tokenPrices', price: '1 ADA' },
  { endpoint: 'market.fearGreed', price: '1 ADA' },
  { endpoint: 'market.categories', price: '1 ADA' },
  { endpoint: 'intelligence.signals', price: '2 ADA' },
  { endpoint: 'intelligence.technicals', price: '2 ADA' },
  { endpoint: 'intelligence.report', price: '3 ADA' },
  { endpoint: 'intelligence.volume', price: '2 ADA' },
  { endpoint: 'intelligence.events', price: '2 ADA' },
  { endpoint: 'agent.decision', price: '2.5 ADA' },
  { endpoint: 'agent.briefing', price: '3 ADA' },
  { endpoint: 'agent.strategyParse', price: '2.5 ADA' },
  { endpoint: 'ai.chat', price: '4 ADA' },
  { endpoint: 'onchain.cardanoTip', price: '1 ADA' },
  { endpoint: 'onchain.cardanoAddress', price: '1 ADA' },
  { endpoint: 'onchain.cardanoPortfolio', price: '1 ADA' },
  { endpoint: 'onchain.cardanoHealth', price: '1 ADA' },
  { endpoint: 'onchain.cardanoAsset', price: '1 ADA' },
]

/** Exactly 2 endpoint lines per org — nothing left empty. */
const OUTBOUND_ROUTES: {
  orgId: string
  endpoint: string
  price: string
  /** Small exit fan; path still ends on the org */
  fan: number
  labelT: number
  slot: 0 | 1
}[] = ORGS.flatMap((org, orgIndex) => {
  const n = ORGS.length
  const baseFan = ((orgIndex - (n - 1) / 2) / Math.max(n - 1, 1)) * 150
  return ([0, 1] as const).map(slot => {
    const pool = ENDPOINT_POOL[(orgIndex * 2 + slot) % ENDPOINT_POOL.length]
    return {
      orgId: org.id,
      endpoint: pool.endpoint,
      price: pool.price,
      fan: baseFan + (slot === 0 ? -10 : 12),
      labelT: slot === 0 ? 0.78 : 0.88,
      slot,
    }
  })
})

const PHASES = [
  {
    title: 'We buy the expensive plans',
    desc: 'Finality holds access to Cardano chain data: Blockfrost, Koios, Maestro, Nexus, Ogmios, and UTxORPC.',
  },
  {
    title: 'We aggregate into one catalog',
    desc: 'Market, intelligence, AI, and Cardano on-chain reads, one place to call.',
  },
  {
    title: 'Agents pay only when they request',
    desc: 'No monthly seat for your org. Cardano x402 settles the exact ADA price per call.',
  },
]

const SIZE_PX = { sm: 58, md: 72, lg: 88 } as const

/** Category colors for result-side packets / labels */
const CATEGORY_COLORS: Record<string, string> = {
  market: '#0F766E',
  intelligence: '#1D4ED8',
  agent: '#C2410C',
  ai: '#BE123C',
  onchain: '#047857',
}

const CATEGORY_LEGEND = [
  { key: 'market', label: 'Market' },
  { key: 'intelligence', label: 'Intelligence' },
  { key: 'agent', label: 'Agent' },
  { key: 'ai', label: 'AI' },
  { key: 'onchain', label: 'On-chain' },
] as const

function categoryOf(endpoint: string): keyof typeof CATEGORY_COLORS {
  const prefix = endpoint.split('.')[0] ?? ''
  if (prefix in CATEGORY_COLORS) return prefix as keyof typeof CATEGORY_COLORS
  return 'market'
}

function colorForEndpoint(endpoint: string): string {
  return CATEGORY_COLORS[categoryOf(endpoint)]
}

type Pt = { x: number; y: number }

type FlowPath = {
  id: string
  d: string
  delay: number
  /** Packet / stroke color (outbound category colors) */
  color?: string
  label?: { endpoint: string; price: string; x: number; y: number; color?: string }
}

function curveControls(from: Pt, to: Pt, pull: number, fanY = 0) {
  const dx = Math.max(to.x - from.x, 40)
  return {
    // Mild exit fan; second control snaps toward the org so the line clearly lands
    c1: { x: from.x + dx * pull, y: from.y + fanY * 0.45 },
    c2: { x: to.x - dx * 0.22, y: to.y },
  }
}

function curvePath(from: Pt, to: Pt, pull: number, fanY = 0): string {
  const { c1, c2 } = curveControls(from, to, pull, fanY)
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`
}

function cubicAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  }
}

function relativePoint(
  el: HTMLElement,
  container: DOMRect,
  edge: 'left' | 'right' | 'center',
): Pt {
  const r = el.getBoundingClientRect()
  const x =
    edge === 'left'
      ? r.left - container.left
      : edge === 'right'
        ? r.right - container.left
        : r.left - container.left + r.width / 2
  return { x, y: r.top - container.top + r.height / 2 }
}

function CircleNode({
  label,
  sub,
  plan,
  Icon,
  logo,
  size,
  style,
  reduce,
  index,
  side,
  nodeRef,
}: {
  label: string
  sub?: string
  plan?: string
  Icon?: LucideIcon
  logo?: string
  size: 'sm' | 'md' | 'lg'
  style: CSSProperties
  reduce: boolean
  index: number
  side: 'in' | 'out'
  nodeRef: (el: HTMLDivElement | null) => void
}) {
  const px = SIZE_PX[size]
  return (
    <motion.div
      ref={nodeRef}
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: index * 0.07, duration: 0.45 }}
      style={{ ...style, width: px, height: px }}
      aria-label={label}
      title={logo ? label : undefined}
      className="absolute z-[2] flex flex-col items-center justify-center rounded-full border border-border bg-background text-center shadow-[0_10px_28px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {logo ? (
        <span className="relative h-[72%] w-[72%] overflow-hidden rounded-full ring-1 ring-black/10">
          <Image
            src={logo}
            alt={label}
            width={72}
            height={72}
            className="h-full w-full object-contain p-0.5"
          />
        </span>
      ) : (
        <>
          {Icon ? <Icon className="h-4 w-4 text-foreground/80" strokeWidth={1.5} /> : null}
          <span className="mt-1 max-w-[92%] px-1 text-center text-[9px] font-semibold leading-tight sm:text-[10px]">
            {label}
          </span>
          {sub ? (
            <span className="mt-0.5 max-w-[90%] truncate px-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
              {sub}
            </span>
          ) : null}
        </>
      )}
      {side === 'in' && plan ? (
        <span className="pointer-events-none absolute -bottom-1 left-1/2 z-[3] max-w-[5.5rem] -translate-x-1/2 truncate rounded-full bg-background px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wide text-muted-foreground ring-1 ring-border line-through decoration-foreground/55 sm:text-[8px]">
          {plan}
        </span>
      ) : null}
    </motion.div>
  )
}

function CurvedFlows({
  paths,
  reduce,
  size,
}: {
  paths: FlowPath[]
  reduce: boolean
  size: { w: number; h: number }
}) {
  if (size.w <= 0 || size.h <= 0) return null

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
    >
      <defs>
        <marker
          id="flow-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.2 L 9 5 L 0 8.8 Z" fill="#737373" />
        </marker>
      </defs>

      {paths.map(p => {
        const stroke = p.color ?? 'currentColor'
        const dot = p.color ?? 'currentColor'
        return (
          <g key={p.id}>
            <path
              d={p.d}
              fill="none"
              stroke={stroke}
              strokeWidth="1.25"
              strokeOpacity={p.color ? 0.45 : 0.2}
              markerEnd={p.color ? undefined : 'url(#flow-arrow)'}
            />
            {!reduce && (
              <>
                <circle r="3.5" fill={dot}>
                  <animateMotion dur="2.8s" begin={`${p.delay}s`} repeatCount="indefinite" path={p.d} />
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0"
                    keyTimes="0;0.1;0.9;1"
                    dur="2.8s"
                    begin={`${p.delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle r="3" fill={dot} opacity={0.7}>
                  <animateMotion
                    dur="2.8s"
                    begin={`${p.delay + 1.4}s`}
                    repeatCount="indefinite"
                    path={p.d}
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.85;0.85;0"
                    keyTimes="0;0.1;0.9;1"
                    dur="2.8s"
                    begin={`${p.delay + 1.4}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function EndpointLabels({ paths }: { paths: FlowPath[] }) {
  return (
    <>
      {paths
        .filter(p => p.label)
        .map(p => {
          const c = p.label!.color ?? p.color ?? '#171717'
          return (
            <div
              key={`label-${p.id}`}
              className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-1/2"
              style={{ left: p.label!.x, top: p.label!.y }}
            >
              <div
                className="flex items-center gap-1.5 whitespace-nowrap border bg-background/95 px-1.5 py-0.5 shadow-[0_4px_14px_rgba(0,0,0,0.06)] backdrop-blur-sm"
                style={{ borderColor: `${c}55` }}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c }}
                />
                <span className="font-mono text-[8px] leading-none text-foreground/85">
                  {p.label!.endpoint}
                </span>
                <span className="font-mono text-[8px] font-semibold tabular-nums" style={{ color: c }}>
                  {p.label!.price}
                </span>
              </div>
            </div>
          )
        })}
    </>
  )
}

function FinalityOrb({
  reduce,
  hubRef,
}: {
  reduce: boolean
  hubRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <motion.div
      ref={hubRef}
      initial={reduce ? false : { opacity: 0, scale: 0.88 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative z-[2] flex h-[5.75rem] w-[5.75rem] items-center justify-center rounded-full bg-background lg:h-[7rem] lg:w-[7rem]"
      style={{
        boxShadow:
          '0 18px 50px rgba(0,0,0,0.14), 0 6px 18px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
      }}
    >
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-full border border-foreground/10"
          animate={{ opacity: [0.2, 0.55, 0.2], scale: [1, 1.06, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <span className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full ring-1 ring-black/10 lg:h-[5.5rem] lg:w-[5.5rem]">
        <Image
          src="/logo.webp"
          alt="Finality"
          width={88}
          height={88}
          className="h-full w-full object-cover"
          priority
        />
      </span>
    </motion.div>
  )
}

export default function ProductFlowAnimation() {
  const reduce = useReducedMotion() ?? false
  const [phase, setPhase] = useState(0)
  const diagramRef = useRef<HTMLDivElement>(null)
  const hubRef = useRef<HTMLDivElement>(null)
  const providerRefs = useRef<(HTMLDivElement | null)[]>([])
  const orgRefs = useRef<(HTMLDivElement | null)[]>([])
  const [paths, setPaths] = useState<FlowPath[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [nodesReady, setNodesReady] = useState(0)

  const setOrgRef = useCallback((index: number, el: HTMLDivElement | null) => {
    orgRefs.current[index] = el
    if (el) setNodesReady(n => n + 1)
  }, [])

  const setProviderRef = useCallback((index: number, el: HTMLDivElement | null) => {
    providerRefs.current[index] = el
    if (el) setNodesReady(n => n + 1)
  }, [])

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setPhase(p => (p + 1) % PHASES.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [reduce])

  const measure = useCallback(() => {
    const container = diagramRef.current
    const hub = hubRef.current
    if (!container || !hub) return

    const box = container.getBoundingClientRect()
    setSize({ w: box.width, h: box.height })

    const hubLeft = relativePoint(hub, box, 'left')
    const hubRight = relativePoint(hub, box, 'right')
    const inGate: Pt = { x: hubLeft.x + 2, y: hubLeft.y }
    const outGate: Pt = { x: hubRight.x - 2, y: hubRight.y }

    const next: FlowPath[] = []

    providerRefs.current.forEach((el, i) => {
      if (!el) return
      const from = relativePoint(el, box, 'right')
      const fanY = (i - (PROVIDERS.length - 1) / 2) * 28
      next.push({
        id: `in-${i}`,
        d: curvePath(from, inGate, 0.45, -fanY * 0.35),
        delay: i * 0.22,
      })
    })

    const orgById = new Map(ORGS.map((o, i) => [o.id, i]))
    const outbound: FlowPath[] = []

    OUTBOUND_ROUTES.forEach((route, i) => {
      const orgIndex = orgById.get(route.orgId)
      if (orgIndex === undefined) return
      const el = orgRefs.current[orgIndex]
      if (!el) return

      // Aim at the org rim so the line visibly docks into the circle
      const to = relativePoint(el, box, 'left')
      const color = colorForEndpoint(route.endpoint)
      const pull = 0.38
      const { c1, c2 } = curveControls(outGate, to, pull, route.fan)
      // Keep labels near the org (end of the path)
      const mid = cubicAt(outGate, c1, c2, to, route.labelT)

      outbound.push({
        id: `out-${route.orgId}-${route.slot}`,
        d: curvePath(outGate, to, pull, route.fan),
        delay: 0.12 + i * 0.08,
        color,
        label: {
          endpoint: route.endpoint,
          price: route.price,
          x: mid.x,
          y: mid.y,
          color,
        },
      })
    })

    // Light per-org label nudge only — avoid shoving labels onto other orgs
    const byOrg = new Map<string, FlowPath[]>()
    outbound.forEach(p => {
      const orgId = p.id.replace(/^out-/, '').replace(/-[01]$/, '')
      const list = byOrg.get(orgId) ?? []
      list.push(p)
      byOrg.set(orgId, list)
    })
    byOrg.forEach(list => {
      list.forEach((p, slot) => {
        if (!p.label) return
        p.label.y += slot === 0 ? -8 : 10
        p.label.x += slot === 0 ? -4 : 10
      })
    })

    next.push(...outbound)
    setPaths(next)
  }, [])

  useLayoutEffect(() => {
    measure()
    const container = diagramRef.current
    if (!container) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(container)
    window.addEventListener('resize', measure)
    const frames = [0, 50, 120, 280, 600, 1000].map(ms => window.setTimeout(measure, ms))
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      frames.forEach(id => window.clearTimeout(id))
    }
  }, [measure, nodesReady])

  return (
    <section id="providers" className="relative overflow-hidden border-b border-border py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,oklch(0.96_0.01_220)_0%,transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, oklch(0.92 0 0) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.92 0 0) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)',
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
            How Finality works
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            One subscription stack.
            <br />
            Many pay-per-request agents.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg font-light leading-relaxed text-muted-foreground">
            We aggregate Cardano chain data from Blockfrost, Koios, Maestro, Nexus, Ogmios, and UTxORPC. Your org or
            agents call what they need and settle in ADA per request via x402.
          </p>
        </div>

        {/* Desktop diagram */}
        <div className="mt-14 hidden md:block md:mt-20">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Cardano data providers
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Orgs · pay per request
              </span>
              <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
              {CATEGORY_LEGEND.map(item => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[item.key] }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div ref={diagramRef} className="relative h-[640px] lg:h-[720px]">
            <CurvedFlows paths={paths} reduce={reduce} size={size} />
            <EndpointLabels paths={paths} />

            {/* Left cloud */}
            <div className="absolute inset-y-0 left-0 w-[30%] lg:w-[28%]">
              {PROVIDERS.map((p, i) => (
                <CircleNode
                  key={p.id}
                  label={p.label}
                  plan={p.plan}
                  size={p.size}
                  style={{ left: p.left, top: p.top }}
                  reduce={reduce}
                  index={i}
                  side="in"
                  nodeRef={el => setProviderRef(i, el)}
                />
              ))}
            </div>

            {/* Hub */}
            <div className="absolute left-[40%] top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 lg:left-[38%]">
              <FinalityOrb reduce={reduce} hubRef={hubRef} />
            </div>

            {/* Right cloud — denser org constellation */}
            <div className="absolute inset-y-0 right-0 w-[42%] lg:w-[44%]">
              {ORGS.map((o, i) => (
                <CircleNode
                  key={o.id}
                  label={o.label}
                  Icon={o.Icon}
                  size={o.size}
                  style={{ left: o.left, top: o.top }}
                  reduce={reduce}
                  index={i}
                  side="out"
                  nodeRef={el => setOrgRef(i, el)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="mt-12 md:hidden">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Cardano data providers
          </div>
          <div className="relative mx-auto h-[340px] max-w-sm">
            {PROVIDERS.map((p, i) => (
              <CircleNode
                key={p.id}
                label={p.label}
                plan={p.plan}
                size="md"
                style={{
                  left: `${2 + (i % 3) * 33}%`,
                  top: `${2 + Math.floor(i / 3) * 32}%`,
                }}
                reduce={reduce}
                index={i}
                side="in"
                nodeRef={() => {}}
              />
            ))}
          </div>

          <div className="flex justify-center py-6">
            <FinalityOrb reduce={reduce} />
          </div>

          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Orgs · pay per request
          </div>
          <div className="relative mx-auto h-[380px] max-w-sm">
            {ORGS.map((o, i) => (
              <div key={o.id}>
                <CircleNode
                  label={o.label}
                  Icon={o.Icon}
                  size="sm"
                  style={{
                    left: `${2 + (i % 4) * 24}%`,
                    top: `${2 + Math.floor(i / 4) * 24}%`,
                  }}
                  reduce={reduce}
                  index={i}
                  side="out"
                  nodeRef={() => {}}
                />
              </div>
            ))}
          </div>
          <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto border-t border-border pt-4">
            {OUTBOUND_ROUTES.map(o => (
              <li
                key={`${o.orgId}-${o.endpoint}`}
                className="flex items-center justify-between gap-3 font-mono text-[11px]"
              >
                <span className="truncate text-muted-foreground">{o.endpoint}</span>
                <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
                  {o.price}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Phase captions */}
        <div className="mx-auto mt-14 max-w-xl text-center md:mt-16">
          <div className="mb-4 flex items-center justify-center gap-2" role="tablist" aria-label="Product story steps">
            {PHASES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={phase === i}
                aria-label={`Step ${i + 1}`}
                onClick={() => setPhase(i)}
                className={`h-1.5 w-8 transition-colors ${
                  phase === i ? 'bg-foreground' : 'bg-border hover:bg-muted-foreground/40'
                }`}
              />
            ))}
          </div>
          <motion.div
            key={phase}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              0{phase + 1} / 0{PHASES.length}
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">{PHASES[phase].title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
              {PHASES[phase].desc}
            </p>
          </motion.div>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 border-t border-border pt-10 sm:grid-cols-3">
          {[
            ['In', 'Blockfrost, Koios, Maestro, Nexus, Ogmios, and UTxORPC'],
            ['Hub', 'Finality aggregates and prices each endpoint in ADA'],
            ['Out', 'Orgs pay ADA only for the endpoint they call'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

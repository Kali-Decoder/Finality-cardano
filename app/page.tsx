'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { clamp, Rv, SplitLines, useFrame, useInView, useStickyProgress } from '@/components/scroll'
import {
  DecideArt,
  EscrowArt,
  HeroFlow,
  MarkBlock,
  QuoteArt,
  ReceiptArt,
  VaultArt,
} from '@/components/home/art'
import ProductFlowAnimation from '@/components/ProductFlowAnimation'

const Arrow = () => <span className="pill__ic">→</span>

const BUCKETS: [string, string, string, number][] = [
  ['market', 'MARKET', '#4B8DCF', 7],
  ['intel', 'INTEL', '#59A53B', 6],
  ['ai', 'AI', '#8F5FC0', 4],
  ['chain', 'CHAIN', '#C38300', 22],
]

const HOW = [
  {
    n: '01',
    h: 'Connect a CIP-30 wallet',
    s: 'Eternl, Lace, Nami. No API keys.',
    p: (
      <>
        Connect on Cardano Preprod (or Mainnet). Finality never sees your keys; signing stays inside the extension.
      </>
    ),
    Art: QuoteArt,
  },
  {
    n: '02',
    h: 'Call any paid endpoint',
    s: 'Market, intelligence, AI, or on-chain.',
    p: (
      <>
        Unpaid requests return <b>HTTP 402</b> with x402 payment requirements (amount, payTo, and network) in plain
        headers.
      </>
    ),
    Art: EscrowArt,
  },
  {
    n: '03',
    h: 'Sign the exact ADA amount',
    s: 'Server builds the tx; you only sign.',
    p: (
      <>
        The merchant builds an unsigned payment via <b>@odatano/x402</b>. Your wallet signs with CIP-30{' '}
        <span className="mono">signTx</span>, then the call retries with <span className="mono">PAYMENT-SIGNATURE</span>.
      </>
    ),
    Art: ReceiptArt,
  },
  {
    n: '04',
    h: 'Get live JSON + receipt',
    s: 'Settlement on Cardano, result in the body.',
    p: (
      <>
        On success you get live data and a <span className="mono">PAYMENT-RESPONSE</span> with the tx hash. Pay again
        only when you need another call.
      </>
    ),
    Art: DecideArt,
  },
] as const

const CATALOG = [
  {
    id: 'market',
    name: 'Market data',
    count: '07',
    tagline: 'Quotes, candles, trending, categories, token prices, fear & greed.',
    price: 'from 0.01 ADA',
    live: true,
  },
  {
    id: 'intel',
    name: 'Intelligence',
    count: '06',
    tagline: 'Signals, technicals, reports, volume, events, and backtests.',
    price: 'from 0.01 ADA',
    live: true,
  },
  {
    id: 'ai',
    name: 'AI & agents',
    count: '04',
    tagline: 'Chat, decisions, briefings, and strategy parse, one paid call.',
    price: 'from 0.01 ADA',
    live: true,
  },
  {
    id: 'cardano',
    name: 'Cardano on-chain',
    count: '22',
    tagline: 'Addresses, assets, scripts, blocks, and mempool-style chain reads.',
    price: 'from 0.01 ADA',
    live: true,
  },
]

const STOPS: { k: string; h: string; p: string; vis: ReactNode; stat: string }[] = [
  {
    k: 'Request',
    h: 'Agent or human hits the API',
    p: 'Same HTTP catalog for a dashboard user or an autonomous agent. No signup wall.',
    vis: <span className="mf__tag">22 Cardano x402 routes</span>,
    stat: '22 paid routes',
  },
  {
    k: '402',
    h: 'Merchant quotes the price',
    p: 'Exact ADA amount on cardano:preprod. Requirements travel in PAYMENT-REQUIRED.',
    vis: <span className="mf__tag">x402 · exact</span>,
    stat: 'x402 v2 · exact scheme',
  },
  {
    k: 'Sign',
    h: 'Wallet authorises the spend',
    p: 'CIP-30 signs the unsigned CBOR. Facilitator verifies and settles on Cardano.',
    vis: <span className="mf__tag">CIP-30 · signTx</span>,
    stat: '@odatano/x402',
  },
  {
    k: 'Result',
    h: 'Live JSON comes back',
    p: 'Market and AI routes return analysis; on-chain routes return chain state, with a settlement receipt.',
    vis: <span className="mf__tag">PAYMENT-RESPONSE</span>,
    stat: 'No monthly seat',
  },
]

function Hero() {
  const media = useRef<HTMLDivElement>(null)
  useFrame(() => {
    const el = media.current
    if (!el) return
    const t = clamp(window.scrollY / window.innerHeight)
    el.style.transform = `scale(${1.04 + t * 0.08})`
  })
  return (
    <section className="hx">
      <div className="hx__panel">
        <div className="hx__media hx__media--finality" ref={media}>
          <HeroFlow />
        </div>
        <div className="hx__shade" />
        <div className="hx__copy">
          <span className="hx__tag">
            <span className="dot" />
            Live · Cardano x402
          </span>
          <SplitLines as="h1" text="Pay for the call. Not the plan." />
          <Rv as="p" delay={0.35}>
            <span className="hx__long">
              Finality is a pay-per-request merchant for market, AI, and Cardano data. Agents and humans hit the same
              endpoints. Settle each call in ADA via x402 and a CIP-30 wallet. No subscriptions.
            </span>
            <span className="hx__short">
              Market and Cardano APIs for agents. Pay per call in ADA via x402. No subscriptions.
            </span>
          </Rv>
          <Rv className="hx__cta" delay={0.5}>
            <Link href="/explore" className="pill white lg">
              Open dashboard <Arrow />
            </Link>
            <Link href="/#pay" className="pill ghost lg">
              Follow the payment <Arrow />
            </Link>
          </Rv>
        </div>
        <div className="hx__foot mono">
          <span>Request → 402 → CIP-30 sign → settle on Cardano</span>
          <span>Scroll ↓</span>
        </div>
      </div>
    </section>
  )
}

function Protocol() {
  const [ref, seen] = useInView<HTMLDivElement>()
  const buckets = BUCKETS.map(([key, label, color, value]) => ({ key, label, color, value }))
  return (
    <section className="panel dark on-dark cf" id="protocol">
      <div className="cf__grid wrap">
        <div className="cf__copy">
          <span className="label">
            <span className="n">01</span>The protocol
          </span>
          <SplitLines text="HTTP 402, settled in ADA on Cardano." accent="ADA" />
          <Rv as="p" className="lede">
            Finality is a pay-per-request merchant on Cardano. Unpaid calls get a 402 with exact ADA requirements;
            your CIP-30 wallet signs once; @odatano/x402 settles and the JSON comes back.
          </Rv>
          <div className="cf__notes">
            {[
              [
                'Exact ADA',
                'Every paid route quotes an exact ADA amount up front. Sign the built transaction or walk away. No open invoices.',
              ],
              [
                'CIP-30 wallets',
                'Eternl, Lace, Nami and friends. Keys never leave the extension; Finality only receives signed CBOR.',
              ],
              [
                'Agent-native headers',
                'PAYMENT-REQUIRED and PAYMENT-SIGNATURE are plain HTTP. Autonomous clients pay and retry without a checkout UI.',
              ],
            ].map(([h, p], i) => (
              <Rv key={h} className="bracket" delay={0.1 * i}>
                <span className="mono">→ {h}</span>
                <p>{p}</p>
              </Rv>
            ))}
          </div>
        </div>
        <div className={`cf__art${seen ? ' in' : ''}`} ref={ref}>
          <div className="cf__head mono">
            <span>Finality catalog · Cardano</span>
            <span>routes by lane</span>
          </div>
          <VaultArt buckets={buckets} />
          <div className="cf__foot">
            <p>
              <span className="mono">Live catalog</span>
              Twenty-two endpoints across market, intelligence, AI, and Cardano on-chain reads, each priced in ADA.
            </p>
            <div className="cf__stats mono">
              <span>
                <b>22</b> endpoints
              </span>
              <span>
                <b>0.01</b> ADA from
              </span>
              <span>
                <b>✓</b> x402 exact
              </span>
            </div>
            <Link href="/explore/endpoints" className="pill green">
              Browse the catalog <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function PayPath() {
  return (
    <section className="mf wrap" id="pay">
      <div className="mf__head">
        <span className="label">
          <span className="n">02</span>Follow the payment
        </span>
        <SplitLines text="From the 402 to the receipt." />
        <Rv as="p" className="lede">
          Same path for a human in the dashboard or an agent hitting the merchant over HTTP.
        </Rv>
      </div>
      <ol className="mf__flow">
        {STOPS.map((s, i) => (
          <Rv as="li" key={s.k} className="mf__stop" delay={0.06 * i}>
            <span className="mf__k">
              <span>{s.k}</span>
              <span>{String(i + 1).padStart(2, '0')}</span>
            </span>
            <div className="mf__vis">{s.vis}</div>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
            <span className="mf__stat">
              <span className="dot" />
              {s.stat}
            </span>
          </Rv>
        ))}
      </ol>
      <Rv className="mf__bar" delay={0.2}>
        <p>
          <b>Autonomous-ready.</b> Agents decode PAYMENT-REQUIRED, pay in ADA, and retry with PAYMENT-SIGNATURE.
          No human checkout page required.
        </p>
        <span className="mf__links">
          <Link href="/explore/run" className="pill green">
            Try a paid call <Arrow />
          </Link>
          <a href="https://developers.cardano.org/x402/" className="pill ghost" target="_blank" rel="noreferrer">
            Cardano x402 docs <Arrow />
          </a>
        </span>
      </Rv>
    </section>
  )
}

function HowCard({
  c,
  i,
  total,
}: {
  c: (typeof HOW)[number]
  i: number
  total: number
}) {
  const ref = useRef<HTMLLIElement>(null)
  const [inRef, seen] = useInView<HTMLDivElement>('-25% 0px -25% 0px')
  useFrame(() => {
    const el = ref.current
    const next = el?.nextElementSibling as HTMLElement | null
    if (!el) return
    if (!next || getComputedStyle(el).position !== 'sticky') {
      el.style.removeProperty('--c')
      return
    }
    const a = el.getBoundingClientRect()
    const b = next.getBoundingClientRect()
    el.style.setProperty('--c', (1 - clamp((b.top - a.top) / a.height)).toFixed(3))
  })
  return (
    <li className="hw__card" ref={ref} style={{ ['--k' as string]: i, zIndex: i + 1 } as CSSProperties}>
      <div className="hw__copy">
        <span className="mono hw__n">
          {c.n} / 0{total}
        </span>
        <h3>{c.h}</h3>
        <p className="hw__s">{c.s}</p>
        <p>{c.p}</p>
      </div>
      <div className={`hw__art${seen ? ' in' : ''}`} ref={inRef}>
        <c.Art />
      </div>
    </li>
  )
}

function How() {
  return (
    <section className="hw wrap" id="how">
      <div className="hw__head">
        <span className="label">
          <span className="n">03</span>How a request works
        </span>
        <SplitLines text="One signature. One ADA payment. One response." />
      </div>
      <ol className="hw__cards">
        {HOW.map((c, i) => (
          <HowCard key={c.n} c={c} i={i} total={HOW.length} />
        ))}
      </ol>
    </section>
  )
}

function Catalog() {
  const ref = useRef<HTMLElement>(null)
  const [at, setAt] = useState(0)
  useStickyProgress(ref, (p) => setAt(Math.min(CATALOG.length - 1, Math.floor(p * CATALOG.length))))
  useEffect(() => {
    if (location.hash === '#catalog') ref.current?.scrollIntoView({ block: 'start' })
  }, [])
  const s = CATALOG[at]
  return (
    <section className="sv" id="catalog" ref={ref} style={{ ['--n' as string]: CATALOG.length } as CSSProperties}>
      <div className="sv__stick wrap">
        <div className="sv__card" style={{ ['--t' as string]: '#ECF6E2' } as CSSProperties}>
          <span className="sv__count mono">
            {String(at + 1).padStart(2, '0')} / {String(CATALOG.length).padStart(2, '0')}
          </span>
          <div className="sv__team" style={{ padding: '48px 24px', fontSize: 72, fontWeight: 650, letterSpacing: '-0.04em' }}>
            {s.count}
          </div>
          <div className="sv__bar">
            <div>
              <span className="mono">{s.id}</span>
              <b>{s.tagline}</b>
            </div>
            <Link className="pill dark" href="/explore/endpoints">
              Open <Arrow />
            </Link>
          </div>
        </div>
        <div className="sv__list">
          <span className="label">
            <span className="n">04</span>Catalog
          </span>
          <ol>
            {CATALOG.map((x, i) => (
              <li key={x.id} className={`${i === at ? 'on' : ''}${x.live ? '' : ' soon'}`}>
                <span className="mono sv__i">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{x.name}</h3>
                  <div className="sv__more">
                    <div>
                      <p>{x.tagline}</p>
                      <span className="mono">{x.live ? `${x.count} routes · ${x.price}` : 'coming soon'}</span>
                    </div>
                  </div>
                </div>
                {x.live && (
                  <Link href="/explore/endpoints" className="sv__go" aria-label={`Browse ${x.name}`}>
                    →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Close() {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <section className="panel dark on-dark cl">
      <div className="cl__grid wrap">
        <div>
          <span className="label">
            <span className="n">05</span>Start here
          </span>
          <SplitLines text="Skip the monthly seat." />
          <Rv as="p" className="lede">
            Connect a Cardano wallet, pick an endpoint, and settle the call in ADA. Built for humans and agents on
            x402.
          </Rv>
          <Rv delay={0.15} className="hx__cta" style={{ marginTop: 28 }}>
            <Link href="/explore" className="pill green">
              Open dashboard <Arrow />
            </Link>
            <Link href="/explore/run" className="pill ghost">
              Run an endpoint <Arrow />
            </Link>
          </Rv>
          <p className="mono cl__fine" style={{ marginTop: 20 }}>
            Cardano Preprod · lovelace · CIP-30 · no subscription
          </p>
        </div>
        <div className={`cl__art${seen ? ' in' : ''}`} ref={ref}>
          <MarkBlock />
        </div>
      </div>
    </section>
  )
}

export default function Page() {
  return (
    <main className="home">
      <Hero />
      <Protocol />
      <ProductFlowAnimation />
      <PayPath />
      <How />
      <Catalog />
      <Close />
    </main>
  )
}

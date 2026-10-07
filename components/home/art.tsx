/** Line illustrations for the home page (Syncly art system, Finality copy). */
import type { CSSProperties } from 'react'

const v = (i: number) => ({ ['--i' as any]: i }) as CSSProperties

const INK = '#13271C'
const MINT = '#2E7A38'
const LEAF = '#A3E36A'
const SOFT = '#ECF6E2'
const PAPER = '#FFFFFF'
const BRASS = '#C8902F'

/** A stack of coins seen from slightly above. */
export function Coins({
  x,
  y,
  n,
  rx = 34,
  ry = 11,
  gap = 5.2,
  stroke,
  fill,
  start = 0,
  top,
}: {
  x: number
  y: number
  n: number
  rx?: number
  ry?: number
  gap?: number
  stroke: string
  fill: string
  start?: number
  top?: string
}) {
  const items = []
  for (let k = 0; k < n; k++) {
    const cy = y - k * gap
    items.push(
      <g key={k} className="pc" style={v(start + k)}>
        <path
          d={`M${x - rx} ${cy} v${gap} a${rx} ${ry} 0 0 0 ${rx * 2} 0 v${-gap}`}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.2"
        />
        <ellipse
          cx={x}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={k === n - 1 && top ? top : fill}
          stroke={stroke}
          strokeWidth="1.2"
        />
      </g>,
    )
  }
  return <g>{items}</g>
}

/** Catalog buckets as coin stacks. */
export function VaultArt({
  buckets,
}: {
  buckets: { key: string; label: string; value: number; color: string }[]
}) {
  const max = Math.max(1.5, ...buckets.map((b) => b.value))
  const W = 560
  const base = 250
  return (
    <svg className="art vault" viewBox={`0 0 ${W} 310`} role="img" aria-label="API catalog buckets">
      <line
        className="pc"
        style={v(0)}
        x1="24"
        y1={base + 26}
        x2={W - 24}
        y2={base + 26}
        stroke="rgba(255,255,255,0.18)"
        strokeDasharray="3 5"
      />
      {buckets.map((b, i) => {
        const n = b.value > 0 ? Math.max(2, Math.round((b.value / max) * 30)) : 1
        const x = 64 + i * ((W - 128) / Math.max(1, buckets.length - 1))
        return (
          <g key={b.key}>
            <Coins x={x} y={base} n={n} rx={34} ry={11} gap={6.2} stroke={b.color} fill="#0F2A1E" start={i * 3} />
            <text
              className="pc"
              style={v(i * 3 + 2)}
              x={x}
              y={base + 50}
              textAnchor="middle"
              fill="#7E9486"
              fontSize="10.5"
              fontFamily="var(--mono)"
              letterSpacing="1.4"
            >
              {b.label}
            </text>
            <text
              className="pc"
              style={v(i * 3 + 3)}
              x={x}
              y={base + 66}
              textAnchor="middle"
              fill="#fff"
              fontSize="12.5"
              fontFamily="var(--mono)"
            >
              {b.value.toFixed(0)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function QuoteArt() {
  return (
    <svg className="art" viewBox="0 0 400 300" role="img" aria-label="A priced API quote">
      <g className="pc" style={v(0)}>
        <rect x="112" y="40" width="176" height="224" rx="12" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      </g>
      <g className="pc" style={v(1)}>
        <rect x="132" y="62" width="70" height="8" rx="4" fill={INK} />
        <rect x="132" y="78" width="110" height="6" rx="3" fill="#D8D1C0" />
      </g>
      <g className="pc" style={v(2)}>
        <text x="132" y="132" fontFamily="var(--sans)" fontWeight="650" fontSize="38" letterSpacing="-1.5" fill={INK}>
          1
        </text>
        <text x="168" y="132" fontFamily="var(--mono)" fontSize="11" fill="#66726A">
          USDM
        </text>
      </g>
      {[0, 1, 2].map((k) => (
        <g key={k} className="pc" style={v(3 + k)}>
          <rect x="132" y={158 + k * 22} width="136" height="1" fill="#E7E2D6" />
          <rect x="132" y={146 + k * 22} width={[62, 88, 50][k]} height="6" rx="3" fill="#D8D1C0" />
          <rect x={236} y={146 + k * 22} width="32" height="6" rx="3" fill={k === 1 ? MINT : '#D8D1C0'} />
        </g>
      ))}
      <g className="pc stamp-in" style={v(6)}>
        <circle cx="262" cy="232" r="30" fill={SOFT} stroke={MINT} strokeWidth="1.6" />
        <circle cx="262" cy="232" r="23" fill="none" stroke={MINT} strokeWidth="1" strokeDasharray="2 3" />
        <path d="M250 232l8 8 15-16" fill="none" stroke={MINT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function EscrowArt() {
  return (
    <svg className="art" viewBox="0 0 400 300" role="img" aria-label="HTTP 402 payment required">
      <g className="pc" style={v(0)}>
        <path d="M200 120l92 44-92 44-92-44z" fill={SOFT} stroke={INK} strokeWidth="1.4" />
        <path d="M108 164v62l92 44v-62z" fill={PAPER} stroke={INK} strokeWidth="1.4" />
        <path d="M292 164v62l-92 44v-62z" fill="#F4F6F8" stroke={INK} strokeWidth="1.4" />
      </g>
      <g className="pc" style={v(1)}>
        <text x="200" y="188" textAnchor="middle" fontFamily="var(--mono)" fontSize="28" fontWeight="600" fill={INK}>
          402
        </text>
        <text x="200" y="210" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#66726A" letterSpacing="1.2">
          PAYMENT REQUIRED
        </text>
      </g>
      <g className="pc drop" style={v(2)}>
        <Coins x={200} y={92} n={4} rx={24} ry={8} gap={4.4} stroke={INK} fill={PAPER} top={SOFT} />
      </g>
      <g className="pc" style={v(3)}>
        <text x="200" y="292" textAnchor="middle" fontFamily="var(--mono)" fontSize="10.5" letterSpacing="1.4" fill="#66726A">
          X402 · CARDANO
        </text>
      </g>
    </svg>
  )
}

export function ReceiptArt() {
  const rows = [
    ['Wallet', 'CIP-30 signTx', '1.00'],
    ['Merchant', 'buildPayment', '—'],
    ['Network', 'cardano:preprod', 'USDM'],
    ['Settle', 'localFacilitator', 'tx'],
  ]
  return (
    <svg className="art" viewBox="0 0 400 300" role="img" aria-label="Payment receipt">
      <g className="pc" style={v(0)}>
        <path
          d="M116 30h168v222l-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>
      <g className="pc" style={v(1)}>
        <text x="200" y="58" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" letterSpacing="2.4" fill={INK}>
          FINALITY · RECEIPT
        </text>
        <rect x="136" y="70" width="128" height="1" fill="#E7E2D6" />
      </g>
      {rows.map((r, k) => (
        <g key={k} className="pc" style={v(2 + k)}>
          <circle cx="144" cy={96 + k * 34} r="8" fill={SOFT} stroke={MINT} />
          <text x="158" y={94 + k * 34} fontFamily="var(--sans)" fontSize="11.5" fontWeight="600" fill={INK}>
            {r[0]}
          </text>
          <text x="158" y={108 + k * 34} fontFamily="var(--mono)" fontSize="9.5" fill="#66726A">
            {r[1]}
          </text>
          <text x="264" y={99 + k * 34} textAnchor="end" fontFamily="var(--mono)" fontSize="11" fill={INK}>
            {r[2]}
          </text>
        </g>
      ))}
      <g className="pc" style={v(7)}>
        <rect x="136" y="232" width="128" height="1" fill={INK} />
        <text x="136" y="250" fontFamily="var(--mono)" fontSize="10" fill={MINT}>
          ✓ SETTLED ON CARDANO
        </text>
      </g>
    </svg>
  )
}

export function DecideArt() {
  return (
    <svg className="art" viewBox="0 0 400 300" role="img" aria-label="Live JSON result">
      <g className="pc" style={v(0)}>
        <rect x="70" y="55" width="260" height="190" rx="14" fill="#0F2A1E" stroke={LEAF} strokeWidth="1.2" />
      </g>
      {[
        '{',
        '  "success": true,',
        '  "operationId": "market.quotes",',
        '  "payment": { "asset": "USDM" }',
        '}',
      ].map((line, i) => (
        <text
          key={i}
          className="pc"
          style={v(1 + i)}
          x="95"
          y={95 + i * 22}
          fontFamily="var(--mono)"
          fontSize="11"
          fill={i === 0 || i === 4 ? LEAF : '#A9BBAE'}
        >
          {line}
        </text>
      ))}
    </svg>
  )
}

export function MarkBlock() {
  return (
    <svg className="art" viewBox="0 0 400 300" role="img" aria-label="Finality">
      <g className="pc" style={v(0)}>
        <rect x="120" y="70" width="160" height="160" rx="28" fill={SOFT} stroke={INK} strokeWidth="1.4" />
      </g>
      <g className="pc" style={v(1)}>
        <rect x="155" y="115" width="28" height="40" fill={INK} />
        <rect x="217" y="145" width="28" height="36" fill={INK} />
        <rect x="155" y="100" width="90" height="24" rx="12" fill={INK} />
        <rect x="155" y="176" width="90" height="24" rx="12" fill={INK} />
        <rect x="155" y="138" width="90" height="24" rx="12" fill={LEAF} />
      </g>
    </svg>
  )
}

/** Full-bleed hero diagram: Request → 402 → CIP-30 sign → settled JSON on Cardano.
 * Nodes sit on the right so the left shade + copy stay readable. */
export function HeroFlow() {
  const nodes = [
    { x: 520, y: 200, label: 'REQUEST', sub: 'GET /market' },
    { x: 720, y: 140, label: '402', sub: 'USDM quote' },
    { x: 920, y: 200, label: 'SIGN', sub: 'CIP-30 · USDM' },
    { x: 1080, y: 320, label: 'RESULT', sub: 'live JSON' },
  ]
  return (
    <svg className="hero-flow" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="rgba(255,255,255,0.045)" />
        </pattern>
        <filter id="hero-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="1200" height="640" fill="url(#hero-grid)" />

      <path
        className="wire"
        d="M570 200 C620 200, 660 140, 680 140"
        fill="none"
        stroke="rgba(163,227,106,0.55)"
        strokeWidth="2"
      />
      <path
        className="wire"
        d="M760 140 C810 140, 850 200, 880 200"
        fill="none"
        stroke="rgba(163,227,106,0.55)"
        strokeWidth="2"
        style={{ animationDelay: '0.4s' }}
      />
      <path
        className="wire"
        d="M960 200 C1000 200, 1030 280, 1040 300"
        fill="none"
        stroke="rgba(163,227,106,0.55)"
        strokeWidth="2"
        style={{ animationDelay: '0.8s' }}
      />

      {nodes.map((n, i) => (
        <g key={n.label} className="node" style={{ animationDelay: `${i * 0.35}s` }}>
          <rect
            x={n.x - 70}
            y={n.y - 46}
            width="140"
            height="92"
            rx="18"
            fill={i === 1 ? 'rgba(194,65,45,0.18)' : 'rgba(255,255,255,0.06)'}
            stroke={i === 1 ? '#E07A6A' : 'rgba(163,227,106,0.55)'}
            strokeWidth="1.4"
            filter="url(#hero-glow)"
          />
          <text
            x={n.x}
            y={n.y - 6}
            textAnchor="middle"
            fill="#fff"
            fontFamily="var(--mono)"
            fontSize="18"
            fontWeight="600"
            letterSpacing="1.5"
          >
            {n.label}
          </text>
          <text x={n.x} y={n.y + 18} textAnchor="middle" fill="#A9BBAE" fontFamily="var(--mono)" fontSize="11">
            {n.sub}
          </text>
        </g>
      ))}

      <g transform="translate(140, 448)">
        <rect width="280" height="72" rx="36" fill="rgba(163,227,106,0.14)" stroke="rgba(163,227,106,0.45)" />
        <image href="/brand/cardano.png" x="28" y="18" width="36" height="36" preserveAspectRatio="xMidYMid meet" />
        <text x="78" y="32" fill="#A3E36A" fontFamily="var(--mono)" fontSize="11" letterSpacing="1.6">
          SETTLED ON CARDANO
        </text>
        <text x="78" y="54" fill="#fff" fontFamily="var(--sans)" fontSize="18" fontWeight="650">
          Pay with USDM
        </text>
        <image href="/brand/usdm.png" x="216" y="18" width="36" height="36" preserveAspectRatio="xMidYMid meet" />
      </g>
    </svg>
  )
}


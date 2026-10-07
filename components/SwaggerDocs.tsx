'use client'

import Link from 'next/link'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

const merchantUrl = '/api/x402'

export default function SwaggerDocs(){
  return <main className="min-h-screen bg-white text-black">
    <div className="px-6 py-3 bg-slate-950 text-white flex items-center justify-between gap-4">
      <div><div className="font-bold">Finality API</div><div className="text-xs text-slate-300">OpenAPI explorer · Cardano Mainnet x402</div></div>
      <Link href="/" className="rounded px-3 py-2 bg-slate-800 text-sm">Wallet tester</Link>
    </div>
    <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-950">
      Try any operation without authorization to inspect its 402 payment requirements. Paid execution needs a wallet-generated PAYMENT-SIGNATURE; use the Wallet tester for interactive non-custodial signing.
    </div>
    <SwaggerUI url={`${merchantUrl}/v1/openapi.json`} deepLinking displayRequestDuration tryItOutEnabled persistAuthorization />
  </main>
}

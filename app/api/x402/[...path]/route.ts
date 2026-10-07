import type { NextRequest } from 'next/server'

export const dynamic='force-dynamic'
const merchant=(process.env.X402_SERVER_URL||'https://x402-server-w7qy.onrender.com').replace(/\/$/,'')

async function proxy(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){
  const {path}=await params
  const upstream=new URL(`${merchant}/${path.join('/')}`)
  upstream.search=request.nextUrl.search
  const headers=new Headers(request.headers)
  for(const name of ['host','connection','content-length'])headers.delete(name)
  try{
    const response=await fetch(upstream,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer(),redirect:'manual',signal:AbortSignal.timeout(30_000)})
    const responseHeaders=new Headers(response.headers)
    for(const name of ['content-encoding','content-length','transfer-encoding','connection'])responseHeaders.delete(name)
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:responseHeaders})
  }catch{
    return Response.json({success:false,error:{code:'merchant_unavailable',message:'The Finality merchant service is not reachable. Start it with npm run dev:merchant.'}},{status:503})
  }
}

export const GET=proxy
export const POST=proxy
export const OPTIONS=proxy

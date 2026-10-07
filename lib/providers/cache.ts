const values = new Map<string,{expires:number,value:unknown}>()
const pending = new Map<string,Promise<unknown>>()

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now=Date.now(), hit=values.get(key)
  if(hit && hit.expires>now) return hit.value as T
  const existing=pending.get(key) as Promise<T>|undefined
  if(existing) return existing
  const request=loader().then(value=>{ values.set(key,{expires:Date.now()+ttlMs,value}); return value }).finally(()=>pending.delete(key))
  pending.set(key,request)
  return request
}

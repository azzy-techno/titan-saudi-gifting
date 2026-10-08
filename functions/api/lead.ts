/**
 * Cloudflare Pages Function — POST /api/lead  (PLACEHOLDER endpoint, BRIEF §8)
 * Validates and acknowledges a lead. It does NOT forward anywhere yet: connect email or Zoho here
 * (e.g. env.LEAD_FORWARD_URL) before switching SITE.leadMode to 'api'. Until then the site uses mailto.
 */
interface Env {
  LEAD_FORWARD_URL?: string
}
interface Ctx {
  request: Request
  env: Env
}

const recent = new Map<string, number[]>() // best-effort per-isolate rate limit

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 3600_000)
  if (times.length >= 8 || (times.length && now - times[times.length - 1]! < 20_000)) return json(429, { ok: false, error: 'rate' })
  let data: Record<string, unknown>
  try {
    data = (await request.json()) as Record<string, unknown>
  } catch {
    return json(400, { ok: false, error: 'json' })
  }
  if (typeof data.website === 'string' && data.website) return json(202, { ok: true }) // honeypot
  const email = String(data.email ?? '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(422, { ok: false, error: 'email' })
  if (data.kind === 'proposal' && (!data.company || data.consent !== true)) return json(422, { ok: false, error: 'fields' })
  times.push(now)
  recent.set(ip, times)
  if (env.LEAD_FORWARD_URL) {
    const r = await fetch(env.LEAD_FORWARD_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
    if (!r.ok) return json(502, { ok: false, error: 'forward' })
  }
  return json(202, { ok: true, ref: data.ref ?? null, forwarded: Boolean(env.LEAD_FORWARD_URL) })
}

export function onRequest(): Response {
  return json(405, { ok: false, error: 'method' })
}

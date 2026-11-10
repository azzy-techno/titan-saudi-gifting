import { asset } from '@/lib/basePath'
import { SITE } from '@/lib/site'

/**
 * Lead adapter (BRIEF §8). Modes:
 *  - 'zoho'   Zoho CRM Web-to-Lead (needs SITE.zoho.action + hidden fields — CONTENT_TODO C3)
 *  - 'api'    POST /api/lead (Cloudflare Pages Function placeholder; forward to email/CRM later)
 *  - 'mailto' opens the visitor's email app with the request — works from day one
 * Any failure in 'zoho'/'api' falls back to 'mailto'.
 */
export type LeadKind = 'proposal' | 'notify'

export interface Lead {
  kind: LeadKind
  locale: 'en' | 'ar'
  email: string
  company?: string
  name?: string
  role?: string
  phone?: string
  quantity?: string
  occasion?: string
  date?: string
  engraving?: string
  message?: string
  consent?: boolean
  /** honeypot — must stay empty */
  website?: string
}

export interface LeadResult {
  ok: boolean
  mode: 'zoho' | 'api' | 'mailto'
  ref: string
  throttled?: boolean
}

const RATE_KEY = 'tsg.lead.times'
const COOLDOWN_MS = 30_000
const MAX_PER_HOUR = 5

export function makeRef(kind: LeadKind): string {
  const d = new Date()
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TSG-${kind === 'notify' ? 'N' : 'P'}-${ymd}-${rnd}`
}

function readTimes(): number[] {
  try {
    const raw = window.localStorage.getItem(RATE_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

function writeTimes(times: number[]) {
  try {
    window.localStorage.setItem(RATE_KEY, JSON.stringify(times))
  } catch {
    /* storage unavailable — rate limit falls back to the in-memory window */
  }
}

let memoryTimes: number[] = []

/** Basic client-side rate limit: 30 s between sends, at most 5 per hour. */
export function isThrottled(now = Date.now()): boolean {
  const times = [...readTimes(), ...memoryTimes].filter((t) => now - t < 3600_000)
  const last = Math.max(0, ...times)
  return now - last < COOLDOWN_MS || times.length >= MAX_PER_HOUR
}

function remember(now = Date.now()) {
  memoryTimes = [...memoryTimes, now].filter((t) => now - t < 3600_000)
  writeTimes([...readTimes(), now].filter((t) => now - t < 3600_000))
}

function lines(lead: Lead, ref: string): string {
  const rows: [string, string | undefined][] = [
    ['Reference', ref],
    ['Type', lead.kind === 'notify' ? 'Al Khobar opening — notify me' : 'Corporate proposal request'],
    ['Company', lead.company],
    ['Name', lead.name],
    ['Role', lead.role],
    ['Email', lead.email],
    ['Phone', lead.phone ? `+966 ${lead.phone}` : undefined],
    ['Quantity', lead.quantity],
    ['Occasion', lead.occasion],
    ['Target delivery', lead.date],
    ['Engraving', lead.engraving?.replace(/\n/g, ' / ')],
    ['Message', lead.message],
    ['Language', lead.locale === 'ar' ? 'Arabic' : 'English'],
  ]
  return rows
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

export function mailtoHref(lead: Lead, ref: string): string {
  const subject = `${SITE.name} — ${lead.kind === 'notify' ? 'Al Khobar opening' : 'Proposal request'} — ${lead.company ?? lead.email} (${ref})`
  return `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines(lead, ref))}`
}

async function viaZoho(lead: Lead): Promise<boolean> {
  if (!SITE.zoho.action) return false
  const fd = new FormData()
  for (const [k, v] of Object.entries(SITE.zoho.hidden)) fd.append(k, v)
  // Field mapping to Zoho's standard Web-to-Lead names — confirm against the supplied form (CONTENT_TODO C3)
  fd.append('Company', lead.company ?? '')
  fd.append('Last Name', lead.name ?? lead.email)
  fd.append('Designation', lead.role ?? '')
  fd.append('Email', lead.email)
  fd.append('Phone', lead.phone ? `+966${lead.phone}` : '')
  fd.append('Description', lines(lead, ''))
  await fetch(SITE.zoho.action, { method: 'POST', body: fd, mode: 'no-cors' })
  return true // opaque response by design (no-cors)
}

async function viaApi(lead: Lead, ref: string): Promise<boolean> {
  const res = await fetch(asset('/api/lead'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...lead, ref }),
  })
  return res.ok
}

export async function submitLead(lead: Lead): Promise<LeadResult> {
  const ref = makeRef(lead.kind)
  if (lead.website) return { ok: true, mode: 'api', ref } // honeypot: silently accept, send nothing
  if (isThrottled()) return { ok: false, mode: SITE.leadMode, ref, throttled: true }
  remember()
  try {
    if (SITE.leadMode === 'zoho' && (await viaZoho(lead))) return { ok: true, mode: 'zoho', ref }
    if (SITE.leadMode === 'api' && (await viaApi(lead, ref))) return { ok: true, mode: 'api', ref }
  } catch {
    /* fall through to mailto */
  }
  window.location.href = mailtoHref(lead, ref)
  return { ok: true, mode: 'mailto', ref }
}

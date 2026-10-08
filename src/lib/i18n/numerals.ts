import { ARABIC_DIGITS, type Locale } from './config'

const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/** Converts ASCII digits (and the decimal point between digits) for Arabic when the switch is 'eastern'. */
export function localizeDigits(input: string | number, locale: Locale): string {
  const s = String(input)
  if (locale !== 'ar' || ARABIC_DIGITS !== 'eastern') return s
  return s
    .replace(/(\d)\.(\d)/g, '$1٫$2') // Arabic decimal separator
    .replace(/(\d),(\d{3})/g, '$1٬$2') // Arabic thousands separator
    .replace(/[0-9]/g, (d) => EASTERN[Number(d)] ?? d)
}

/** Deep-maps every string in a dictionary through localizeDigits (keys in `skip` are left untouched). */
export function localizeDictionary<T>(value: T, locale: Locale, skip: ReadonlySet<string>, key = ''): T {
  if (typeof value === 'string') {
    return (skip.has(key) || value.includes('[[CONFIRM') ? value : localizeDigits(value, locale)) as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => localizeDictionary(v, locale, skip, key)) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = localizeDictionary(v, locale, skip, k)
    return out as T
  }
  return value
}

/** Zero-padded number, localised. */
export function pad(n: number, width: number, locale: Locale): string {
  return localizeDigits(String(Math.max(0, Math.floor(n))).padStart(width, '0'), locale)
}

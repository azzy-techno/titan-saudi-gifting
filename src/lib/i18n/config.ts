export const LOCALES = ['en', 'ar'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export const DIR: Record<Locale, 'ltr' | 'rtl'> = { en: 'ltr', ar: 'rtl' }

/**
 * Single switch for digits in Arabic text.
 * 'eastern' → ٠١٢٣٤٥٦٧٨٩ (default per brief) · 'western' → 0123456789
 */
export const ARABIC_DIGITS: 'eastern' | 'western' = 'eastern'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

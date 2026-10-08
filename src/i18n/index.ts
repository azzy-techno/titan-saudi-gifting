import type { Locale } from '@/lib/i18n/config'
import { en, type Dictionary } from './en'
import { ar } from './ar'

const DICTIONARIES: Record<Locale, Dictionary> = { en, ar }

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

export type { Dictionary }

/**
 * Site-wide configuration. Every value marked CONFIRM is listed in CONTENT_TODO.md.
 * Empty strings mean "not supplied yet" — the UI shows a visible [[CONFIRM]] placeholder instead.
 */
export const SITE = {
  name: 'Titan Saudi Corporate Gifting',
  /** CONFIRM (C9): production domain. `.example` is a reserved placeholder TLD. */
  url: 'https://titan-saudi-gifting.example',
  /** CONFIRM (C1): WhatsApp number, digits only incl. country code, e.g. 9665XXXXXXXX */
  whatsapp: '',
  /** CONFIRM (C2): enquiries inbox for the mailto fallback + footer */
  email: '',
  /** CONFIRM (C3): Zoho CRM Web-to-Lead form action URL + hidden fields */
  zoho: {
    action: '',
    hidden: {} as Record<string, string>,
  },
  /**
   * Lead adapter mode. Day one = 'mailto' (the only path that reaches a human without backend config).
   * Switch to 'zoho' once C3 is supplied, or 'api' once /api/lead forwards to email/CRM.
   */
  leadMode: 'mailto' as 'api' | 'zoho' | 'mailto',
  /** CONFIRM (C4): legal entity — all shown with [[CONFIRM]] markers until verified */
  legal: {
    entity: 'FAST Operations and Maintenance Company',
    address: 'Office 308, Balhamer Business Gate, Dammam',
    cr: '2050113965',
    vat: '312690692600003',
    confirmed: false,
  },
  /** Al Khobar city coordinates (Wikipedia: 26°17′N 50°12′E). Store coordinates CONFIRM (C5). */
  khobar: {
    lat: 26.2833,
    lon: 50.2,
    dms: '26°17′N 50°12′E',
  },
  timeZone: 'Asia/Riyadh',
} as const

export const CONFIRM = (what: string) => `[[CONFIRM: ${what}]]`

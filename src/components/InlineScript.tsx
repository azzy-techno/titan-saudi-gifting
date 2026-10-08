/**
 * Inline script that runs synchronously during HTML parsing (before first paint).
 * Pattern from Next 16 docs (preventing-flash-before-hydration): text/plain on the client
 * so React does not warn about rendering <script>, and suppressHydrationWarning for the type swap.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

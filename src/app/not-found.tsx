import Link from 'next/link'
export default function NotFound() {
  return (
    <main className="root-pick">
      <p className="label">404</p>
      <nav aria-label="Language">
        <Link href="/en/">English</Link>
        <Link href="/ar/" lang="ar">
          العربية
        </Link>
      </nav>
    </main>
  )
}

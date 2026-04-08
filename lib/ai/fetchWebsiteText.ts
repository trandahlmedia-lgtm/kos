import 'server-only'

/**
 * Validates that a URL is a safe external HTTP(S) target.
 * Blocks private IPs, localhost, link-local, and non-HTTP schemes.
 */
export function isSafeUrl(raw: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()

  // Block localhost variants
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') return false

  // Block private/reserved IP ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    if (a === 10) return false                           // 10.0.0.0/8
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return false  // 172.16.0.0/12
    if (a === 192 && b === 168) return false              // 192.168.0.0/16
    if (a === 169 && b === 254) return false              // link-local
    if (a === 0) return false                             // 0.0.0.0/8
  }

  // Block cloud metadata endpoints
  if (hostname === 'metadata.google.internal') return false
  if (hostname === '169.254.169.254') return false

  return true
}

/**
 * Fetches a URL and returns cleaned plain text (up to 8000 chars).
 * Used by the client-intake and lead research agents.
 * Validates URL safety before fetching to prevent SSRF.
 */
export async function fetchWebsiteText(url: string): Promise<string> {
  if (!isSafeUrl(url)) return ''

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KOS/1.0; +https://konvyrt.com)',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return ''

    const html = await res.text()

    const text = html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()

    return text.substring(0, 8000)
  } catch {
    return ''
  }
}

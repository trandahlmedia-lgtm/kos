/**
 * Next.js configuration.
 * OWASP A05:2021 — Security Misconfiguration
 *
 * Security headers applied to every response. Key additions over baseline:
 *
 *   Content-Security-Policy
 *     - connect-src: locks fetch/WebSocket to same origin + Supabase
 *     - object-src 'none': blocks Flash and object-embed attacks
 *     - base-uri 'self': prevents <base> tag injection (redirects all links)
 *     - form-action 'self': form submissions only to this origin
 *     - frame-ancestors 'none': stronger than X-Frame-Options: DENY
 *     Note: script-src requires 'unsafe-inline' because Next.js App Router
 *     inlines bootstrap scripts. A nonce-based CSP would be stricter but
 *     requires significant middleware work — tracked as a future hardening item.
 *
 *   Permissions-Policy
 *     Disables browser APIs KOS never uses (camera, mic, geolocation, etc.)
 *     to reduce the blast radius of any future XSS.
 */
import type { NextConfig } from 'next'

// Read at build time — safe because NEXT_PUBLIC_ vars are intended to be
// embedded in the client bundle anyway.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// Derive WebSocket URL (wss://) from the HTTPS Supabase URL for Realtime.
const supabaseWss = supabaseHost.replace(/^https?:\/\//, 'wss://')

const csp = [
  "default-src 'self'",
  // Next.js App Router requires 'unsafe-inline' for its bootstrap scripts.
  // 'unsafe-eval' is needed by some Next.js internals in development.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Google Fonts for Inter — remove if you self-host the font.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Restrict fetch/XHR/WebSocket to own origin and Supabase.
  `connect-src 'self' ${supabaseHost} ${supabaseWss}`,
  // Allow data: URIs for generated thumbnails; blob: for file previews.
  `img-src 'self' data: blob: ${supabaseHost}`,
  // Allow blob: iframes for the visual preview modal (carousel HTML rendered via blob URL).
  "frame-src 'self' blob:",
  // Block all plugin/object embeds (Flash, Java applets, etc.).
  "object-src 'none'",
  // Prevents <base> tag injection from changing all relative link targets.
  "base-uri 'self'",
  // Form submissions must post back to this origin.
  "form-action 'self'",
  // Supercedes X-Frame-Options: DENY — no framing in any context.
  "frame-ancestors 'none'",
].join('; ')

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        // Prevent MIME-type sniffing attacks.
        { key: 'X-Content-Type-Options', value: 'nosniff' },

        // Clickjacking — belt-and-suspenders alongside frame-ancestors in CSP.
        { key: 'X-Frame-Options', value: 'DENY' },

        // Legacy XSS auditor (modern browsers ignore it, but older ones benefit).
        { key: 'X-XSS-Protection', value: '1; mode=block' },

        // Limit referrer data sent to third-party sites.
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

        // Disable browser APIs that KOS never uses.
        // Empty list () = feature disabled for all origins.
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        },

        // Content Security Policy (see comment at top of file).
        { key: 'Content-Security-Policy', value: csp },
      ],
    },
  ],
}

export default nextConfig

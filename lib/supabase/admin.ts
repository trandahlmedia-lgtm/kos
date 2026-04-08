/**
 * Supabase admin client — service role key, bypasses all RLS.
 *
 * SECURITY:
 *   - `import 'server-only'` causes a build error if this module is ever
 *     imported in a Client Component or browser bundle. Belt-and-suspenders
 *     on top of Next.js's own tree-shaking.
 *   - The service role key is read from an environment variable at runtime.
 *     It is NEVER prefixed with NEXT_PUBLIC_ and is therefore not included
 *     in the client bundle.
 *   - autoRefreshToken and persistSession are disabled because the admin
 *     client is stateless and server-side only.
 *
 * Use only for operations that must bypass RLS:
 *   - Rate limit checks (rate_limits table has no RLS policy)
 *   - Migrations / seeding (run outside normal request flow)
 */
import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Fail fast at startup if required environment variables are absent.
// A missing key would silently authenticate as anon otherwise.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. ' +
      'Add it to .env.local and restart the dev server.'
  )
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. ' +
      'Add it to .env.local and restart the dev server. ' +
      'Never prefix this key with NEXT_PUBLIC_.'
  )
}

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Disable session persistence — this client is stateless and server-only.
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

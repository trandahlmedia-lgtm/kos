import type { Platform } from '@/types'

export interface PlatformBiosInput {
  clientName: string
  claudeMd: string
  platforms: Platform[]
}

const PLATFORM_BIO_LIMITS: Record<Platform, { chars: number; notes: string }> = {
  instagram: { chars: 150, notes: 'No clickable links in bio text. Use line breaks. Include emoji sparingly. End with CTA linking to bio link.' },
  facebook: { chars: 255, notes: 'Short description shown on page. Keyword-rich but natural. Include service area and phone.' },
  linkedin: { chars: 2000, notes: 'Professional tone. Lead with the problem you solve. Include services and differentiators.' },
  tiktok: { chars: 80, notes: 'Ultra short. Punchy. One clear hook. Link in bio mention.' },
  nextdoor: { chars: 500, notes: 'Hyper-local. Neighborly and trustworthy. Service area prominent. No hashtags.' },
}

export const PLATFORM_BIOS_SYSTEM = `You are a social media copywriter for Konvyrt Marketing. Your job is to write platform-optimized bios for a home service business client.

Rules:
1. Read the brand document — voice, tone, and differentiators must come through in each bio
2. Respect each platform's character limits strictly
3. Include the service area naturally — "serving [city/area]" not just the name
4. Always include a clear CTA (phone number, "book online", etc.)
5. Match the platform's culture (Instagram = punchy, LinkedIn = professional, Nextdoor = neighborly)
6. Return ONLY valid JSON — no markdown, no code fences`

export function buildPlatformBiosPrompt(input: PlatformBiosInput): string {
  const platformDetails = input.platforms
    .map((p) => {
      const limits = PLATFORM_BIO_LIMITS[p]
      return `- ${p}: ${limits.chars} chars max. ${limits.notes}`
    })
    .join('\n')

  const exampleOutput = Object.fromEntries(
    input.platforms.map((p) => [p, 'bio text here'])
  )

  return `Generate platform bios for ${input.clientName}.

Platforms to generate (with character limits and notes):
${platformDetails}

Brand document:
${input.claudeMd}

Respond with this exact JSON structure and nothing else:
${JSON.stringify(exampleOutput, null, 2)}`
}

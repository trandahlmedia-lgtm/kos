import type { Platform, ContentType } from '@/types'

export interface CaptionInput {
  clientName: string
  claudeMd: string
  platform: Platform
  contentType: ContentType
  format: 'static' | 'reel' | 'story'
  angle: string
  captionBrief: string
}

export const CAPTIONS_SYSTEM = `You are a social media copywriter for Konvyrt Marketing, specializing in home service businesses. You write compelling, on-brand captions that convert followers into booked customers.

Rules:
1. Read the brand document carefully before writing a single word — every caption must reflect this specific client's voice, not generic marketing language
2. Pull exact pain points from the brand doc and speak directly to them
3. CTA must be specific and from the brand doc — "Call (612) 655-3370 for a free estimate" not "Learn More"
4. Include the client's phone number in every caption if their brand doc has one
5. Never use phrases listed in the client's "Things to Avoid" section
6. Platform-specific formatting:
   - Instagram: punchy opening line, conversational body, 15-20 relevant hashtags
   - Facebook: longer is fine, local and conversational tone, 3-5 hashtags max
   - TikTok: short and punchy, hook in first 2 words, trending-format aware, minimal hashtags
   - Nextdoor: hyper-local, neighborly tone, no hashtags
   - LinkedIn: professional, benefit-forward, no hashtags needed
   - Stories: 1-2 lines MAX, direct CTA only
7. Return ONLY valid JSON — no markdown, no code fences, no explanation`

const PLATFORM_AUDIENCE: Partial<Record<Platform, string>> = {
  instagram: 'Younger homeowners and renters (28–42), visual-first, lifestyle-oriented — use punchy hooks and a conversational tone',
  facebook: 'Older homeowners (45–65), community-minded, local trust signals matter — longer form is fine, lean into reliability and experience',
  tiktok: 'Young adults (18–35), casual and trend-aware — hook in first 2 words, entertainment-first, keep it short',
  linkedin: 'Business professionals and property managers — credibility-forward, benefit-led, more formal tone',
  nextdoor: 'Local homeowners in the service area — hyper-local and neighborly, community trust is everything, no hype',
}

export function buildCaptionsPrompt(input: CaptionInput): string {
  const audienceNote = PLATFORM_AUDIENCE[input.platform]

  return `Generate 3 caption options for this post.

Client: ${input.clientName}
Platform: ${input.platform}${audienceNote ? `\nPlatform audience: ${audienceNote}` : ''}
Content type: ${input.contentType.replace(/_/g, ' ')}
Format: ${input.format}
Angle: ${input.angle}
Caption brief: ${input.captionBrief}

Brand document:
${input.claudeMd}

Respond with this exact JSON structure and nothing else:
{
  "best_caption": {
    "content": "The full caption text exactly as it should be posted",
    "cta": "The specific call to action",
    "hashtags": "#hashtag1 #hashtag2 #hashtag3"
  },
  "alternative_1": {
    "content": "Different angle, same brief",
    "cta": "The specific call to action",
    "hashtags": "#hashtag1 #hashtag2 #hashtag3"
  },
  "alternative_2": {
    "content": "Third option — different hook or structure",
    "cta": "The specific call to action",
    "hashtags": "#hashtag1 #hashtag2 #hashtag3"
  }
}`
}

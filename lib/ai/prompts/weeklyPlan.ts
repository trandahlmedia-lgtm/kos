import type { Platform } from '@/types'

export interface WeeklyPlanInput {
  clientName: string
  claudeMd: string
  weekStartDate: string // YYYY-MM-DD (Monday)
  platforms: Platform[]
  postCount?: number // default 5
}

export const WEEKLY_PLAN_SYSTEM = `You are a social media content strategist for Konvyrt Marketing, a digital marketing agency specializing in home service businesses.

Your job is to generate a balanced, strategic weekly content plan for a client. You will be given their brand document which contains their services, target audience, voice/tone, content pillars, and platform details.

Rules:
1. Read the brand document carefully — every post angle must be rooted in this client's specific services and audience
2. Balance content types across the week — never use the same content_type twice in a row, and avoid more than 2 of the same type per week
3. Account for the current season based on the week start date provided
4. Prioritize pain points, dream jobs, and current offers from the brand doc
5. Suggested post times should be optimal for home service audiences (early morning 7-8am, lunch 12pm, or evening 6-7pm)
6. Cross-post to all active platforms by default — choose the primary platform that best fits the format
7. Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON
8. Choose format and placement for each post based on the content type and angle:
   - "carousel" for educational content, step-by-step guides, before/after comparisons, feature lists, and multi-point storytelling
   - "static" for single impactful images, offers, quotes, simple announcements
   - "feed" placement for content that should live permanently on the profile grid
   - "story" placement for time-sensitive content, behind-the-scenes, quick polls, ephemeral updates

Content types available: offer, seasonal, trust, differentiator, social_proof, education, bts, before_after
Formats available: carousel, static
Placements available: feed, story`

export function buildWeeklyPlanPrompt(input: WeeklyPlanInput): string {
  const postCount = input.postCount ?? 5
  const platformList = input.platforms.join(', ')

  return `Generate a weekly content plan for ${input.clientName}.

Week starting: ${input.weekStartDate}
Posts to generate: ${postCount}
Active platforms: ${platformList}

Choose the best-fit primary platform per post from the active platforms list. Set cross_post_platforms to include all active platforms that make sense for that format (carousels for Instagram/Facebook, static posts for all platforms, stories for Instagram/Facebook/TikTok).

Brand document:
${input.claudeMd}

Respond with this exact JSON structure and nothing else:
{
  "posts": [
    {
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "platform": "instagram",
      "cross_post_platforms": ["instagram", "facebook"],
      "content_type": "trust",
      "format": "carousel",
      "placement": "feed",
      "angle": "Specific 1-2 sentence description of what to create — e.g. 'Before/after of a furnace install showing clean ductwork and the tech's professionalism'",
      "caption_brief": "Key points the caption must hit — pain points to address, offer to highlight, tone notes",
      "ai_reasoning": "One sentence: why this angle on this day for this client"
    }
  ]
}`
}

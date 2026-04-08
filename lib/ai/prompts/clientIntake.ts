export interface ClientIntakeInput {
  companyName: string
  websiteContent: string // scraped HTML/text from the website
  websiteUrl?: string
}

export const CLIENT_INTAKE_SYSTEM = `You are a business analyst for Konvyrt Marketing, a digital marketing agency specializing in home service businesses. Your job is to analyze a business's website and extract structured data to pre-fill a new client profile.

Extract everything you can find. If something is not clearly stated, make a reasonable inference and flag it with "confidence": "low". If something is completely absent, set it to null.

Tiers and pricing:
- starter: $1,750/mo — new to social, no existing presence, needs foundation
- growth: $3,250/mo — has some presence but inconsistent, needs strategy and volume
- full_service: $3,000/mo — wants the full package including filming
- basic: $750/mo — very limited scope

Recommend the tier based on what you find about their current social presence and apparent business maturity.

Return ONLY valid JSON — no markdown, no code fences, no explanation.`

export function buildClientIntakePrompt(input: ClientIntakeInput): string {
  const websiteSection = input.websiteContent.trim()
    ? `Website content (${input.websiteUrl ?? 'scraped'}):\n${input.websiteContent.substring(0, 8000)}`
    : 'Website: Not available or unreachable'

  return `Analyze this business and extract structured profile data.

Company name: ${input.companyName}
${websiteSection}

Respond with this exact JSON structure:
{
  "name": "confirmed or cleaned company name",
  "industry": "HVAC | Plumbing | Electrical | Roofing | Painting | Landscaping | Other",
  "services": ["service 1", "service 2"],
  "service_area": "City, State or region",
  "phone": "raw digits only or null",
  "email": "email or null",
  "website": "clean URL or null",
  "social_links": {
    "instagram": "URL or null",
    "facebook": "URL or null",
    "linkedin": "URL or null",
    "tiktok": "URL or null"
  },
  "recommended_tier": "starter | growth | full_service | basic",
  "tier_reasoning": "2-3 sentence explanation of why this tier fits",
  "estimated_mrr": 1750,
  "confidence": {
    "overall": "high | medium | low",
    "notes": "Any fields that were inferred rather than explicitly stated"
  },
  "existing_social_presence": {
    "summary": "Brief description of their current social media situation",
    "last_active": "platform name and approximate date or null",
    "follower_estimate": "rough estimate or null"
  },
  "flags": ["Any warnings: template site, unverified social links, missing info, etc."]
}`
}

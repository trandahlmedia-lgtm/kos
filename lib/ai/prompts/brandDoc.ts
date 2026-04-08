export interface BrandDocInput {
  companyName: string
  industry: string
  services: string
  serviceArea: string
  audience: string
  voiceTone: string
  differentiators: string
  competitors: string
  phone?: string
  email?: string
  website?: string
  socialLinks?: string
  additionalNotes?: string
}

export const BRAND_DOC_SYSTEM = `You are a brand strategist for Konvyrt Marketing, a digital marketing agency specializing in home service businesses. Your job is to generate a comprehensive brand document (CLAUDE.md) that will be used by AI agents to generate all future content for this client.

The document must be:
- Specific and actionable — not generic marketing speak
- Rooted in the client's actual services and audience
- Written in a way that another AI can read it and immediately write on-brand content
- Formatted in Markdown

Include these sections:
1. Business Overview (name, industry, service area, contact info)
2. Services Offered (bullet list, specific)
3. Target Audience (who they are, what they care about, what keeps them up at night)
4. Pain Points (the specific problems this client's customers face — be concrete)
5. Voice & Tone (how the brand speaks — adjectives, examples of what to say vs. what to avoid)
6. Content Pillars (the recurring themes for social content — 4-6 pillars)
7. Key Differentiators (what makes this client better than competitors)
8. Dream Jobs (the work they most want to be known for)
9. Offers & Promotions (current offers, seasonal promos, pricing philosophy)
10. CTAs (specific calls to action with phone number format, booking URL, etc.)
11. Things to Avoid (phrases, tones, content types that are off-brand)
12. Platform Notes (any platform-specific guidance)

Return only the Markdown document — no introduction, no explanation.`

export function buildBrandDocPrompt(input: BrandDocInput): string {
  return `Generate a complete CLAUDE.md brand document for this client.

Company: ${input.companyName}
Industry: ${input.industry}
Services: ${input.services}
Service Area: ${input.serviceArea}
Target Audience: ${input.audience}
Voice & Tone: ${input.voiceTone}
Key Differentiators: ${input.differentiators}
Competitors: ${input.competitors}${input.phone ? `\nPhone: ${input.phone}` : ''}${input.email ? `\nEmail: ${input.email}` : ''}${input.website ? `\nWebsite: ${input.website}` : ''}${input.socialLinks ? `\nSocial Links: ${input.socialLinks}` : ''}${input.additionalNotes ? `\nAdditional Notes: ${input.additionalNotes}` : ''}

Generate the full CLAUDE.md document now. Return only the Markdown — no preamble.`
}

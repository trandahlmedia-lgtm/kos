// ---------------------------------------------------------------------------
// Outreach Email Drafting Prompts
// Sonnet for initial full sequence, Haiku for single re-drafts
// ---------------------------------------------------------------------------

export const OUTREACH_EMAIL_SYSTEM = `You are a cold email copywriter for Konvyrt Marketing, a digital marketing agency for home service businesses in the Twin Cities and Duluth, Minnesota.

You write short, direct cold emails that feel personal — not templated. You reference specific findings about the prospect's business to show you've done your homework.

Rules:
- 4-6 sentences max per email. Short paragraphs.
- Never mention AI, research agents, scoring, or automation.
- Never use false urgency, misleading subjects, or clickbait.
- Reference specific findings: their website quality, social presence, review count, missing CTAs, etc.
- Use Konvyrt's real pricing ranges when hinting at value — never make up numbers.
- Sign as "Jay Trandahl, Konvyrt Marketing"
- Include the placeholder {{unsubscribe_link}} at the bottom of every email.
- Include the placeholder {{business_address}} at the bottom of every email.
- Keep the tone professional but conversational — like a real person reaching out, not a marketing blast.

Konvyrt's actual pricing:
- Websites: $1,000 (basic) to $2,500 (full build). Build fee can be spread over 3 months.
- Social Media: $750/mo (basic — 2 posts/week, scheduling, analytics) to $3,500/mo (full service — filming, brand kit, strategy, content creation)
- Brand Kit: $400-$800 standalone
- Content Filming: $400-$600/half-day
- Bundles: Starter ~$1,750/mo, Growth $3,000-$3,500/mo, Full Stack custom

Do NOT quote exact prices in cold emails. Instead hint at value: "affordable", "we structure builds so there's no big upfront cost", "packages that fit different budgets", etc. Save exact pricing for the conversation.`

export function buildOutreachSequencePrompt(params: {
  businessName: string
  industry: string | null
  serviceArea: string | null
  website: string | null
  hasWebsite: boolean
  reviewCount: number | null
  rating: number | null
  aiScore: number | null
  recommendedTier: string | null
  recommendedMrr: number | null
  researchReport: string | null
  websiteFindings: string[]
  socialFindings: string[]
  primaryOpportunity: string | null
  quickWins: string[]
}): string {
  const {
    businessName,
    industry,
    serviceArea,
    website,
    hasWebsite,
    reviewCount,
    rating,
    aiScore,
    recommendedTier,
    researchReport,
    websiteFindings,
    socialFindings,
    primaryOpportunity,
    quickWins,
  } = params

  return `Draft a complete cold email sequence (initial + 3 follow-ups) for this prospect.

PROSPECT:
- Business: ${businessName}
- Industry: ${industry ?? 'home services'}
- Area: ${serviceArea ?? 'Twin Cities, MN'}
- Website: ${website ?? 'none'}
- Has website: ${hasWebsite}
- Google reviews: ${reviewCount ?? 'unknown'} (rating: ${rating ?? 'unknown'}/5)
- Our AI score: ${aiScore ?? 'unknown'}/100
- Recommended tier: ${recommendedTier ?? 'unknown'}

RESEARCH FINDINGS:
Website issues: ${websiteFindings.length > 0 ? websiteFindings.join('; ') : 'no data'}
Social issues: ${socialFindings.length > 0 ? socialFindings.join('; ') : 'no data'}
Primary opportunity: ${primaryOpportunity ?? 'general digital presence improvement'}
Quick wins: ${quickWins.length > 0 ? quickWins.join('; ') : 'none identified'}

${researchReport ? `FULL RESEARCH SUMMARY:\n${researchReport.substring(0, 3000)}` : ''}

EMAIL SEQUENCE STRATEGY:
- Initial: Lead with the most compelling finding. Show you looked at their business specifically. Soft CTA — "Would it make sense to chat for 15 minutes?"
- Follow-up 1 (sent 3 days later): Different angle — social proof or a quick win you could deliver. "Just circling back..."
- Follow-up 2 (sent 7 days after initial): Specific opportunity they're missing. More direct CTA.
- Follow-up 3 (sent 14 days after initial): Last touch. Brief, respectful. "If the timing isn't right, no worries."

Return ONLY this JSON, no other text:
{
  "initial": {
    "subject": "<subject line — specific to their business, not generic>",
    "body_text": "<plain text email body>",
    "body_html": "<simple HTML email — use <p> tags, <br>, <a> for links. No fancy styling. Include \\n{{business_address}}\\n{{unsubscribe_link}} at the bottom>"
  },
  "followup_1": {
    "subject": "<Re: [initial subject] or new subject>",
    "body_text": "<plain text>",
    "body_html": "<simple HTML>"
  },
  "followup_2": {
    "subject": "<subject>",
    "body_text": "<plain text>",
    "body_html": "<simple HTML>"
  },
  "followup_3": {
    "subject": "<subject>",
    "body_text": "<plain text>",
    "body_html": "<simple HTML>"
  }
}`
}

// ---------------------------------------------------------------------------
// Single email re-draft (Haiku) — used when Jay edits and wants a fresh take
// ---------------------------------------------------------------------------

export const REDRAFT_EMAIL_SYSTEM = `You are a cold email copywriter for Konvyrt Marketing. Rewrite the given email based on Jay's direction. Keep it short (4-6 sentences), personal, and specific to the prospect's business. Sign as "Jay Trandahl, Konvyrt Marketing". Include {{unsubscribe_link}} and {{business_address}} placeholders at the bottom of HTML emails.`

export function buildRedraftPrompt(params: {
  businessName: string
  currentSubject: string
  currentBody: string
  direction: string
}): string {
  const { businessName, currentSubject, currentBody, direction } = params

  return `Rewrite this cold email for ${businessName}.

Current subject: ${currentSubject}
Current body:
${currentBody}

Jay's direction: ${direction}

Return ONLY this JSON:
{
  "subject": "<new subject>",
  "body_text": "<plain text>",
  "body_html": "<simple HTML with {{unsubscribe_link}} and {{business_address}} at bottom>"
}`
}

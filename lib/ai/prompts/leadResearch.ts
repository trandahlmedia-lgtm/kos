// ---------------------------------------------------------------------------
// Lead Research Agent — Prompts
// 5 Haiku sub-agents + 1 Sonnet orchestrator
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-agent 1: Website Auditor
// ---------------------------------------------------------------------------

export const WEBSITE_AUDITOR_SYSTEM = `You are a digital marketing analyst auditing a home service business website for Konvyrt Marketing.
Konvyrt is a full-service digital marketing agency that builds brands, manages social media, runs paid ads, and creates content for home service companies.
Your job is to evaluate the website and return a structured JSON audit. Be honest and specific. If there is no website, say so.`

export function buildWebsiteAuditorPrompt(params: {
  businessName: string
  website: string | null
  websiteContent: string
}): string {
  const { businessName, website, websiteContent } = params

  if (!website || !websiteContent) {
    return `Business: ${businessName}
Website: None provided or unreachable.

Return this JSON (has_website: false):
{
  "score": 0,
  "has_website": false,
  "design_quality": "none",
  "content_quality": "none",
  "has_cta": false,
  "seo_basics": false,
  "mobile_notes": "no website",
  "findings": ["No website found — high opportunity for Konvyrt to build one"],
  "recommendations": ["Build a professional website as first priority"]
}`
  }

  return `Business: ${businessName}
Website URL: ${website}

Website Content (scraped text):
---
${websiteContent}
---

Audit this website for a home service business. Score it 0-100 where 0 = no website / terrible, 100 = best-in-class.
Higher score = better existing presence (less opportunity for us). Lower score = worse presence (more opportunity for us to help).

Return ONLY this JSON, no other text:
{
  "score": <0-100 integer>,
  "has_website": true,
  "design_quality": "<none|poor|basic|good|excellent>",
  "content_quality": "<none|poor|basic|good|excellent>",
  "has_cta": <true|false>,
  "seo_basics": <true|false — has title, meta desc, location keywords>,
  "mobile_notes": "<brief note on mobile friendliness based on content>",
  "findings": ["<specific finding 1>", "<specific finding 2>", ...],
  "recommendations": ["<specific recommendation 1>", "<specific recommendation 2>", ...]
}`
}

// ---------------------------------------------------------------------------
// Sub-agent 2: Social Media Auditor
// ---------------------------------------------------------------------------

export const SOCIAL_AUDITOR_SYSTEM = `You are a social media analyst auditing a home service business's social presence for Konvyrt Marketing.
Konvyrt manages Instagram, Facebook, TikTok, and Google Business for home service companies.
Evaluate the social presence based on what handles/URLs were provided. Be realistic — most home service businesses have poor or nonexistent social presence.`

export function buildSocialAuditorPrompt(params: {
  businessName: string
  instagramHandle: string | null
  facebookUrl: string | null
  googleBusinessUrl: string | null
}): string {
  const { businessName, instagramHandle, facebookUrl, googleBusinessUrl } = params

  return `Business: ${businessName}
Instagram: ${instagramHandle ?? 'none provided'}
Facebook: ${facebookUrl ?? 'none provided'}
Google Business: ${googleBusinessUrl ?? 'none provided'}

Analyze the social presence for this home service business.
Score 0-100 where 0 = no presence, 100 = highly active across all platforms.
Higher score = stronger existing presence. Lower score = more opportunity for Konvyrt.

Return ONLY this JSON, no other text:
{
  "overall_score": <0-100 integer>,
  "platforms": {
    "instagram": {
      "handle": ${instagramHandle ? `"${instagramHandle}"` : 'null'},
      "exists": <true|false>,
      "estimated_activity": "<none|inactive|sporadic|active|very_active>",
      "notes": "<brief note>"
    },
    "facebook": {
      "url": ${facebookUrl ? `"${facebookUrl}"` : 'null'},
      "exists": <true|false>,
      "estimated_activity": "<none|inactive|sporadic|active|very_active>",
      "notes": "<brief note>"
    },
    "google": {
      "url": ${googleBusinessUrl ? `"${googleBusinessUrl}"` : 'null'},
      "exists": <true|false>,
      "has_reviews": <true|false — infer from url if possible>,
      "notes": "<brief note>"
    }
  },
  "posting_consistency": "<none|irregular|weekly|daily>",
  "content_quality": "<none|poor|basic|good|excellent>",
  "engagement_indicators": "<none|low|medium|high>",
  "findings": ["<finding 1>", "<finding 2>", ...]
}`
}

// ---------------------------------------------------------------------------
// Sub-agent 3: Business Intelligence
// ---------------------------------------------------------------------------

export const BUSINESS_INTEL_SYSTEM = `You are a business analyst helping Konvyrt Marketing evaluate a potential home service client.
Use all available data points to estimate the business's size, health, and growth stage.
Be honest and realistic. Infer from context when direct data is unavailable.`

export function buildBusinessIntelPrompt(params: {
  businessName: string
  industry: string | null
  serviceArea: string | null
  jobsPerWeek: number | null
  yearsInBusiness: number | null
  websiteContent: string
  websiteScore: number
  socialScore: number
}): string {
  const { businessName, industry, serviceArea, jobsPerWeek, yearsInBusiness, websiteContent, websiteScore, socialScore } = params

  return `Business: ${businessName}
Industry: ${industry ?? 'home services (unspecified)'}
Service Area: ${serviceArea ?? 'unknown'}
Jobs Per Week: ${jobsPerWeek ?? 'unknown'}
Years in Business: ${yearsInBusiness ?? 'unknown'}
Website Score: ${websiteScore}/100
Social Score: ${socialScore}/100
Website Content Summary: ${websiteContent ? websiteContent.substring(0, 2000) : 'none'}

Estimate the business health and size for Konvyrt Marketing's qualification purposes.

Return ONLY this JSON, no other text:
{
  "estimated_annual_revenue_range": "<e.g. $200k-$500k>",
  "business_size": "<solo|micro|small|medium>",
  "growth_stage": "<startup|early|established|mature>",
  "market_notes": "<1-2 sentences about their market position>",
  "competitive_position": "<weak|average|strong — relative to other home service cos in their area>"
}`
}

// ---------------------------------------------------------------------------
// Sub-agent 4: Service Fit Analyzer
// ---------------------------------------------------------------------------

export const SERVICE_FIT_SYSTEM = `You are a strategy consultant for Konvyrt Marketing, a digital marketing agency serving home service companies.
Konvyrt's services: brand identity, website design & development, social media management, paid advertising (Meta/TikTok), content filming & editing.
Analyze which services are the best fit for this specific lead and why.`

export function buildServiceFitPrompt(params: {
  businessName: string
  websiteAudit: Record<string, unknown>
  socialAudit: Record<string, unknown>
  businessIntel: Record<string, unknown>
}): string {
  const { businessName, websiteAudit, socialAudit, businessIntel } = params

  return `Business: ${businessName}

Website Audit: ${JSON.stringify(websiteAudit)}
Social Audit: ${JSON.stringify(socialAudit)}
Business Intelligence: ${JSON.stringify(businessIntel)}

Based on all data above, identify which Konvyrt services are the best fit and prioritize them.
Konvyrt services: website design & development, brand identity, social media management, paid advertising (Meta/TikTok), content filming & editing.

Return ONLY this JSON, no other text:
{
  "services": [
    {
      "name": "<service name>",
      "priority": "<high|medium|low>",
      "rationale": "<one sentence why>",
      "estimated_effort": "<low|medium|high>"
    }
  ],
  "primary_opportunity": "<one sentence — what's the biggest opportunity with this lead>",
  "quick_wins": ["<thing that would make immediate impact>", ...]
}`
}

// ---------------------------------------------------------------------------
// Sub-agent 5: Pricing Recommender
// ---------------------------------------------------------------------------

export const PRICING_RECOMMENDER_SYSTEM = `You are a pricing strategist for Konvyrt Marketing.

IMPORTANT: Jay sells websites FIRST as a one-time project, THEN pitches monthly retainer services after trust is built. These are two separate sales conversations. You must recommend both tiers independently.

Konvyrt's EXACT pricing (do not make up numbers):

WEBSITES (one-time build fee):
- Basic: $1,000 — 3-4 pages (Homepage, Services, Contact). Clean design, mobile-optimized, no custom integrations.
- Standard: $1,500 — 5-7 pages, pricing pages, service sub-pages, basic integrations (booking link, contact form).
- Full Build: $2,000-$2,500 — Custom design from scratch, full brand alignment, multiple service pages, booking integrations, contact API, SEO-ready, fully wireframed to convert.
- Every build includes: research, wireframe, design, development, mobile responsiveness, contact form, basic SEO structure.
- Build fee can be spread across first 3 months of a retainer ($333-$833/mo added).

SOCIAL MEDIA / MONTHLY RETAINER:
- Basic: $750/mo — 2 static posts/week, Reels editing from client footage, captions, scheduling, monthly analytics. Does NOT include filming, brand kit, or ads.
- Full Service: $2,500-$3,500/mo — Everything in Basic PLUS brand kit, monthly filming session, scripted content, platform expansion, strategy, ongoing consulting, analytics with context. Reference: Northern Standard at $3,000/mo.

ADD-ONS:
- Brand Kit: $400-$800 (included in Full Service and Full Build websites)
- Content Filming: $400-$600/half-day, $800-$1,200/full-day (included in Full Service retainer)
- Paid Ads: 5-10% of attributed revenue, $20/day min spend — only after 2-3 months of organic presence

BUNDLES:
- Starter: ~$1,750/mo — Basic website + Basic social (build spread over 3 months)
- Growth: $3,000-$3,500/mo — Standard website + Full Service social
- Full Stack: Custom — Full Build + Full Service + Ads

Be realistic. Not every lead needs Full Build or Full Service. Match the tier to their actual business size and needs.`

export function buildPricingRecommenderPrompt(params: {
  businessName: string
  websiteAudit: Record<string, unknown>
  socialAudit: Record<string, unknown>
  businessIntel: Record<string, unknown>
  serviceFit: Record<string, unknown>
}): string {
  const { businessName, websiteAudit, socialAudit, businessIntel, serviceFit } = params

  return `Business: ${businessName}

Website Audit: ${JSON.stringify(websiteAudit)}
Social Audit: ${JSON.stringify(socialAudit)}
Business Intelligence: ${JSON.stringify(businessIntel)}
Service Fit: ${JSON.stringify(serviceFit)}

Recommend BOTH a website tier AND a retainer tier for this lead, as two separate sales.
If the lead already has a good website, the website_tier can still recommend improvements or a rebuild — use your judgment.

Return ONLY this JSON, no other text:
{
  "website_tier": {
    "tier_name": "<basic|standard|full_build>",
    "price_low": <integer — e.g. 1000>,
    "price_high": <integer — e.g. 1000 for Basic, 2500 for Full Build>,
    "rationale": "<one sentence why this tier fits their business>",
    "includes": "<what they get — e.g. '5-7 pages, booking integration, service sub-pages'>"
  },
  "retainer_tier": {
    "tier_name": "<basic|full_service>",
    "monthly_low": <integer — e.g. 750>,
    "monthly_high": <integer — e.g. 750 for Basic, 3500 for Full Service>,
    "rationale": "<one sentence why — tied to their specific social/marketing gaps>",
    "includes": "<what they get — e.g. '2 posts/week, Reels editing, scheduling'>"
  },
  "recommended_bundle": "<starter|growth|full_stack>",
  "negotiation_notes": "<pricing sensitivity, objections to expect, or upsell path>",
  "build_fee_note": "<suggest spreading build fee into retainer if appropriate, e.g. '$500/mo for 3 months'>"
}`
}

// ---------------------------------------------------------------------------
// Orchestrator: Synthesis Prompt (Sonnet)
// ---------------------------------------------------------------------------

export const ORCHESTRATOR_SYSTEM = `You are a senior marketing strategist at Konvyrt Marketing writing a lead research report.
Konvyrt is a full-service digital marketing agency for home service companies in the Twin Cities and surrounding areas.
Your report will be read by Jay and Dylan (co-owners) when evaluating whether to pitch this lead.
Be direct, specific, and actionable. No fluff.`

export function buildOrchestratorPrompt(params: {
  businessName: string
  websiteAudit: Record<string, unknown>
  socialAudit: Record<string, unknown>
  businessIntel: Record<string, unknown>
  serviceFit: Record<string, unknown>
  pricingAnalysis: Record<string, unknown>
}): string {
  const { businessName, websiteAudit, socialAudit, businessIntel, serviceFit, pricingAnalysis } = params

  return `You have completed a full research pass on this lead. Write a comprehensive report.

Business: ${businessName}

--- RESEARCH DATA ---
Website Audit: ${JSON.stringify(websiteAudit)}
Social Audit: ${JSON.stringify(socialAudit)}
Business Intelligence: ${JSON.stringify(businessIntel)}
Service Fit: ${JSON.stringify(serviceFit)}
Pricing Analysis: ${JSON.stringify(pricingAnalysis)}

IMPORTANT: Jay sells websites FIRST (one-time project), then pitches monthly retainer AFTER trust is built. Structure the recommendation accordingly.

Write a markdown report with these sections:

## Executive Summary
2-3 sentences. Is this a good lead? Why?

## Online Presence
What does their digital footprint look like? Website, social, Google — what's weak, what's working?

## Business Health
Size, revenue estimate, growth stage, competitive position.

## Opportunity for Konvyrt
What services are the best fit? What's the primary opportunity? What are quick wins we can pitch?

## The Website Sale (Pitch First)
Website tier recommendation, price, what it includes, and why it fits. This is the door-opener.

## The Monthly Retainer (Pitch After Website)
Retainer tier, monthly price range, what it includes, and what gaps it fills. This is the long-term revenue play.

## Recommended Approach
How should Jay approach this pitch? What pain points to lead with? Any objections to prepare for? Should the build fee be spread into the retainer?

## Score Breakdown
- Online Presence (40%): X/40
- Business Health (30%): X/30
- Ad Readiness (20%): X/20
- Service Fit (10%): X/10
- **Total: XX/100**

Keep it tight. No marketing speak. Write like you're briefing a colleague before a sales call.`
}

// ---------------------------------------------------------------------------
// Score calculator
// ---------------------------------------------------------------------------

export function calculateOverallScore(params: {
  websiteScore: number
  socialScore: number
  businessIntel: Record<string, unknown>
  serviceFit: Record<string, unknown>
  pricingAnalysis: Record<string, unknown>
}): number {
  const { websiteScore, socialScore, businessIntel, serviceFit } = params

  // Online presence (40%): invert website + social — lower presence = higher opportunity score
  const presenceScore = Math.round(((100 - websiteScore) * 0.5 + (100 - socialScore) * 0.5) * 0.4)

  // Business health (30%): based on growth stage + size
  const growthStage = businessIntel.growth_stage as string | undefined
  const size = businessIntel.business_size as string | undefined
  const healthMap: Record<string, number> = {
    startup: 50, early: 65, established: 80, mature: 70,
  }
  const sizeMap: Record<string, number> = {
    solo: 55, micro: 65, small: 80, medium: 90,
  }
  const healthRaw = ((healthMap[growthStage ?? ''] ?? 65) + (sizeMap[size ?? ''] ?? 65)) / 2
  const healthScore = Math.round(healthRaw * 0.3)

  // Ad readiness (20%): website exists + has cta = they spend money
  // Use website score as proxy
  const adReadiness = websiteScore > 30 ? 70 : 40
  const adScore = Math.round(adReadiness * 0.2)

  // Service fit (10%): count high-priority services
  const services = (serviceFit.services as Array<{ priority: string }> | undefined) ?? []
  const highPriority = services.filter((s) => s.priority === 'high').length
  const fitRaw = Math.min(100, 40 + highPriority * 20)
  const fitScore = Math.round(fitRaw * 0.1)

  return Math.min(100, presenceScore + healthScore + adScore + fitScore)
}

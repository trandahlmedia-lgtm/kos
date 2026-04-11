export const SUGGEST_ANGLE_SYSTEM = `You are a content strategist for a home services marketing agency. Your job is to suggest specific, actionable content angles for social media posts.

Good angles are specific and concrete:
- "Spring AC tune-up — why waiting until summer costs more"
- "3 signs your furnace filter is overdue"
- "What happens when you skip annual maintenance: a real customer story"

Bad angles are vague and generic:
- "HVAC tips"
- "Why choose us"
- "Home services advice"

Return ONLY the angle as a plain text string — nothing else. No quotes, no explanation, no preamble.`

const CONTENT_TYPE_GUIDANCE: Record<string, string> = {
  education:      'The angle should teach the audience something useful — a tip, a fact, or a how-to.',
  differentiator: 'The angle should highlight what makes this company better or different from competitors.',
  social_proof:   'The angle should feature a customer story, review, or real outcome.',
  trust:          'The angle should build credibility — company values, guarantees, team expertise, or track record.',
  before_after:   'The angle should showcase a visible transformation or project result.',
  bts:            'The angle should give a behind-the-scenes look at the process, team, or daily work.',
  seasonal:       'The angle should connect to the current season, upcoming holiday, or a time-sensitive topic.',
  offer:          'The angle should promote a specific deal, discount, or limited-time offer.',
}

export function buildSuggestAnglePrompt({
  claudeMd,
  scheduledDate,
  existingAngles,
  contentType,
}: {
  claudeMd: string
  scheduledDate: string
  existingAngles: string[]
  contentType?: string
}): string {
  const avoidSection =
    existingAngles.length > 0
      ? `Avoid these angles already scheduled this month:\n${existingAngles.map((a) => `- ${a}`).join('\n')}\n\n`
      : ''

  const contentTypeGuidance = contentType && CONTENT_TYPE_GUIDANCE[contentType]
    ? `Content type: ${contentType.replace(/_/g, ' ')}\nAngle direction: ${CONTENT_TYPE_GUIDANCE[contentType]}\n\n`
    : ''

  return `Here is the client's brand document:\n\n${claudeMd}\n\n${contentTypeGuidance}${avoidSection}Suggest ONE specific content angle for a post scheduled on ${scheduledDate}.`
}

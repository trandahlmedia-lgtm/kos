import type { FontPair } from '@/types'

const HEADING_WEIGHTS = [300, 400, 600, 700, 800, 900]
const BODY_WEIGHTS = [300, 400, 600, 700]
const BODY_ITALIC_WEIGHTS = [400]

function encodeFamilyParam(name: string, weights: number[]): string {
  const encoded = name.replace(/ /g, '+')
  const weightStr = weights.sort((a, b) => a - b).join(';')
  return `family=${encoded}:wght@${weightStr}`
}

function encodeBodyFamilyParam(
  name: string,
  weights: number[],
  italicWeights: number[]
): string {
  const encoded = name.replace(/ /g, '+')
  const entries: string[] = []
  for (const w of [...weights].sort((a, b) => a - b)) {
    entries.push(`0,${w}`)
  }
  for (const w of [...italicWeights].sort((a, b) => a - b)) {
    entries.push(`1,${w}`)
  }
  return `family=${encoded}:ital,wght@${entries.join(';')}`
}

export function buildFontUrl(fontPair: FontPair): string {
  const base = 'https://fonts.googleapis.com/css2'

  if (fontPair.heading === fontPair.body) {
    // Combine all weights into one family request with italic support
    const allWeights = [...new Set([...HEADING_WEIGHTS, ...BODY_WEIGHTS])]
    const param = encodeBodyFamilyParam(fontPair.heading, allWeights, BODY_ITALIC_WEIGHTS)
    return `${base}?${param}&display=swap`
  }

  const headingParam = encodeFamilyParam(fontPair.heading, HEADING_WEIGHTS)
  const bodyParam = encodeBodyFamilyParam(fontPair.body, BODY_WEIGHTS, BODY_ITALIC_WEIGHTS)
  return `${base}?${headingParam}&${bodyParam}&display=swap`
}

export function fontCssClasses(fontPair: FontPair): string {
  return `.serif { font-family: '${fontPair.heading}', sans-serif; }\n.sans { font-family: '${fontPair.body}', sans-serif; }`
}

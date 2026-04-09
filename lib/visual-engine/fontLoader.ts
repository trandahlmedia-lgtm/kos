import type { FontPair } from '@/types'

const HEADING_WEIGHTS = [300, 600, 700, 800, 900]
const BODY_WEIGHTS = [300, 400, 500, 600]

function encodeFamilyParam(name: string, weights: number[]): string {
  const encoded = name.replace(/ /g, '+')
  const weightStr = weights.sort((a, b) => a - b).join(';')
  return `family=${encoded}:wght@${weightStr}`
}

export function buildFontUrl(fontPair: FontPair): string {
  const base = 'https://fonts.googleapis.com/css2'

  if (fontPair.heading === fontPair.body) {
    // Combine all weights into one family request
    const allWeights = [...new Set([...HEADING_WEIGHTS, ...BODY_WEIGHTS])]
    const param = encodeFamilyParam(fontPair.heading, allWeights)
    return `${base}?${param}&display=swap`
  }

  const headingParam = encodeFamilyParam(fontPair.heading, HEADING_WEIGHTS)
  const bodyParam = encodeFamilyParam(fontPair.body, BODY_WEIGHTS)
  return `${base}?${headingParam}&${bodyParam}&display=swap`
}

export function fontCssClasses(fontPair: FontPair): string {
  return `.serif { font-family: '${fontPair.heading}', sans-serif; }\n.sans { font-family: '${fontPair.body}', sans-serif; }`
}

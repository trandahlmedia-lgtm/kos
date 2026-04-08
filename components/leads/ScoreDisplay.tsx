'use client'

interface ScoreDisplayProps {
  aiScore: number | null
  manualScore: number | null
  onManualScoreChange?: (score: number | null) => void
  readonly?: boolean
  size?: 'sm' | 'md'
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-[#555555]'
  if (score >= 71) return 'text-green-400'
  if (score >= 41) return 'text-yellow-400'
  return 'text-red-400'
}

export function ScoreDisplay({
  aiScore,
  manualScore,
  onManualScoreChange,
  readonly = false,
  size = 'md',
}: ScoreDisplayProps) {
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const scoreSize = size === 'sm' ? 'text-xs font-semibold' : 'text-sm font-semibold'

  return (
    <div className="flex items-center gap-2">
      {/* AI Score */}
      <div className="flex items-center gap-1">
        <span className={`${textSize} text-[#555555]`}>AI</span>
        <span className={`${scoreSize} ${scoreColor(aiScore)}`}>
          {aiScore !== null ? aiScore : '—'}
        </span>
      </div>

      {/* Manual Score */}
      <div className="flex items-center gap-1">
        <span className={`${textSize} text-[#555555]`}>You</span>
        {readonly || !onManualScoreChange ? (
          <span className={`${scoreSize} ${scoreColor(manualScore)}`}>
            {manualScore !== null ? manualScore : '—'}
          </span>
        ) : (
          <input
            type="number"
            min={1}
            max={100}
            value={manualScore ?? ''}
            placeholder="—"
            onChange={(e) => {
              const val = e.target.value === '' ? null : Math.min(100, Math.max(1, parseInt(e.target.value, 10)))
              onManualScoreChange(val)
            }}
            className={`w-10 bg-transparent border-b border-[#2a2a2a] text-center ${scoreSize} ${scoreColor(manualScore)} focus:outline-none focus:border-[#E8732A]`}
          />
        )}
      </div>
    </div>
  )
}

'use client'

/**
 * @param {number} props.score — 0 to 100
 * @param {number} [props.similarCount=100] — for "Lower risk than X of Y" sentence
 * @param {number} [props.rankPosition] — how many cases score lower
 * @param {boolean} [props.loading=false]
 * @param {string} [props.className]
 */
export default function RiskBadge({ score, similarCount = 100, rankPosition, loading = false, className = '' }) {
  if (loading) {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="h-20 w-24 bg-bg-raised rounded-sm animate-pulse" />
        <div className="h-3 w-48 bg-bg-raised rounded-sm animate-pulse" />
      </div>
    )
  }

  /* Risk colour — text only, used on the numeral */
  const scoreColor = score <= 35
    ? 'text-success'
    : score <= 65
      ? 'text-warning'
      : 'text-danger'

  /* Plain-language sentence — one sentence, no chart, no legend */
  const lowerThan = rankPosition ?? Math.round((1 - score / 100) * similarCount)
  const contextSentence = `Lower risk than ${lowerThan} of ${similarCount} similar cases.`

  return (
    <div
      className={`flex flex-col items-center gap-3 ${className}`}
      role="img"
      aria-label={`Risk score ${score}. ${contextSentence}`}
    >
      {/*
        THE RISK SCORE — Fraunces 300 72px proportional-nums
        This is the ONLY visualisation. The scale of the type IS the chart.
        DO NOT add arcs, circles, progress bars, or any other visual.
      */}
      <span
        className={`font-display font-light leading-none ${scoreColor}`}
        style={{
          fontSize: '72px',
          fontVariantNumeric: 'proportional-nums',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {score}
      </span>

      {/* ONE sentence. Nothing else. */}
      <p
        className="font-body text-[13px] text-text-tertiary text-center leading-relaxed"
        aria-hidden="true"
      >
        {contextSentence}
      </p>
    </div>
  )
}
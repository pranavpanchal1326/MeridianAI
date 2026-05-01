// app/settlement/SimilarCases.jsx
'use client'

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'
import { EmptyState } from '@/app/components/ui'

/**
 * SimilarCases
 * Shows 20 most similar historical cases from KNN search
 */
export function SimilarCases({ similarCases }) {
  if (!similarCases) {
    return <EmptyState screen="similarCases" />
  }

  const cases = similarCases.cases ||
    similarCases.top_3_outcomes ||
    []

  const aggregate = similarCases.aggregate || {}
  const custodyInsight = aggregate.custody_insight ||
    similarCases.custody_insight

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 6px'
          }}
        >
          {similarCases.total_found || cases.length} similar cases
        </p>

        {aggregate.median_duration_days && (
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            Median outcome:{' '}
            <span
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '16px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {aggregate.median_duration_days}
            </span>
            {' '}days,{' '}
            <span
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '16px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              ?{formatINR(aggregate.median_cost_inr)}
            </span>
          </p>
        )}
      </div>

      {custodyInsight && (
        <motion.div
          variants={MESSAGE_VARIANTS}
          initial="hidden"
          animate="visible"
          style={{
            backgroundColor: 'var(--bg-raised)',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '16px',
            borderLeft: '3px solid var(--accent)'
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            {custodyInsight}
          </p>
        </motion.div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
        role="list"
        aria-label="Similar cases"
      >
        {cases.slice(0, 10).map((c, i) => (
          <SimilarCaseRow
            key={c.rank || i}
            case_={c}
            rank={c.rank || i + 1}
          />
        ))}
      </div>

      {cases.length > 10 && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            margin: '12px 0 0',
            textAlign: 'center'
          }}
        >
          +{cases.length - 10} more similar cases
        </p>
      )}
    </div>
  )
}

function SimilarCaseRow({ case_, rank }) {
  const PATH_LABELS = {
    collab: 'Collaborative',
    med:    'Mediation',
    court:  'Court'
  }

  return (
    <div
      role="listitem"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
          width: '20px',
          flexShrink: 0
        }}
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>

      <span
        style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '18px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
          width: '60px',
          flexShrink: 0
        }}
        aria-label={`${case_.duration_days} days`}
      >
        {case_.duration_days}d
      </span>

      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          flex: 1,
          fontVariantNumeric: 'tabular-nums'
        }}
        aria-label={`Cost ${case_.cost_inr} rupees`}
      >
        ?{formatINR(case_.cost_inr)}
      </span>

      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          letterSpacing: '+0.02em',
          flexShrink: 0
        }}
      >
        {PATH_LABELS[case_.path_taken] || case_.path_taken}
      </span>

      {case_.key_factor && (
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={case_.key_factor}
        >
          {case_.key_factor}
        </span>
      )}
    </div>
  )
}

function formatINR(value) {
  if (!value) return '—'
  return Math.round(value).toLocaleString('en-IN')
}

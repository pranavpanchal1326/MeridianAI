// app/settlement/PathCards.jsx
'use client'

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

/**
 * PathCards
 * Three settlement path cards: Collaborative, Mediation, Court
 */
export function PathCards({
  paths,
  recommendedPath,
  isAnomalous
}) {
  if (!paths) return null

  const PATH_ORDER = ['collab', 'med', 'court']

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
      }}
      className="settlement-grid"
      role="list"
      aria-label="Settlement path options"
    >
      {PATH_ORDER.map((pathKey, index) => {
        const path = paths[pathKey]
        if (!path) return null

        return (
          <PathCard
            key={pathKey}
            path={path}
            pathKey={pathKey}
            isRecommended={pathKey === recommendedPath}
            isAnomalous={isAnomalous}
            index={index}
          />
        )
      })}
    </div>
  )
}

function PathCard({
  path,
  pathKey,
  isRecommended,
  isAnomalous,
  index
}) {
  const PATH_CONFIG = {
    collab: { label: 'Collaborative', icon: '?' },
    med:    { label: 'Mediation',     icon: '?' },
    court:  { label: 'Litigation',    icon: '?' }
  }

  const config = PATH_CONFIG[pathKey]

  // Confidence interval modifier for anomalous cases (E8)
  const intervalModifier = isAnomalous ? 1.4 : 1.0
  const intervalLow = Math.round(
    (path.confidence_interval?.duration_low ||
     path.duration_days * 0.75) * intervalModifier
  )
  const intervalHigh = Math.round(
    (path.confidence_interval?.duration_high ||
     path.duration_days * 1.25) * intervalModifier
  )

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      custom={index}
      role="listitem"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        border: isRecommended
          ? '1px solid var(--accent)'
          : '1px solid var(--border-subtle)',
        boxShadow: isRecommended
          ? '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
      aria-label={`${config.label} path${isRecommended ? ' — recommended' : ''}`}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <p
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            fontFamily: 'var(--font-general-sans)',
            fontSize: '10px',
            fontWeight: 500,
            color: 'var(--accent)',
            letterSpacing: '+0.06em',
            textTransform: 'uppercase',
            margin: 0
          }}
          aria-label="Recommended for your case"
        >
          Recommended
        </p>
      )}

      {/* Path label */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          letterSpacing: '+0.08em',
          textTransform: 'uppercase',
          margin: '0 0 12px'
        }}
      >
        {config.label}
      </p>

      {/* Duration */}
      <div style={{ marginBottom: '4px' }}>
        <span
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '40px',
            fontWeight: 300,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'proportional-nums'
          }}
        >
          {path.duration_days}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '14px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            marginLeft: '6px'
          }}
        >
          days
        </span>
      </div>

      {/* Confidence interval */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '0 0 16px'
        }}
      >
        {intervalLow}–{intervalHigh} days range
        {isAnomalous && (
          <span style={{ color: 'var(--warning)' }}>
            {' '}(wider — unusual case)
          </span>
        )}
      </p>

      {/* Cost */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: '0 0 4px'
        }}
      >
        Est. cost
      </p>
      <p
        style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '20px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          margin: '0 0 16px',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        <span style={{ fontSize: '0.8em' }}>?</span>
        {formatINR(path.cost_inr)}
      </p>

      {/* Success probability */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: '0 0 16px'
        }}
      >
        {path.success_pct}% resolved without escalation
      </p>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--border-subtle)',
          margin: '0 0 16px'
        }}
        aria-hidden="true"
      />

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: '0 0 12px',
          flex: 1
        }}
      >
        {path.description}
      </p>

      {/* Pros */}
      {path.pros && path.pros.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
          aria-label="Advantages"
        >
          {path.pros.slice(0, 3).map((pro, i) => (
            <li
              key={i}
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '12px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px'
              }}
            >
              <span
                style={{ color: 'var(--success)', flexShrink: 0 }}
                aria-hidden="true"
              >
                ?
              </span>
              {pro}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

function formatINR(value) {
  if (!value) return '—'
  const num = Math.round(value)
  return num.toLocaleString('en-IN')
}

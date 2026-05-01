// app/settlement/SHAPExplanation.jsx
'use client'
// E5: "SHAP explanations on prediction ?
//      plain language faster/slower reasons shown
//      — no raw floats"
//      Using: success-soft and danger-soft color semantic

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

/**
 * SHAPExplanation
 * Renders explanation cards from SHAP data
 */
export function SHAPExplanation({ explanation, predictedPath }) {
  if (!explanation) return null

  const cards = explanation.explanation_cards ||
    buildCardsFromShap(explanation)

  if (!cards || cards.length === 0) return null

  const fasterCards = cards.filter(c => c.impact === 'faster')
  const slowerCards = cards.filter(c => c.impact === 'slower')
  const neutralCards = cards.filter(c => c.impact === 'neutral')

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
      <div style={{ marginBottom: '20px' }}>
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
          Why these estimates
        </p>

        {explanation.predicted_duration_days && (
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
            Your estimated{' '}
            <span
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '16px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {explanation.predicted_duration_days}
            </span>
            {' '}days is shaped by these factors.
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}
        className="shap-grid"
      >
        {slowerCards.map((card, i) => (
          <SHAPCard key={`slower-${i}`} card={card} />
        ))}
        {fasterCards.map((card, i) => (
          <SHAPCard key={`faster-${i}`} card={card} />
        ))}
        {neutralCards.map((card, i) => (
          <SHAPCard key={`neutral-${i}`} card={card} />
        ))}
      </div>

      {explanation.confidence_statement && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
            margin: '20px 0 0',
            fontStyle: 'italic'
          }}
        >
          {explanation.confidence_statement}
        </p>
      )}
    </div>
  )
}

function SHAPCard({ card }) {
  const IMPACT_CONFIG = {
    faster:  { 
      arrow: '↓', 
      color: 'var(--success)', 
      bg: 'var(--success-soft)', 
      label: 'faster' 
    },
    slower:  { 
      arrow: '↑', 
      color: 'var(--danger)', 
      bg: 'var(--danger-soft)', 
      label: 'slower' 
    },
    neutral: { 
      arrow: '—', 
      color: 'var(--text-tertiary)', 
      bg: 'var(--bg-raised)', 
      label: 'neutral' 
    }
  }

  const config = IMPACT_CONFIG[card.impact] || IMPACT_CONFIG.neutral

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: config.bg,
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        border: `1px solid ${config.color}20`
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span
          style={{
            fontSize: '16px',
            color: config.color,
            lineHeight: 1
          }}
          aria-hidden="true"
        >
          {config.arrow}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: config.color,
            letterSpacing: '+0.06em',
            textTransform: 'uppercase'
          }}
        >
          {card.days_impact !== undefined &&
            card.days_impact !== 0 ? (
            <>
              {Math.abs(card.days_impact)} days {config.label}
            </>
          ) : (
            config.label
          )}
        </span>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: 0,
          lineHeight: 1.3
        }}
      >
        {card.headline}
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: 0
        }}
      >
        {card.detail}
      </p>
    </motion.div>
  )
}

function buildCardsFromShap(explanation) {
  const cards = []

  ;(explanation.top_factors_slower || []).forEach(text => {
    cards.push({
      impact:   'slower',
      headline: text.split(' — ')[0] || text,
      detail:   text,
      days_impact: null
    })
  })

  ;(explanation.top_factors_faster || []).forEach(text => {
    cards.push({
      impact:   'faster',
      headline: text.split(' — ')[0] || text,
      detail:   text,
      days_impact: null
    })
  })

  return cards
}

// app/settlement/DisclaimerModal.jsx
'use client'
// E1: "disclaimer modal blocks all content"
// E2: "click outside modal ? does NOT close — must check checkbox"
// From document Section 07: GAP-04 — 4-line disclaimer +
//   mandatory checkbox + consent logged

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'
import { SETTLEMENT_DISCLAIMER } from '@/lib/constants/disclaimers'

export function DisclaimerModal({ onConsent, isLogging }) {
  const [checked, setChecked] = useState(false)

  return (
    <>
      {/* Backdrop — pointer events blocked so nothing behind works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={TRANSITIONS.standard}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(28, 25, 23, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={TRANSITIONS.standard}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '100%',
          maxWidth: '480px',
          margin: '0 16px',
          backgroundColor: 'var(--bg-base)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Statistical estimates disclaimer"
        aria-describedby="disclaimer-content"
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 16px'
          }}
        >
          Before you continue
        </p>

        <h2
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '22px',
            fontWeight: 300,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            margin: '0 0 20px'
          }}
        >
          These are estimates, not advice.
        </h2>

        {/* THE 4 DISCLAIMER LINES — from locked constant */}
        <div
          id="disclaimer-content"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '24px',
            maxWidth: '72ch'
          }}
        >
          {[
            SETTLEMENT_DISCLAIMER.line1,
            SETTLEMENT_DISCLAIMER.line2,
            SETTLEMENT_DISCLAIMER.line3,
            SETTLEMENT_DISCLAIMER.line4
          ].map((line, idx) => (
            <p
              key={idx}
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '13px',
                fontWeight: idx === 1 ? 500 : 400,
                color: idx === 1
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
                lineHeight: 1.55,
                margin: 0
              }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Mandatory checkbox — E2 requirement */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '24px'
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              marginTop: '2px',
              accentColor: 'var(--accent)',
              cursor: 'pointer',
              flexShrink: 0
            }}
            aria-label={SETTLEMENT_DISCLAIMER.consentText}
          />
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              userSelect: 'none'
            }}
          >
            {SETTLEMENT_DISCLAIMER.consentText}
          </span>
        </label>

        {/* Confirm button — disabled until checkbox checked */}
        <motion.button
          onClick={onConsent}
          disabled={!checked || isLogging}
          whileTap={checked ? { scale: 0.98 } : {}}
          transition={TRANSITIONS.standard}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: checked
              ? 'var(--accent)'
              : 'var(--border-default)',
            border: 'none',
            borderRadius: '8px',
            cursor: checked && !isLogging ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-general-sans)',
            fontSize: '14px',
            fontWeight: 500,
            color: checked
              ? 'var(--text-inverse)'
              : 'var(--text-disabled)',
            transition: `background-color ${TRANSITIONS.standard.duration}s`,
            opacity: isLogging ? 0.7 : 1
          }}
          aria-disabled={!checked || isLogging}
          aria-label="Continue to settlement simulator"
        >
          {isLogging ? 'Recording your consent...' : 'I understand — continue'}
        </motion.button>

        {/* Version stamp */}
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            margin: '12px 0 0',
            textAlign: 'center',
            letterSpacing: '+0.02em'
          }}
        >
          Disclaimer v{SETTLEMENT_DISCLAIMER.version}
        </p>
      </motion.div>
    </>
  )
}

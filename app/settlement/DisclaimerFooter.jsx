// app/settlement/DisclaimerFooter.jsx
// E4: "Inspect page bottom always ? ML_DISCLAIMER text
//      always visible, never removed"
// HARDCODED from constant — never conditionally rendered
// Never wrapped in {condition && <DisclaimerFooter />}

import { SETTLEMENT_DISCLAIMER } from '@/lib/constants/disclaimers'

export function DisclaimerFooter() {
  // NOT a client component — static, always renders
  // No state. No conditions. Always visible.

  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-base)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '10px 24px',
        zIndex: 50
      }}
      aria-label="Legal disclaimer"
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: '960px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        {/* Line 2 is most important — "not legal advice" */}
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            margin: 0,
            letterSpacing: '+0.01em'
          }}
        >
          {SETTLEMENT_DISCLAIMER.line2}
        </p>

        <span
          style={{ color: 'var(--border-default)' }}
          aria-hidden="true"
        >
          ·
        </span>

        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            margin: 0
          }}
        >
          {SETTLEMENT_DISCLAIMER.line4}
        </p>

        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            marginLeft: 'auto',
            opacity: 0.6
          }}
        >
          v{SETTLEMENT_DISCLAIMER.version}
        </span>
      </div>
    </footer>
  )
}

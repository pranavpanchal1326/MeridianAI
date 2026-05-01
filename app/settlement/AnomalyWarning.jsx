// app/settlement/AnomalyWarning.jsx
'use client'
// E8: "Unusual case: run predict ? anomaly warning shown
//      with wider confidence interval"

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

export function AnomalyWarning({ anomalyScore }) {
  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: 'var(--warning-soft)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid var(--warning)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}
      role="alert"
      aria-live="polite"
    >
      <span
        style={{ fontSize: '16px', flexShrink: 0 }}
        aria-hidden="true"
      >
        ?
      </span>

      <div>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--warning)',
            margin: '0 0 4px',
            letterSpacing: '+0.02em'
          }}
        >
          Unusual case profile
        </p>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0
          }}
        >
          Your case has some characteristics that are uncommon
          in our training data. We have shown wider estimate
          ranges to reflect this uncertainty. These projections
          are still based on the closest similar cases we could
          find.
        </p>
      </div>
    </motion.div>
  )
}

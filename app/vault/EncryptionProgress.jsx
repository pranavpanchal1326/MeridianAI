// app/vault/EncryptionProgress.jsx
'use client'
// From demo script: "Encrypting in browser." — shown to user

import { motion } from 'framer-motion'
import { TRANSITIONS, DURATION } from '@/lib/constants/animations'

export function EncryptionProgress({
  stage,
  fileName,
  progress,
  fileSize
}) {
  const STAGES = {
    encrypting: {
      label:   'Encrypting in your browser',
      sublabel: 'Using AES-256. Your document never leaves unencrypted.',
      color:   'var(--accent)'
    },
    uploading: {
      label:   'Uploading to IPFS',
      sublabel: 'Sending encrypted data to decentralized storage.',
      color:   'var(--success)'
    }
  }

  const config = STAGES[stage] || STAGES.encrypting

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={TRANSITIONS.standard}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06)'
      }}
      role="status"
      aria-live="polite"
      aria-label={config.label}
    >
      {/* File name */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '0 0 8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {fileName}
        {fileSize && (
          <span style={{ marginLeft: '8px' }}>
            {formatSize(fileSize)}
          </span>
        )}
      </p>

      {/* Stage label */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: '0 0 4px'
        }}
      >
        {config.label}
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: '0 0 16px'
        }}
      >
        {config.sublabel}
      </p>

      {/* Progress bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderRadius: '4px',
          height: '4px',
          overflow: 'hidden'
        }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: DURATION.slow, ease: 'easeOut' }}
          style={{
            height: '100%',
            backgroundColor: config.color,
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Pulsing dots */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginTop: '12px',
          alignItems: 'center'
        }}
        aria-hidden="true"
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              delay: i * 0.2
            }}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: config.color
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

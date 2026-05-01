// app/vault/KeyStoragePrompt.jsx
'use client'
// Upload complete — user must store their encryption key
// This is the ONLY time they see their key
// After this: key is gone forever from our system

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

export function KeyStoragePrompt({
  encryptionResult,
  uploadResult,
  onKeyStored
}) {
  const [keyCopied, setKeyCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(
        encryptionResult?.keyBase64 || ''
      )
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 3000)
    } catch {
      // Clipboard not available — user must manually copy
    }
  }

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid var(--border-default)'
      }}
    >
      {/* Success indicator */}
      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--success)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 6px'
          }}
        >
          ? Uploaded to IPFS
        </p>

        {/* IPFS hash in Geist Mono — from demo script */}
        {uploadResult?.ipfs_hash && (
          <p
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.02em',
              wordBreak: 'break-all',
              margin: 0
            }}
            aria-label={`IPFS hash: ${uploadResult.ipfs_hash}`}
          >
            {uploadResult.ipfs_hash}
          </p>
        )}
      </div>

      {/* Key storage instruction */}
      <p
        style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '18px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          margin: '0 0 8px'
        }}
      >
        Save your encryption key.
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: '0 0 16px'
        }}
      >
        This key decrypts your document. We do not store it.
        If you lose it, the document cannot be recovered by
        anyone — including us.
      </p>

      {/* Key display */}
      <div
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '10px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            letterSpacing: '+0.02em',
            wordBreak: 'break-all',
            margin: 0,
            flex: 1,
            lineHeight: 1.6,
            // Blur key unless copied — privacy on screen
            filter: keyCopied ? 'none' : 'blur(4px)',
            userSelect: keyCopied ? 'text' : 'none',
            transition: `filter ${TRANSITIONS.standard.duration}s`
          }}
          aria-label="Encryption key (click copy to reveal)"
        >
          {encryptionResult?.keyBase64}
        </p>
      </div>

      {/* Copy button */}
      <motion.button
        onClick={handleCopyKey}
        whileTap={{ scale: 0.97 }}
        transition={TRANSITIONS.standard}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: keyCopied
            ? 'var(--success)'
            : 'var(--accent)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-inverse)',
          marginBottom: '12px',
          transition: `background-color ${TRANSITIONS.standard.duration}s`
        }}
        aria-label={keyCopied ? 'Key copied' : 'Copy encryption key'}
      >
        {keyCopied
          ? '? Copied — paste this somewhere safe'
          : 'Copy encryption key'}
      </motion.button>

      {/* Confirmation checkbox */}
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          cursor: 'pointer',
          marginBottom: '16px'
        }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          style={{
            width: '16px',
            height: '16px',
            marginTop: '2px',
            accentColor: 'var(--accent)',
            flexShrink: 0
          }}
          aria-label="I have saved my encryption key"
        />
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            userSelect: 'none'
          }}
        >
          I have saved my encryption key in a safe place
        </span>
      </label>

      {/* Continue button */}
      <button
        onClick={onKeyStored}
        disabled={!confirmed}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: confirmed
            ? 'var(--bg-raised)'
            : 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          cursor: confirmed ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: confirmed
            ? 'var(--text-primary)'
            : 'var(--text-disabled)'
        }}
        aria-disabled={!confirmed}
      >
        Continue
      </button>
    </motion.div>
  )
}

// app/vault/UploadZone.jsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

export function UploadZone({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }, [onFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }, [onFileSelect])

  return (
    <motion.div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      animate={{
        borderColor: isDragging
          ? 'var(--accent)'
          : 'var(--border-default)',
        backgroundColor: isDragging
          ? 'var(--accent-soft)'
          : 'var(--bg-surface)'
      }}
      transition={TRANSITIONS.standard}
      style={{
        border: '2px dashed var(--border-default)',
        borderRadius: '12px',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer'
      }}
      role="button"
      aria-label="Upload document — click or drag and drop"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          fileInputRef.current?.click()
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 6px'
        }}
      >
        {isDragging
          ? 'Drop to encrypt and upload'
          : 'Click to upload a document'}
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: 0
        }}
      >
        PDF, JPG, PNG, or Word · Max 50MB
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '12px 0 0',
          letterSpacing: '+0.02em'
        }}
      >
        Encrypted in your browser before upload
      </p>
    </motion.div>
  )
}

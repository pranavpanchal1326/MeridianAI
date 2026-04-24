'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS } from '../../lib/constants/animations'

/**
 * @param {boolean} props.isActive
 * @param {Function} props.onDeactivate
 */
export default function PrivateMode({ isActive, onDeactivate }) {
  /* Keyboard: any key deactivates */
  const handleKey = useCallback((e) => {
    if (isActive) { e.preventDefault(); onDeactivate() }
  }, [isActive, onDeactivate])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Private mode active. Tap to restore."
          className="fixed inset-0 z-[10000] flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: 'var(--bg-inverse)' }}   /* #1C1917 warm near-black */
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANSITIONS.privateMode}               /* 100ms — must feel instant */
          onClick={onDeactivate}
        >
          {/* Grain texture visible in Private Mode — using same body::before approach */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              opacity: 0.04,
            }}
            aria-hidden="true"
          />

          <div className="flex flex-col items-center gap-3 pointer-events-none">
            {/* Lock icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-inverse/30">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-inverse/30">
              Private Mode
            </p>
            <p className="font-body text-[12px] text-text-inverse/20">
              Tap anywhere to restore
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
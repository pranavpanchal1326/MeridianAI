'use client'

import { motion } from 'framer-motion'
import { SKELETON_PULSE } from '../../lib/constants/animations'

/**
 * @param {'text'|'card'|'professional'|'risk'|'settlement'|'decision'} [props.variant='text']
 * @param {number} [props.lines=3] — text variant: number of text lines
 * @param {string} [props.className]
 */
export default function Skeleton({ variant = 'text', lines = 3, className = '' }) {
  const shimmer = {
    animate: { opacity: [0.5, 1, 0.5] },
    transition: SKELETON_PULSE,
  }

  const base = `bg-bg-raised rounded-sm`

  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-2.5 ${className}`} role="status" aria-label="Loading...">
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={`${base} h-3.5`}
            style={{ width: i === lines - 1 ? '65%' : '100%' }}
            {...shimmer}
          />
        ))}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`bg-bg-surface rounded-card shadow-card p-6 ${className}`} role="status" aria-label="Loading...">
        <div className="flex flex-col gap-3">
          <motion.div className={`${base} h-4 w-1/3`} {...shimmer} />
          <motion.div className={`${base} h-3 w-full`} {...shimmer} />
          <motion.div className={`${base} h-3 w-4/5`} {...shimmer} />
          <motion.div className={`${base} h-3 w-3/5`} {...shimmer} />
        </div>
      </div>
    )
  }

  if (variant === 'professional') {
    /* Shaped like a professional card with 4px left bar space */
    return (
      <div className={`bg-bg-surface rounded-card shadow-card overflow-hidden ${className}`} role="status" aria-label="Loading professional...">
        <div className="flex">
          <div className="w-1 bg-bg-raised shrink-0" />
          <div className="flex-1 p-5 flex flex-col gap-2.5">
            <motion.div className={`${base} h-4 w-2/5`} {...shimmer} />
            <motion.div className={`${base} h-3 w-3/5`} {...shimmer} />
            <motion.div className={`${base} h-2 w-1/4 mt-1`} {...shimmer} />
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'risk') {
    /* Shaped like the Fraunces 72px risk score display */
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`} role="status" aria-label="Calculating risk score...">
        <motion.div className={`${base} h-20 w-24 rounded-sm`} {...shimmer} />
        <motion.div className={`${base} h-3 w-48`} {...shimmer} />
      </div>
    )
  }

  if (variant === 'settlement') {
    return (
      <div className={`flex flex-col gap-4 ${className}`} role="status" aria-label="Loading settlement options...">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-bg-surface rounded-card shadow-card p-5 flex flex-col gap-2">
            <motion.div className={`${base} h-4 w-1/4`} {...shimmer} />
            <motion.div className={`${base} h-8 w-1/3`} {...shimmer} />
            <motion.div className={`${base} h-3 w-full`} {...shimmer} />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'decision') {
    return (
      <div className={`bg-bg-surface rounded-card shadow-card p-5 flex flex-col gap-2.5 ${className}`} role="status" aria-label="Loading decisions...">
        <motion.div className={`${base} h-3 w-1/6`} {...shimmer} />
        <motion.div className={`${base} h-4 w-3/5`} {...shimmer} />
        <motion.div className={`${base} h-3 w-full`} {...shimmer} />
        <motion.div className={`${base} h-8 w-24 mt-2`} {...shimmer} />
      </div>
    )
  }

  /* Default fallback */
  return <motion.div className={`${base} h-4 w-full ${className}`} {...shimmer} role="status" aria-label="Loading..." />
}
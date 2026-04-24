'use client'

/**
 * @param {number} props.score — 0 to 100
 * @param {'pending'|'read_only'|'approved'} props.verificationStatus
 * @param {string} [props.className]
 */
export default function TrustBadge({ score, verificationStatus, className = '' }) {
  const statusConfig = {
    pending:   { label: 'Pending verification', bg: 'bg-warning-soft', text: 'text-warning' },
    read_only: { label: 'Read-only access',      bg: 'bg-accent-soft',  text: 'text-accent-text' },
    approved:  { label: 'Verified',              bg: 'bg-success-soft', text: 'text-success' },
  }

  const config = statusConfig[verificationStatus] || statusConfig.pending

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Trust score — smaller than risk score, General Sans not Fraunces */}
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-body text-[28px] font-semibold text-text-primary"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {score}
        </span>
        <span className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
          Trust Score
        </span>
      </div>

      {/* Verification status badge */}
      <span className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        font-body text-[11px] font-medium tracking-wide
        ${config.bg} ${config.text}
      `}>
        {verificationStatus === 'approved' && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {config.label}
      </span>
    </div>
  )
}
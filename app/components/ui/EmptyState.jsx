'use client'

import { EMPTY_STATES } from '../../lib/constants/design'

/**
 * @param {'decisionInbox'|'documentVault'|'professionalCards'|'deadlineBrain'|'caseDNA'|'settlementSimulator'|'similarCases'} props.screen
 * @param {string} [props.className]
 */
export default function EmptyState({ screen, className = '' }) {
  const state = EMPTY_STATES[screen]
  if (!state) return null

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-12 px-6 text-center ${className}`}
      role="status"
      aria-label={`${state.title} ${state.body}`}
    >
      <p className="font-body text-[15px] font-medium text-text-secondary leading-relaxed max-w-[52ch]">
        {state.title}
      </p>
      {state.body && (
        <p className="font-body text-[13px] text-text-tertiary leading-relaxed max-w-[52ch]">
          {state.body}
        </p>
      )}
    </div>
  )
}
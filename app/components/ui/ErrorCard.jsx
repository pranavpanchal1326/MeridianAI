'use client'

import Button from './Button'

/**
 * @param {'soft'|'hard'|'critical'} [props.type='hard']
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {Function} [props.onRetry]
 * @param {boolean} [props.isRetrying=false]
 * @param {string} [props.className]
 */
export default function ErrorCard({ type = 'hard', title, message, onRetry, isRetrying = false, className = '' }) {
  const configs = {
    soft: {
      defaultTitle:   'Give us a moment.',
      defaultMessage: 'We are still working on this. No action needed — we will update you shortly.',
      icon:           '○',
      showRetry:      false,
      bg:             'bg-bg-surface',
      border:         'border-l-4 border-l-border-default',
    },
    hard: {
      defaultTitle:   'Something did not load.',
      defaultMessage: 'Your data is safe. Try again — it usually works the second time.',
      icon:           '◎',
      showRetry:      true,
      bg:             'bg-warning-soft',
      border:         'border-l-4 border-l-warning',
    },
    critical: {
      defaultTitle:   'We hit an unexpected issue.',
      defaultMessage: 'Your data is completely safe. Our team has been notified. No action needed on your end.',
      icon:           '⊗',
      showRetry:      false,
      bg:             'bg-danger-soft',
      border:         'border-l-4 border-l-danger',
    },
  }

  const config = configs[type]

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        ${config.bg} ${config.border}
        rounded-card p-5
        flex flex-col gap-3
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <span className="font-mono text-[16px] text-text-tertiary shrink-0 mt-0.5" aria-hidden="true">
          {config.icon}
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="font-body text-[15px] font-medium text-text-primary leading-[1.3]">
            {title || config.defaultTitle}
          </p>
          <p className="font-body text-[13px] text-text-secondary leading-relaxed max-w-[52ch]">
            {message || config.defaultMessage}
          </p>
        </div>
      </div>

      {config.showRetry && onRetry && (
        <div className="pl-7">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            loading={isRetrying}
          >
            {isRetrying ? 'Trying again...' : 'Try again'}
          </Button>
        </div>
      )}
    </div>
  )
}

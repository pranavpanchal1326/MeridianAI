'use client'

/**
 * @param {'success'|'warning'|'danger'|'neutral'|'accent'} [props.variant='neutral']
 * @param {'sm'|'md'} [props.size='md']
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Badge({ variant = 'neutral', size = 'md', children, className = '' }) {
  const base = `
    inline-flex items-center font-body font-medium rounded-full
    tracking-wide
  `

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-[11px]',
  }

  const variants = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger:  'bg-danger-soft  text-danger',
    neutral: 'bg-bg-overlay   text-text-secondary',
    accent:  'bg-accent-soft  text-accent-text',
  }

  return (
    <span className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} role="status">
      {children}
    </span>
  )
}
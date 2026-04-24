'use client'

import { useState } from 'react'

/**
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {'text'|'email'|'password'|'textarea'} [props.type='text']
 * @param {number} [props.rows=4] — textarea only
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.placeholder]
 * @param {string} props.value
 * @param {Function} props.onChange
 * @param {string} [props.id]
 * @param {string} [props.className]
 */
export default function Input({
  label,
  hint,
  error,
  type = 'text',
  rows = 4,
  disabled = false,
  placeholder,
  value,
  onChange,
  id,
  className = '',
  ...props
}) {
  const [focused, setFocused] = useState(false)

  const inputId = id || `input-${Math.random().toString(36).slice(2, 7)}`

  /* NO top/side/bottom border — 2px bottom line only */
  /* Focus changes bottom line to --accent (maritime blue) */
  const inputBase = `
    w-full bg-bg-raised text-text-primary
    font-body text-[15px] leading-relaxed
    border-0 border-b-2 outline-none
    transition-colors duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]
    placeholder:text-text-tertiary
    disabled:opacity-40 disabled:cursor-not-allowed
    px-0 pt-2 pb-2
  `

  const borderColor = error
    ? 'border-b-danger'
    : focused
      ? 'border-b-border-focus'
      : 'border-b-border-default'

  const commonProps = {
    id: inputId,
    value,
    onChange,
    onFocus:  () => setFocused(true),
    onBlur:   () => setFocused(false),
    disabled,
    placeholder,
    className: `${inputBase} ${borderColor}`,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined,
    ...props,
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary"
        >
          {label}
        </label>
      )}

      {type === 'textarea'
        ? <textarea rows={rows} {...commonProps} />
        : <input type={type} {...commonProps} />
      }

      {hint && !error && (
        <p id={`${inputId}-hint`} className="font-body text-[12px] text-text-tertiary leading-relaxed">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${inputId}-error`} className="font-body text-[12px] text-danger leading-relaxed" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
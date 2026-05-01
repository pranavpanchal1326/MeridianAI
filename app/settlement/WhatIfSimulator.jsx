// app/settlement/WhatIfSimulator.jsx
'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS, DURATION } from '@/lib/constants/animations'

/**
 * WhatIfSimulator
 *
 * Interactive sliders that run ONNX in browser
 * ZERO server calls — fully offline (E7)
 * Updates in < 10ms (E6)
 *
 * Sliders:
 * 1. Property value (total_asset_value_inr)
 * 2. Number of children
 * 3. Urgency level
 * 4. Complexity score
 * 5. Marriage duration
 *
 * Shows: duration diff, cost diff, risk diff vs base
 */
export function WhatIfSimulator({ baseState, caseId, isDemoMode = false }) {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentValues, setCurrentValues] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [basePrediction, setBasePrediction] = useState(null)
  const [inferenceMs, setInferenceMs] = useState(null)
  const [loadError, setLoadError] = useState(false)

  const inferenceRef = useRef(null)
  // Ref to debounce slider — prevents queuing multiple inferences

  // DEMO_MODE logic (Block J2)
  const getDemoScale = (values) => {
    // Deterministic simulation for demo
    let scale = 1.0
    if (values.urgency === 3) scale *= 0.8
    if (values.complexity_score > 7) scale *= 1.3
    return scale
  }

  // Initialize base state from prop
  useEffect(() => {
    if (baseState?.features) {
      setCurrentValues({ ...baseState.features })
      setBasePrediction(baseState.base_predictions)
      setPrediction(baseState.base_predictions)
    }
  }, [baseState])

  // Pre-load ONNX models on mount
  useEffect(() => {
    async function init() {
      if (isDemoMode) {
        setIsReady(true)
        setIsLoading(false)
        return
      }

      try {
        const { preloadWhatIfModels } = await import(
          '@/lib/ml/whatif'
        )
        const loaded = await preloadWhatIfModels()
        setIsReady(loaded)
      } catch (err) {
        console.error('[WhatIf] Init failed:', err)
        setLoadError(true)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [isDemoMode])

  // Build full 12-feature vector from current values
  const buildFeatureVector = useCallback((values) => {
    if (!baseState?.features) return null
    const base = baseState.features

    // Map slider values back to ML feature vector
    // Feature order is FIXED — never reorder
    return [
      0,                                      // [0] case_type (fixed)
      3,                                      // [1] city (fixed — Pune demo)
      values.total_asset_value_inr || base.total_asset_value_inr,  // [2]
      values.children_count ?? base.children_count,                // [3]
      0,                                      // [4] business_ownership (fixed)
      values.marriage_duration_years || base.marriage_duration_years, // [5]
      34,                                     // [6] petitioner_age (fixed)
      values.professional_count || base.professional_count, // [7]
      values.urgency ?? base.urgency,         // [8]
      9,                                      // [9] court_backlog (fixed)
      1.0,                                    // [10] filing_season (fixed)
      values.complexity_score || base.complexity_score  // [11]
    ]
  }, [baseState])

  // Run inference when slider changes
  const runInference = useCallback(async (values) => {
    if (!isReady) return

    // Cancel pending inference
    if (inferenceRef.current) {
      clearTimeout(inferenceRef.current)
    }

    // [E6] Slider debounce: 16ms (one frame)
    inferenceRef.current = setTimeout(async () => {
      if (isDemoMode) {
        const scale = getDemoScale(values)
        setPrediction({
          collab_duration: Math.round(basePrediction.collab_duration * scale),
          collab_cost:     Math.round(basePrediction.collab_cost * scale),
          risk_score:      Math.round(basePrediction.risk_score * scale),
          inference_ms:    2 // Faster for demo
        })
        return
      }

      const features = buildFeatureVector(values)
      if (!features) return

      try {
        const { predictWhatIf } = await import('@/lib/ml/whatif')
        const result = await predictWhatIf(features)
        setPrediction(result)
        setInferenceMs(result.inference_ms)
      } catch (err) {
        console.error('[WhatIf] Inference error:', err)
      }
    }, 16)
  }, [isReady, buildFeatureVector, isDemoMode, basePrediction])

  const handleSliderChange = useCallback((key, value) => {
    const newValues = { ...currentValues, [key]: value }
    setCurrentValues(newValues)
    runInference(newValues)
  }, [currentValues, runInference])

  // Compute diffs vs base prediction
  const diffs = prediction && basePrediction ? {
    duration: prediction.collab_duration - basePrediction.collab_duration,
    cost:     prediction.collab_cost - basePrediction.collab_cost,
    risk:     prediction.risk_score - basePrediction.risk_score
  } : null

  const SLIDERS = [
    {
      key:      'total_asset_value_inr',
      label:    'Asset value',
      min:      500000,
      max:      50000000,
      step:     100000,
      format:   v => `₹${Math.round(v / 100000) * 100000 >= 10000000
        ? (v / 10000000).toFixed(1) + ' Cr'
        : (v / 100000).toFixed(0) + ' L'}`
    },
    {
      key:      'children_count',
      label:    'Children',
      min:      0,
      max:      3,
      step:     1,
      format:   v => v === 0 ? 'None' : v === 1 ? '1 child' : `${v} children`
    },
    {
      key:      'urgency',
      label:    'Urgency',
      min:      0,
      max:      3,
      step:     1,
      format:   v => ['Low', 'Medium', 'High', 'Critical'][v] || 'Medium'
    },
    {
      key:      'complexity_score',
      label:    'Complexity',
      min:      1,
      max:      10,
      step:     0.5,
      format:   v => v <= 3.3 ? 'Low' : v <= 6.6 ? 'Medium' : 'High'
    },
    {
      key:      'marriage_duration_years',
      label:    'Marriage duration',
      min:      1,
      max:      30,
      step:     1,
      format:   v => `${v} years`
    }
  ]

  if (isLoading) {
    return (
      <WhatIfSkeleton />
    )
  }

  if (loadError || !isReady) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          padding: '24px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: 0
          }}
        >
          Scenario explorer is not available in this browser.
          Your estimates above remain accurate.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.08em',
              textTransform: 'uppercase',
              margin: '0 0 6px'
            }}
          >
            Scenario Explorer
          </p>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              margin: 0
            }}
          >
            Adjust any factor to see how it changes your estimate.
            Updates instantly — no internet needed.
          </p>
        </div>
        
        {/* [E7] Offline status indicator */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '100px',
            backgroundColor: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Offline
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px'
        }}
        className="whatif-grid"
      >
        {/* Left: sliders */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {SLIDERS.map(slider => (
            <WhatIfSlider
              key={slider.key}
              config={slider}
              value={currentValues?.[slider.key] ??
                baseState?.features?.[slider.key]}
              onChange={(v) => handleSliderChange(slider.key, v)}
            />
          ))}
        </div>

        {/* Right: prediction output */}
        <div>
          <WhatIfOutput
            prediction={prediction}
            basePrediction={basePrediction}
            diffs={diffs}
            inferenceMs={inferenceMs}
          />
        </div>
      </div>
    </div>
  )
}

function WhatIfSlider({ config, value, onChange }) {
  const displayValue = config.format(value ?? config.min)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '8px'
        }}
      >
        <label
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            letterSpacing: '+0.02em'
          }}
          htmlFor={`slider-${config.key}`}
        >
          {config.label}
        </label>

        <span
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '16px',
            fontWeight: 300,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {displayValue}
        </span>
      </div>

      <input
        id={`slider-${config.key}`}
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value ?? config.min}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--accent)',
          cursor: 'pointer',
          height: '4px'
        }}
        aria-label={`${config.label}: ${displayValue}`}
        aria-valuemin={config.min}
        aria-valuemax={config.max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
      />
    </div>
  )
}

function WhatIfOutput({ prediction, basePrediction, diffs, inferenceMs }) {
  if (!prediction) return null

  const DiffIndicator = ({ value, unit, invertSign = false }) => {
    const isPositive = invertSign ? value < 0 : value > 0
    const isNeutral  = value === 0
    const color = isNeutral
      ? 'var(--text-tertiary)'
      : isPositive
      ? 'var(--warning)'
      : 'var(--success)'

    const formatted = unit === 'inr'
      ? `₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`
      : `${Math.abs(Math.round(value))} days`

    return (
      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color,
          marginLeft: '6px'
        }}
        aria-label={`Change: ${value > 0 ? 'increase' : 'decrease'} of ${formatted}`}
      >
        {isNeutral
          ? '—'
          : `${value > 0 ? '↑' : '↓'} ${formatted}`}
      </span>
    )
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Duration output */}
      <div
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 8px'
          }}
        >
          Collaborative path
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <motion.span
            key={prediction.collab_duration}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.fast }}
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '40px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'proportional-nums'
            }}
            aria-live="polite"
            aria-label={`${prediction.collab_duration} days`}
          >
            {prediction.collab_duration}
          </motion.span>
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              color: 'var(--text-tertiary)'
            }}
          >
            days
          </span>
          {diffs && (
            <DiffIndicator value={diffs.duration} unit="days" />
          )}
        </div>
      </div>

      {/* Cost output */}
      <div
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 8px'
          }}
        >
          Estimated cost
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '20px',
              fontWeight: 300,
              color: 'var(--text-tertiary)',
              lineHeight: 1
            }}
          >
            ₹
          </span>
          <motion.span
            key={prediction.collab_cost}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.fast }}
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '24px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums'
            }}
            aria-live="polite"
          >
            {Math.round(prediction.collab_cost).toLocaleString('en-IN')}
          </motion.span>
          {diffs && (
            <DiffIndicator value={diffs.cost} unit="inr" />
          )}
        </div>
      </div>

      {/* Risk output */}
      <div
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 8px'
          }}
        >
          Risk score
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <motion.span
            key={prediction.risk_score}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.fast }}
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '40px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'proportional-nums'
            }}
            aria-live="polite"
          >
            {prediction.risk_score}
          </motion.span>
          {diffs && (
            <DiffIndicator
              value={diffs.risk}
              unit="points"
              invertSign
              // Higher risk = worse, so invert colour signal
            />
          )}
        </div>
      </div>

      {/* Inference time — dev reference */}
      {inferenceMs !== null && (
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            margin: 0,
            opacity: 0.5,
            textAlign: 'right'
          }}
          aria-label={`Inference time: ${inferenceMs} milliseconds`}
        >
          {inferenceMs}ms
        </p>
      )}
    </div>
  )
}

function WhatIfSkeleton() {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.2 }}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        height: '320px'
      }}
      aria-busy="true"
      aria-label="Loading scenario explorer"
    />
  )
}

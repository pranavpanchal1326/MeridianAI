// app/settlement/SettlementSimulator.jsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'
import { usePredictionUpdates } from '@/lib/realtime/useChannel.js'
import { DisclaimerModal } from './DisclaimerModal'
import { PathCards } from './PathCards'
import { SHAPExplanation } from './SHAPExplanation'
import { SimilarCases } from './SimilarCases'
import { WhatIfSimulator } from './WhatIfSimulator'
import { AnomalyWarning } from './AnomalyWarning'
import { DisclaimerFooter } from './DisclaimerFooter'
import { EmptyState } from '@/app/components/ui'
import { SETTLEMENT_DISCLAIMER } from '@/lib/constants/disclaimers'

/**
 * SettlementSimulator
 *
 * Architecture:
 * 1. Disclaimer modal blocks ALL content on first visit (E1)
 * 2. Modal cannot be dismissed without checkbox (E2)
 * 3. Consent logged to Supabase on confirm (E3)
 * 4. Disclaimer footer always visible below content (E4)
 * 5. SHAP explanations in plain language (E5)
 * 6. What-If slider updates < 10ms (E6)
 * 7. What-If works offline via browser ONNX (E7)
 * 8. Anomaly warning shown for unusual cases (E8)
 */
export function SettlementSimulator({
  userId,
  caseId,
  predictionData,
  initialConsent
}) {
  const [hasConsented, setHasConsented] = useState(initialConsent)
  const [prediction, setPrediction] = useState(predictionData)
  const [isLoading, setIsLoading] = useState(!predictionData)
  const [consentLogging, setConsentLogging] = useState(false)

  // Realtime: prediction updates after milestone
  usePredictionUpdates(caseId, useCallback((update) => {
    if (update.prediction_updated_at) {
      // Reload prediction data
      fetchLatestPrediction()
    }
  }, []))

  const fetchLatestPrediction = useCallback(async () => {
    try {
      const r = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId })
      })
      if (r.ok) {
        const data = await r.json()
        setPrediction(data)
      }
    } catch (err) {
      console.error('[Settlement] Prediction fetch failed:', err)
    }
  }, [caseId])

  // Handle disclaimer consent
  const handleConsent = useCallback(async () => {
    setConsentLogging(true)
    try {
      // Log consent to Supabase — E3 requirement
      await fetch('/api/settings/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:      userId,
          consent_type: 'settlement_disclaimer',
          consented:    true,
          version:      SETTLEMENT_DISCLAIMER.version
        })
      })
      setHasConsented(true)
    } catch (err) {
      console.error('[Settlement] Consent log failed:', err)
      // Still allow through — consent log failure is not user-facing
      setHasConsented(true)
    } finally {
      setConsentLogging(false)
    }
  }, [userId])

  return (
    <motion.div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-base)' }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
    >
      {/* DISCLAIMER MODAL — blocks ALL content (E1, E2, E3) */}
      <AnimatePresence>
        {!hasConsented && (
          <DisclaimerModal
            onConsent={handleConsent}
            isLogging={consentLogging}
          />
        )}
      </AnimatePresence>

      {/* Main content — rendered but visually blocked by modal */}
      <div
        className="mx-auto px-6"
        style={{
          maxWidth: '960px',
          paddingTop: '32px',
          paddingBottom: '120px'
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.015em',
              margin: '0 0 6px'
            }}
          >
            Your path options
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              margin: 0
            }}
          >
            Based on 200,000 similar cases
          </p>
        </div>

        {isLoading ? (
          <SettlementSkeleton />
        ) : !prediction ? (
          <EmptyState screen="settlement" />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: '32px'
            }}
          >
            {/* Anomaly warning — shown before paths if unusual case */}
            {prediction.anomaly_check?.is_anomalous && (
              <AnomalyWarning
                anomalyScore={prediction.anomaly_check.anomaly_score}
              />
            )}

            {/* THREE PATH CARDS */}
            <section aria-label="Settlement path options">
              <PathCards
                paths={prediction.paths}
                recommendedPath={prediction.recommended_path?.path}
                isAnomalous={prediction.anomaly_check?.is_anomalous}
              />
            </section>

            {/* SHAP EXPLANATION — plain language (E5) */}
            {prediction.shap_explanation && (
              <section aria-label="Why these estimates">
                <SHAPExplanation
                  explanation={prediction.shap_explanation}
                  predictedPath={prediction.recommended_path?.path}
                />
              </section>
            )}

            {/* WHAT-IF SIMULATOR — browser ONNX (E6, E7) */}
            <section aria-label="Explore different scenarios">
              <WhatIfSimulator
                baseState={prediction.whatif_base_state}
                caseId={caseId}
              />
            </section>

            {/* KNN SIMILAR CASES */}
            {prediction.similar_cases_preview && (
              <section aria-label="Similar cases">
                <SimilarCases
                  similarCases={prediction.similar_cases_preview}
                />
              </section>
            )}
          </div>
        )}
      </div>

      {/* DISCLAIMER FOOTER — always visible, never removed (E4) */}
      <DisclaimerFooter />
    </motion.div>
  )
}

function SettlementSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            delay: i * 0.1,
            ease: 'easeInOut'
          }}
          style={{
            height: '160px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px'
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// app/settlement/page.jsx

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { createSupabaseAdminClient } from '@/lib/db/client'
import { SettlementSimulator } from './SettlementSimulator'
import { isDemoMode } from '@/lib/demo/demoMode'

export const metadata = {
  title: 'UnwindAI — Your Path Options',
  robots: { index: false, follow: false }
}

export default async function SettlementPage() {
  const userSession = await getCurrentUser()
  if (!userSession) redirect('/')

  const { dbUser } = userSession
  if (!dbUser.case_id) redirect('/intake')

  let predictionData = null
  let hasConsented = false

  // Check if DEMO_MODE
  if (isDemoMode()) {
    try {
      const demo = await import(
        '@/DEMO_RESPONSES/settlement_output.json',
        { assert: { type: 'json' } }
      )
      predictionData = demo.default
      hasConsented = true
    } catch (e) {
      console.error('[Settlement] Demo data missing:', e.message)
    }
  } else {
    const supabase = createSupabaseAdminClient()

    // Check existing settlement disclaimer consent
    const { data: consent } = await supabase
      .from('consent_logs')
      .select('consented')
      .eq('user_id', dbUser.id)
      .eq('consent_type', 'settlement_disclaimer')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    hasConsented = consent?.consented === true

    // Load ML prediction from case_profile
    const { data: profile } = await supabase
      .from('case_profile')
      .select('ml_prediction_json, risk_score, recommended_path, anomaly_flag, anomaly_score, shap_explanation_json, percentile_json, similar_cases_json')
      .eq('case_id', dbUser.case_id)
      .single()

    if (profile?.ml_prediction_json) {
      predictionData = {
        ...profile.ml_prediction_json,
        anomaly_check: {
          is_anomalous:  profile.anomaly_flag || false,
          anomaly_score: profile.anomaly_score || -0.5
        },
        shap_explanation: profile.shap_explanation_json,
        percentile:       profile.percentile_json,
        similar_cases_preview: profile.similar_cases_json
      }
    }
  }

  return (
    <SettlementSimulator
      userId={dbUser.id}
      caseId={dbUser.case_id}
      predictionData={predictionData}
      initialConsent={hasConsented}
    />
  )
}

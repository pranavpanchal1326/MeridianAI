// app/api/settings/emotion-shield/route.js

import { NextResponse } from 'next/server'
import { updateEmotionShieldConsent } from '@/lib/db/professionals'

export async function PATCH(request) {
  try {
    const { user_id, consented } = await request.json()

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id required' },
        { status: 400 }
      )
    }

    // updateEmotionShieldConsent: logs to consent_logs FIRST
    // then updates users.consent_emotion_shield
    // DPDP compliant — dual write
    await updateEmotionShieldConsent(user_id, consented === true)

    return NextResponse.json({
      success:   true,
      consented: consented === true,
      logged_at: new Date().toISOString()
    })

  } catch (err) {
    console.error('[EmotionShield] Consent update failed:', err)
    return NextResponse.json(
      { error: 'Unable to update preference.' },
      { status: 500 }
    )
  }
}

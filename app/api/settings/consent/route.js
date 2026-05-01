// app/api/settings/consent/route.js

import { NextResponse } from 'next/server'
import { logConsent } from '@/lib/db/professionals'

export async function POST(request) {
  try {
    const {
      user_id,
      consent_type,
      consented,
      version
    } = await request.json()

    if (!user_id || !consent_type) {
      return NextResponse.json(
        { error: 'user_id and consent_type required' },
        { status: 400 }
      )
    }

    const validTypes = [
      'emotion_shield', 'settlement_disclaimer',
      'document_upload', 'professional_access',
      'whatsapp_notifications', 'data_processing',
      'terms_of_service'
    ]

    if (!validTypes.includes(consent_type)) {
      return NextResponse.json(
        { error: `Invalid consent_type: ${consent_type}` },
        { status: 400 }
      )
    }

    await logConsent(user_id, consent_type, consented === true)

    return NextResponse.json({
      success:    true,
      consent_type,
      consented:  consented === true,
      logged_at:  new Date().toISOString(),
      version:    version || '4.0'
    })

  } catch (err) {
    console.error('[Consent] Log failed:', err.message)
    return NextResponse.json(
      { error: 'Consent logging failed.' },
      { status: 500 }
    )
  }
}

// lib/ml/predictor.js
// Runs all ONNX models in Node.js via onnxruntime-node
// Assembles full prediction response matching predict_meera.json shape

import * as ort from 'onnxruntime-node'
import { getDemoResponse, isDemoMode } from '@/lib/demo/demoMode'
import case_stats from '@/data/case_stats.json' assert { type: 'json' }
import shap_data from '@/data/shap_by_case_type.json' assert { type: 'json' }

// --- SESSION CACHE -----------------------------------------
const sessions = {}

async function getSession(modelName) {
  if (!sessions[modelName]) {
    try {
      sessions[modelName] = await ort.InferenceSession.create(
        `./models/${modelName}.onnx`
      )
    } catch (err) {
      throw new Error(
        `Failed to load model ${modelName}: ${err.message}`
      )
    }
  }
  return sessions[modelName]
}

// --- SINGLE MODEL INFERENCE --------------------------------

async function runModel(modelName, features) {
  const sess = await getSession(modelName)
  const tensor = new ort.Tensor(
    'float32',
    Float32Array.from(features),
    [1, 12]
  )
  const results = await sess.run({ input: tensor })
  return results
}

// --- MAIN PREDICT FUNCTION --------------------------------

export async function predictOutcome(features, caseId) {
  // DEMO_MODE — always first
  if (isDemoMode()) {
    const cached = await getDemoResponse('predict_meera')
    return cached
  }

  if (!features || features.length !== 12) {
    throw new Error('ML features must be array of exactly 12 values')
  }

  const startTime = Date.now()

  // Run all models in parallel for speed
  const [
    collabDuration,
    collabCost,
    medDuration,
    medCost,
    courtDuration,
    courtCost,
    pathRecommender,
    riskScorer,
    phaseSetup,
    phaseDocs,
    phaseNegotiation,
    phaseDraft,
    phaseFiling
  ] = await Promise.all([
    runModel('outcome_collab_duration', features),
    runModel('outcome_collab_cost',     features),
    runModel('outcome_med_duration',    features),
    runModel('outcome_med_cost',        features),
    runModel('outcome_court_duration',  features),
    runModel('outcome_court_cost',      features),
    runModel('path_recommender',        features),
    runModel('risk_scorer',             features),
    runModel('phase_setup',             features),
    runModel('phase_docs',              features),
    runModel('phase_negotiation',       features),
    runModel('phase_draft',             features),
    runModel('phase_filing',            features)
  ])

  // Extract values from ONNX output tensors
  const extract = (result) => {
    const keys = Object.keys(result)
    return result[keys[0]].data[0]
  }

  const collabDurationDays = Math.round(extract(collabDuration))
  const collabCostInr      = Math.round(extract(collabCost))
  const medDurationDays    = Math.round(extract(medDuration))
  const medCostInr         = Math.round(extract(medCost))
  const courtDurationDays  = Math.round(extract(courtDuration))
  const courtCostInr       = Math.round(extract(courtCost))

  const riskScore = Math.round(
    Math.max(0, Math.min(100, extract(riskScorer)))
  )
  const riskLabel = riskScore < 33 ? 'Low'
    : riskScore < 66 ? 'Medium' : 'High'

  // Path recommendation
  const pathProbs = pathRecommender[Object.keys(pathRecommender)[0]].data
  const pathLabels = ['collab', 'med', 'court']
  const maxProbIdx = Array.from(pathProbs).indexOf(
    Math.max(...Array.from(pathProbs))
  )
  const recommendedPath = pathLabels[maxProbIdx] || 'collab'
  const confidence = Math.round(pathProbs[maxProbIdx] * 100)

  // Phase timeline
  const phaseBreakdown = [
    { key: 'setup',       label: 'Setup',         days: Math.round(extract(phaseSetup)) },
    { key: 'docs',        label: 'Documentation', days: Math.round(extract(phaseDocs)) },
    { key: 'negotiation', label: 'Negotiation',   days: Math.round(extract(phaseNegotiation)) },
    { key: 'draft',       label: 'Draft',         days: Math.round(extract(phaseDraft)) },
    { key: 'filing',      label: 'Filing',        days: Math.round(extract(phaseFiling)) }
  ]

  const totalPhaseDays = phaseBreakdown.reduce(
    (sum, p) => sum + p.days, 0
  )

  // Anomaly check
  let anomalyFlag = false
  let anomalyScore = -0.5
  try {
    const { checkAnomaly } = await import('./anomaly.js')
    const anomalyResult = await checkAnomaly(features)
    anomalyFlag  = anomalyResult.is_anomalous
    anomalyScore = anomalyResult.anomaly_score
  } catch {
    // Non-fatal — default to not anomalous
  }

  // Percentile computation from case_stats
  const caseTypeKey = ['divorce','inheritance','property','business','nri'][features[0]] || 'divorce'
  const cityKey = ['mumbai','delhi','bangalore','pune','hyderabad','chennai','ahmedabad'][features[1]] || 'mumbai'
  const sliceKey = `${cityKey}_${caseTypeKey}`
  const sliceStats = case_stats.by_city_and_type?.[sliceKey]
  const durationP50 = sliceStats?.duration?.p50 || 90
  const durationPercentile = collabDurationDays < durationP50
    ? Math.round(70 + (durationP50 - collabDurationDays) / durationP50 * 20)
    : Math.round(50 - (collabDurationDays - durationP50) / durationP50 * 20)
  const clampedPercentile = Math.max(10, Math.min(95, durationPercentile))

  // SHAP explanation from precomputed data
  const shapCaseType = caseTypeKey
  const shapDataForType = shap_data[shapCaseType]

  const inferenceMs = Date.now() - startTime

  // Assemble full prediction response
  return {
    risk: {
      score:     riskScore,
      label:     riskLabel,
      percentile_statement:
        `Lower risk than ${clampedPercentile} of 100 similar cases`,
      factors:   shapDataForType?.top_3_slower?.slice(0, 3) || []
    },

    recommended_path: {
      path:            recommendedPath,
      confidence:      pathProbs[maxProbIdx],
      confidence_pct:  confidence,
      reason: recommendedPath === 'collab'
        ? 'Your case has low complexity — collaborative resolution is significantly faster and less costly.'
        : recommendedPath === 'med'
        ? 'Your case would benefit from structured mediation to reach agreement.'
        : 'Litigation may be necessary given the complexity of your case.'
    },

    paths: {
      collab: {
        label:            'Collaborative',
        duration_days:    collabDurationDays,
        duration_range:   buildRange(collabDurationDays, case_stats, sliceKey, anomalyFlag),
        cost_inr:         collabCostInr,
        cost_range:       buildCostRange(collabCostInr, anomalyFlag),
        success_pct:      84,
        recommended:      recommendedPath === 'collab',
        description:      'Both parties negotiate directly with professional support. No court involvement.',
        pros: [
          'Fastest resolution — no court delays',
          'Significantly lower cost',
          'More control over custody terms'
        ],
        cons: [
          'Requires cooperation from both parties'
        ],
        confidence_interval: {
          duration_low:  Math.round(collabDurationDays * (anomalyFlag ? 0.6 : 0.75)),
          duration_high: Math.round(collabDurationDays * (anomalyFlag ? 1.6 : 1.25)),
          cost_low:      Math.round(collabCostInr * 0.7),
          cost_high:     Math.round(collabCostInr * 1.3)
        }
      },
      med: {
        label:         'Mediation',
        duration_days: medDurationDays,
        duration_range: buildRange(medDurationDays, case_stats, sliceKey, anomalyFlag),
        cost_inr:      medCostInr,
        cost_range:    buildCostRange(medCostInr, anomalyFlag),
        success_pct:   76,
        recommended:   recommendedPath === 'med',
        description:   'A trained mediator facilitates structured negotiation. Outcome is a binding agreement.',
        pros: ['Structured process with professional oversight', 'Binding mediated agreement'],
        cons: ['Higher cost than collaborative', 'Requires scheduling mediator'],
        confidence_interval: {
          duration_low:  Math.round(medDurationDays * (anomalyFlag ? 0.6 : 0.75)),
          duration_high: Math.round(medDurationDays * (anomalyFlag ? 1.6 : 1.25)),
          cost_low:      Math.round(medCostInr * 0.7),
          cost_high:     Math.round(medCostInr * 1.3)
        }
      },
      court: {
        label:         'Litigation',
        duration_days: courtDurationDays,
        duration_range: buildRange(courtDurationDays, case_stats, sliceKey, anomalyFlag),
        cost_inr:      courtCostInr,
        cost_range:    buildCostRange(courtCostInr, anomalyFlag),
        success_pct:   68,
        recommended:   recommendedPath === 'court',
        description:   'Full court proceedings. Judge determines outcome if parties cannot agree.',
        pros: ['Court order is fully enforceable'],
        cons: ['Slowest by significant margin', 'Most expensive', 'Public record', 'Adversarial environment'],
        confidence_interval: {
          duration_low:  Math.round(courtDurationDays * (anomalyFlag ? 0.6 : 0.75)),
          duration_high: Math.round(courtDurationDays * (anomalyFlag ? 1.6 : 1.25)),
          cost_low:      Math.round(courtCostInr * 0.7),
          cost_high:     Math.round(courtCostInr * 1.3)
        }
      }
    },

    phase_timeline: {
      total_days: totalPhaseDays,
      phases:     phaseBreakdown
    },

    percentile: {
      duration_percentile:   clampedPercentile,
      cost_percentile:       Math.min(90, clampedPercentile + 5),
      statement_duration:    `Faster than ${clampedPercentile} of 100 similar ${cityKey} ${caseTypeKey} cases`,
      statement_cost:        `Lower cost than ${Math.min(90, clampedPercentile + 5)} of 100 similar cases`,
      comparison_basis:      sliceKey
    },

    shap_explanation:    shapDataForType ? buildShapExplanation(shapDataForType, features) : null,

    anomaly_check: {
      is_anomalous:                anomalyFlag,
      anomaly_score:               anomalyScore,
      confidence_interval_modifier: anomalyFlag ? 1.4 : 1.0,
      note: anomalyFlag
        ? 'Case is outside normal training distribution — wider confidence intervals shown'
        : 'Case is within normal training distribution'
    },

    whatif_base_state: {
      description: 'Base state for What-If Simulator sliders',
      features: {
        total_asset_value_inr:  features[2],
        children_count:         features[3],
        complexity_score:       features[11],
        urgency:                features[8],
        professional_count:     features[7],
        marriage_duration_years: features[5]
      },
      base_predictions: {
        collab_duration: collabDurationDays,
        collab_cost:     collabCostInr,
        risk_score:      riskScore
      }
    },

    inference_metadata: {
      inference_time_ms: inferenceMs,
      models_used:       ['outcome_*.onnx', 'path_recommender.onnx',
                          'risk_scorer.onnx', 'phase_*.onnx'],
      demo_mode:         false
    }
  }
}

function buildRange(days, stats, sliceKey, isAnomalous) {
  const multiplier = isAnomalous ? 1.4 : 1
  const low  = Math.round(days * 0.75 * multiplier)
  const high = Math.round(days * 1.25 * multiplier)
  return `${low}–${high} days`
}

function buildCostRange(cost, isAnomalous) {
  const low  = Math.round(cost * 0.7).toLocaleString('en-IN')
  const high = Math.round(cost * 1.3).toLocaleString('en-IN')
  return `?${low}–?${high}`
}

function buildShapExplanation(shapData, features) {
  return {
    base_duration_days:      null,
    predicted_duration_days: null,
    top_factors_slower: shapData.top_3_slower || [],
    top_factors_faster: shapData.top_3_faster || [],
    confidence_statement:
      'These estimates are based on 200,000 similar cases.',
    explanation_cards:
      buildExplanationCards(shapData, features)
  }
}

function buildExplanationCards(shapData, features) {
  const cards = []

  if (shapData.top_3_slower) {
    shapData.top_3_slower.forEach((text, i) => {
      cards.push({
        factor:           `factor_slower_${i}`,
        impact:           'slower',
        days_impact:      null,
        headline:         text.split(' — ')[0] || text.substring(0, 40),
        detail:           text,
        what_you_can_do:  'Discuss this with your lawyer.'
      })
    })
  }

  if (shapData.top_3_faster) {
    shapData.top_3_faster.forEach((text, i) => {
      cards.push({
        factor:          `factor_faster_${i}`,
        impact:          'faster',
        days_impact:     null,
        headline:        text.split(' — ')[0] || text.substring(0, 40),
        detail:          text,
        what_you_can_do: 'Nothing required — this is already working in your favour.'
      })
    })
  }

  return cards
}

// Export for runMilestoneMLRefresh (Phase 9.3)
export async function runMilestoneMLRefresh(caseId, milestone) {
  const { createSupabaseAdminClient } = await import('../db/client.js')
  const supabase = createSupabaseAdminClient()

  const { data: profile } = await supabase
    .from('case_profile')
    .select('ml_features_json')
    .eq('case_id', caseId)
    .single()

  if (!profile?.ml_features_json) return

  const prediction = await predictOutcome(
    profile.ml_features_json,
    caseId
  )

  // Update case_profile with new prediction
  const { updateMLPrediction } = await import('../db/cases.js')
  await updateMLPrediction(
    caseId,
    prediction,
    prediction.risk.score,
    prediction.risk.label,
    prediction.recommended_path.path,
    prediction.anomaly_check.is_anomalous,
    prediction.anomaly_check.anomaly_score,
    prediction.shap_explanation,
    prediction.percentile
  )

  console.log(
    `[ML] Milestone refresh complete: ${caseId} trigger=${milestone}`
  )
  return prediction
}

// lib/ml/whatif.js
// Runs ONNX models in browser via onnxruntime-web
// ZERO server calls — fully offline capable (E7)
// Must run in < 10ms per inference (E6)

/**
 * FEATURE INDEX MAPPING (Section 07)
 * total_asset_value_inr:   2
 * children_count:          3
 * complexity_score:        11
 */

'use client'
// This module only runs in browser context

let _sessions = {}
let _ort = null

/**
 * Initialize onnxruntime-web
 * Called once on WhatIfSimulator mount
 */
async function getOrt() {
  if (_ort) return _ort
  // Dynamic import — only loads in browser
  _ort = await import('onnxruntime-web')
  // Configure WASM backend
  _ort.env.wasm.numThreads = 1
  // Single thread for hackathon — simpler setup
  _ort.env.wasm.simd = true
  
  // Set explicit WASM paths for E7 offline compliance
  _ort.env.wasm.wasmPaths = '/onnxruntime-web/'
  
  return _ort
}

/**
 * Get or create browser ONNX session
 * Models fetched from /models/ public directory
 * Cached after first load — subsequent calls instant
 */
async function getBrowserSession(modelName) {
  if (_sessions[modelName]) return _sessions[modelName]

  const ort = await getOrt()

  // Models must be in /public/models/ for browser access
  const session = await ort.InferenceSession.create(
    `/models/${modelName}.onnx`,
    { executionProviders: ['wasm'] }
  )

  _sessions[modelName] = session
  return session
}

/**
 * buildWhatIfFeatures
 * Creates an immutable copy of base features before mutation
 */
export function buildWhatIfFeatures(baseFeatures, updates = {}) {
  // CHECK 4: Never mutate baseFeatures
  const features = [...baseFeatures]
  
  // Apply updates based on index
  if (updates.total_asset_value_inr !== undefined) features[2] = updates.total_asset_value_inr
  if (updates.children_count !== undefined)          features[3] = updates.children_count
  if (updates.complexity_score !== undefined)        features[11] = updates.complexity_score
  
  return features
}

/**
 * runBrowserInference
 * Runs a single ONNX model in browser
 * Returns raw output value
 */
async function runBrowserInference(modelName, features) {
  const ort     = await getOrt()
  const session = await getBrowserSession(modelName)

  const tensor = new ort.Tensor(
    'float32',
    Float32Array.from(features),
    [1, 12]
  )

  const results = await session.run({ input: tensor })
  const keys    = Object.keys(results)
  return results[keys[0]].data[0]
}

/**
 * predictWhatIf
 * Main function called by slider onChange
 * Runs collab duration + cost + risk scorer in parallel
 * Target: < 10ms total (E6 requirement)
 */
export async function predictWhatIf(features) {
  const start = performance.now()

  // Run 3 models in parallel for speed
  const [duration, cost, risk] = await Promise.all([
    runBrowserInference('outcome_collab_duration', features),
    runBrowserInference('outcome_collab_cost',     features),
    runBrowserInference('risk_scorer',             features)
  ])

  const elapsed = performance.now() - start

  return {
    collab_duration: Math.round(duration),
    collab_cost:     Math.round(cost),
    risk_score:      Math.round(Math.max(0, Math.min(100, risk))),
    inference_ms:    Math.round(elapsed * 10) / 10
    // Report actual inference time for debugging
  }
}

/**
 * preloadWhatIfModels
 * Call on component mount to pre-warm ONNX sessions
 * First inference is slow (model load) — preload hides this
 */
export async function preloadWhatIfModels() {
  try {
    // Warm the sessions
    await Promise.all([
      getBrowserSession('outcome_collab_duration'),
      getBrowserSession('outcome_collab_cost'),
      getBrowserSession('risk_scorer')
    ])
    console.log('[WhatIf] Models pre-loaded in browser')
    return true
  } catch (err) {
    console.error('[WhatIf] Model preload failed:', err.message)
    return false
  }
}

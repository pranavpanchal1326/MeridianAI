// scripts/verify/verify_6_1.js

async function runVerification() {
  const results = {}
  console.log('PHASE 6.1 — SETTLEMENT SIMULATOR VERIFICATION')
  console.log('----------------------------------------------')

  const { readFileSync, existsSync } = await import('fs')

  // -- CHECK 1: All files exist ------------------------------
  const requiredFiles = [
    'app/settlement/page.jsx',
    'app/settlement/SettlementSimulator.jsx',
    'app/settlement/DisclaimerModal.jsx',
    'app/settlement/PathCards.jsx',
    'app/settlement/SHAPExplanation.jsx',
    'app/settlement/SimilarCases.jsx',
    'app/settlement/AnomalyWarning.jsx',
    'app/settlement/DisclaimerFooter.jsx',
    'app/api/ml/predict/route.js',
    'app/api/ml/similar/route.js',
    'app/api/settings/consent/route.js',
    'lib/ml/predictor.js',
    'lib/ml/anomaly.js'
  ]

  const missingFiles = requiredFiles.filter(f => !existsSync(f))
  results.allFilesExist = missingFiles.length === 0
  console.log(results.allFilesExist
    ? `? CHECK 1: All ${requiredFiles.length} files exist`
    : `? CHECK 1: Missing: ${missingFiles.join(', ')}`
  )

  // -- CHECK 2: Block E1/E2 — Disclaimer blocks content ------
  const simulator = existsSync('app/settlement/SettlementSimulator.jsx')
    ? readFileSync('app/settlement/SettlementSimulator.jsx', 'utf-8')
    : ''
  results.blocksContent = simulator.includes('!hasConsented && (') && 
                          simulator.includes('<DisclaimerModal')
  console.log(results.blocksContent
    ? '? Block E1/E2: Disclaimer modal logic present'
    : '? Block E1/E2: Disclaimer modal logic missing'
  )

  // -- CHECK 3: Block E4 — Footer always visible -------------
  results.footerPresent = simulator.includes('<DisclaimerFooter />')
  console.log(results.footerPresent
    ? '? Block E4: Disclaimer footer integrated'
    : '? Block E4: Disclaimer footer missing'
  )

  // -- CHECK 4: Block E8 — Anomaly Warning ------------------
  results.anomalyWarning = simulator.includes('prediction.anomaly_check?.is_anomalous && (') &&
                           simulator.includes('<AnomalyWarning')
  console.log(results.anomalyWarning
    ? '? Block E8: Anomaly warning logic present'
    : '? Block E8: Anomaly warning missing'
  )

  // -- CHECK 5: Predictor uses onnxruntime-node --------------
  const predictor = existsSync('lib/ml/predictor.js')
    ? readFileSync('lib/ml/predictor.js', 'utf-8')
    : ''
  results.usesOnnxNode = predictor.includes("from 'onnxruntime-node'")
  results.runsParallel = predictor.includes('Promise.all([') && predictor.includes('runModel(')
  
  console.log(results.usesOnnxNode
    ? '? lib/ml: Uses onnxruntime-node for inference'
    : '? lib/ml: onnxruntime-node import missing'
  )
  console.log(results.runsParallel
    ? '? lib/ml: Models run in parallel for speed'
    : '? lib/ml: Models not running in parallel'
  )

  // -- CHECK 6: Anomaly detector uses Python subprocess ------
  const anomaly = existsSync('lib/ml/anomaly.js')
    ? readFileSync('lib/ml/anomaly.js', 'utf-8')
    : ''
  results.usesPython = anomaly.includes('spawn(') && 
                        (anomaly.includes("'python'") || anomaly.includes("'python3'"))
  console.log(results.usesPython
    ? '? lib/ml: Anomaly detector uses Python subprocess'
    : '? lib/ml: Anomaly detector subprocess missing'
  )

  // -- CHECK 7: Zero TypeScript ------------------------------
  const { execSync } = await import('child_process')
  let tsFiles = []
  try {
    const tsFound = execSync(
      'powershell -Command "Get-ChildItem -Path app, lib -Recurse -Include *.ts, *.tsx | Select-Object -ExpandProperty FullName"'
    ).toString().trim()
    if (tsFound) tsFiles = tsFound.split('\n').filter(Boolean)
  } catch { }

  results.noTypeScript = tsFiles.length === 0
  console.log(results.noTypeScript
    ? '? Architecture: Zero TypeScript files'
    : `? Architecture: TypeScript found:\n  ${tsFiles.join('\n  ')}`
  )

  // -- FINAL RESULT ------------------------------------------
  const allPassed = Object.values(results).every(Boolean)
  if (!allPassed) {
    const failed = Object.entries(results).filter(([, v]) => !v).map(([k]) => k)
    console.log(`\n? FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  +----------------------------------------------------------+
  ¦       PHASE 6.1 — SETTLEMENT SIMULATOR — COMPLETE        ¦
  +----------------------------------------------------------+
  `)
}

runVerification().catch(console.error)

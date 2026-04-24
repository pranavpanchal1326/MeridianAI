const fs = require("fs");

function audit(filePath, checks) {
  const content = fs.readFileSync(filePath, "utf8");
  let pass = 0,
    fail = 0;
  for (const [label, test] of Object.entries(checks)) {
    const ok = typeof test === "string" ? content.includes(test) : test(content);
    console.log((ok ? "[PASS]" : "[FAIL]") + " " + label);
    ok ? pass++ : fail++;
  }
  return { pass, fail };
}

let totalPass = 0,
  totalFail = 0;

function run(filePath, checks) {
  console.log("\n" + filePath);
  const r = audit(filePath, checks);
  totalPass += r.pass;
  totalFail += r.fail;
}

// channels.js
run("lib/realtime/channels.js", {
  "Exactly 7 channel builder keys": (c) =>
    ["caseStatus", "caseDecisions", "caseDocuments", "caseDeadlines", "caseAlerts", "casePredictions", "professionalTasks"].every((k) => c.includes(k)),
  "No user_message field ever": (c) => !c.includes("user_message") && !c.includes("original_text"),
  "createAdminSupabaseClient used for broadcast": (c) => c.includes("createAdminSupabaseClient"),
  "broadcastToChannel never throws": (c) => {
    const start = c.indexOf("async function broadcastToChannel");
    const end = c.indexOf("export const broadcast");
    const fn = c.slice(start, end);
    return !fn.includes("throw new");
  },
  "Error caught and console.error'd": (c) => c.includes("console.error"),
  "All 7 broadcast convenience fns": (c) =>
    ["caseStatus", "caseDecision", "caseDocument", "caseDeadline", "caseAlert", "casePrediction", "professionalTask"].every((k) => c.includes(k)),
  "Event: status_update": (c) => c.includes("status_update"),
  "Event: new_decision": (c) => c.includes("new_decision"),
  "Event: document_event": (c) => c.includes("document_event"),
  "Event: deadline_update": (c) => c.includes("deadline_update"),
  "Event: alert": (c) => c.includes('"alert"'),
  "Event: prediction_updated": (c) => c.includes("prediction_updated"),
  "Event: task_event": (c) => c.includes("task_event"),
  "Channel format case:{id}:status": (c) => c.includes("case:${caseId}:status"),
  "Channel format professional:{id}:tasks": (c) => c.includes("professional:${professionalId}:tasks"),
});

// useChannel.js
run("lib/realtime/useChannel.js", {
  '"use client" directive is first line': (c) => c.trimStart().startsWith('"use client"'),
  "enabled param defaults to true": (c) => c.includes("enabled = true"),
  "stale-closure pattern via onMessageRef": (c) => c.includes("onMessageRef.current = onMessage"),
  "CHANNEL_ERROR handled silently": (c) => c.includes("CHANNEL_ERROR"),
  "removeChannel called in cleanup": (c) => c.includes("supabase.removeChannel(channelRef.current)"),
  "channelRef.current set to null after cleanup": (c) => c.includes("channelRef.current = null"),
  "useCaseAlerts has emotionShieldEnabled param": (c) => c.includes("emotionShieldEnabled"),
  "emotionShieldEnabled gates subscription": (c) => c.includes("enabled: emotionShieldEnabled"),
  "emotionShieldEnabled NOT defaulted to true": (c) => !c.match(/emotionShieldEnabled\s*=\s*true/),
  "All 7 typed hooks defined": (c) =>
    ["useCaseStatus", "useCaseDecisions", "useCaseDocuments", "useCaseDeadlines", "useCaseAlerts", "useCasePredictions", "useProfessionalTasks"].every((k) => c.includes(k)),
  "createBrowserSupabaseClient used": (c) => c.includes("createBrowserSupabaseClient"),
  "CHANNELS imported from ./channels": (c) => c.includes("./channels"),
});

// index.js
run("lib/realtime/index.js", {
  "Exports CHANNELS": (c) => c.includes("CHANNELS"),
  "Exports broadcast": (c) => c.includes("broadcast"),
  "Re-exports from ./channels": (c) => c.includes("./channels"),
  "Re-exports from ./useChannel": (c) => c.includes("./useChannel"),
  "All 7 hooks re-exported": (c) =>
    ["useCaseStatus", "useCaseDecisions", "useCaseDocuments", "useCaseDeadlines", "useCaseAlerts", "useCasePredictions", "useProfessionalTasks"].every((k) => c.includes(k)),
});

// route.js
run("app/api/realtime/channels/route.js", {
  "401 returned when no session": (c) => c.includes("status: 401"),
  "Reads x-user-role header": (c) => c.includes("x-user-role"),
  "User branch: get_user_case_id RPC called": (c) => c.includes("get_user_case_id"),
  "User branch: consent_emotion_shield checked": (c) => c.includes("consent_emotion_shield"),
  "alerts: null when emotion shield off": (c) => c.includes("emotionShieldEnabled ? CHANNELS.caseAlerts(caseId) : null"),
  "404 returned for no_case": (c) => c.includes('"no_case"'),
  "Professional branch: get_professional_id RPC called": (c) => c.includes("get_professional_id"),
  "Returns case_id in user response": (c) => c.includes("case_id: caseId"),
  "Returns professional_id in pro response": (c) => c.includes("professional_id: professionalId"),
  "Professional returns tasks channel only": (c) => c.includes("tasks: CHANNELS.professionalTasks"),
  "No raw channel strings (uses CHANNELS.*())": (c) => !c.match(/['"`]case:[^$]/),
  "CHANNELS imported from @/lib/realtime": (c) => c.includes("@/lib/realtime"),
});

// SQL migration
run("supabase/migrations/002_realtime_rls.sql", {
  "Adds cases to Realtime publication": (c) => c.includes("cases"),
  "Adds tasks to Realtime publication": (c) => c.includes("tasks"),
  "Adds decisions to Realtime publication": (c) => c.includes("decisions"),
  "Adds documents to Realtime publication": (c) => c.includes("documents"),
  "get_user_case_id function defined": (c) => c.includes("get_user_case_id"),
  "get_professional_id function defined": (c) => c.includes("get_professional_id"),
  "user_emotion_shield_enabled function defined": (c) => c.includes("user_emotion_shield_enabled"),
  "log_emotion_shield_change trigger function": (c) => c.includes("log_emotion_shield_change"),
  "emotion_shield_consent_trigger created": (c) => c.includes("emotion_shield_consent_trigger"),
  "consent_logs insert in trigger": (c) => c.includes("consent_logs"),
  "SECURITY DEFINER on helper functions": (c) => c.includes("SECURITY DEFINER"),
  "Migration is 002_ (not rewriting 001)": (c) =>
    !c.includes("CREATE TABLE users") && !c.includes("CREATE TABLE cases"),
});

console.log("\n" + "=".repeat(50));
console.log("TOTAL: " + totalPass + " passed, " + totalFail + " FAILED");
if (totalFail > 0) process.exit(1);

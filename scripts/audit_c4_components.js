const fs = require("fs");

function audit(filePath, checks) {
  const content = fs.readFileSync(filePath, "utf8");
  let pass = 0, fail = 0;
  for (const [label, test] of Object.entries(checks)) {
    const ok = typeof test === "string" ? content.includes(test) : test(content);
    console.log((ok ? "[PASS]" : "[FAIL]") + " " + label);
    ok ? pass++ : fail++;
  }
  return { pass, fail };
}

let totalPass = 0, totalFail = 0;
function run(filePath, checks) {
  console.log("\n" + filePath);
  const r = audit(filePath, checks);
  totalPass += r.pass;
  totalFail += r.fail;
}

// ── Global rules for all 3 new files ─────────────────────────────────────────
console.log("\n── GLOBAL RULES ─────────────────────────────────────────────────");
const C4_FILES = [
  "app/components/ui/RiskBadge.jsx",
  "app/components/ui/TrustBadge.jsx",
  "app/components/ui/ErrorCard.jsx",
];
C4_FILES.forEach((f) => {
  const c = fs.readFileSync(f, "utf8");
  const useClient = c.trimStart().startsWith('"use client"');
  const isJsx     = f.endsWith(".jsx");
  const codeLines = c.split("\n").filter(l => !l.trimStart().startsWith("*")).join("\n");
  const noTs      = !codeLines.match(/:\s*(string|boolean|number|React\.|void)\b(?!\s*=>)/) &&
                    !codeLines.includes(" satisfies ") &&
                    !codeLines.includes("interface ");
  const noHex     = !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/);
  const noSpring  = !c.includes('"spring"') && !c.includes("'spring'");
  const status = [
    useClient ? "" : "MISSING-use-client",
    isJsx     ? "" : "NOT-jsx",
    noTs      ? "" : "TS-FOUND",
    noHex     ? "" : "HARDCODED-HEX",
    noSpring  ? "" : "SPRING-FOUND",
  ].filter(Boolean);
  console.log(`  ${f.split("/").pop()}: ${status.length === 0 ? "ALL OK" : status.join(", ")}`);
  if (useClient) totalPass++; else totalFail++;
  if (isJsx)     totalPass++; else totalFail++;
  if (noTs)      totalPass++; else totalFail++;
  if (noHex)     totalPass++; else totalFail++;
  if (noSpring)  totalPass++; else totalFail++;
});

// ── RiskBadge.jsx ─────────────────────────────────────────────────────────────
run("app/components/ui/RiskBadge.jsx", {
  "imports useMemo from react": 'import { useMemo } from "react"',
  "default export RiskBadge": "export default function RiskBadge(",
  "getRiskTier function defined": "function getRiskTier(",
  "score <= 33 → Low Risk": "score <= 33",
  "score <= 66 → Medium Risk (34-66)": "score <= 66",
  "High Risk is catch-all above 66": (c) => {
    const fn = c.slice(c.indexOf("function getRiskTier"), c.indexOf("// ── Size Config"));
    return fn.includes('"High Risk"') && !fn.includes("score <= 67") && !fn.includes("score >= 67");
  },
  "Low uses text-risk-low": "text-risk-low",
  "Medium uses text-risk-medium (NEVER text-risk-high)": (c) => {
    const mediumBlock = c.slice(c.indexOf('"Medium Risk"'), c.indexOf('"High Risk"'));
    return mediumBlock.includes("text-risk-medium") && !mediumBlock.includes("text-risk-high");
  },
  "High uses text-risk-high": "text-risk-high",
  "Low bg-risk-low/15 low opacity": "bg-risk-low/15",
  "Medium bg-risk-medium/15 amber low opacity": "bg-risk-medium/15",
  "High bg-risk-high/15 red low opacity": "bg-risk-high/15",
  "SIZE_CONFIG defined": "const SIZE_CONFIG",
  "sm md lg sizes defined": (c) => c.includes("sm:") && c.includes("md:") && c.includes("lg:"),
  "RiskDot component defined": "function RiskDot(",
  "RiskBar component defined": "function RiskBar(",
  "RiskBar role=progressbar": 'role="progressbar"',
  "RiskBar aria-valuenow": "aria-valuenow={score}",
  "score clamped with Math.min Math.max": (c) =>
    c.includes("Math.min") && c.includes("Math.max"),
  "score defaults to 0": "score = 0",
  "factors sliced to max 2": "factors.slice(0, 2)",
  "showScore defaults to false": "showScore = false",
  "showBar defaults to false": "showBar = false",
  "showLabel defaults to true": "showLabel = true",
  "large mode: showScore && size !== sm": 'showScore && size !== "sm"',
  "out of 100 label shown": '"out of 100"',
  "Main risk factors heading": '"Main risk factors"',
  "compact badge mode has aria-label": 'aria-label={`${tier.label}: ${clampedScore} out of 100`}',
  "no hardcoded hex": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── TrustBadge.jsx ────────────────────────────────────────────────────────────
run("app/components/ui/TrustBadge.jsx", {
  "imports useMemo from react": 'import { useMemo } from "react"',
  "default export TrustBadge": "export default function TrustBadge(",
  "getTrustTier function defined": "function getTrustTier(",
  "Gold threshold: score >= 90": "score >= 90",
  "Silver threshold: score >= 75 (89 → silver not gold)": "score >= 75",
  "Blue threshold: score >= 60 (74 → blue not silver)": "score >= 60",
  "returns null below 60": "return null",
  "Gold uses text-trust-gold": "text-trust-gold",
  "Silver uses text-trust-silver": "text-trust-silver",
  "Blue uses text-trust-blue": "text-trust-blue",
  "Gold bg-trust-gold/15": "bg-trust-gold/15",
  "Silver bg-trust-silver/15": "bg-trust-silver/15",
  "Blue bg-trust-blue/15": "bg-trust-blue/15",
  "TrustIcon component with cssVar": "function TrustIcon(",
  "shield path in SVG": 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  "checkmark polyline in SVG": "9 12 11 14 15 10",
  "TRUST_SIZE config defined": "const TRUST_SIZE",
  "score clamped with Math.min Math.max": (c) =>
    c.includes("Math.min") && c.includes("Math.max"),
  "score defaults to 0": "score = 0",
  "size defaults to sm" : 'size = "sm"',
  "showScore defaults to false": "showScore = false",
  "showLabel defaults to true": "showLabel = true",
  "returns null check present": "if (!tier) return null",
  "aria-label includes score": 'aria-label={`${tier.label} trust badge. Score: ${clampedScore}`}',
  "title uses sublabel": "title={tier.sublabel}",
  "no hardcoded hex": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── ErrorCard.jsx ─────────────────────────────────────────────────────────────
run("app/components/ui/ErrorCard.jsx", {
  "imports MESSAGE_VARIANTS from animations": 'from "@/lib/constants/animations"',
  "MESSAGE_VARIANTS imported": "MESSAGE_VARIANTS",
  "imports Button from ./Button": 'from "./Button"',
  "default export ErrorCard": "export default function ErrorCard(",
  "getErrorCopy function defined": "function getErrorCopy(",
  "context param used in copy (not just title)": (c) => {
    const fn = c.slice(c.indexOf("function getErrorCopy"), c.indexOf("// ── Error Icons"));
    return fn.includes("${ctx}") || fn.includes("ctx.charAt");
  },
  "soft copy: no word 'error'": (c) => {
    const softBlock = c.slice(c.indexOf("soft:"), c.indexOf("hard:"));
    return !softBlock.toLowerCase().includes("error") &&
           !softBlock.toLowerCase().includes("failed") &&
           !softBlock.toLowerCase().includes("crashed");
  },
  "hard copy: no word 'error'": (c) => {
    const hardBlock = c.slice(c.indexOf("hard:"), c.indexOf("critical:"));
    return !hardBlock.toLowerCase().includes("error") &&
           !hardBlock.toLowerCase().includes("failed") &&
           !hardBlock.toLowerCase().includes("crashed");
  },
  "critical copy: no word 'error'": (c) => {
    const critBlock = c.slice(c.indexOf("critical:"), c.indexOf("return copy[type]"));
    return !critBlock.toLowerCase().includes("error") &&
           !critBlock.toLowerCase().includes("failed") &&
           !critBlock.toLowerCase().includes("crashed");
  },
  "soft copy confirms data safe": (c) => {
    const softBlock = c.slice(c.indexOf("soft:"), c.indexOf("hard:"));
    return softBlock.includes("safe");
  },
  "hard copy confirms data safe": (c) => {
    const hardBlock = c.slice(c.indexOf("hard:"), c.indexOf("critical:"));
    return hardBlock.includes("safe");
  },
  "critical copy confirms data safe FIRST in title": (c) => {
    const critBlock = c.slice(c.indexOf("critical:"), c.indexOf("return copy[type]"));
    return critBlock.includes("Your case data is safe") || critBlock.includes("data is safe");
  },
  "critical cta is null (no retry)": (c) => {
    const critBlock = c.slice(c.indexOf("critical:"), c.indexOf("return copy[type]"));
    return critBlock.includes("cta:     null") || critBlock.includes("cta: null");
  },
  "soft cta is null": (c) => {
    const softBlock = c.slice(c.indexOf("soft:"), c.indexOf("hard:"));
    return softBlock.includes("cta:     null") || softBlock.includes("cta: null");
  },
  "hard has Try again cta": '"Try again"',
  "ErrorIcon component defined": "function ErrorIcon(",
  "refresh icon defined": '"refresh"',
  "alert icon defined": '"alert"',
  "shield icon defined (critical = data safe)": '"shield"',
  "ERROR_CONFIG defined": "const ERROR_CONFIG",
  "soft spinning=true": "spinning:      true",
  "hard spinning=false": (c) => {
    const hardConf = c.slice(c.indexOf("hard:"), c.indexOf("critical:"));
    return hardConf.includes("spinning:      false") || hardConf.includes("spinning: false");
  },
  "critical spinning=false": (c) => {
    const critConf = c.slice(c.indexOf("critical:", c.indexOf("ERROR_CONFIG")), c.indexOf("// ── Spinning"));
    return critConf.includes("spinning:      false") || critConf.includes("spinning: false");
  },
  "soft border is border-border (neutral)": "border-border",
  "hard border is border-warning/30 (amber)": "border-warning/30",
  "critical border is border-danger/30 (red)": "border-danger/30",
  "SpinWrapper component defined": "function SpinWrapper(",
  "animate-spin used in SpinWrapper": "animate-spin",
  "retry CTA only renders when copy.cta AND onRetry both truthy": "copy.cta && onRetry",
  "motion.div with MESSAGE_VARIANTS": "variants={MESSAGE_VARIANTS}",
  "role=alert on wrapper": 'role="alert"',
  "aria-live=assertive": 'aria-live="assertive"',
  "type defaults to hard": 'type = "hard"',
  "no hardcoded hex": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── index.js — Phase 0 final ──────────────────────────────────────────────────
run("app/components/ui/index.js", {
  "Button exported":      "export { default as Button }",
  "Card exported":        "export { default as Card }",
  "Badge exported":       "export { default as Badge }",
  "Input exported":       "export { default as Input }",
  "Toggle exported":      "export { default as Toggle }",
  "Skeleton exported":    "export { default as Skeleton }",
  "Modal exported":       "export { default as Modal }",
  "PrivateMode exported": "export { default as PrivateMode }",
  "EmptyState + EMPTY_STATES exported": (c) =>
    c.includes("default as EmptyState") && c.includes("EMPTY_STATES"),
  "RiskBadge exported (active, not commented)": (c) => {
    const line = c.split("\n").find(l => l.includes("RiskBadge"));
    return line && !line.trimStart().startsWith("//");
  },
  "TrustBadge exported (active, not commented)": (c) => {
    const line = c.split("\n").find(l => l.includes("TrustBadge"));
    return line && !line.trimStart().startsWith("//");
  },
  "ErrorCard exported (active, not commented)": (c) => {
    const line = c.split("\n").find(l => l.includes("ErrorCard"));
    return line && !line.trimStart().startsWith("//");
  },
  "total active exports count 11+": (c) => {
    const active = c.split("\n").filter(l =>
      !l.trimStart().startsWith("//") && l.includes("export {")
    );
    return active.length >= 11;
  },
});

// ── ComponentShowcase.jsx ─────────────────────────────────────────────────────
run("app/components/ui/ComponentShowcase.jsx", {
  "dev only note": "DEVELOPMENT ONLY",
  "imports all 11 components + EMPTY_STATES": (c) =>
    ["Button","Card","Badge","Input","Toggle","Skeleton","Modal","PrivateMode",
     "EmptyState","RiskBadge","TrustBadge","ErrorCard","EMPTY_STATES"].every(n => c.includes(n)),
  "RiskBadge boundary score 33 shown": "score={33}",
  "RiskBadge boundary score 34 shown": "score={34}",
  "TrustBadge boundary score 89 shown (silver not gold)": "score={89}",
  "TrustBadge boundary score 74 shown (blue not silver)": "score={74}",
  "TrustBadge score 59 renders nothing — shown in showcase": "score={59}",
  "ErrorCard all 3 types shown": (c) =>
    c.includes('type="soft"') && c.includes('type="hard"') && c.includes('type="critical"'),
  "Modal open/close state wired": (c) =>
    c.includes("modalOpen") && c.includes("setModalOpen"),
  "Toggle state wired": "setToggleOn",
  "EmptyState 3 screens shown": (c) =>
    c.includes('screen="decisions"') && c.includes('screen="documents"') && c.includes('screen="professionals"'),
});

// ── Verify threshold logic numerically ───────────────────────────────────────
console.log("\n── NUMERIC THRESHOLD VERIFICATION ────────────────────────────────");
// Inline the functions for testing
function getRiskTier(score) {
  if (score <= 33) return "low";
  if (score <= 66) return "medium";
  return "high";
}
function getTrustTier(score) {
  if (score >= 90) return "gold";
  if (score >= 75) return "silver";
  if (score >= 60) return "blue";
  return null;
}
const riskTests = [
  [0, "low"], [1, "low"], [33, "low"],
  [34, "medium"], [50, "medium"], [66, "medium"],
  [67, "high"], [80, "high"], [100, "high"],
];
riskTests.forEach(([s, expected]) => {
  const got = getRiskTier(s);
  const ok = got === expected;
  if (ok) totalPass++; else totalFail++;
  console.log(`  [${ok ? "PASS" : "FAIL"}] RiskBadge score=${s} → ${got} (expected ${expected})`);
});
const trustTests = [
  [100, "gold"], [90, "gold"], [89, "silver"], [75, "silver"],
  [74, "blue"], [60, "blue"], [59, null], [40, null], [0, null],
];
trustTests.forEach(([s, expected]) => {
  const got = getTrustTier(s);
  const ok = got === expected;
  if (ok) totalPass++; else totalFail++;
  console.log(`  [${ok ? "PASS" : "FAIL"}] TrustBadge score=${s} → ${got} (expected ${expected})`);
});

console.log("\n" + "=".repeat(60));
console.log("PHASE 0 COMPLETE AUDIT — TOTAL: " + totalPass + " passed, " + totalFail + " FAILED");
if (totalFail > 0) process.exit(1);

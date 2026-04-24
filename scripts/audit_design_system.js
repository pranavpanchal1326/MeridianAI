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

// ── globals.css ──────────────────────────────────────────────────────────────
run("app/globals.css", {
  "@import tailwindcss": '@import "tailwindcss"',
  "--bg-primary is #0F0F13 (not #000000 or #111111)": (c) =>
    c.includes("--bg-primary:   #0F0F13") && !c.includes("--bg-primary:   #000") && !c.includes("--bg-primary:   #111"),
  "--bg-surface is #1A1A24": "--bg-surface:   #1A1A24",
  "--bg-raised is #242433": "--bg-raised:    #242433",
  "--bg-overlay is #2E2E42": "--bg-overlay:   #2E2E42",
  "--accent is #6C63FF": "--accent:       #6C63FF",
  "--accent-dim is #4A43B8": "--accent-dim:   #4A43B8",
  "--accent-glow is #6C63FF22 (low opacity, not full)": (c) =>
    c.includes("--accent-glow:  #6C63FF22") && !c.includes("--accent-glow:  #6C63FF;"),
  "--text-primary is #F8F8FF (ghost white, not #FFFFFF)": (c) =>
    c.includes("--text-primary:   #F8F8FF") && !c.includes("--text-primary:   #FFFFFF"),
  "--text-secondary is #94A3B8": "--text-secondary: #94A3B8",
  "--text-muted is #64748B": "--text-muted:     #64748B",
  "--warning is #F59E0B amber (NOT red)": "--warning:      #F59E0B",
  "--danger is #EF4444 (critical only)": "--danger:       #EF4444",
  "--border is #2A2A3A": "--border:         #2A2A3A",
  "--border-focus is #6C63FF55": "--border-focus:   #6C63FF55",
  "--trust-gold, silver, blue defined": (c) =>
    c.includes("--trust-gold") && c.includes("--trust-silver") && c.includes("--trust-blue"),
  "--risk-low, medium, high defined": (c) =>
    c.includes("--risk-low") && c.includes("--risk-medium") && c.includes("--risk-high"),
  "--radius-sm md lg xl full defined": (c) =>
    ["--radius-sm:   6px", "--radius-md:   12px", "--radius-lg:   16px", "--radius-xl:   24px", "--radius-full: 9999px"].every(v => c.includes(v)),
  "--t-micro 150ms": "--t-micro:     150ms",
  "--t-page 300ms": "--t-page:      300ms",
  "--t-ai 800ms": "--t-ai:        800ms",
  "--t-emergency 100ms (not 150ms)": (c) => c.includes("--t-emergency: 100ms") && !c.includes("--t-emergency: 150ms"),
  "--t-emotion 400ms": "--t-emotion:   400ms",
  "--z-private is 9999 highest": "--z-private:   9999",
  "@theme block exists (Tailwind v4)": "@theme {",
  "skeleton-pulse animation 800ms": "skeleton-pulse var(--t-ai) ease-in-out infinite",
  "section-updated animation defined": "section-updated 1.5s ease-out forwards",
  "private-mode-overlay class defined": ".private-mode-overlay",
  "z-index var(--z-private) in overlay": "z-index: var(--z-private)",
  "accent-glow-border class defined": ".accent-glow-border",
  "card-base class defined": ".card-base",
  "scrollbar styled thin 6px": "width: 6px",
  "focus-visible ring uses accent": "outline: 2px solid var(--accent)",
  "focus not focus-visible outline none": ":focus:not(:focus-visible)",
  "selection uses accent-glow": "background: var(--accent-glow)",
  "font-mono class defined": ".font-mono",
  "JetBrains Mono font-family in mono class": 'font-family: var(--font-jetbrains-mono)',
  "body uses --font-inter variable": "font-family: var(--font-inter)",
  "antialiased rendering set": "-webkit-font-smoothing: antialiased",
  "no pure white #FFFFFF as text": (c) => !c.match(/color:\s*#FFFFFF/),
  "no red used for warnings": (c) => {
    const warningSection = c.slice(c.indexOf("--warning"), c.indexOf("--warning") + 30);
    return !warningSection.includes("#EF") && !warningSection.includes("#FF0000");
  },
});

// ── tailwind.config.js ───────────────────────────────────────────────────────
run("tailwind.config.js", {
  "content includes app/**/*.{js,jsx}": './app/**/*.{js,jsx}',
  "content includes lib/**/*.{js,jsx}": './lib/**/*.{js,jsx}',
  "no hardcoded hex color values": (c) => !c.match(/#[0-9A-Fa-f]{6}/),
  "export default config present": "export default config",
});

// ── lib/constants/animations.js ──────────────────────────────────────────────
run("lib/constants/animations.js", {
  "TRANSITIONS exported": "export const TRANSITIONS",
  "micro is 0.15": "duration: 0.15",
  "page is 0.30": "duration: 0.30",
  "aiLoad is 0.80": "duration: 0.80",
  "emergency is 0.10 (not 0.15)": (c) => c.includes("duration: 0.10") && !c.match(/emergency.*duration: 0\.15/),
  "emotion is 0.40": "duration: 0.40",
  "FORBIDDEN_EASINGS exported": "export const FORBIDDEN_EASINGS",
  "spring in FORBIDDEN_EASINGS": '"spring"',
  "bounce in FORBIDDEN_EASINGS": '"bounce"',
  "elastic in FORBIDDEN_EASINGS": '"elastic"',
  "backIn backOut in FORBIDDEN_EASINGS": (c) => c.includes('"backIn"') && c.includes('"backOut"'),
  "PAGE_VARIANTS exported": "export const PAGE_VARIANTS",
  "MESSAGE_VARIANTS exported": "export const MESSAGE_VARIANTS",
  "EMOTION_ALERT_VARIANTS exported": "export const EMOTION_ALERT_VARIANTS",
  "MODAL_OVERLAY_VARIANTS exported": "export const MODAL_OVERLAY_VARIANTS",
  "MODAL_CONTENT_VARIANTS exported": "export const MODAL_CONTENT_VARIANTS",
  "PRIVATE_MODE_VARIANTS exported": "export const PRIVATE_MODE_VARIANTS",
  "CARD_HOVER exported (barely perceptible 1.005)": (c) => c.includes("scale: 1.005"),
  "LOADING_MESSAGES.intake has 3 strings": (c) => {
    const section = c.slice(c.indexOf("intake:"), c.indexOf("mlPrediction:"));
    return (section.match(/\".*\.\.\.\"/g) || []).length === 3;
  },
  "LOADING_MESSAGES.whatIf has 1 string": (c) => c.includes('"Recalculating..."'),
  "no spring easing used in transitions": (c) => !c.match(/ease:\s*"spring"/),
  "no bounce easing used in transitions": (c) => !c.match(/ease:\s*"bounce"/),
  "no elastic easing used in transitions": (c) => !c.match(/ease:\s*"elastic"/),
});

// ── app/layout.jsx ────────────────────────────────────────────────────────────
run("app/layout.jsx", {
  "imports Inter from next/font/google": 'import { Inter, JetBrains_Mono } from "next/font/google"',
  "imports globals.css": 'import "./globals.css"',
  "--font-inter variable set": 'variable: "--font-inter"',
  "--font-jetbrains-mono variable set": 'variable: "--font-jetbrains-mono"',
  "Inter weights 400 500 600 700 800": (c) => {
    const section = c.slice(c.indexOf("Inter("), c.indexOf("JetBrains_Mono("));
    return ["400", "500", "600", "700", "800"].every(w => section.includes(w));
  },
  "JetBrains Mono weight 400 ONLY (not 500+)": (c) => {
    const section = c.slice(c.indexOf("JetBrains_Mono("), c.indexOf("export const metadata"));
    return section.includes('"400"') && !section.includes('"500"') && !section.includes('"700"');
  },
  "display swap for both fonts": (c) => (c.match(/display: "swap"/g) || []).length === 2,
  "metadata title correct": 'title: "UnwindAI',
  "robots noindex nofollow (private product)": (c) =>
    c.includes("index: false") && c.includes("follow: false"),
  "maximumScale: 1 — prevents mobile zoom on inputs": "maximumScale: 1",
  "userScalable: false": "userScalable: false",
  "themeColor matches --bg-primary #0F0F13": 'themeColor: "#0F0F13"',
  "appleWebApp capable true": "capable: true",
  "statusBarStyle black-translucent": '"black-translucent"',
  "html lang en": 'lang="en"',
  "suppressHydrationWarning on html": "suppressHydrationWarning",
  "inter.variable jetbrainsMono.variable in className": (c) =>
    c.includes("inter.variable") && c.includes("jetbrainsMono.variable"),
  "body has bg-bg-primary class": "bg-bg-primary",
  "body has text-text-primary class": "text-text-primary",
  "body has font-sans class": "font-sans",
  "no Google Analytics script": (c) => !c.includes("gtag") && !c.includes("analytics"),
  "no tracking scripts": (c) =>
    !c.includes("intercom") && !c.includes("hotjar") && !c.includes("segment"),
});

console.log("\n" + "=".repeat(60));
console.log("DESIGN SYSTEM AUDIT — TOTAL: " + totalPass + " passed, " + totalFail + " FAILED");
if (totalFail > 0) process.exit(1);

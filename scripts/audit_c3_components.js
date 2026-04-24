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

// ── Global rule check for all 4 new files ────────────────────────────────────
console.log("\n── GLOBAL RULES ─────────────────────────────────────────────────");
const C3_FILES = [
  "app/components/ui/Skeleton.jsx",
  "app/components/ui/Modal.jsx",
  "app/components/ui/PrivateMode.jsx",
  "app/components/ui/EmptyState.jsx",
];
C3_FILES.forEach((f) => {
  const c = fs.readFileSync(f, "utf8");
  const useClient  = c.trimStart().startsWith('"use client"');
  const isJsx      = f.endsWith(".jsx");
  // Check code lines only (exclude JSDoc comment lines starting with *)
  const codeLines  = c.split("\n").filter(l => !l.trimStart().startsWith("*")).join("\n");
  const noTs       = !codeLines.match(/:\s*(string|boolean|number|React\.|void)\b/) &&
                     !codeLines.includes(" satisfies ") &&
                     !codeLines.includes("interface ");
  const noHex      = !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/);
  const noSpring   = !c.includes('"spring"') && !c.includes("'spring'");

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

// ── Skeleton.jsx ──────────────────────────────────────────────────────────────
run("app/components/ui/Skeleton.jsx", {
  "uses skeleton-pulse class from globals.css": '"skeleton-pulse"',
  "no spinner — no animate-spin": (c) => !c.includes("animate-spin"),
  "SkeletonBlock internal component": "function SkeletonBlock(",
  "SkeletonText internal component": "function SkeletonText(",
  "SkeletonTitle internal component": "function SkeletonTitle(",
  "SkeletonAvatar internal component": "function SkeletonAvatar(",
  "SkeletonCard internal component": "function SkeletonCard(",
  "SkeletonBar internal component": "function SkeletonBar(",
  "SkeletonCircle internal component": "function SkeletonCircle(",
  "default export Skeleton": "export default function Skeleton(",
  "variant='text' handled": 'variant === "text"',
  "variant='title' handled": 'variant === "title"',
  "variant='avatar' handled": 'variant === "avatar"',
  "variant='card' handled": 'variant === "card"',
  "variant='bar' handled": 'variant === "bar"',
  "variant='circle' handled": 'variant === "circle"',
  "SkeletonCard uses card-base class": "card-base",
  "last text line is w-3/4 shorter": "w-3/4",
  "all sub-components aria-hidden": (c) => (c.match(/aria-hidden="true"/g) || []).length >= 6,
  "Skeleton.Block sub-export assigned": "Skeleton.Block  = SkeletonBlock",
  "Skeleton.Text sub-export assigned":  "Skeleton.Text   = SkeletonText",
  "Skeleton.Title sub-export assigned": "Skeleton.Title  = SkeletonTitle",
  "Skeleton.Avatar sub-export assigned":"Skeleton.Avatar = SkeletonAvatar",
  "Skeleton.Card sub-export assigned":  "Skeleton.Card   = SkeletonCard",
  "Skeleton.Bar sub-export assigned":   "Skeleton.Bar    = SkeletonBar",
  "Skeleton.Circle sub-export assigned":"Skeleton.Circle = SkeletonCircle",
  "no hardcoded hex colors": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── Modal.jsx ─────────────────────────────────────────────────────────────────
run("app/components/ui/Modal.jsx", {
  "imports useEffect and useRef from react": (c) =>
    c.includes("useEffect") && c.includes("useRef"),
  "imports AnimatePresence from framer-motion": "AnimatePresence",
  "imports MODAL_OVERLAY_VARIANTS": "MODAL_OVERLAY_VARIANTS",
  "imports MODAL_CONTENT_VARIANTS": "MODAL_CONTENT_VARIANTS",
  "SIZE_MAP defined": "const SIZE_MAP",
  "useFocusTrap hook defined": "function useFocusTrap(",
  "focus trap queries focusable elements": 'querySelectorAll(',
  "Tab key handled in focus trap": 'e.key !== "Tab"',
  "Shift+Tab cycles backward in trap": "e.shiftKey",
  "first element focused on open": "first?.focus()",
  "default export Modal": "export default function Modal(",
  "open defaults to false": "open = false",
  "closeOnOverlayClick defaults to true": "closeOnOverlayClick = true",
  "closeOnEsc defaults to true": "closeOnEsc = true",
  "showCloseButton defaults to true": "showCloseButton = true",
  "previousFocusRef stores element before open": "previousFocusRef.current = document.activeElement",
  "previousFocusRef restores focus on close": "previousFocusRef.current?.focus()",
  "body scroll locked when open": 'document.body.style.overflow = "hidden"',
  "body scroll restored on close": 'document.body.style.overflow = ""',
  "Escape key closes when closeOnEsc=true": 'e.key === "Escape"',
  "closeOnEsc guard: only if true": "!open || !closeOnEsc",
  "overlay click respects closeOnOverlayClick": "closeOnOverlayClick && e.target === e.currentTarget",
  "AnimatePresence wraps modal": "<AnimatePresence>",
  "MODAL_OVERLAY_VARIANTS used on overlay": "variants={MODAL_OVERLAY_VARIANTS}",
  "MODAL_CONTENT_VARIANTS used on content": "variants={MODAL_CONTENT_VARIANTS}",
  "z-index uses CSS var z-modal": 'zIndex: "var(--z-modal)"',
  "role=dialog on overlay": 'role="dialog"',
  "aria-modal=true": 'aria-modal="true"',
  "modal-title id for aria-labelledby": '"modal-title"',
  "close button has aria-label": 'aria-label="Close modal"',
  "bg-bg-surface for content panel": "bg-bg-surface",
  "bg-black/70 overlay backdrop": "bg-black/70 backdrop-blur-sm",
  "no hardcoded hex": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── PrivateMode.jsx ───────────────────────────────────────────────────────────
run("app/components/ui/PrivateMode.jsx", {
  "imports useState useEffect useCallback": (c) =>
    c.includes("useState") && c.includes("useEffect") && c.includes("useCallback"),
  "imports AnimatePresence": "AnimatePresence",
  "imports PRIVATE_MODE_VARIANTS": "PRIVATE_MODE_VARIANTS",
  "ShieldIcon component defined": "function ShieldIcon(",
  "PrivateModeOverlay component defined": "function PrivateModeOverlay(",
  "ShieldButton component defined": "function ShieldButton(",
  "default export PrivateMode": "export default function PrivateMode(",
  "defaultActive = false (ALWAYS false)": (c) =>
    c.includes("defaultActive = false") && !c.includes("defaultActive = true"),
  "uses private-mode-overlay CSS class (not bg-black)": (c) =>
    c.includes('"private-mode-overlay"') && !c.includes('className="bg-black"'),
  "z-index 9999 as inline style number (not Tailwind class)": (c) =>
    c.includes("zIndex: 9999") && !c.includes("z-[9999]"),
  "PRIVATE_MODE_VARIANTS initial=hidden animate=visible exit=hidden": (c) =>
    c.includes('initial="hidden"') && c.includes('animate="visible"') && c.includes('exit="hidden"'),
  "tap anywhere deactivates — onClick on overlay": "onClick={onDeactivate}",
  "keyboard Enter/Space/Escape also deactivates": (c) =>
    c.includes('"Enter"') && c.includes('" "') && c.includes('"Escape"'),
  "AnimatePresence wraps overlay": "<AnimatePresence>",
  "Ctrl+Shift+P shortcut implemented": (c) =>
    c.includes("e.ctrlKey") && c.includes("e.shiftKey") && c.includes('e.key === "P"'),
  "toggle function via useCallback": 'useCallback(() => setIsActive((v) => !v)',
  "activate function defined": "useCallback(() => setIsActive(true)",
  "deactivate function defined": "useCallback(() => setIsActive(false)",
  "ShieldButton fixed bottom-right": "fixed bottom-6 right-6",
  "ShieldButton z-index 50 (below overlay)": "zIndex: 50",
  "role=button on overlay for a11y": 'role="button"',
  "tabIndex=0 on overlay for keyboard": "tabIndex={0}",
  "no hardcoded hex except zinc-800 utility class": (c) =>
    !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── EmptyState.jsx ────────────────────────────────────────────────────────────
run("app/components/ui/EmptyState.jsx", {
  "EMPTY_STATES named export": "export const EMPTY_STATES",
  "exactly 7 screen entries": (c) => {
    const keys = ["decisions","documents","professionals","deadlines","caseDna","settlement","similarCases"];
    return keys.every(k => c.includes(k));
  },
  "decisions copy exact": "No decisions needed right now",
  "decisions description exact": "We will notify you the moment something needs your attention.",
  "documents copy exact": "No documents yet",
  "documents description exact": "Your professionals will request them as your case progresses.",
  "professionals copy exact": "Matching you with the right professionals",
  "professionals description exact": "Usually under 2 hours.",
  "deadlines copy exact": "No upcoming deadlines",
  "deadlines description exact": "Your case is on track.",
  "caseDna copy exact": "Building your case map",
  "caseDna description exact": "About 30 seconds.",
  "settlement copy exact": "Enter your asset details above",
  "settlement description exact": "We will show your path options here.",
  "similarCases copy exact": "Finding cases similar to yours",
  "similarCases description exact": "Searching 200,000 cases...",
  "EmptyIcon component defined": "function EmptyIcon(",
  "all 7 icons defined": (c) =>
    ["inbox","folder","users","clock","map","chart","search"].every(k => c.includes(`${k}:`)),
  "SIZE_MAP with sm md lg": (c) =>
    c.includes("sm:") && c.includes("md:") && c.includes("lg:"),
  "default export EmptyState": "export default function EmptyState(",
  "size defaults to md": 'size = "md"',
  "role=status on wrapper": 'role="status"',
  "aria-live=polite on wrapper": 'aria-live="polite"',
  "action rendered in mt-5 div": "mt-5",
  "falls back to Nothing here yet": '"Nothing here yet"',
  "no hardcoded hex": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── index.js ──────────────────────────────────────────────────────────────────
run("app/components/ui/index.js", {
  "Button exported (0-C2)":     "export { default as Button }",
  "Card exported (0-C2)":       "export { default as Card }",
  "Badge exported (0-C2)":      "export { default as Badge }",
  "Input exported (0-C2)":      "export { default as Input }",
  "Toggle exported (0-C2)":     "export { default as Toggle }",
  "Skeleton exported (0-C3)":   "export { default as Skeleton }",
  "Modal exported (0-C3)":      "export { default as Modal }",
  "PrivateMode exported (0-C3)":"export { default as PrivateMode }",
  "EmptyState default exported": "export { default as EmptyState",
  "EMPTY_STATES named exported": "EMPTY_STATES }",
  "0-C4 RiskBadge still commented": (c) => {
    const line = c.split("\n").find(l => l.includes("RiskBadge"));
    return line && line.trimStart().startsWith("//");
  },
  "0-C4 TrustBadge still commented": (c) => {
    const line = c.split("\n").find(l => l.includes("TrustBadge"));
    return line && line.trimStart().startsWith("//");
  },
  "no broken active imports": (c) => {
    const active = c.split("\n").filter(l =>
      !l.trimStart().startsWith("//") && l.includes("export") && l.includes("from")
    );
    const allowed = ["Button","Card","Badge","Input","Toggle","Skeleton","Modal","PrivateMode","EmptyState","EMPTY_STATES"];
    return active.every(l => allowed.some(n => l.includes(n)));
  },
});

console.log("\n" + "=".repeat(60));
console.log("0-C3 AUDIT — TOTAL: " + totalPass + " passed, " + totalFail + " FAILED");
if (totalFail > 0) process.exit(1);

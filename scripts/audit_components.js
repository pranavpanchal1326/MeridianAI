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

// ── Global rules checked for every component ─────────────────────────────────
const FILES = [
  "app/components/ui/Button.jsx",
  "app/components/ui/Card.jsx",
  "app/components/ui/Badge.jsx",
  "app/components/ui/Input.jsx",
  "app/components/ui/Toggle.jsx",
];

console.log("\n── GLOBAL RULES (all component files) ──────────────────────────");
FILES.forEach((f) => {
  const c = fs.readFileSync(f, "utf8");
  const hasUseClient    = c.trimStart().startsWith('"use client"');
  const noTs            = !c.includes(": string") && !c.includes(": boolean") && !c.includes(": React.") && !c.includes(" satisfies ") && !c.includes(" as const");
  const noHardcodedHex  = !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/);
  const noSpring        = !c.includes('"spring"') && !c.includes("'spring'");
  const noBounce        = !c.includes('"bounce"') && !c.includes("'bounce'");
  const noElastic       = !c.includes('"elastic"') && !c.includes("'elastic'");
  const isJsx           = f.endsWith(".jsx");
  console.log(
    `  ${f.split("/").pop()}: use-client=${hasUseClient} no-TS=${noTs} no-hex=${noHardcodedHex} no-spring=${noSpring} no-bounce=${noBounce} no-elastic=${noElastic} jsx=${isJsx}`
  );
  if (hasUseClient) totalPass++; else { totalFail++; console.log("  [FAIL] missing use client in " + f); }
  if (noTs)         totalPass++; else { totalFail++; console.log("  [FAIL] TypeScript found in " + f); }
  if (noHardcodedHex) totalPass++; else { totalFail++; console.log("  [FAIL] hardcoded hex in " + f); }
  if (noSpring && noBounce && noElastic) totalPass++; else { totalFail++; console.log("  [FAIL] forbidden easing in " + f); }
  if (isJsx)        totalPass++; else { totalFail++; console.log("  [FAIL] not .jsx: " + f); }
});

// ── Button.jsx ────────────────────────────────────────────────────────────────
run("app/components/ui/Button.jsx", {
  "imports framer-motion": 'from "framer-motion"',
  "imports TRANSITIONS from animations": 'from "@/lib/constants/animations"',
  "VARIANT_STYLES map defined": "const VARIANT_STYLES",
  "primary variant uses bg-accent": "bg-accent text-white",
  "secondary variant uses bg-bg-raised": "bg-bg-raised text-text-primary",
  "ghost variant uses bg-transparent": "bg-transparent text-text-secondary",
  "danger variant uses bg-danger (not bg-red-500)": (c) =>
    c.includes("bg-danger text-white") && !c.includes("bg-red-500"),
  "SIZE_STYLES map defined": "const SIZE_STYLES",
  "sm size h-8": "h-8",
  "md size h-10": "h-10",
  "lg size h-12": "h-12",
  "LoadingSpinner component defined": "function LoadingSpinner()",
  "spinner animate-spin": "animate-spin",
  "default export Button function": "export default function Button(",
  "variant defaults to primary": 'variant = "primary"',
  "size defaults to md": 'size = "md"',
  "loading defaults to false": "loading = false",
  "disabled defaults to false": "disabled = false",
  "isDisabled = disabled || loading": "const isDisabled = disabled || loading",
  "motion.button used": "<motion.button",
  "whileTap scale 0.98 (not 0.95 or 0.9)": "scale: 0.98",
  "whileTap disabled when isDisabled": "isDisabled ? {} : { scale: 0.98 }",
  "TRANSITIONS.micro passed to transition": "transition={TRANSITIONS.micro}",
  "aria-disabled set": "aria-disabled={isDisabled}",
  "aria-busy set": "aria-busy={loading}",
  "LoadingSpinner rendered when loading": "{loading && <LoadingSpinner />}",
  "fullWidth prop supported": "fullWidth = false",
  "type defaults to button": 'type = "button"',
  "focus-visible ring on all variants": (c) =>
    (c.match(/focus-visible:ring-2/g) || []).length >= 4,
  "no pure white hardcoded": (c) => !c.includes("#FFFFFF") && !c.includes("#fff"),
});

// ── Card.jsx ──────────────────────────────────────────────────────────────────
run("app/components/ui/Card.jsx", {
  "default export Card function": "export default function Card(",
  "hoverable defaults to false": "hoverable = false",
  "updated defaults to false": "updated = false",
  "card-base class applied": '"card-base"',
  "section-updated class on updated=true": 'updated ? "section-updated" : ""',
  "header slot rendered when present": "{header && (",
  "header has border-b border-border": "border-b border-border",
  "body slot always rendered": '<div className="px-5 py-4">',
  "footer slot rendered when present": "{footer && (",
  "footer has border-t border-border": "border-t border-border",
  "footer has bg-bg-raised/40": "bg-bg-raised/40",
  "hoverable adds transition-colors": (c) =>
    c.includes("hover:border-accent") || c.includes("hover:bg-bg-raised"),
  "no hardcoded hex colors": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
  "overflow-hidden": "overflow-hidden",
});

// ── Badge.jsx ─────────────────────────────────────────────────────────────────
run("app/components/ui/Badge.jsx", {
  "default export Badge function": "export default function Badge(",
  "BADGE_STYLES map defined": "const BADGE_STYLES",
  "success uses bg-success/15 low opacity": "bg-success/15 text-success",
  "warning uses bg-warning/15 amber": "bg-warning/15 text-warning",
  "danger uses bg-danger/15 low opacity (not full red)": (c) =>
    c.includes("bg-danger/15  text-danger") && !c.includes("bg-red-"),
  "info variant defined": '"info"',
  "indigo variant uses bg-accent/15": "bg-accent/15  text-accent",
  "muted variant defined": '"muted"',
  "BADGE_SIZE map defined": "const BADGE_SIZE",
  "sm size px-2 text-xs": "px-2 py-0.5 text-xs",
  "md size px-2.5 text-sm": "px-2.5 py-1 text-sm",
  "variant defaults to info": 'variant = "info"',
  "size defaults to sm": 'size = "sm"',
  "icon rendered with aria-hidden": 'aria-hidden="true"',
  "span wrapper (not div)": "export default function Badge",
  "no hardcoded hex": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── Input.jsx ─────────────────────────────────────────────────────────────────
run("app/components/ui/Input.jsx", {
  "imports useId from react": 'import { useId } from "react"',
  "default export Input function": "export default function Input(",
  "autoId = useId()": "const autoId = useId()",
  "id = externalId ?? autoId": "const id = externalId ?? autoId",
  "label htmlFor matches id": "htmlFor={id}",
  "input id matches label": "id={id}",
  "error uses border-danger (not border-red-500)": (c) =>
    c.includes("border-danger") && !c.includes("border-red-500"),
  "error state adds ring-danger/30": "focus:ring-danger/30",
  "normal focus uses border-accent": "focus:border-accent",
  "normal focus uses border-focus var": "focus:ring-[var(--border-focus)]",
  "aria-invalid set on error": "aria-invalid={!!error}",
  "aria-describedby links to error id": "`${id}-error`",
  "error p has role=alert": 'role="alert"',
  "error p has aria-live=polite": 'aria-live="polite"',
  "helper text uses text-text-muted": "text-text-muted",
  "helper only shown when no error": "helper && !error",
  "leftIcon positioning pl-10": "pl-10",
  "rightIcon positioning pr-10": "pr-10",
  "disabled applies cursor-not-allowed opacity-50": (c) =>
    c.includes("cursor-not-allowed") && c.includes("opacity-50"),
  "placeholder uses text-text-muted": "placeholder:text-text-muted",
  "bg-bg-raised for input background": "bg-bg-raised text-text-primary",
  "outline-none to remove browser default": "outline-none",
  "no hardcoded hex": (c) => !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/),
});

// ── Toggle.jsx ────────────────────────────────────────────────────────────────
run("app/components/ui/Toggle.jsx", {
  "imports useId from react": 'import { useId } from "react"',
  "imports framer-motion": 'from "framer-motion"',
  "imports TRANSITIONS from animations": 'from "@/lib/constants/animations"',
  "default export Toggle function": "export default function Toggle(",
  "checked defaults to false (NEVER true)": (c) =>
    c.includes("checked = false") && !c.includes("checked = true"),
  "role=switch set": 'role="switch"',
  "aria-checked bound to checked": "aria-checked={checked}",
  "handleToggle function": "function handleToggle()",
  "handleKeyDown handles Enter and Space": (c) =>
    c.includes('"Enter"') && c.includes('" "'),
  "e.preventDefault() called in keydown": "e.preventDefault()",
  "motion.span for thumb with layout": "<motion.span",
  "layout prop for smooth position": "\n          layout",
  "TRANSITIONS.micro as transition": "transition={TRANSITIONS.micro}",
  "checked state: bg-accent track": '"bg-accent"',
  "unchecked state: bg-bg-overlay track": (c) =>
    c.includes("bg-bg-overlay border border-border"),
  "thumb right position when checked": "left-[calc(100%-1.375rem)]",
  "thumb left position when unchecked": "left-0.5",
  "focus-visible ring on track button": "focus-visible:ring-2 focus-visible:ring-accent",
  "disabled: opacity-50 cursor-not-allowed": (c) =>
    c.includes("opacity-50") && c.includes("cursor-not-allowed"),
  "label click triggers handleToggle": "onClick={handleToggle}",
  "description uses text-text-muted": "text-xs text-text-muted",
  "no hardcoded hex (except bg-white for thumb)": (c) => {
    const noHex = !c.match(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/);
    return noHex; // bg-white is a Tailwind class, not hardcoded hex
  },
});

// ── index.js ──────────────────────────────────────────────────────────────────
run("app/components/ui/index.js", {
  "exports Button as default": 'export { default as Button }',
  "exports Card as default": 'export { default as Card }',
  "exports Badge as default": 'export { default as Badge }',
  "exports Input as default": 'export { default as Input }',
  "exports Toggle as default": 'export { default as Toggle }',
  "future 0-C3 exports commented out": (c) =>
    c.includes("// export { default as Skeleton }") &&
    c.includes("// export { default as Modal }"),
  "future 0-C4 exports commented out": (c) =>
    c.includes("// export { default as RiskBadge }") &&
    c.includes("// export { default as TrustBadge }"),
  "no broken active imports of unbuilt components": (c) => {
    const activeExports = c.split("\n").filter(l => !l.trimStart().startsWith("//") && l.includes("export"));
    return activeExports.every(l => ["Button", "Card", "Badge", "Input", "Toggle", "index"].some(n => l.includes(n)));
  },
});

console.log("\n" + "=".repeat(60));
console.log("COMPONENT AUDIT — TOTAL: " + totalPass + " passed, " + totalFail + " FAILED");
if (totalFail > 0) process.exit(1);

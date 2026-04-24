// lib/constants/design.js — v4.0 Quiet Clarity
// NEW FILE — did not exist in v3

/* EMPTY STATES — exact copy — never modify */
export const EMPTY_STATES = {
  decisionInbox: {
    title: 'No decisions needed right now.',
    body:  "We'll notify you the moment something needs your attention.",
  },
  documentVault: {
    title: 'No documents yet.',
    body:  'Your professionals will request them as your case progresses.',
  },
  professionalCards: {
    title: 'Matching you with the right professionals.',
    body:  'Usually under 2 hours.',
  },
  deadlineBrain: {
    title: 'No upcoming deadlines.',
    body:  'Your case is on track.',
  },
  caseDNA: {
    title: 'Building your case map.',
    body:  'About 30 seconds.',
  },
  settlementSimulator: {
    title: 'Enter your asset details above',
    body:  'to see your path options.',
  },
  similarCases: {
    title: 'Finding cases similar to yours...',
    body:  '',
  },
}

/* TYPOGRAPHY SCALE — reference only — implement via CSS vars */
export const TYPE_SCALE = {
  display:       { font: 'fraunces', size: '72px', weight: 300, tracking: '-0.04em', lh: 1,   numeric: 'proportional-nums' },
  intakeQuestion:{ font: 'fraunces', size: '32px', weight: 300, style: 'italic', tracking: '-0.02em', lh: 1.2 },
  heroLanding:   { font: 'fraunces', size: '56px', weight: 400, tracking: '-0.03em', lh: 1.1 },
  headingXL:     { font: 'general-sans', size: '28px', weight: 600, tracking: '-0.03em', lh: 1.15 },
  headingMD:     { font: 'general-sans', size: '18px', weight: 500, tracking: '-0.015em', lh: 1.3 },
  body:          { font: 'general-sans', size: '15px', weight: 400, tracking: '0em', lh: 1.6 },
  caption:       { font: 'general-sans', size: '12px', weight: 400, tracking: '+0.02em', lh: 1.5 },
  label:         { font: 'general-sans', size: '11px', weight: 500, tracking: '+0.08em', lh: 1, transform: 'uppercase' },
  mono:          { font: 'geist-mono',   size: '11px', weight: 400, tracking: '+0.02em' },
}

/* SPACING — 8px base grid */
export const SPACING = {
  min:         12,
  xs:          8,
  sm:          12,
  md:          16,
  lg:          24,
  xl:          32,
  cardPaddingV: 20,
  cardPaddingH: 24,
  bodyMaxWidth: '65ch',
  intakeMaxWidth: '52ch',
  legalMaxWidth:  '72ch',
}

/* PROFESSIONAL CARD STATUS COLORS — 4px left bar only */
export const PROFESSIONAL_STATUS = {
  active:   { color: '#3D5A80', pulse: false },
  working:  { color: '#D97706', pulse: true,  pulseDuration: 1.2 },
  waiting:  { color: '#A8A29E', pulse: false },
  delayed:  { color: '#DC2626', pulse: false },
  pending:  { color: '#D6D3D1', pulse: false },
}

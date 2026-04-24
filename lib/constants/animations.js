// lib/constants/animations.js
// ALL animation values for UnwindAI v4.0 — Quiet Clarity
// NEVER hardcode duration values in component files
// ALWAYS import TRANSITIONS from here

export const TRANSITIONS = {
  /* Standard — all page elements, interactions */
  standard: {
    duration: 0.24,
    ease: [0.4, 0, 0.2, 1],
  },
  /* Page transitions */
  page: {
    duration: 0.24,
    ease: 'easeInOut',
  },
  /* Private Mode — safety feature — must feel instant */
  privateMode: {
    duration: 0.1,
    ease: 'easeOut',
  },
  /* EmotionShield — gravity moment — slightly slower */
  emotionShield: {
    duration: 0.4,
    ease: 'easeIn',
  },
  /* Variable font morph — number weight animation */
  fontMorph: {
    duration: 0.4,
    ease: [0.4, 0, 0.2, 1],
  },
}

export const SKELETON_PULSE = {
  /* 1200ms breathe — slow enough to feel like thinking, not broken */
  duration: 1.2,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
}

export const STATUS_DOT_PULSE = {
  /* Working state pulse — 1200ms opacity 0.4 → 1.0 */
  duration: 1.2,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
}

export const VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit:    { opacity: 0, scale: 0.97 },
  },
  /* Modal — slides up from bottom on mobile, fades on desktop */
  modal: {
    initial: { opacity: 0, scale: 0.98, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit:    { opacity: 0, scale: 0.98, y: 8 },
  },
}

/* LOADING MESSAGES — rotate during AI/ML calls */
export const LOADING_MESSAGES = {
  intake:     ['Reading your situation...', 'Building your case profile...', 'Almost there...'],
  predict:    ['Analyzing 200,000 similar cases...', 'Calculating your path options...', 'Running risk assessment...'],
  similar:    ['Finding cases like yours...', 'Comparing outcomes...'],
  orchestrator: ['Coordinating your team...', 'Checking deadlines...', 'Reviewing case status...'],
  summary:    ['Preparing your daily brief...'],
}

/* FORBIDDEN — PERMANENTLY BANNED — NO EXCEPTIONS */
// bounce, spring, elastic, overshoot
// These are not games. Never use these easings.
/** @type {import('tailwindcss').Config} */
// UnwindAI v4.0 — Tailwind v4 CSS-first architecture
// NOTE: In Tailwind v4, all design tokens are defined in globals.css via @theme {}.
// This file is retained ONLY for content path scanning and plugin registration.
// Do NOT add hardcoded color values here — all tokens live in CSS vars in globals.css.
const config = {
  content: [
    './app/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  plugins: [],
}

export default config

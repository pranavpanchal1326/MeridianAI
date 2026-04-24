/**
 * lib/constants/disclaimers.js
 *
 * IMMUTABLE LEGAL DISCLAIMER CONSTANTS
 *
 * ⚠️  MODIFICATION RULES:
 * - Never modify any string without legal review
 * - If any string changes: increment the version field
 * - Update consent_logs references when version changes
 * - These are never conditionally rendered — always visible
 * - SETTLEMENT_DISCLAIMER renders on every simulator output
 * - AI_OUTPUT_DISCLAIMER appends to every agent legal output
 * - ML_DISCLAIMER is permanently visible on simulator page
 *
 * Last reviewed: v2.0
 */

/**
 * Settlement Simulator disclaimer — shown in modal on first open
 * and as persistent footer on every subsequent visit.
 * All 4 lines render. consentText goes next to the checkbox.
 * version is stored in consent_logs when user accepts.
 */
export const SETTLEMENT_DISCLAIMER = {
	line1: "These projections are based on 200,000 synthetic cases and statistical modeling only.",
	line2: "This is not legal advice. This is not financial advice.",
	line3: "Outcomes in your specific case may differ significantly.",
	line4: "Consult your lawyer before making any decisions based on these projections.",
	consentText: "I understand these are statistical estimates, not legal advice.",
	version: "2.0",
}

/**
 * Appended to every AI agent output that touches legal matters.
 * Orchestrator, Summary Agent, and Document Agent all append this.
 * Renders as small muted text below agent-generated summaries.
 * Never omitted. Never shortened. Never conditional.
 */
export const AI_OUTPUT_DISCLAIMER =
	"AI-generated summary for coordination purposes only. Not legal advice."

/**
 * Permanently visible at the bottom of the SettlementSimulator page.
 * Never hidden. Never toggled. Never removed on mobile.
 * Layout adjusts around it — text does not change.
 */
export const ML_DISCLAIMER =
	"Predictions from ML models trained on synthetic data. ±9 day MAE on validation set."

/**
 * Shown next to the EmotionShield opt-in toggle in Settings.
 * User reads this before enabling EmotionShield monitoring.
 * Also stored in consent_logs when user opts in.
 */
export const EMOTION_SHIELD_CONSENT_TEXT =
	"I agree that UnwindAI may analyze my messages for emotional distress signals. " +
	"If a crisis is detected, my assigned therapist will receive an alert — not my message. " +
	"I can disable this at any time and my consent will be logged."

/**
 * Shown when a professional requests access to a document.
 * Renders above the approve/deny buttons in the Decision Inbox.
 * Reminds user that access is time-limited and blockchain-logged.
 */
export const DOCUMENT_ACCESS_DISCLAIMER =
	"Granting access will allow this professional to view the document for 48 hours only. " +
	"Access automatically expires after 48 hours via smart contract. " +
	"Every access event is permanently logged on the Polygon blockchain."

/**
 * Shown below the encrypted upload confirmation in TrustVault.
 * Reminds user their raw document never reached UnwindAI servers.
 * Builds trust at the most sensitive moment — document upload.
 */
export const ZERO_CUSTODY_STATEMENT =
	"Your document was encrypted in your browser before upload. " +
	"UnwindAI servers never received or stored your original file. " +
	"Only you hold the decryption key."
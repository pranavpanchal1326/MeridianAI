/**
 * lib/constants/limits.js
 *
 * SYSTEM CONFIGURATION CONSTANTS
 *
 * ⚠️  MODIFICATION RULES:
 * - Every number here is architecturally derived — not arbitrary
 * - Changes require updating all dependent files simultaneously
 * - QUEUE_NAMES changes require restarting all BullMQ workers
 * - ML_FEATURE_COUNT changes require full model retraining
 * - DEAD_MAN_SWITCH_DAYS changes require smart contract update
 * - Never hardcode any of these values anywhere else in the codebase
 * - Always import from this file — never duplicate the values
 */

// ─────────────────────────────────────────────
// AI RATE LIMITING
// Prevents runaway Claude API spend per case
// Enforced by Upstash rate limiter in every AI route
// ─────────────────────────────────────────────

/** Max Claude API calls allowed per case per hour */
export const CLAUDE_CALLS_PER_HOUR_PER_CASE = 50

/** Max document access requests a professional can make per day */
export const PROFESSIONAL_DOC_REQUESTS_PER_DAY = 20

// ─────────────────────────────────────────────
// ORCHESTRATOR FAULT TOLERANCE
// 3-layer fallback: retry → dead letter → checkpoint resume
// GAP-03 in master build document
// ─────────────────────────────────────────────

/**
 * Exponential backoff delays for Claude API retry attempts.
 * Index 0 = first retry (2s), index 1 = second (4s), index 2 = third (8s).
 * After all 3 fail: task moves to BullMQ dead letter queue.
 * @type {number[]}
 */
export const RETRY_DELAYS_MS = [2000, 4000, 8000]

/** Maximum number of retry attempts before dead letter queue */
export const MAX_RETRY_ATTEMPTS = 3

// ─────────────────────────────────────────────
// DEAD MAN SWITCH
// Protects users who go silent — court silences >30 days are normal
// GAP-06 in master build document
// Smart contract reads freezeAccess threshold
// ─────────────────────────────────────────────

/**
 * Days of inactivity before each Dead Man Switch action triggers.
 * checkIn:     7 days  → send check-in notification only
 * pauseTasks:  21 days → pause all pending professional tasks
 * freezeAccess: 45 days → freeze all document access via smart contract
 * @type {{ checkIn: number, pauseTasks: number, freezeAccess: number }}
 */
export const DEAD_MAN_SWITCH_DAYS = {
	checkIn: 7,
	pauseTasks: 21,
	freezeAccess: 45,
}

// ─────────────────────────────────────────────
// ESCALATION THRESHOLDS
// Controls when deadline agent escalates overdue tasks
// ─────────────────────────────────────────────

/**
 * Hours overdue before escalation actions trigger.
 * first: standard escalation — notify professional
 * high:  high-priority escalation — notify professional + user
 * @type {{ first: number, high: number }}
 */
export const ESCALATION_HOURS = {
	first: 48,
	high: 96,
}

/**
 * Number of escalations before Orchestrator creates a Decision
 * for the user to replace the professional.
 * Spec: "if count > 2" → threshold is 3.
 */
export const PROFESSIONAL_REPLACEMENT_THRESHOLD = 3

// ─────────────────────────────────────────────
// PROFESSIONAL ACCESS CONTROL
// Smart contract enforces these at blockchain level
// ─────────────────────────────────────────────

/**
 * Hours a professional's document access key remains valid.
 * After this: TrustVault.sol hasAccess() returns false automatically.
 * Smart contract enforces this — not application logic.
 */
export const PROFESSIONAL_ACCESS_EXPIRY_HOURS = 48

// ─────────────────────────────────────────────
// BULLMQ QUEUE NAMES
// Single source of truth — imported by index.js and workers.js
// Any drift between definition and worker causes silent job loss
// ─────────────────────────────────────────────

/**
 * All BullMQ queue names used in the system.
 * Import this object everywhere — never hardcode queue name strings.
 * @type {{ orchestrator: string, escalation: string, summary: string, document: string, emotion: string }}
 */
export const QUEUE_NAMES = {
	orchestrator: "unwindai:orchestrator",
	escalation:   "unwindai:escalation",
	summary:      "unwindai:summary",
	document:     "unwindai:document",
	emotion:      "unwindai:emotion",
}

// ─────────────────────────────────────────────
// SUPABASE REALTIME CHANNEL NAMES
// Template functions — scoped to case_id or professional_id
// Never hardcode channel strings — always use these functions
// ─────────────────────────────────────────────

/**
 * Realtime channel name generators.
 * Every channel is scoped to a specific case or professional.
 * Usage: REALTIME_CHANNELS.caseStatus("uuid-here")
 * @type {Object.<string, function(string): string>}
 */
export const REALTIME_CHANNELS = {
	caseStatus:      (caseId) => `case:${caseId}:status`,
	caseDecisions:   (caseId) => `case:${caseId}:decisions`,
	caseDocuments:   (caseId) => `case:${caseId}:documents`,
	caseDeadlines:   (caseId) => `case:${caseId}:deadlines`,
	caseAlerts:      (caseId) => `case:${caseId}:alerts`,
	casePredictions: (caseId) => `case:${caseId}:predictions`,
	professionalTasks: (profId) => `professional:${profId}:tasks`,
}

// ─────────────────────────────────────────────
// ML MODEL CONSTANTS
// Feature vector is fixed — reordering requires full retraining
// ─────────────────────────────────────────────

/**
 * Exact number of features in the ML feature vector.
 * Order is fixed — see Section 07 of master build document.
 * Every ML route, feature extractor, and What-If builder
 * must import and validate against this constant.
 * Changing this number requires full model retraining.
 */
export const ML_FEATURE_COUNT = 12

/**
 * Feature vector index map — documents the exact order.
 * Import this to avoid magic number indexing in feature builders.
 * @type {Object.<string, number>}
 */
export const ML_FEATURE_INDEX = {
	case_type:              0,
	city:                   1,
	total_asset_value_inr:  2,
	children_count:         3,
	business_ownership:     4,
	marriage_duration_years:5,
	petitioner_age:         6,
	professional_count:     7,
	urgency:                8,
	court_backlog_months:   9,
	filing_season_score:    10,
	complexity_score:       11,
}

/**
 * Encoding maps for categorical ML features.
 * Training data and inference must use identical encoding.
 * If encoding drifts between training and inference:
 * model predictions will be silently wrong — no error thrown.
 */
export const ML_ENCODINGS = {
	case_type: {
		divorce:     0,
		inheritance: 1,
		property:    2,
		business:    3,
		nri:         4,
	},
	city: {
		Mumbai:    0,
		Delhi:     1,
		Bangalore: 2,
		Pune:      3,
		Hyderabad: 4,
		Chennai:   5,
		Ahmedabad: 6,
	},
	urgency: {
		low:      0,
		medium:   1,
		high:     2,
		critical: 3,
	},
	path: {
		collaborative: 0,
		mediation:     1,
		court:         2,
	},
}

/**
 * Court backlog months per city — used in feature extraction.
 * Source: master build document Section 11.
 * These are used during intake → feature vector construction.
 */
export const COURT_BACKLOG_MONTHS = {
	Mumbai:    18,
	Delhi:     14,
	Bangalore: 11,
	Pune:      9,
	Hyderabad: 8,
	Chennai:   12,
	Ahmedabad: 7,
}

/**
 * Filing season scores — affects court scheduling probability.
 * January spike due to post-holiday filings.
 * November-December dip due to court winter recess.
 */
export const FILING_SEASON_SCORES = {
	january:          1.2,
	november:         0.5,
	december:         0.5,
	default:          1.0,
}

// ─────────────────────────────────────────────
// TIMING CONSTANTS
// Animation and UX timing — matches design system
// ─────────────────────────────────────────────

/**
 * Private Mode must activate in under 100ms.
 * This is a safety feature — not a UI preference.
 * Used in CSS transition and tested in Block J verification.
 */
export const PRIVATE_MODE_TRANSITION_MS = 100

/**
 * Skeleton loader pulse cycle duration.
 * Design system rule: 800ms. Never a spinner after 2 seconds.
 */
export const SKELETON_PULSE_MS = 800

/**
 * Summary Agent cron schedule — 8am daily.
 * node-cron format: second minute hour day month weekday
 */
export const SUMMARY_CRON_SCHEDULE = "0 0 8 * * *"

/**
 * Deadline check cron schedule — every 15 minutes.
 * node-cron format.
 */
export const DEADLINE_CHECK_CRON_SCHEDULE = "0 */15 * * * *"

/**
 * Dead Man Switch check cron schedule — once daily at 9am.
 * Runs after Summary Agent so user receives summary before freeze.
 */
export const DEAD_MAN_SWITCH_CRON_SCHEDULE = "0 0 9 * * *"

// ─────────────────────────────────────────────
// 2AM RULE
// Prevents emotionally distressed users from making
// irreversible decisions in the middle of the night
// ─────────────────────────────────────────────

/**
 * Hours during which the 2AM rule applies.
 * Any Decision submission between startHour and endHour
 * triggers a pause prompt before the confirm modal.
 * startHour: 0 = midnight, endHour: 5 = 5am
 */
export const TWO_AM_RULE_HOURS = {
	startHour: 0,
	endHour:   5,
}

// ─────────────────────────────────────────────
// DEMO MODE
// ─────────────────────────────────────────────

/**
 * Maximum milliseconds a DEMO_MODE response should take.
 * If a cached file read exceeds this: something is wrong.
 * Used in Block J demo readiness verification tests.
 */
export const DEMO_RESPONSE_MAX_MS = 50

/**
 * Session durations.
 * Users on magic link: shorter session, less sensitive role.
 * Professionals on 2FA: longer session, trusted verified role.
 * Both stored in httpOnly cookies — never localStorage.
 */
export const SESSION_DURATION = {
	user:         60 * 60 * 24 * 7,   // 7 days in seconds
	professional: 60 * 60 * 24 * 30,  // 30 days in seconds
}

/**
 * Magic link expiry.
 * After this many seconds, the link is invalid and user
 * must request a new one. Balances security with usability
 * for users who may be distracted during a difficult process.
 */
export const MAGIC_LINK_EXPIRY_SECONDS = 60 * 15 // 15 minutes

// ─────────────────────────────────────────────
// COST TRACKER THRESHOLDS
// Controls color coding in the Cost Tracker UI widget
// ─────────────────────────────────────────────

/**
 * Budget usage percentage thresholds for Cost Tracker colors.
 * below safe:    green  — under budget, good burn rate
 * safe to warn:  amber  — approaching budget, monitor closely
 * above warn:    red    — over budget, user decision needed
 */
export const COST_TRACKER_THRESHOLDS = {
	safe: 80,   // below 80% = green
	warn: 100,  // 80-100% = amber, above 100% = red
}

/**
 * Minimum prediction change in days to trigger a
 * real-time notification after milestone completion.
 * Below this threshold: silent update, no notification.
 * At or above: "Your case is moving faster/slower" message shown.
 */
export const PREDICTION_DIFF_NOTIFY_DAYS = 5
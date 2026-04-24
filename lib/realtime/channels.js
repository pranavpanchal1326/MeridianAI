import { createAdminSupabaseClient } from "@/lib/db/client";

// Always use these functions - never hardcode channel strings in components.
export const CHANNELS = Object.freeze({
  caseStatus: (caseId) => `case:${caseId}:status`,
  caseDecisions: (caseId) => `case:${caseId}:decisions`,
  caseDocuments: (caseId) => `case:${caseId}:documents`,
  caseDeadlines: (caseId) => `case:${caseId}:deadlines`,
  caseAlerts: (caseId) => `case:${caseId}:alerts`,
  casePredictions: (caseId) => `case:${caseId}:predictions`,
  professionalTasks: (professionalId) => `professional:${professionalId}:tasks`,
});

/**
 * @typedef {Object} CaseStatusPayload
 * @property {string} professional_id
 * @property {"lawyer"|"ca"|"therapist"|"property_valuator"|"mediator"} role
 * @property {"pending"|"active"|"waiting"|"needs_action"} status
 * @property {string} updated_at
 */

/**
 * @typedef {Object} CaseDecisionPayload
 * @property {string} decision_id
 * @property {string} title
 * @property {"normal"|"urgent"|"critical"} urgency
 * @property {string|null} deadline
 * @property {"pending"} status
 */

/**
 * @typedef {Object} CaseDocumentPayload
 * @property {string} document_id
 * @property {string} label
 * @property {string} document_type
 * @property {"uploaded"|"access_granted"|"access_revoked"} event
 * @property {string} actor_role
 * @property {string} timestamp
 */

/**
 * @typedef {Object} CaseDeadlinePayload
 * @property {string} task_id
 * @property {string} title
 * @property {string} professional_role
 * @property {string} deadline
 * @property {"on_track"|"at_risk"|"breached"} status
 */

/**
 * @typedef {Object} CaseAlertPayload
 * @property {"crisis"|"daily_summary"} alert_type
 * @property {string} message
 * @property {string} timestamp
 */

/**
 * @typedef {Object} PredictionPathStats
 * @property {number} duration_median
 * @property {number} cost_median
 * @property {number} success_probability
 */

/**
 * @typedef {Object} CasePredictionPayload
 * @property {PredictionPathStats} collaborative
 * @property {PredictionPathStats} mediation
 * @property {PredictionPathStats} court
 * @property {number} risk_score
 * @property {boolean} anomaly_flag
 * @property {string} model_version
 * @property {number} diff_days
 * @property {"faster"|"slower"} diff_direction
 */

/**
 * @typedef {Object} ProfessionalTaskPayload
 * @property {string} task_id
 * @property {string} case_id
 * @property {string} title
 * @property {"low"|"normal"|"high"|"urgent"} priority
 * @property {string} deadline
 * @property {"new_task"|"escalation"|"updated"} event
 */

/**
 * Used by Orchestrator, ML pipeline, agents to emit events.
 * Only call from server - never from client components.
 * @template {object} T
 * @param {string} channelName
 * @param {string} event
 * @param {T} payload
 * @returns {Promise<void>}
 */
export async function broadcastToChannel(channelName, event, payload) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.channel(channelName).send({
    type: "broadcast",
    event,
    payload,
  });

  if (error) {
    // Log but never throw - realtime failure must never crash orchestrator.
    console.error(`[Realtime] Broadcast failed on ${channelName}:`, error.message);
  }
}

export const broadcast = Object.freeze({
  caseStatus: (caseId, payload) =>
    broadcastToChannel(CHANNELS.caseStatus(caseId), "status_update", payload),

  caseDecision: (caseId, payload) =>
    broadcastToChannel(CHANNELS.caseDecisions(caseId), "new_decision", payload),

  caseDocument: (caseId, payload) =>
    broadcastToChannel(CHANNELS.caseDocuments(caseId), "document_event", payload),

  caseDeadline: (caseId, payload) =>
    broadcastToChannel(CHANNELS.caseDeadlines(caseId), "deadline_update", payload),

  caseAlert: (caseId, payload) =>
    broadcastToChannel(CHANNELS.caseAlerts(caseId), "alert", payload),

  casePrediction: (caseId, payload) =>
    broadcastToChannel(
      CHANNELS.casePredictions(caseId),
      "prediction_updated",
      payload,
    ),

  professionalTask: (professionalId, payload) =>
    broadcastToChannel(
      CHANNELS.professionalTasks(professionalId),
      "task_event",
      payload,
    ),
});

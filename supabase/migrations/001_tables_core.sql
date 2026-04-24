CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- pgvector kept for future use even though KNN uses ball-tree in v2.0
-- uuid-ossp provides uuid_generate_v4() as default for all pk columns
-- pgcrypto for future server-side hashing needs

CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id            UUID UNIQUE NOT NULL,
  -- auth_user_id references auth.users(id) from Supabase Auth
  -- Do NOT add FOREIGN KEY constraint here — Supabase auth schema is managed separately
  email                   TEXT UNIQUE NOT NULL,
  case_id                 UUID,
  -- FK to cases(id) added in 001_tables_core.sql after cases table exists
  -- Nullable: user exists before case is created during intake
  consent_emotion_shield  BOOLEAN NOT NULL DEFAULT FALSE,
  -- CRITICAL: default must be FALSE — EmotionShield is opt-in only
  -- NEVER change this default under any circumstance
  private_mode_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inline comment block (write these as SQL comments in the file):
-- consent_emotion_shield: DPDP-compliant opt-in flag.
--   FALSE = no emotional monitoring, no therapist alerts, ever.
--   TRUE = user explicitly opted in via /settings with consent logged.
-- private_mode_enabled: UI-only flag. Stores last private mode state.
--   Toggling private mode is a safety feature, not a preference.
-- case_id: one user has one active case in v2.0.
--   Will be populated after intake completes and case is created.

CREATE TABLE IF NOT EXISTS cases (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL,
  -- FK to users(id) — add constraint after users table defined above
  case_type    TEXT NOT NULL CHECK (
                 case_type IN ('divorce', 'inheritance', 'property', 'business', 'nri')
               ),
  city         TEXT NOT NULL CHECK (
                 city IN ('Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad')
               ),
  status       TEXT NOT NULL DEFAULT 'intake' CHECK (
                 status IN ('intake', 'active', 'pending_decision', 'resolved', 'abandoned')
               ),
  data_version TEXT NOT NULL DEFAULT '2.0',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_cases_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT
  -- ON DELETE RESTRICT: never cascade-delete a case when a user is deleted
  -- Cases are legal records — they must be explicitly resolved, never silently dropped
);

-- Inline comment block:
-- case_type CHECK constraint: enforces only 5 valid types from Section 07 API contract.
--   Maps to ML feature index 0: divorce=0, inheritance=1, property=2, business=3, nri=4
-- city CHECK constraint: enforces exactly 7 cities with exact casing.
--   Maps to ML feature index 1. Casing must match exactly for KNN index lookup.
-- status flow: intake → active → pending_decision ↔ active → resolved | abandoned
--   Never skip intake status. Orchestrator sets active after profile confirmed.
-- data_version: tracks schema generation version for model compatibility checks.

-- Add FK after both tables exist (circular reference requires deferred approach)
ALTER TABLE users
  ADD CONSTRAINT fk_users_case
  FOREIGN KEY (case_id)
  REFERENCES cases(id)
  ON DELETE SET NULL;
-- SET NULL: if case deleted (rare, admin only), user record remains intact

CREATE TABLE IF NOT EXISTS case_profile (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id                UUID UNIQUE NOT NULL,
  -- UNIQUE: one profile per case. Not a one-to-many. Never duplicate.
  assets_json            JSONB NOT NULL DEFAULT '{}',
  -- Stores: { property, savings, business, vehicles, gold, total_estimated_inr }
  -- Exact shape from Section 07 API contract assets object
  people_json            JSONB NOT NULL DEFAULT '{}',
  -- Stores: { petitioner_age, respondent_age, marriage_duration_years, children }
  -- Exact shape from Section 07 API contract people object
  intake_transcript      TEXT,
  -- Full raw text of intake conversation. Nullable until intake completes.
  -- Used for: audit, re-analysis, EmotionShield retrospective if opted in
  profile_generated_at   TIMESTAMPTZ,
  -- Nullable: null until Intake Agent successfully extracts case profile JSON
  case_dna_version       INTEGER NOT NULL DEFAULT 1,
  -- Increments on: major Decision update, Orchestrator blocker, professional replacement
  -- GAP-07 fix: Case DNA recalculates on these events, not just once at creation
  ml_prediction_json     JSONB,
  -- Nullable: populated within 5s of profile_generated_at
  -- Shape: exact ML Prediction Output from Section 07
  -- Updated by: live_update.ts after each milestone (Phase 9.3)
  risk_score             INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  -- 0-100. Extracted from ml_prediction_json.risk_score at save time for fast queries
  -- Colors in UI: 0-33=success, 34-66=warning, 67-100=danger
  anomaly_flag           BOOLEAN NOT NULL DEFAULT FALSE,
  -- TRUE if Isolation Forest detects this case is outside training distribution
  -- When TRUE: UI shows wider confidence intervals on SettlementSimulator
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_case_profile_case FOREIGN KEY (case_id)
    REFERENCES cases(id) ON DELETE RESTRICT
);

-- Inline comment block:
-- assets_json and people_json store the structured intake data.
--   They are NOT normalized into columns — they evolve as intake improves.
--   Always validated against Section 07 API contract shape before insert.
-- ml_prediction_json stores the FULL output from lib/ml/predictor.ts.
--   Includes: collaborative/mediation/court predictions, shap_values,
--   similar_cases array, risk_score, anomaly_flag, model_version, inference_time_ms.
-- case_dna_version starts at 1. Frontend uses this to know when to re-fetch Case DNA.
--   React component compares stored version to last-seen version.
-- anomaly_flag is denormalized from ml_prediction_json for fast boolean queries.
--   Source of truth is ml_prediction_json. This is an index-optimized copy.

-- supabase/migrations/001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- pgvector: keep for future use even though current ML uses KNN pkl
-- Do not remove - future phases may use it
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enable Row Level Security globally
-- Individual table policies defined per table below
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- TABLE 1 - users
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id            UUID UNIQUE NOT NULL REFERENCES auth.users(id)
                          ON DELETE CASCADE,
  email                   TEXT UNIQUE NOT NULL,
  full_name               TEXT,
  phone                   TEXT,
  city                    TEXT,
  case_id                 UUID,
  -- EmotionShield consent - default FALSE, never auto-enabled
  -- Only flipped to TRUE via explicit opt-in in Settings
  consent_emotion_shield  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Private Mode preference - persisted across sessions
  private_mode_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Dead Man Switch tracking - updated on every app interaction
  last_active_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "users_service_all" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON users(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_users_case_id
  ON users(case_id);

-- -----------------------------------------------------------------------------
-- TABLE 2 - cases
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id)
                ON DELETE RESTRICT,
  -- case_type: divorce, inheritance, property, business, nri
  -- Matches ML_ENCODINGS.case_type in lib/constants/limits.js
  case_type     TEXT NOT NULL CHECK (
                  case_type IN ('divorce','inheritance',
                                'property','business','nri')
                ),
  -- city: must match ML_ENCODINGS.city keys
  city          TEXT NOT NULL CHECK (
                  city IN ('Mumbai','Delhi','Bangalore',
                           'Pune','Hyderabad','Chennai','Ahmedabad')
                ),
  -- status progression: intake -> active -> pending_decision
  --                     -> resolved -> abandoned
  status        TEXT NOT NULL DEFAULT 'intake' CHECK (
                  status IN ('intake','active','pending_decision',
                             'resolved','abandoned')
                ),
  -- path: set by ML Path Recommender after intake
  -- collaborative=fastest, court=slowest
  path_taken    TEXT CHECK (
                  path_taken IN ('collaborative','mediation','court')
                ),
  data_version  TEXT NOT NULL DEFAULT '2.0',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cases_select_own" ON cases
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "cases_update_own" ON cases
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "cases_insert_own" ON cases
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "cases_service_all" ON cases
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_cases_user_id
  ON cases(user_id);

CREATE INDEX IF NOT EXISTS idx_cases_status
  ON cases(status);

CREATE INDEX IF NOT EXISTS idx_cases_created_at
  ON cases(created_at DESC);

-- -----------------------------------------------------------------------------
-- TABLE 3 - case_profile
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_profile (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id               UUID UNIQUE NOT NULL REFERENCES cases(id)
                        ON DELETE RESTRICT,
  -- Raw intake conversation transcript
  intake_transcript     TEXT,
  -- Structured assets JSON from Intake Agent extraction
  -- Shape: { property, savings, business, vehicles, gold, total_estimated_inr }
  assets_json           JSONB,
  -- People involved in the case
  -- Shape: { petitioner_age, respondent_age, marriage_duration_years,
  --          children: { exists, count, ages } }
  people_json           JSONB,
  -- The 12-element ML feature vector - exact order from ML_FEATURE_INDEX
  -- Stored as JSONB array: [0, 3, 12800000, 1, 0, 11, 34, 5, 1, 9, 1.0, 4.2]
  ml_features           JSONB,
  -- Full ML prediction output - updated after each milestone
  -- Shape: { collaborative, mediation, court, similar_cases,
  --          risk_score, anomaly_flag, anomaly_score, model_version }
  ml_prediction_json    JSONB,
  -- Risk score extracted from ml_prediction_json for quick queries
  -- Range: 0-100. 0-33=low, 34-66=medium, 67-100=high
  risk_score            INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  -- Anomaly flag from Isolation Forest model
  -- TRUE = case is outside training distribution -> wider confidence intervals
  anomaly_flag          BOOLEAN NOT NULL DEFAULT FALSE,
  -- Case DNA version - increments when Case DNA is recalculated
  -- Triggers: major Decision update, Orchestrator blocker, professional replacement
  case_dna_version      INTEGER NOT NULL DEFAULT 1,
  -- Timestamp of last ML prediction run
  profile_generated_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE case_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_profile_select_own" ON case_profile
  FOR SELECT USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "case_profile_update_own" ON case_profile
  FOR UPDATE USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "case_profile_service_all" ON case_profile
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_case_profile_case_id
  ON case_profile(case_id);

CREATE INDEX IF NOT EXISTS idx_case_profile_risk_score
  ON case_profile(risk_score);

-- -----------------------------------------------------------------------------
-- TABLE 4 - professionals
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS professionals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id          UUID UNIQUE REFERENCES auth.users(id)
                        ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  -- role must match professional_role in task objects
  role                  TEXT NOT NULL CHECK (
                          role IN ('lawyer','ca','therapist',
                                   'property_valuator','mediator',
                                   'business_valuator',
                                   'cross_border_specialist',
                                   'court_clerk','senior_counsel',
                                   'notary')
                        ),
  email                 TEXT UNIQUE NOT NULL,
  phone                 TEXT,
  city                  TEXT NOT NULL CHECK (
                          city IN ('Mumbai','Delhi','Bangalore',
                                   'Pune','Hyderabad','Chennai',
                                   'Ahmedabad')
                        ),
  -- License ID submitted during registration
  -- Verified by admin before status changes to verified
  license_id            TEXT,
  -- verification_status progression:
  -- pending -> verified (admin approves) or rejected (admin rejects)
  -- pending: read-only access, no case data visible
  -- verified: full role-appropriate access
  verification_status   TEXT NOT NULL DEFAULT 'pending' CHECK (
                          verification_status IN
                          ('pending','verified','rejected','suspended')
                        ),
  -- Trust score 0-100 - calculated from task completion history
  -- 90+: gold badge, 75-89: silver, 60-74: blue, below 60: no badge
  trust_score           INTEGER NOT NULL DEFAULT 0
                        CHECK (trust_score BETWEEN 0 AND 100),
  -- 2FA required for professionals - tracked here
  two_fa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professionals_select_own" ON professionals
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "professionals_update_own" ON professionals
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "professionals_service_all" ON professionals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "professionals_select_for_users" ON professionals
  FOR SELECT USING (
    verification_status = 'verified'
    AND auth.uid() IN (
      SELECT u.auth_user_id FROM users u
    )
  );

CREATE INDEX IF NOT EXISTS idx_professionals_role
  ON professionals(role);

CREATE INDEX IF NOT EXISTS idx_professionals_city
  ON professionals(city);

CREATE INDEX IF NOT EXISTS idx_professionals_verification_status
  ON professionals(verification_status);

-- -----------------------------------------------------------------------------
-- TABLE 5 - case_professionals
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_professionals (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id                   UUID NOT NULL REFERENCES cases(id)
                            ON DELETE RESTRICT,
  professional_id           UUID NOT NULL REFERENCES professionals(id)
                            ON DELETE RESTRICT,
  assigned_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- status: pending -> active -> completed -> replaced
  status                    TEXT NOT NULL DEFAULT 'pending' CHECK (
                              status IN ('pending','active',
                                         'completed','replaced',
                                         'conflict_blocked')
                            ),
  -- conflict_checked: TRUE once Orchestrator has run conflict check
  -- FALSE = not yet checked, do not allow full access until TRUE
  conflict_checked          BOOLEAN NOT NULL DEFAULT FALSE,
  -- conflict_reason: populated if status = conflict_blocked
  conflict_reason           TEXT,
  -- Snapshot of trust score when assigned - for historical audit
  trust_score_at_assignment INTEGER,
  -- Total cost this professional billed to this case
  total_billed_inr          INTEGER DEFAULT 0,
  UNIQUE(case_id, professional_id)
);

ALTER TABLE case_professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_professionals_select_own_prof" ON case_professionals
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "case_professionals_select_own_user" ON case_professionals
  FOR SELECT USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "case_professionals_service_all" ON case_professionals
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_case_professionals_case_id
  ON case_professionals(case_id);

CREATE INDEX IF NOT EXISTS idx_case_professionals_professional_id
  ON case_professionals(professional_id);

CREATE INDEX IF NOT EXISTS idx_case_professionals_status
  ON case_professionals(status);

-- -----------------------------------------------------------------------------
-- TABLE 6 - tasks
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id               UUID NOT NULL REFERENCES cases(id)
                        ON DELETE RESTRICT,
  professional_id       UUID NOT NULL REFERENCES professionals(id)
                        ON DELETE RESTRICT,
  title                 TEXT NOT NULL,
  -- Role-filtered description - Orchestrator strips sensitive info
  -- before writing this. CA never sees legal strategy here.
  description           TEXT NOT NULL,
  -- Context is even more restricted than description
  -- Contains only what this specific professional needs
  context               TEXT,
  -- Required document IDs this task depends on
  required_documents    JSONB DEFAULT '[]',
  deadline              TIMESTAMPTZ NOT NULL,
  priority              TEXT NOT NULL DEFAULT 'normal' CHECK (
                          priority IN ('low','normal','high','urgent')
                        ),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (
                          status IN ('pending','in_progress','completed',
                                     'overdue','escalated','blocked')
                        ),
  -- escalation_count: increments every 48h the task remains overdue
  -- At 3: Orchestrator creates Decision to replace professional
  escalation_count      INTEGER NOT NULL DEFAULT 0,
  -- actual_cost_inr: submitted by professional when marking complete
  -- NULL until professional submits - never assumed or estimated here
  actual_cost_inr       INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own_prof" ON tasks
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update_own_prof" ON tasks
  FOR UPDATE USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_select_own_user" ON tasks
  FOR SELECT USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_service_all" ON tasks
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_tasks_case_id
  ON tasks(case_id);

CREATE INDEX IF NOT EXISTS idx_tasks_professional_id
  ON tasks(professional_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status_deadline
  ON tasks(status, deadline);

CREATE INDEX IF NOT EXISTS idx_tasks_escalation_count
  ON tasks(escalation_count)
  WHERE escalation_count > 0;

-- -----------------------------------------------------------------------------
-- TABLE 7 - documents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS documents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id             UUID NOT NULL REFERENCES cases(id)
                      ON DELETE RESTRICT,
  -- IPFS content identifier - points to the encrypted blob
  -- Never points to raw file content
  ipfs_hash           TEXT NOT NULL,
  -- SHA-256 hash of the AES-256 key - NOT the key itself
  -- Used to verify key integrity without ever storing the key
  encrypted_key_hash  TEXT NOT NULL,
  -- IV used during AES-GCM encryption - safe to store
  -- Required for decryption but useless without the key
  iv_hex              TEXT NOT NULL,
  label               TEXT NOT NULL,
  document_type       TEXT NOT NULL CHECK (
                        document_type IN (
                          'property_deed','itr','bank_statement',
                          'marriage_certificate','birth_certificate',
                          'court_order','valuation_report',
                          'agreement_draft','legal_notice','other'
                        )
                      ),
  uploaded_by         UUID NOT NULL REFERENCES users(id)
                      ON DELETE RESTRICT,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- access_log: append-only array of access events
  -- Each event: { professional_id, accessed_at, action }
  -- Mirrors what is on the Polygon blockchain
  access_log          JSONB NOT NULL DEFAULT '[]',
  -- file_size_bytes: for display only, never for reconstruction
  file_size_bytes     INTEGER,
  -- ProofTimeline transaction hash on Polygon
  blockchain_tx_hash  TEXT
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own_user" ON documents
  FOR SELECT USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "documents_insert_own_user" ON documents
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "documents_select_professional" ON documents
  FOR SELECT USING (
    case_id IN (
      SELECT cp.case_id
      FROM case_professionals cp
      JOIN professionals p ON cp.professional_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "documents_service_all" ON documents
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_documents_case_id
  ON documents(case_id);

CREATE INDEX IF NOT EXISTS idx_documents_document_type
  ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at
  ON documents(uploaded_at DESC);

-- -----------------------------------------------------------------------------
-- TABLE 8 - decisions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS decisions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id       UUID NOT NULL REFERENCES cases(id)
                ON DELETE RESTRICT,
  -- One sentence: what decision is needed
  title         TEXT NOT NULL,
  -- Two sentences: why it matters + what happens if not decided
  context       TEXT NOT NULL,
  -- Array of option objects: { id, label, explanation, consequence }
  options_json  JSONB NOT NULL,
  deadline      TIMESTAMPTZ,
  urgency       TEXT NOT NULL DEFAULT 'normal' CHECK (
                  urgency IN ('normal','urgent','critical')
                ),
  -- status: pending -> decided or expired
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (
                  status IN ('pending','decided','expired')
                ),
  -- The option id the user chose (e.g., "a" or "b")
  user_choice   TEXT,
  decided_at    TIMESTAMPTZ,
  -- 2AM Rule: was the decision made during restricted hours?
  -- Logged for audit - does not invalidate the decision
  made_during_restricted_hours BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decisions_select_own" ON decisions
  FOR SELECT USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "decisions_update_own" ON decisions
  FOR UPDATE USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "decisions_service_all" ON decisions
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_decisions_case_id_status
  ON decisions(case_id, status);

CREATE INDEX IF NOT EXISTS idx_decisions_urgency
  ON decisions(urgency)
  WHERE status = 'pending';

-- -----------------------------------------------------------------------------
-- TABLE 9 - escalations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS escalations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID NOT NULL REFERENCES tasks(id)
                   ON DELETE RESTRICT,
  case_id          UUID NOT NULL REFERENCES cases(id)
                   ON DELETE RESTRICT,
  professional_id  UUID NOT NULL REFERENCES professionals(id)
                   ON DELETE RESTRICT,
  -- reason: plain language description of why escalated
  reason           TEXT NOT NULL,
  -- escalation_level: mirrors tasks.escalation_count at time of event
  escalation_level INTEGER NOT NULL DEFAULT 1,
  escalated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  -- resolution: what action was taken to resolve
  resolution       TEXT,
  -- resolution_type: how it was resolved
  resolution_type  TEXT CHECK (
                     resolution_type IN (
                       'professional_responded',
                       'professional_replaced',
                       'user_extended_deadline',
                       'task_cancelled',
                       'auto_resolved'
                     )
                   )
);

ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalations_select_own_user" ON escalations
  FOR SELECT USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "escalations_service_all" ON escalations
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_escalations_task_id
  ON escalations(task_id);

CREATE INDEX IF NOT EXISTS idx_escalations_case_id
  ON escalations(case_id);

CREATE INDEX IF NOT EXISTS idx_escalations_resolved_at
  ON escalations(resolved_at)
  WHERE resolved_at IS NULL;

-- -----------------------------------------------------------------------------
-- TABLE 10 - consent_logs
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consent_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id)
                   ON DELETE RESTRICT,
  -- consent_type: what the user consented to or revoked
  consent_type     TEXT NOT NULL CHECK (
                     consent_type IN (
                       'emotion_shield_optin',
                       'emotion_shield_optout',
                       'settlement_disclaimer',
                       'document_access_grant',
                       'document_access_revoke',
                       'terms_of_service',
                       'privacy_policy'
                     )
                   ),
  -- consented: TRUE = opted in / accepted, FALSE = opted out / revoked
  consented        BOOLEAN NOT NULL,
  -- version: the version of the disclaimer or policy consented to
  -- References SETTLEMENT_DISCLAIMER.version from disclaimers.js
  version          TEXT,
  -- ip_hash: SHA-256 hash of user IP - not the IP itself (privacy)
  ip_hash          TEXT,
  -- user_agent_hash: hashed user agent string
  user_agent_hash  TEXT,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at - append-only, rows never change
);

ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_logs_insert_own" ON consent_logs
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "consent_logs_select_own" ON consent_logs
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- NO update policy. NO delete policy. APPEND ONLY.
-- Service role can insert (for server-side consent logging)
CREATE POLICY "consent_logs_service_insert" ON consent_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "consent_logs_service_select" ON consent_logs
  FOR SELECT USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id
  ON consent_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type
  ON consent_logs(user_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_logs_timestamp
  ON consent_logs(timestamp DESC);

-- -----------------------------------------------------------------------------
-- TABLE 11 - trust_score_history
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trust_score_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id  UUID NOT NULL REFERENCES professionals(id)
                   ON DELETE RESTRICT,
  score            INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  -- Previous score - allows calculating delta
  previous_score   INTEGER,
  -- What triggered this recalculation
  trigger_event    TEXT NOT NULL CHECK (
                     trigger_event IN (
                       'task_completed_on_time',
                       'task_completed_late',
                       'task_escalated',
                       'professional_replaced',
                       'user_rating',
                       'initial_score',
                       'manual_admin_adjustment'
                     )
                   ),
  -- formula_version: allows auditing if formula changes later
  formula_version  TEXT NOT NULL DEFAULT '2.0',
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at - append-only
);

ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_score_history_select_own" ON trust_score_history
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "trust_score_history_service_all" ON trust_score_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_trust_score_history_professional_id
  ON trust_score_history(professional_id);

CREATE INDEX IF NOT EXISTS idx_trust_score_history_calculated_at
  ON trust_score_history(professional_id, calculated_at DESC);

-- -----------------------------------------------------------------------------
-- TABLE 12 - ml_prediction_log
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ml_prediction_log (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id              UUID NOT NULL REFERENCES cases(id)
                       ON DELETE RESTRICT,
  -- prediction_type: what triggered this prediction
  prediction_type      TEXT NOT NULL CHECK (
                         prediction_type IN (
                           'initial',
                           'live_update',
                           'what_if',
                           'demo'
                         )
                       ),
  -- features_json: the exact 12 (or 16 for live_update) feature
  -- vector passed to the model - enables debugging wrong predictions
  features_json        JSONB NOT NULL,
  -- output_json: full ML prediction output shape from Section 07
  output_json          JSONB NOT NULL,
  -- model_version: matches the version in trained ONNX files
  model_version        TEXT NOT NULL DEFAULT '2.0',
  predicted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- actual_outcome_json: populated when case resolves
  -- Null until case_status = resolved
  -- Shape: { actual_duration_days, actual_cost_inr, path_taken }
  actual_outcome_json  JSONB,
  -- inference_time_ms: how long ONNX inference took
  -- Used to monitor performance degradation
  inference_time_ms    INTEGER
);

ALTER TABLE ml_prediction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ml_prediction_log_service_insert" ON ml_prediction_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "ml_prediction_log_service_select" ON ml_prediction_log
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "ml_prediction_log_select_own" ON ml_prediction_log
  FOR SELECT USING (
    case_id IN (
      SELECT c.id FROM cases c
      JOIN users u ON c.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ml_prediction_log_case_id
  ON ml_prediction_log(case_id);

CREATE INDEX IF NOT EXISTS idx_ml_prediction_log_predicted_at
  ON ml_prediction_log(predicted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_prediction_log_type
  ON ml_prediction_log(prediction_type, predicted_at DESC);

-- -----------------------------------------------------------------------------
-- BONUS TABLE - orchestrator_state
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orchestrator_state (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id        UUID UNIQUE NOT NULL REFERENCES cases(id)
                 ON DELETE RESTRICT,
  -- Full LangGraph state serialized as JSON
  -- Written before every node execution
  state          JSONB NOT NULL,
  -- The last node that completed successfully
  -- Orchestrator resumes AFTER this node on restart
  last_node      TEXT NOT NULL,
  -- checkpoint_id: unique per checkpoint for deduplication
  checkpoint_id  TEXT UNIQUE NOT NULL
                 DEFAULT gen_random_uuid()::TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orchestrator_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orchestrator_state_service_all" ON orchestrator_state
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "orchestrator_state_service_select" ON orchestrator_state
  FOR SELECT USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_orchestrator_state_case_id
  ON orchestrator_state(case_id);

-- -----------------------------------------------------------------------------
-- TRIGGERS - AUTOMATIC UPDATED_AT MAINTENANCE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_profile_updated_at
  BEFORE UPDATE ON case_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orchestrator_state_updated_at
  BEFORE UPDATE ON orchestrator_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- REALTIME PUBLICATION - ENABLE SUPABASE REALTIME
-- -----------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE cases;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE case_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE orchestrator_state;

-- Do NOT add to realtime (sensitive, server-only, or append-only):
-- consent_logs, ml_prediction_log, trust_score_history,
-- escalations, professionals (trust score updates are non-urgent)

-- -----------------------------------------------------------------------------
-- VERIFICATION QUERIES - RUN THESE AFTER MIGRATION
-- -----------------------------------------------------------------------------

-- Verify all 13 tables exist (12 + orchestrator_state)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'users','cases','case_profile','professionals',
  'case_professionals','tasks','documents','decisions',
  'escalations','consent_logs','trust_score_history',
  'ml_prediction_log','orchestrator_state'
);
-- Expected: 13

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
-- Expected: rowsecurity = true on all 13 rows

-- Verify consent_logs has no update or delete policy
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'consent_logs'
AND cmd IN ('UPDATE','DELETE');
-- Expected: 0 rows

-- Verify indexes on tasks table (most queried by deadline agent)
SELECT indexname FROM pg_indexes
WHERE tablename = 'tasks';
-- Expected: at least idx_tasks_status_deadline present

-- Verify Realtime publication includes correct tables
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
-- Expected: cases, tasks, decisions, documents,
--           case_profile, orchestrator_state

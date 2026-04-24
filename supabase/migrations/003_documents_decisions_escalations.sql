-- supabase/migrations/003_documents_decisions_escalations.sql

-- TABLE 1 - documents
-- CRITICAL ARCHITECTURE NOTE:
-- UnwindAI NEVER stores raw documents. Not temporarily. Not ever.
-- This table stores only: IPFS content identifier, encrypted key HASH
-- (not the key), label, type, who uploaded it, and an append-only
-- access log. Raw file bytes never leave the browser unencrypted.
-- If any column in this table could be used to reconstruct a document,
-- the column is wrong - remove it.
CREATE TABLE IF NOT EXISTS documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  uploaded_by         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ipfs_hash           text NOT NULL,
  encrypted_key_hash  text NOT NULL,
  iv_hex              text NOT NULL,
  label               text NOT NULL,
  document_type       text NOT NULL CHECK (document_type IN (
                        'property_deed',
                        'itr',
                        'bank_statement',
                        'marriage_certificate',
                        'business_valuation',
                        'court_order',
                        'agreement_draft',
                        'identity_proof',
                        'other'
                      )),
  file_name           text NOT NULL,
  file_size_bytes     bigint,
  access_log          jsonb NOT NULL DEFAULT '[]'::jsonb,
  uploaded_at         timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz
);

-- What access_log entries look like (enforced by application, not DB):
-- [
--   {
--     "professional_id": "uuid",
--     "professional_role": "ca",
--     "access_granted_at": "ISO",
--     "access_expires_at": "ISO",
--     "granted_by": "orchestrator",
--     "blockchain_tx": "0x..."
--   }
-- ]
-- access_log is APPEND-ONLY at application level.
-- Never UPDATE access_log to remove entries - immutable audit trail.

CREATE INDEX IF NOT EXISTS idx_documents_case_id
  ON documents(case_id);

CREATE INDEX IF NOT EXISTS idx_documents_type
  ON documents(case_id, document_type);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by
  ON documents(uploaded_by);

-- Unique: same IPFS hash should not be stored twice for same case
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_ipfs_unique
  ON documents(case_id, ipfs_hash);

-- TABLE 2 - decisions
-- Decisions are created by the Orchestrator Agent and placed in the
-- Decision Inbox. The user reads them, selects an option, and the
-- Orchestrator resumes from the decision result.
-- options_json structure (enforced at application layer):
-- [
--   {
--     "id": "a",
--     "label": "Accept",
--     "explanation": "one sentence",
--     "consequence": "one sentence - what happens if this is chosen"
--   },
--   {
--     "id": "b",
--     "label": "Reject",
--     "explanation": "one sentence",
--     "consequence": "one sentence"
--   }
-- ]
CREATE TABLE IF NOT EXISTS decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  title           text NOT NULL,
  context         text NOT NULL,
  options_json    jsonb NOT NULL DEFAULT '[]'::jsonb,
  deadline        timestamptz,
  urgency         text NOT NULL DEFAULT 'normal'
                    CHECK (urgency IN ('normal','urgent','critical')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','decided','expired')),
  user_choice     text,
  decided_at      timestamptz,
  two_am_prompted bool NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Constraint: user_choice and decided_at must both be set together
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_decision_consistency'
      AND conrelid = 'decisions'::regclass
  ) THEN
    ALTER TABLE decisions ADD CONSTRAINT chk_decision_consistency
      CHECK (
        (user_choice IS NULL AND decided_at IS NULL)
        OR (user_choice IS NOT NULL AND decided_at IS NOT NULL)
      );
  END IF;
END
$$;

-- Constraint: status=decided requires user_choice to be set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_decided_requires_choice'
      AND conrelid = 'decisions'::regclass
  ) THEN
    ALTER TABLE decisions ADD CONSTRAINT chk_decided_requires_choice
      CHECK (
        (status = 'decided' AND user_choice IS NOT NULL)
        OR (status != 'decided')
      );
  END IF;
END
$$;

-- Core query: Decision Inbox loads pending decisions for a case
CREATE INDEX IF NOT EXISTS idx_decisions_inbox
  ON decisions(case_id, status, urgency)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_decisions_case_id
  ON decisions(case_id);

-- Auto-update updated_at (reuse trigger function from migration 002)
DROP TRIGGER IF EXISTS decisions_updated_at ON decisions;
CREATE TRIGGER decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- TABLE 3 - escalations
-- Escalations are created by the Deadline Agent (BullMQ cron, every 15 min).
-- This table is APPEND-ONLY - the Deadline Agent only INSERTs.
-- Resolution is recorded by adding resolved_at and resolution text
-- on the existing row (one UPDATE per escalation lifetime maximum).
-- No escalation row is ever deleted.
CREATE TABLE IF NOT EXISTS escalations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               uuid NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  case_id               uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  professional_id       uuid NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  reason                text NOT NULL,
  overdue_hours         numeric(8,2) NOT NULL,
  escalated_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz,
  resolution            text,
  notified_user         bool NOT NULL DEFAULT false,
  notified_professional bool NOT NULL DEFAULT false
);

-- Constraint: resolved_at and resolution must appear together
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_resolution_consistency'
      AND conrelid = 'escalations'::regclass
  ) THEN
    ALTER TABLE escalations ADD CONSTRAINT chk_resolution_consistency
      CHECK (
        (resolved_at IS NULL AND resolution IS NULL)
        OR (resolved_at IS NOT NULL AND resolution IS NOT NULL)
      );
  END IF;
END
$$;

-- Deadline Agent query: find all unresolved escalations for a case
CREATE INDEX IF NOT EXISTS idx_escalations_unresolved
  ON escalations(case_id, resolved_at)
  WHERE resolved_at IS NULL;

-- Count escalations per task (feeds escalation_count logic in Orchestrator)
CREATE INDEX IF NOT EXISTS idx_escalations_task_id
  ON escalations(task_id);

CREATE INDEX IF NOT EXISTS idx_escalations_professional
  ON escalations(professional_id, escalated_at DESC);

-- ROW LEVEL SECURITY - ALL 3 TABLES
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent - DROP IF EXISTS then recreate)
DROP POLICY IF EXISTS user_select_own_case_documents ON documents;
DROP POLICY IF EXISTS user_insert_own_case_documents ON documents;
DROP POLICY IF EXISTS professional_select_assigned_case_documents ON documents;
DROP POLICY IF EXISTS user_select_own_decisions ON decisions;
DROP POLICY IF EXISTS user_update_own_decisions ON decisions;
DROP POLICY IF EXISTS user_select_own_escalations ON escalations;

-- DOCUMENTS
-- Users can see all documents for their own case
CREATE POLICY user_select_own_case_documents
  ON documents FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE user_id = auth.uid()
    )
  );

-- Users can upload documents to their own case
CREATE POLICY user_insert_own_case_documents
  ON documents FOR INSERT
  WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Professionals can see document metadata for cases they are assigned to
-- They NEVER get file content (there is none here) - only ipfs_hash + label
CREATE POLICY professional_select_assigned_case_documents
  ON documents FOR SELECT
  USING (
    case_id IN (
      SELECT cp.case_id
      FROM case_professionals cp
      JOIN professionals p ON cp.professional_id = p.id
      WHERE p.auth_user_id = auth.uid()
        AND cp.status = 'active'
    )
  );

-- DECISIONS
-- Users can read decisions for their own case
CREATE POLICY user_select_own_decisions
  ON decisions FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE user_id = auth.uid()
    )
  );

-- Users can update only their own case decisions (to record their choice)
-- user_choice and decided_at only - enforced at application layer
CREATE POLICY user_update_own_decisions
  ON decisions FOR UPDATE
  USING (
    case_id IN (
      SELECT id FROM cases WHERE user_id = auth.uid()
    )
  );

-- ESCALATIONS
-- Users can see escalations for their own case
CREATE POLICY user_select_own_escalations
  ON escalations FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM cases WHERE user_id = auth.uid()
    )
  );

-- SUPABASE REALTIME - ENABLE FOR DECISIONS
-- Decisions table powers the case:{id}:decisions Realtime channel
-- Documents table powers the case:{id}:documents Realtime channel
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'decisions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE documents;
  END IF;
END
$$;

-- Escalations are internal - no direct Realtime to user
-- Orchestrator reads escalations and creates Decisions for the user

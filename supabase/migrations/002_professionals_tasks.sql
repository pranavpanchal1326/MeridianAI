-- supabase/migrations/002_professionals_tasks.sql

-- TABLE 1 - professionals
CREATE TABLE IF NOT EXISTS professionals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  role                  text NOT NULL CHECK (role IN (
                          'lawyer',
                          'ca',
                          'therapist',
                          'property_valuator',
                          'mediator',
                          'business_valuator',
                          'nri_specialist',
                          'notary',
                          'court_clerk',
                          'senior_counsel'
                        )),
  email                 text UNIQUE NOT NULL,
  license_id            text NOT NULL,
  verification_status   text NOT NULL DEFAULT 'pending'
                          CHECK (verification_status IN (
                            'pending',
                            'pending_conflict_check',
                            'verified',
                            'rejected',
                            'suspended'
                          )),
  city                  text NOT NULL CHECK (city IN (
                          'Mumbai','Delhi','Bangalore',
                          'Pune','Hyderabad','Chennai','Ahmedabad'
                        )),
  trust_score           int NOT NULL DEFAULT 0
                          CHECK (trust_score >= 0 AND trust_score <= 100),
  auth_user_id          uuid UNIQUE,
  totp_enabled          bool NOT NULL DEFAULT false,
  onboarded_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Indexes for professionals
CREATE INDEX IF NOT EXISTS idx_professionals_role
  ON professionals(role);

CREATE INDEX IF NOT EXISTS idx_professionals_city
  ON professionals(city);

CREATE INDEX IF NOT EXISTS idx_professionals_verification
  ON professionals(verification_status);

CREATE INDEX IF NOT EXISTS idx_professionals_auth_user
  ON professionals(auth_user_id);

-- TABLE 2 - case_professionals
-- This is the JOIN table between cases and professionals.
-- Every professional assigned to a case gets one row here.
-- conflict_checked must be set to true before status can move to 'active'.
CREATE TABLE IF NOT EXISTS case_professionals (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                    uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  professional_id            uuid NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  assigned_at                timestamptz NOT NULL DEFAULT now(),
  status                     text NOT NULL DEFAULT 'pending'
                               CHECK (status IN (
                                 'pending',
                                 'active',
                                 'completed',
                                 'replaced',
                                 'BLOCKED'
                               )),
  conflict_checked           bool NOT NULL DEFAULT false,
  conflict_check_result      text CHECK (conflict_check_result IN (
                               'clear',
                               'conflict_found',
                               'pending_admin_review'
                             )),
  trust_score_at_assignment  int CHECK (
                               trust_score_at_assignment >= 0
                               AND trust_score_at_assignment <= 100
                             ),
  replaced_at                timestamptz,
  replacement_reason         text
);

-- Unique: one professional can be assigned to a case only once
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_professionals_unique
  ON case_professionals(case_id, professional_id);

-- Fast lookup by case
CREATE INDEX IF NOT EXISTS idx_case_professionals_case_id
  ON case_professionals(case_id);

-- Fast lookup by professional (for their task list)
CREATE INDEX IF NOT EXISTS idx_case_professionals_professional_id
  ON case_professionals(professional_id);

-- Filter active assignments quickly
CREATE INDEX IF NOT EXISTS idx_case_professionals_status
  ON case_professionals(case_id, status);

-- TABLE 3 - tasks
-- Tasks are created by the Orchestrator Agent.
-- Each task is assigned to exactly one professional for one case.
-- actual_cost_inr is nullable - only the professional fills this on completion.
-- escalation_count increments each time the Deadline Agent fires on this task.
CREATE TABLE IF NOT EXISTS tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  professional_id     uuid NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  title               text NOT NULL,
  description         text NOT NULL,
  context_json        jsonb,
  required_documents  uuid[] DEFAULT '{}',
  deadline            timestamptz NOT NULL,
  priority            text NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','urgent')),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending',
                          'in_progress',
                          'completed',
                          'overdue',
                          'escalated',
                          'blocked'
                        )),
  escalation_count    int NOT NULL DEFAULT 0 CHECK (escalation_count >= 0),
  actual_cost_inr     numeric(12,2),
  completion_notes    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

-- Constraint: completed_at only set when status = completed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_completed_at_only_when_complete'
      AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_completed_at_only_when_complete
      CHECK (
        (status = 'completed' AND completed_at IS NOT NULL)
        OR (status != 'completed')
      );
  END IF;
END
$$;

-- Constraint: actual_cost_inr only when task is completed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_cost_only_when_complete'
      AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_cost_only_when_complete
      CHECK (
        (actual_cost_inr IS NULL)
        OR (status = 'completed')
      );
  END IF;
END
$$;

-- Core query: Orchestrator polls overdue tasks every 15 min
CREATE INDEX IF NOT EXISTS idx_tasks_overdue_check
  ON tasks(status, deadline)
  WHERE status NOT IN ('completed', 'blocked');

-- Professional portal: show this professional's task list
CREATE INDEX IF NOT EXISTS idx_tasks_professional_status
  ON tasks(professional_id, status);

-- Case view: all tasks for a case
CREATE INDEX IF NOT EXISTS idx_tasks_case_id
  ON tasks(case_id);

-- updated_at trigger - auto-update on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tasks_updated_at'
      AND tgrelid = 'tasks'::regclass
  ) THEN
    CREATE TRIGGER tasks_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- ROW LEVEL SECURITY - ALL 3 TABLES
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- professionals: a professional can read and update only their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'professionals'
      AND policyname = 'professional_select_own'
  ) THEN
    CREATE POLICY professional_select_own
      ON professionals FOR SELECT
      USING (auth_user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'professionals'
      AND policyname = 'professional_update_own'
  ) THEN
    CREATE POLICY professional_update_own
      ON professionals FOR UPDATE
      USING (auth_user_id = auth.uid());
  END IF;
END
$$;

-- Service role can SELECT/INSERT/UPDATE all professionals (Orchestrator uses service key)
-- This is handled by Supabase service key bypass - no policy needed for service role

-- case_professionals: users can read assignments for their own case
-- Join through cases table to get user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'case_professionals'
      AND policyname = 'user_read_own_case_professionals'
  ) THEN
    CREATE POLICY user_read_own_case_professionals
      ON case_professionals FOR SELECT
      USING (
        case_id IN (
          SELECT id FROM cases WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- professionals can read their own assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'case_professionals'
      AND policyname = 'professional_read_own_assignments'
  ) THEN
    CREATE POLICY professional_read_own_assignments
      ON case_professionals FOR SELECT
      USING (
        professional_id IN (
          SELECT id FROM professionals WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- tasks: professionals can only see tasks assigned to them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'professional_select_own_tasks'
  ) THEN
    CREATE POLICY professional_select_own_tasks
      ON tasks FOR SELECT
      USING (
        professional_id IN (
          SELECT id FROM professionals WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- professionals can update only their own tasks (status, completion_notes, actual_cost_inr)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'professional_update_own_tasks'
  ) THEN
    CREATE POLICY professional_update_own_tasks
      ON tasks FOR UPDATE
      USING (
        professional_id IN (
          SELECT id FROM professionals WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- users can read all tasks for their case (to see professional progress)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'user_read_own_case_tasks'
  ) THEN
    CREATE POLICY user_read_own_case_tasks
      ON tasks FOR SELECT
      USING (
        case_id IN (
          SELECT id FROM cases WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- SUPABASE REALTIME - ENABLE FOR TASKS
-- Enable Realtime replication for tasks table
-- This powers the professional:{id}:tasks channel in Section 06
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
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
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
      AND tablename = 'case_professionals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE case_professionals;
  END IF;
END
$$;

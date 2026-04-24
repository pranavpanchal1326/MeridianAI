-- Enable Realtime on required tables
-- (broadcast channels don't need this but postgres changes do)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cases'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cases;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
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
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'decisions'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
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
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE documents;
  END IF;
END
$$;

-- Realtime Broadcast Policies
-- Supabase Realtime broadcast: auth is handled at subscription level
-- Server always uses service role to broadcast (bypasses RLS)
-- Client subscriptions validated by checking case ownership

-- Policy: Users can only subscribe to their own case channels
-- Enforced at API route level before returning channel names to client
-- Additional check: case_id in channel name must match user's case_id in users table

-- Function: validate user owns case before frontend gets channel name
CREATE OR REPLACE FUNCTION get_user_case_id(user_auth_id UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT case_id FROM users WHERE auth_user_id = user_auth_id LIMIT 1;
$$;

-- Function: validate professional owns their channel
CREATE OR REPLACE FUNCTION get_professional_id(user_auth_id UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id FROM professionals WHERE auth_user_id = user_auth_id LIMIT 1;
$$;

-- Policy: EmotionShield channel - only subscribe if consent given
CREATE OR REPLACE FUNCTION user_emotion_shield_enabled(user_auth_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT consent_emotion_shield FROM users
  WHERE auth_user_id = user_auth_id LIMIT 1;
$$;

-- Append to consent_logs when EmotionShield toggled
-- (trigger ensures it's logged even if app crashes mid-toggle)
CREATE OR REPLACE FUNCTION log_emotion_shield_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.consent_emotion_shield IS DISTINCT FROM NEW.consent_emotion_shield THEN
    INSERT INTO consent_logs (user_id, consent_type, consented, timestamp, ip_hash)
    VALUES (
      NEW.id,
      'emotion_shield',
      NEW.consent_emotion_shield,
      NOW(),
      'trigger_logged'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emotion_shield_consent_trigger ON users;
CREATE TRIGGER emotion_shield_consent_trigger
  AFTER UPDATE OF consent_emotion_shield ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_emotion_shield_change();

-- Phase 16: persistent shared care-thread messages (Supabase).
-- Apply via Supabase MCP (db execute / migration) or psql.
-- Safe to run twice (IF NOT EXISTS guards).

CREATE TABLE IF NOT EXISTS care_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user','bot','doctor','coach','caretaker','system')),
  author_name TEXT,
  author_id TEXT,
  text TEXT NOT NULL,
  is_voice BOOLEAN NOT NULL DEFAULT FALSE,
  voice_duration TEXT,
  transcript TEXT,
  client_msg_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_messages_patient_created
  ON care_messages (patient_id, created_at);

-- Realtime fan-out for cross-device live sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'care_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE care_messages;
  END IF;
END $$;

-- RLS: enable + permissive policies for the anon/service roles used by this app.
-- Tighten later (e.g. check CareRelationship membership via JWT claims) if needed.
ALTER TABLE care_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_messages_select_all" ON care_messages;
CREATE POLICY "care_messages_select_all" ON care_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "care_messages_insert_all" ON care_messages;
CREATE POLICY "care_messages_insert_all" ON care_messages
  FOR INSERT WITH CHECK (true);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to insert contact messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'Anyone can insert contact messages'
  ) THEN
    CREATE POLICY "Anyone can insert contact messages" ON contact_messages
      FOR INSERT WITH CHECK (true);
  END IF;
END
$$;

-- Admins can view contact messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'Admins can view contact messages'
  ) THEN
    CREATE POLICY "Admins can view contact messages" ON contact_messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'editor')
        )
      );
  END IF;
END
$$;

-- Admins can manage (update/delete) contact messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'Admins can manage contact messages'
  ) THEN
    CREATE POLICY "Admins can manage contact messages" ON contact_messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
        )
      );
  END IF;
END
$$;

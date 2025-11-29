/*
  # Fix Notification Triggers to Use Environment Variables

  ## Changes
  Update notification functions to get Supabase credentials from a settings table
  instead of database configuration parameters

  ## New Table
  - `app_settings`: Stores application configuration key-value pairs

  ## Security
  - RLS enabled
  - No public access (only used by SECURITY DEFINER functions)
*/

-- Create app settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- No policies needed - only accessed by SECURITY DEFINER functions

-- Insert Supabase credentials
INSERT INTO app_settings (key, value)
VALUES 
  ('supabase_url', 'https://wgqfdspakixzhbpjmwmr.supabase.co'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWZkc3Bha2l4emhicGptd21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTc0OTAsImV4cCI6MjA3OTczMzQ5MH0.6lUbQ2-fldHjjM64s9RJfWVBmVxqGRVOzPzeYydfifY')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update notification functions to use app_settings table
CREATE OR REPLACE FUNCTION notify_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_title text;
  note_title text;
  note_owner_id uuid;
  completer_name text;
  share_record RECORD;
  token_record RECORD;
  tokens_array text[];
  supabase_url text;
  supabase_anon_key text;
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    SELECT title INTO task_title FROM tasks WHERE id = NEW.id;
    SELECT title, owner_id INTO note_title, note_owner_id FROM notes WHERE id = NEW.note_id;
    SELECT first_name || ' ' || last_name INTO completer_name FROM profiles WHERE id = NEW.completed_by;

    tokens_array := ARRAY[]::text[];

    FOR share_record IN
      SELECT user_id FROM note_shares WHERE note_id = NEW.note_id AND user_id != NEW.completed_by
    LOOP
      FOR token_record IN
        SELECT token FROM notification_tokens WHERE user_id = share_record.user_id
      LOOP
        tokens_array := array_append(tokens_array, token_record.token);
      END LOOP;
    END LOOP;

    IF note_owner_id != NEW.completed_by THEN
      FOR token_record IN
        SELECT token FROM notification_tokens WHERE user_id = note_owner_id
      LOOP
        tokens_array := array_append(tokens_array, token_record.token);
      END LOOP;
    END IF;

    IF array_length(tokens_array, 1) > 0 THEN
      SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
      SELECT value INTO supabase_anon_key FROM app_settings WHERE key = 'supabase_anon_key';

      IF supabase_url IS NOT NULL AND supabase_anon_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := supabase_url || '/functions/v1/send-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || supabase_anon_key
          ),
          body := jsonb_build_object(
            'tokens', tokens_array,
            'title', note_title,
            'body', completer_name || ' bir görevi tamamladı: ' || task_title,
            'data', jsonb_build_object('noteId', NEW.note_id)
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_note_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  note_title text;
  owner_name text;
  token_record RECORD;
  tokens_array text[];
  supabase_url text;
  supabase_anon_key text;
BEGIN
  SELECT n.title, p.first_name || ' ' || p.last_name
  INTO note_title, owner_name
  FROM notes n
  JOIN profiles p ON n.owner_id = p.id
  WHERE n.id = NEW.note_id;

  tokens_array := ARRAY[]::text[];

  FOR token_record IN
    SELECT token FROM notification_tokens WHERE user_id = NEW.user_id
  LOOP
    tokens_array := array_append(tokens_array, token_record.token);
  END LOOP;

  IF array_length(tokens_array, 1) > 0 THEN
    SELECT value INTO supabase_url FROM app_settings WHERE key = 'supabase_url';
    SELECT value INTO supabase_anon_key FROM app_settings WHERE key = 'supabase_anon_key';

    IF supabase_url IS NOT NULL AND supabase_anon_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_anon_key
        ),
        body := jsonb_build_object(
          'tokens', tokens_array,
          'title', 'Yeni Paylaşım',
          'body', owner_name || ' sizinle bir not paylaştı: ' || note_title,
          'data', jsonb_build_object('noteId', NEW.note_id)
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

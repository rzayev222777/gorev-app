/*
  # Fix FCM Push Notification Trigger

  1. Changes
    - Use hardcoded Supabase URL and anon key
    - Fix null URL issue in trigger
*/

-- Drop old function
DROP FUNCTION IF EXISTS send_fcm_push_notification() CASCADE;

-- Create function with hardcoded values
CREATE OR REPLACE FUNCTION send_fcm_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  fcm_tokens text[];
BEGIN
  -- Get FCM tokens for the user
  SELECT array_agg(token) INTO fcm_tokens
  FROM notification_tokens
  WHERE user_id = NEW.user_id;

  -- Only proceed if we have tokens
  IF fcm_tokens IS NOT NULL AND array_length(fcm_tokens, 1) > 0 THEN
    -- Call edge function (async, fire and forget)
    PERFORM net.http_post(
      url := 'https://wgqfdspakixzhbpjmwmr.supabase.co/functions/v1/send-notification-fcm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWZkc3Bha2l4emhicGptd21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MjYwNjYsImV4cCI6MjA0ODIwMjA2Nn0.G4G-rYhIZkVz4X9-YKRmcdAYiQWW6hBM0Gp6z9cj7jY'
      ),
      body := jsonb_build_object(
        'tokens', fcm_tokens,
        'title', NEW.title,
        'body', NEW.body,
        'noteId', NEW.note_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_fcm_push_notification();

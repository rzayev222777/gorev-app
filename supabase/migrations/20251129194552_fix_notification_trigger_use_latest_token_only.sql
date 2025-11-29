/*
  # Fix Notification Trigger - Use Latest Token Only

  1. Changes
    - Modify trigger to only send to the most recent FCM token per user
    - This prevents duplicate notifications when user has multiple tokens
    
  2. Notes
    - Users may have multiple tokens from different devices/browsers
    - We only send to the most recent token to avoid spam
    - Old tokens will naturally expire and can be cleaned up later
*/

DROP FUNCTION IF EXISTS send_fcm_push_notification() CASCADE;

CREATE OR REPLACE FUNCTION send_fcm_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  fcm_token text;
BEGIN
  -- Get only the most recent FCM token for the user
  SELECT token INTO fcm_token
  FROM notification_tokens
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Only proceed if we have a token
  IF fcm_token IS NOT NULL THEN
    -- Call edge function (async, fire and forget)
    PERFORM net.http_post(
      url := 'https://wgqfdspakixzhbpjmwmr.supabase.co/functions/v1/send-notification-fcm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWZkc3Bha2l4emhicGptd21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MjYwNjYsImV4cCI6MjA0ODIwMjA2Nn0.G4G-rYhIZkVz4X9-YKRmcdAYiQWW6hBM0Gp6z9cj7jY'
      ),
      body := jsonb_build_object(
        'tokens', jsonb_build_array(fcm_token),
        'title', NEW.title,
        'body', NEW.body,
        'noteId', NEW.note_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_fcm_push_notification();

/*
  # Track FCM Send Status

  1. Changes
    - Add `fcm_sent` column to notifications table
    - Trigger will only send FCM once per notification
    - This prevents duplicate sends even if trigger runs multiple times
*/

-- Add column to track if FCM was sent
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS fcm_sent boolean DEFAULT false;

-- Drop and recreate trigger with fcm_sent check
DROP FUNCTION IF EXISTS send_fcm_push_notification() CASCADE;

CREATE OR REPLACE FUNCTION send_fcm_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  fcm_token text;
  request_id text;
BEGIN
  request_id := gen_random_uuid()::text;
  
  -- Check if FCM already sent for this notification
  IF NEW.fcm_sent = true THEN
    RAISE LOG '⏭️ FCM already sent for notification: %', NEW.id;
    RETURN NEW;
  END IF;
  
  RAISE LOG '🔵 TRIGGER START - Request: % | Notification ID: %', request_id, NEW.id;

  SELECT token INTO fcm_token
  FROM notification_tokens
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF fcm_token IS NOT NULL THEN
    RAISE LOG '🟢 SENDING FCM - Request: %', request_id;
    
    PERFORM net.http_post(
      url := 'https://wgqfdspakixzhbpjmwmr.supabase.co/functions/v1/send-notification-fcm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWZkc3Bha2l4emhicGptd21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MjYwNjYsImV4cCI6MjA0ODIwMjA2Nn0.G4G-rYhIZkVz4X9-YKRmcdAYiQWW6hBM0Gp6z9cj7jY',
        'X-Request-ID', request_id
      ),
      body := jsonb_build_object(
        'requestId', request_id,
        'tokens', jsonb_build_array(fcm_token),
        'title', NEW.title,
        'body', NEW.body,
        'noteId', NEW.note_id
      )
    );
    
    -- Mark as sent
    UPDATE notifications SET fcm_sent = true WHERE id = NEW.id;
    
    RAISE LOG '✅ FCM SENT - Request: %', request_id;
  ELSE
    RAISE LOG '🔴 NO TOKEN - Request: %', request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_fcm_push_notification();

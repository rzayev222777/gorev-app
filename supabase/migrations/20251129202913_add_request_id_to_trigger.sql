/*
  # Add Request ID to Trigger for Deduplication

  1. Changes
    - Add unique request ID to each trigger invocation
    - Send request ID to edge function for tracking
    - This helps identify if trigger fires multiple times or if edge function is called multiple times
*/

DROP FUNCTION IF EXISTS send_fcm_push_notification() CASCADE;

CREATE OR REPLACE FUNCTION send_fcm_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  fcm_token text;
  request_id text;
BEGIN
  -- Generate unique request ID for this trigger invocation
  request_id := gen_random_uuid()::text;
  
  RAISE LOG '[TRIGGER %] Starting for notification %', request_id, NEW.id;

  -- Get only the most recent FCM token for the user
  SELECT token INTO fcm_token
  FROM notification_tokens
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RAISE LOG '[TRIGGER %] Token: %', request_id, SUBSTRING(fcm_token, 1, 20);

  -- Only proceed if we have a token
  IF fcm_token IS NOT NULL THEN
    RAISE LOG '[TRIGGER %] Calling edge function with title: %', request_id, NEW.title;
    
    -- Call edge function with request ID
    PERFORM net.http_post(
      url := 'https://wgqfdspakixzhbpjmwmr.supabase.co/functions/v1/send-notification-fcm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Request-ID', request_id,
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWZkc3Bha2l4emhicGptd21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MjYwNjYsImV4cCI6MjA0ODIwMjA2Nn0.G4G-rYhIZkVz4X9-YKRmcdAYiQWW6hBM0Gp6z9cj7jY'
      ),
      body := jsonb_build_object(
        'tokens', jsonb_build_array(fcm_token),
        'title', NEW.title,
        'body', NEW.body,
        'noteId', NEW.note_id
      )
    );
    
    RAISE LOG '[TRIGGER %] Edge function called successfully', request_id;
  ELSE
    RAISE LOG '[TRIGGER %] No token found', request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_fcm_push_notification();

/*
  # Debug Trigger Call Count

  1. Changes
    - Add detailed logging to track how many times trigger runs
    - Add entry/exit logs
    - This will help us see if trigger is being called multiple times
*/

DROP FUNCTION IF EXISTS send_fcm_push_notification() CASCADE;

CREATE OR REPLACE FUNCTION send_fcm_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  fcm_token text;
  request_id text;
BEGIN
  request_id := gen_random_uuid()::text;
  
  RAISE LOG '🔵 TRIGGER START - Request: % | Notification ID: % | User: %', 
    request_id, NEW.id, NEW.user_id;

  SELECT token INTO fcm_token
  FROM notification_tokens
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF fcm_token IS NOT NULL THEN
    RAISE LOG '🟢 SENDING FCM - Request: % | Token: %', 
      request_id, SUBSTRING(fcm_token, 1, 30);
    
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
    
    RAISE LOG '🟣 FCM SENT - Request: %', request_id;
  ELSE
    RAISE LOG '🔴 NO TOKEN - Request: %', request_id;
  END IF;

  RAISE LOG '🔵 TRIGGER END - Request: %', request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_fcm_push_notification();

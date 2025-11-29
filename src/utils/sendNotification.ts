import { supabase } from '../lib/supabase';

interface SendNotificationParams {
  userIds: string[];
  title: string;
  body: string;
  noteId?: string;
}

export async function sendNotification({ userIds, title, body, noteId }: SendNotificationParams) {
  try {
    console.log('📤 Sending notification to users:', userIds);
    console.log('📧 Title:', title, 'Body:', body);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        userIds,
        title,
        body,
        noteId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error creating notifications:', error);
      return;
    }

    const result = await response.json();
    console.log(`✅ Created ${result.count} notification(s)`);
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

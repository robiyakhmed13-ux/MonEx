import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY'); // Firebase Cloud Messaging server key

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal';
}

interface FCMNotification {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  priority: string;
  android?: {
    priority: string;
    notification: {
      sound: string;
      channel_id: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        sound: string;
        badge?: number;
      };
    };
  };
}

async function sendFCMNotification(token: string, notification: FCMNotification): Promise<boolean> {
  if (!FCM_SERVER_KEY) {
    console.error('FCM_SERVER_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        ...notification,
      }),
    });

    const result = await response.json();
    if (result.success === 0 && result.results?.[0]?.error) {
      console.error('FCM error:', result.results[0].error);
      // If token is invalid, we should remove it from database
      if (result.results[0].error === 'InvalidRegistration' || 
          result.results[0].error === 'NotRegistered') {
        return false; // Signal to remove token
      }
      return false;
    }
    return result.success === 1;
  } catch (error) {
    console.error('Failed to send FCM notification:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data, priority = 'high' }: PushNotificationRequest = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get all device tokens for this user
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('device_token, platform')
      .eq('user_id', user_id);

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch devices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No devices found for user', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const notification: FCMNotification = {
      notification: {
        title,
        body,
      },
      priority: priority === 'high' ? 'high' : 'normal',
      android: {
        priority: priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channel_id: 'monex_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    // Add data payload if provided
    if (data) {
      notification.data = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>);
    }

    // Send to all devices
    let sentCount = 0;
    const invalidTokens: string[] = [];

    for (const device of devices) {
      const success = await sendFCMNotification(device.device_token, notification);
      if (success) {
        sentCount++;
      } else {
        invalidTokens.push(device.device_token);
      }
    }

    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      await supabase
        .from('user_devices')
        .delete()
        .in('device_token', invalidTokens);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent', 
        sent: sentCount, 
        total: devices.length,
        invalid_tokens_removed: invalidTokens.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


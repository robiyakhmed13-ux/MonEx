// Telegram Webhook Setup Function
// Call this endpoint to set/check/delete the Telegram webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ 
        error: 'TELEGRAM_BOT_TOKEN not configured',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'info';

    // Build webhook URL
    const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;

    console.log(`Telegram Setup - Action: ${action}`);
    console.log(`Webhook URL: ${webhookUrl}`);

    let result: any;

    switch (action) {
      case 'set':
        // Set the webhook
        const setResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: webhookUrl,
              allowed_updates: ['message', 'callback_query'],
              drop_pending_updates: true,
            }),
          }
        );
        result = await setResponse.json();
        console.log('Set webhook result:', JSON.stringify(result));
        break;

      case 'delete':
        // Delete the webhook
        const deleteResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
          { method: 'POST' }
        );
        result = await deleteResponse.json();
        console.log('Delete webhook result:', JSON.stringify(result));
        break;

      case 'info':
      default:
        // Get current webhook info
        const infoResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
        );
        result = await infoResponse.json();
        console.log('Webhook info:', JSON.stringify(result));
        break;
    }

    // Also get bot info
    const meResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );
    const botInfo = await meResponse.json();

    return new Response(JSON.stringify({
      success: result.ok !== false,
      action,
      result,
      bot: botInfo.result,
      expectedWebhook: webhookUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Telegram setup error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

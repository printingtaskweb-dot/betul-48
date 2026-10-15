// Supabase Edge Function: send-push
// Deploy with: supabase functions deploy send-push
// Deno runtime — uses FCM HTTP v1 API with a Service Account JWT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ── CORS headers ──────────────────────────────────────── */
const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/* ── Helper: create a signed JWT for Google OAuth2 ─────── */
async function createJWT(serviceAccount: Record<string, string>): Promise<string> {
  const now  = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  };

  const enc = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${enc(header)}.${enc(payload)}`;

  // Import the RSA private key from PEM
  const pemBody = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput),
  );

  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${signingInput}.${sig64}`;
}

/* ── Helper: exchange JWT for Google OAuth2 access token ── */
async function getAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const jwt = await createJWT(serviceAccount);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`OAuth token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

/* ── Helper: send a single FCM message ────────────────── */
async function sendFCMMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  url: string,
): Promise<boolean> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon:  '/logo.png',
              badge: '/logo.png',
              click_action: url,
            },
            fcm_options: { link: url },
          },
          data: { url, sent_at: new Date().toISOString() },
        },
      }),
    },
  );
  return res.ok;
}

/* ── Main handler ──────────────────────────────────────── */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    /* 1. Parse request body */
    const { title, body, url = '/', tokens: requestedTokens, user_ids, sent_by } = await req.json() as {
      title:   string;
      body:    string;
      url?:    string;
      tokens?: string[];
      user_ids?: string[];
      sent_by?: string;
    };

    if (!title || !body || (!requestedTokens?.length && !user_ids?.length)) {
      return new Response(
        JSON.stringify({ error: 'title, body, and tokens[] or user_ids[] are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supa = createClient(supabaseUrl, supabaseSecret);
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: actor } = await supa.from('user_profiles')
      .select('role, is_admin, approval_status')
      .eq('id', authData.user.id)
      .maybeSingle();
    const canSend = actor?.approval_status !== 'rejected' && (
      actor?.is_admin === true ||
      ['admin', 'municipal_administrator', 'deputy_commissioner', 'verification_officer'].includes(actor?.role || '') ||
      authData.user.email?.toLowerCase() === 'ouikey41@gmail.com'
    );
    if (!canSend) {
      return new Response(JSON.stringify({ error: 'Not authorized to send notifications' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let tokens = requestedTokens || [];
    if (user_ids?.length) {
      const { data: userTokens, error: tokenError } = await supa.from('fcm_tokens')
        .select('token')
        .in('user_id', Array.from(new Set(user_ids)));
      if (tokenError) throw tokenError;
      tokens = [...tokens, ...(userTokens || []).map((row: { token: string }) => row.token)];
    }
    if (!tokens.length) {
      return new Response(JSON.stringify({ error: 'No registered devices found for recipients' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    /* 2. Load Firebase service account from env secret */
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT secret is not set in Supabase dashboard.');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id || 'printing-task-78a01';

    /* 3. Get OAuth2 access token */
    const accessToken = await getAccessToken(serviceAccount);

    /* 4. Send to all unique tokens (in parallel batches of 100) */
    const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
    let sent = 0;
    const failed: string[] = [];
    const batchSize = 100;

    for (let i = 0; i < uniqueTokens.length; i += batchSize) {
      const batch = uniqueTokens.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(token => sendFCMMessage(accessToken, projectId, token, title, body, url))
      );
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) sent++;
        else failed.push(batch[idx]);
      });
    }

    /* 5. Log to Supabase notification_log table */
    try {
      await supa.from('notification_log').insert({
        title,
        body,
        url,
        sent_to_count: sent,
        failed_count:  failed.length,
        sent_by:       authData.user.id || sent_by || null,
        created_at:    new Date().toISOString(),
      });
    } catch (_logErr) {
      // Non-fatal — don't fail the whole request if logging fails
      console.warn('Failed to log notification:', _logErr);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed: failed.length, total: tokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-push] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

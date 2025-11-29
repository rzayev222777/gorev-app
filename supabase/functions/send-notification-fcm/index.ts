import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface FCMRequest {
  tokens: string[];
  title: string;
  body: string;
  noteId?: string;
}

const SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'gorev-2a82b',
  private_key_id: '9e09c4b6002a3a2be2f56e87fe19359e495192a0',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD2uYeZKSPBd7cq\nZ+38A28Hyi0j/BWRNB4qXWhnrP7P9E1swiU/Q1JBNvtHYP1TVVcCROcEssERAkL2\nLwlJV8DgdTmRDA2wyphQoVAbjnvuqXy7xR8ExpeGpYWAOhD6zENizsdVQJUDBsXw\n2VDC2RjhOjl433nQDWjmOETafsW+ZBgemuSuOunEgfxtVdEKRXEJrWoZvbxrGmz0\nLZl0G/gk0ux4xI6PvkUjzB9CNe0G3v+hujMIO56YUTarosergGLRElx2ygiMf+Fq\nQ7/trbvH1a70EUB4R3c9mwRYEFQbSS3UN4khKpF0ufvu7ohf4aGMHpk0pgxCtIGT\nE3CjZO43AgMBAAECggEAdDn4N92ae3RC9BYblUGk112VoEMLgei0YS65lUV4kEw9\nAQQAeenj4NbezsRQ8iXcpDQDREJVEwcmtkR4MnXFZbezU7IC7QqzcCBd1W1s0oRD\nP01gDGblUMe+uSYhg5QgFnbkjjOrPs69BnXJRtDwmIFOO7PC9ZCrnvBY9zkLPGGL\n7AXEPwU1oYwTXGgt5k85YRm1nfyp70hkiqSCIySIcEc8yjHiHCTcZBIshIQWhVDV\nqK/64hV1/RrQbtCzoxwvy7FPBKxLaomoLJIW8M75P6ylV+eRe0VEYG9zBPNIgJGI\ndZT/3SbL3LTLng83xaj67I9vT4h/Mk7yttaDcp4GgQKBgQD/8l4j9tg7VPqa7UBa\nktuG1ZEvlUngiyItOJO0NdBTFxnHXF1eaq2AC7+AZCsXb9sxzTteSIWcddhk7fqF\n+/WsvXi7qs2mr/uC4iSChTRMdiWqmvjFkTbq/qVJG85jI9URYXaHjUxmdQojPgs4\nFV9DvUeFt6WTOYepKPbBKNPrwQKBgQD2xqu27vrTmCMqAYr7tQXEKDGh9opUuTOl\ncU/5S99N8oUNyCihY431Z2Y+ipYVCYZhAEWnGca1OKm/AyB2ZDXNNDyYCEQwyEAv\nrgoQ6fSHlaIk7mC70oCiWt9Qcn5HVnJi2t+KwoFMC/IDovmrnLwws/7v38+zh4tq\ndKH8YMY39wKBgQDfzjSJqEDeaOmWbZ2XVdGGbtu8ywNFyQQCnPVzYJchARM2o8q1\nU/0Q+bTj9TNFFDeMrdSbFjlXXijx4LLvVCo4eZnIKIwZlMsOYObiBs57idhX/ZlJ\nUTi/dhpb+meXg269+walc2X6NZ++v3MaAH5EApA3GiY7vdOllL9ommXtQQKBgQCV\nq0ESHjc6hhctrungZ5YrtkUD+kdDw1+zg9oBVScGW4SfKzqZR4wdvqygWeVUtQYv\nZr7X7iY6Wzd4hij2JSkMYBYwDzNscsebI28vevW4FeTViU5aG/2wenTekdJM6f1O\nP3k862MIAGa0FfBfSRxKXaDNU2zhcd/4nOxx6S/PWQKBgCmZRuMirASXB9sBWIj9\nswQhowYKXjIoghKp4DN+r/uM7ZGpHlt/hryL6e0nggWRuBhFZS/rAL+TNMy2fHcr\nmcTwtHULTNRr27K96k0Cp15d6X4GhUFTgPvv+VBgIM7F7t9fTBh4B+VGnx4MJDzX\njhooQ9CH4W+wiBkTIs4EzZkj\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@gorev-2a82b.iam.gserviceaccount.com',
  client_id: '117884870280926513911',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gorev-2a82b.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};

const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/messages:send`;

async function getAccessToken(): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: SERVICE_ACCOUNT.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(SERVICE_ACCOUNT.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${encodedSignature}`;

  const response = await fetch(SERVICE_ACCOUNT.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  return data.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  noteId?: string
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();

    const message = {
      message: {
        token,
        notification: {
          title,
          body,
        },
        data: noteId ? { noteId } : undefined,
        webpush: noteId ? {
          fcm_options: {
            link: `https://gorev.bolt.host/note/${noteId}`
          }
        } : undefined,
      },
    };

    const response = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('FCM error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestId = req.headers.get('X-Request-ID') || crypto.randomUUID();
    const { tokens, title, body, noteId }: FCMRequest = await req.json();

    console.log(`[${requestId}] ⚡ EDGE FUNCTION CALLED`);
    console.log(`[${requestId}] Sending FCM to ${tokens.length} device(s)`);
    console.log(`[${requestId}] Title: ${title}`);
    console.log(`[${requestId}] Body: ${body}`);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = await Promise.allSettled(
      tokens.map(token => sendFCMNotification(token, title, body, noteId))
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`[${requestId}] ✅ FCM sent: ${successCount}/${tokens.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: tokens.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('FCM error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import type { ExportedHandler, Fetcher, Request } from '@cloudflare/workers-types';

interface Env {
    ASSETS: Fetcher;
    VITE_GOOGLE_CLIENT_ID: string;
    VITE_GOOGLE_CLIENT_SECRET: string;
    VITE_MICROSOFT_CLIENT_ID: string;
    VITE_MICROSOFT_CLIENT_SECRET: string;
}

const exported = {
    fetch: async (request, env) => {
        const url = new URL(request.url);

        if (url.pathname.startsWith("/api/")) {
            return await handleApiRequests(url.pathname, request, env);
        }

        return await env.ASSETS.fetch(request);
    }
} as ExportedHandler<Env>;

async function handleApiRequests(path: string, request: Request, env: Env): Promise<Response> {
    switch (path) {
        case "/api/token": return handleTokenRequest(request, env);
        default: return new Response('Not Found', { status: 404 })
    }
}

async function handleTokenRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const params = url.searchParams;
    // Same-origin as the SPA that initiated login, so this matches the
    // client-side redirect_uri on both production and preview deployments.
    const callbackUrl = `${url.origin}/auth/callback`;
    const code = params.get('code');
    const token = params.get('token');
    const handler = params.get('handler')?.includes('-') ? params.get('handler')?.split('-')[0] : params.get('handler');

    switch (handler) {
        case 'google': return handleGoogleTokenRequest(code, token, env, callbackUrl);
        case 'microsoft': return handleMicrosoftTokenRequest(code, token, env, callbackUrl);
        default: return new Response('Not Found', { status: 404 })
    }
}

async function handleMicrosoftTokenRequest(code: string | null, token: string | null, env: Env, callbackUrl: string): Promise<Response> {
    const clientId = env.VITE_MICROSOFT_CLIENT_ID;
    const clientSecret = env.VITE_MICROSOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret || !callbackUrl) {
        return new Response('Bad Request', { status: 400 });
    }

    const params: Record<string, string> = {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
    }

    if (code) {
        params['grant_type'] = 'authorization_code';
        params['code'] = code;
    } else if (token) {
        params['grant_type'] = 'refresh_token';
        params['refresh_token'] = token;
    } else {
        return new Response('Bad Request', { status: 400 });
    }

    const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(params).toString(),
    });

    const resText = await response.text();
    return new Response(resText, {
        status: 200,
        headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
        }
    });
}

async function handleGoogleTokenRequest(code: string | null, token: string | null, env: Env, callbackUrl: string): Promise<Response> {
    const clientId = env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = env.VITE_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret || !callbackUrl) {
        return new Response('Bad Request', { status: 400 });
    }

    const params: Record<string, string> = {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
    }

    if (code) {
        params['grant_type'] = 'authorization_code';
        params['code'] = code;
    } else if (token) {
        params['grant_type'] = 'refresh_token';
        params['refresh_token'] = token;
    } else {
        return new Response('Bad Request', { status: 400 });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(params).toString(),
    });

    const resText = await response.text();

    return new Response(resText, {
        status: 200,
        headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
        }
    });
}
export default exported;
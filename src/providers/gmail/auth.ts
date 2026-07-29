import { exec } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { config } from '../../config.js';

// Read-only scope only — Gmail's equivalent of Graph's Mail.Read. Do not add
// gmail.modify / gmail.send here for v1 (see "8. Privacy and safety controls").
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Google's OAuth device-authorization flow (used for the Outlook-style
// "print a code, sign in elsewhere" UX) only supports a small scope allowlist
// (openid/email/profile, Drive, YouTube) — Gmail scopes are rejected with
// invalid_scope. Gmail requires the standard authorization-code flow instead,
// via a loopback redirect (RFC 8252) — this needs a "Desktop app" OAuth
// client in Google Cloud Console, not the "TVs and Limited Input devices"
// type the device flow uses.
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_PATH = path.join(DATA_DIR, 'gmail-token-cache.json');

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

function loadCache(): TokenCache | null {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as TokenCache;
  } catch {
    return null;
  }
}

function saveCache(cache: TokenCache): void {
  mkdirSync(DATA_DIR, { recursive: true });
  // TODO(production): encrypt this file at rest, same caveat as the Outlook token cache.
  writeFileSync(CACHE_PATH, JSON.stringify(cache), { mode: 0o600 });
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function openInBrowser(url: string): void {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  // Best-effort — the URL is always printed too, so a failure here isn't fatal.
  exec(`${command} "${url}"`, () => {});
}

interface AuthorizationResult {
  code: string;
  redirectUri: string;
}

/**
 * Starts a one-shot local HTTP server on a random loopback port, opens the
 * Google consent screen in the user's browser, and resolves once Google
 * redirects back with an authorization code.
 */
async function runLoopbackAuthorization(codeChallenge: string): Promise<AuthorizationResult> {
  return new Promise((resolve, reject) => {
    let redirectUri = '';

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Google sign-in timed out before you completed the browser flow.'));
    }, LOGIN_TIMEOUT_MS);

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', redirectUri || 'http://127.0.0.1');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      if (error) {
        res.end(`<p>Sign-in failed: ${error}. You can close this window.</p>`);
        cleanup();
        reject(new Error(`Google sign-in was denied or failed: ${error}`));
        return;
      }
      if (!code) {
        res.end('<p>No authorization code received. You can close this window.</p>');
        return;
      }

      res.end('<p>Signed in - you can close this window and return to the terminal.</p>');
      cleanup();
      resolve({ code, redirectUri });
    });

    function cleanup(): void {
      clearTimeout(timeout);
      server.close();
    }

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      redirectUri = `http://127.0.0.1:${port}`;

      const authUrl = new URL(AUTH_URL);
      authUrl.searchParams.set('client_id', config.googleClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      console.log(`\nOpening your browser to sign in to Google. If it doesn't open, visit:\n${authUrl.toString()}\n`);
      openInBrowser(authUrl.toString());
    });
  });
}

async function exchangeCodeForToken(code: string, redirectUri: string, codeVerifier: string): Promise<TokenCache> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  if (!data.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Revoke this app\'s access at ' +
        'https://myaccount.google.com/permissions and sign in again — Google only issues a ' +
        'refresh token on first consent for a given account.',
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<TokenCache> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  return {
    accessToken: data.access_token,
    // Google usually omits refresh_token on a plain refresh — keep the old one.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Returns a valid Gmail access token, reusing the cached refresh token when
 * possible. Falls back to the loopback authorization-code flow (opens a
 * browser tab, listens on a local port for the redirect) on first run or
 * once the refresh token expires.
 */
export async function getAccessToken(): Promise<string> {
  const cached = loadCache();

  if (cached) {
    if (cached.expiresAt - 60_000 > Date.now()) {
      return cached.accessToken;
    }
    try {
      const refreshed = await refreshAccessToken(cached.refreshToken);
      saveCache(refreshed);
      return refreshed.accessToken;
    } catch {
      // Refresh token expired or revoked — fall through to interactive login.
    }
  }

  const { verifier, challenge } = generatePkcePair();
  const { code, redirectUri } = await runLoopbackAuthorization(challenge);
  const token = await exchangeCodeForToken(code, redirectUri, verifier);
  saveCache(token);
  return token.accessToken;
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../../config.js';

// Read-only scope only — Gmail's equivalent of Graph's Mail.Read. Do not add
// gmail.modify / gmail.send here for v1 (see "8. Privacy and safety controls").
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  interval: number;
  expires_in: number;
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.googleClientId, scope: SCOPES.join(' ') }),
  });
  if (!res.ok) {
    throw new Error(`Google device code request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<DeviceCodeResponse>;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

async function pollForToken(deviceCode: string, intervalSeconds: number, expiresInSeconds: number): Promise<TokenCache> {
  const deadline = Date.now() + expiresInSeconds * 1000;
  let interval = intervalSeconds;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = (await res.json()) as TokenResponse;

    if (res.ok) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? '',
        expiresAt: Date.now() + data.expires_in * 1000,
      };
    }

    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      interval += 5;
      continue;
    }

    throw new Error(`Google sign-in failed: ${data.error ?? res.status} ${data.error_description ?? ''}`.trim());
  }

  throw new Error('Google sign-in timed out before you approved access.');
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

  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    // Google usually omits refresh_token on a plain refresh — keep the old one.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Returns a valid Gmail access token, reusing the cached refresh token when
 * possible. Falls back to the OAuth device-authorization flow (RFC 8628) on
 * first run or once the refresh token expires — prints a verification URL +
 * code to the console, mirroring the Outlook device-code login.
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

  const device = await requestDeviceCode();
  console.log(`\nGo to ${device.verification_url} and enter code: ${device.user_code}\n`);
  const token = await pollForToken(device.device_code, device.interval, device.expires_in);
  saveCache(token);
  return token.accessToken;
}

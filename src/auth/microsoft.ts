import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PublicClientApplication, type AccountInfo } from '@azure/msal-node';
import { config } from '../config.js';

// Read-only delegated scopes only — see "3. Microsoft 365 email connection" in
// the workflow spec. Do not add Mail.ReadWrite or Mail.Send here for v1.
const SCOPES = ['openid', 'profile', 'offline_access', 'User.Read', 'Mail.Read'];

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_PATH = path.join(DATA_DIR, 'token-cache.json');

let pcaInstance: PublicClientApplication | undefined;

function getPca(): PublicClientApplication {
  if (pcaInstance) return pcaInstance;

  mkdirSync(DATA_DIR, { recursive: true });

  pcaInstance = new PublicClientApplication({
    auth: {
      clientId: config.azureClientId,
      authority: `https://login.microsoftonline.com/${config.azureTenantId}`,
    },
    cache: {
      cachePlugin: {
        beforeCacheAccess: async (cacheContext) => {
          if (existsSync(CACHE_PATH)) {
            cacheContext.tokenCache.deserialize(readFileSync(CACHE_PATH, 'utf-8'));
          }
        },
        afterCacheAccess: async (cacheContext) => {
          if (cacheContext.cacheHasChanged) {
            // TODO(production): encrypt this file at rest instead of writing plaintext MSAL cache.
            writeFileSync(CACHE_PATH, cacheContext.tokenCache.serialize(), { mode: 0o600 });
          }
        },
      },
    },
  });

  return pcaInstance;
}

/**
 * Returns a valid Graph access token, reusing the cached refresh token when
 * possible. Falls back to an interactive device-code login (prints a URL +
 * code to the console) on first run or once the refresh token expires.
 *
 * If the tenant requires admin consent that hasn't been granted, MSAL raises
 * an error here and this function lets it propagate — per the spec, the
 * workflow should fail clearly and stop rather than trying another login path.
 */
export async function getAccessToken(): Promise<string> {
  const pca = getPca();
  const cache = pca.getTokenCache();
  const accounts: AccountInfo[] = await cache.getAllAccounts();

  if (accounts.length > 0) {
    try {
      const result = await pca.acquireTokenSilent({ account: accounts[0], scopes: SCOPES });
      if (result?.accessToken) return result.accessToken;
    } catch {
      // Refresh token expired or revoked — fall through to interactive login.
    }
  }

  const result = await pca.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (response) => {
      console.log(`\n${response.message}\n`);
    },
  });

  if (!result?.accessToken) {
    throw new Error('Microsoft sign-in failed: no access token returned.');
  }

  return result.accessToken;
}

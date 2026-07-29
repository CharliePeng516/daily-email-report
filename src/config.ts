import 'dotenv/config';

// Bump whenever the classification prompt or EmailAnalysis schema changes,
// so historical report rows stay traceable to the logic that produced them.
export const ANALYSIS_VERSION = '2026-07-29.1';

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function requiredForRealRun(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in, ` +
        `or pass --mock to run the pipeline against fixture data without credentials.`,
    );
  }
  return value;
}

export const config = {
  timezone: optional('TIMEZONE', 'Australia/Sydney'),
  userEmail: optional('USER_EMAIL', ''),
  managerEmails: optional('MANAGER_EMAILS', '')
    .split(',')
    .map((addr) => addr.trim().toLowerCase())
    .filter(Boolean),

  get azureClientId(): string {
    return requiredForRealRun('AZURE_CLIENT_ID');
  },
  get azureTenantId(): string {
    return requiredForRealRun('AZURE_TENANT_ID');
  },

  get googleClientId(): string {
    return requiredForRealRun('GOOGLE_CLIENT_ID');
  },
  get googleClientSecret(): string {
    return requiredForRealRun('GOOGLE_CLIENT_SECRET');
  },

  get openaiApiKey(): string {
    return requiredForRealRun('OPENAI_API_KEY');
  },
  openaiModel: optional('OPENAI_MODEL', 'gpt-4o-mini'),
};

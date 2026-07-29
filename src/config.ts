import 'dotenv/config';

// Bump whenever the classification prompt or EmailAnalysis schema changes,
// so historical report rows stay traceable to the logic that produced them.
export const ANALYSIS_VERSION = '2026-07-29.2';

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

export type LlmProvider = 'openai' | 'deepseek';

// OpenAI's strict structured-outputs mode (json_schema, grammar-constrained)
// isn't offered by DeepSeek — it only has plain JSON mode, which doesn't
// guarantee the response matches our schema. classify.ts branches on this.
const LLM_PROVIDER_DEFAULTS: Record<LlmProvider, { baseUrl?: string; model: string; apiKeyEnvVar: string }> = {
  openai: { model: 'gpt-4o-mini', apiKeyEnvVar: 'OPENAI_API_KEY' },
  // deepseek-v4-flash is the cheap/fast tier — deepseek-v4-pro trades cost for quality.
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', apiKeyEnvVar: 'DEEPSEEK_API_KEY' },
};

const llmProvider: LlmProvider = optional('LLM_PROVIDER', 'openai').toLowerCase() === 'deepseek'
  ? 'deepseek'
  : 'openai';
const llmDefaults = LLM_PROVIDER_DEFAULTS[llmProvider];

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

  llmProvider,
  llmSupportsStrictJsonSchema: llmProvider === 'openai',
  llmBaseUrl: optional('LLM_BASE_URL', llmDefaults.baseUrl ?? ''),
  llmModel: optional('LLM_MODEL', llmDefaults.model),
  get llmApiKey(): string {
    return requiredForRealRun(llmDefaults.apiKeyEnvVar);
  },
};

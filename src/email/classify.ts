import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { config } from '../config.js';
import { EmailAnalysisSchema, type EmailAnalysis, type NormalisedEmail } from '../types.js';

const SYSTEM_PROMPT = `You are a triage assistant for a university staff member's inbox. \
Analyse ONE email at a time and return a structured assessment only — never a free-form paragraph. \
Be conservative: only set actionRequired to true when the sender is explicitly asking the recipient \
to do something. Only fill "deadline" when the email states or clearly implies a specific date/time; \
otherwise return null. If the email discusses an individual student's health, welfare, academic \
integrity, special consideration, or another sensitive personal matter, set sensitive to true and keep \
"summary" free of identifying detail (e.g. "Sensitive student matter - manual review required.").`;

// Only needed for the JSON-mode fallback below — providers with OpenAI's strict
// json_schema mode (config.llmSupportsStrictJsonSchema) get this enforced by the
// API itself instead, via zodResponseFormat.
const JSON_SCHEMA_INSTRUCTIONS = `Return ONLY a single JSON object (no prose, no markdown fences) with exactly these fields:
{
  "category": "urgent_action" | "student_issue" | "teaching_admin" | "meeting" | "deadline" | "announcement" | "newsletter" | "spam" | "other",
  "summary": string,
  "actionRequired": boolean,
  "action": string | null,
  "deadline": string | null,      // ISO 8601 date-time, or null if none stated
  "urgency": number,              // 0-10
  "importance": number,           // 0-10
  "senderRole": "manager" | "course_admin" | "colleague" | "student" | "university_system" | "unknown",
  "sensitive": boolean,
  "confidence": number,           // 0-1
  "reasons": string[]
}`;

function buildUserPrompt(email: NormalisedEmail): string {
  return [
    `From: ${email.fromName} <${email.fromAddress}>`,
    `To: ${email.toRecipients.join(', ') || '(unknown)'}`,
    `Received: ${email.receivedDateTime}`,
    `Microsoft importance flag: ${email.importance}`,
    `Subject: ${email.subject}`,
    '',
    'Body:',
    email.bodyText || '(empty body)',
  ].join('\n');
}

let client: OpenAI | undefined;
function getClient(): OpenAI {
  client ??= new OpenAI({ apiKey: config.llmApiKey, baseURL: config.llmBaseUrl || undefined });
  return client;
}

// OpenAI's grammar-constrained structured outputs — guarantees the response matches EmailAnalysisSchema.
async function classifyStrict(email: NormalisedEmail): Promise<EmailAnalysis> {
  const completion = await getClient().beta.chat.completions.parse({
    model: config.llmModel,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(email) },
    ],
    response_format: zodResponseFormat(EmailAnalysisSchema, 'email_analysis'),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error(`${config.llmProvider} returned no structured result for message ${email.id}`);
  }

  // Belt-and-braces: re-validate even though the API enforced the schema.
  return EmailAnalysisSchema.parse(parsed);
}

// Plain JSON mode for providers without strict schema enforcement (e.g. DeepSeek) —
// the model is only asked nicely via JSON_SCHEMA_INSTRUCTIONS, so a shape mismatch
// is possible. EmailAnalysisSchema.parse() throws in that case, which the caller
// (jobs/daily-report.ts) already treats as a per-message processing error rather
// than aborting the run.
async function classifyJsonMode(email: NormalisedEmail): Promise<EmailAnalysis> {
  const completion = await getClient().chat.completions.create({
    model: config.llmModel,
    temperature: 0,
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${JSON_SCHEMA_INSTRUCTIONS}` },
      { role: 'user', content: buildUserPrompt(email) },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`${config.llmProvider} returned no content for message ${email.id}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error(`${config.llmProvider} returned invalid JSON for message ${email.id}`);
  }

  return EmailAnalysisSchema.parse(raw);
}

export async function classifyEmail(email: NormalisedEmail): Promise<EmailAnalysis> {
  return config.llmSupportsStrictJsonSchema ? classifyStrict(email) : classifyJsonMode(email);
}

const KEYWORD_RULES: Array<{ pattern: RegExp; analysis: Partial<EmailAnalysis> }> = [
  {
    pattern: /unsubscribe|newsletter|weekly digest/i,
    analysis: {
      category: 'newsletter',
      summary: 'Weekly newsletter digest.',
      urgency: 1,
      importance: 1,
      actionRequired: false,
    },
  },
  {
    pattern: /you('ve| have) won|claim your prize|wire transfer|verify your account/i,
    analysis: {
      category: 'spam',
      summary: 'Unsolicited message flagged as spam.',
      urgency: 0,
      importance: 0,
      actionRequired: false,
      sensitive: false,
    },
  },
  {
    pattern: /deadline|due by|submit .* by|attendance/i,
    analysis: {
      category: 'deadline',
      summary: 'A submission with a fixed deadline is required.',
      action: 'Complete and submit the requested item before the deadline.',
      deadline: null,
      urgency: 8,
      importance: 8,
      actionRequired: true,
    },
  },
  {
    pattern: /meeting|calendar invite|reschedul/i,
    analysis: {
      category: 'meeting',
      summary: 'A meeting time needs to be confirmed.',
      action: 'Confirm availability for the meeting.',
      urgency: 5,
      importance: 5,
      actionRequired: true,
    },
  },
  {
    pattern: /special consideration|welfare|health|misconduct|academic integrity/i,
    analysis: {
      category: 'student_issue',
      urgency: 7,
      importance: 8,
      sensitive: true,
    },
  },
];

/**
 * Deterministic stand-in for classifyEmail used by `--mock` runs (see
 * jobs/daily-report.ts) so the full pipeline can be exercised without an
 * OpenAI API key. Intentionally simple keyword matching — not meant to
 * approximate real classification quality.
 */
export function classifyEmailMock(email: NormalisedEmail): EmailAnalysis {
  const haystack = `${email.subject}\n${email.bodyText}`;
  const matched = KEYWORD_RULES.find((rule) => rule.pattern.test(haystack));

  const base: EmailAnalysis = {
    category: 'other',
    summary: email.subject,
    actionRequired: false,
    action: null,
    deadline: null,
    urgency: 3,
    importance: 3,
    senderRole: 'unknown',
    sensitive: false,
    confidence: 0.5,
    reasons: ['mock classifier: default'],
  };

  const merged = { ...base, ...matched?.analysis };

  if (merged.sensitive) {
    merged.summary = 'Sensitive student matter - manual review required.';
  }
  if (merged.actionRequired && !merged.action) {
    merged.action = `Review: ${email.subject}`;
  }

  merged.reasons = matched ? [`mock classifier matched: ${matched.pattern}`] : merged.reasons;
  merged.confidence = matched ? 0.7 : 0.4;

  return EmailAnalysisSchema.parse(merged);
}

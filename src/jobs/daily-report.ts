import {
  getCheckpoint,
  isAlreadyProcessed,
  saveProcessedEmail,
  saveProcessingError,
  setCheckpoint,
} from '../db/client.js';
import { classifyEmail, classifyEmailMock } from '../email/classify.js';
import { levelForScore, scoreEmail, sortByPriority } from '../email/priority.js';
import { getSampleMessages } from '../fixtures/sample-messages.js';
import { getProvider, type FetchedItem, type ProviderName } from '../providers/index.js';
import { generateMarkdownReport } from '../report/generate.js';
import { saveReport } from '../report/deliver.js';
import type { NormalisedEmail, ProcessingError, ScoredEmail } from '../types.js';

const DEFAULT_WINDOW_HOURS = 24;

function checkpointName(provider: ProviderName): string {
  return `daily-report:${provider}`;
}

export interface RunOptions {
  since?: string;
  output: string;
  mock: boolean;
  provider: ProviderName;
}

export interface RunResult {
  outputPath: string;
  processedCount: number;
  errorCount: number;
}

function resolveSince(since: string | undefined, provider: ProviderName): string {
  if (since) {
    const hoursMatch = since.match(/^(\d+)\s*hours?$/i);
    if (hoursMatch) {
      return new Date(Date.now() - Number(hoursMatch[1]) * 60 * 60 * 1000).toISOString();
    }
    const parsed = new Date(since);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Could not parse --since value "${since}". Use an ISO timestamp or e.g. "24 hours".`);
    }
    return parsed.toISOString();
  }

  const checkpoint = getCheckpoint(checkpointName(provider));
  if (checkpoint) return checkpoint;

  return new Date(Date.now() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

async function classify(email: NormalisedEmail, mock: boolean) {
  const analysis = mock ? classifyEmailMock(email) : await classifyEmail(email);
  const score = scoreEmail(email, analysis);
  const level = levelForScore(score);
  return { email, analysis, score, level } satisfies ScoredEmail;
}

/**
 * Runs the full pipeline for one mailbox provider: fetch -> preprocess ->
 * classify -> score -> persist -> generate report -> save. One bad message
 * (whether it fails to fetch/normalise or fails classification) is caught
 * and logged rather than aborting the whole run.
 */
export async function runDailyReport(options: RunOptions): Promise<RunResult> {
  const runAt = new Date();
  const sinceIso = resolveSince(options.since, options.provider);

  const fetched: FetchedItem[] = options.mock
    ? getSampleMessages().map((email): FetchedItem => ({ ok: true, email }))
    : await getProvider(options.provider).fetchMessagesSince(sinceIso);

  const scored: ScoredEmail[] = [];
  const errors: ProcessingError[] = [];

  for (const item of fetched) {
    if (!item.ok) {
      const error: ProcessingError = { messageId: item.id, subject: item.subject, error: item.error };
      errors.push(error);
      saveProcessingError(options.provider, error, runAt.toISOString());
      continue;
    }

    if (isAlreadyProcessed(options.provider, item.email.id)) continue;

    try {
      const scoredItem = await classify(item.email, options.mock);
      scored.push(scoredItem);
      saveProcessedEmail(options.provider, scoredItem, runAt.toISOString());
    } catch (err) {
      const error: ProcessingError = {
        messageId: item.email.id,
        subject: item.email.subject,
        error: err instanceof Error ? err.message : String(err),
      };
      errors.push(error);
      saveProcessingError(options.provider, error, runAt.toISOString());
    }
  }

  const sorted = sortByPriority(scored);

  const markdown = generateMarkdownReport({
    generatedAt: runAt,
    processedCount: fetched.length,
    items: sorted,
    errors,
  });

  const outputPath = saveReport(markdown, options.output);

  if (!options.mock) {
    setCheckpoint(checkpointName(options.provider), runAt.toISOString());
  }

  return { outputPath, processedCount: fetched.length, errorCount: errors.length };
}

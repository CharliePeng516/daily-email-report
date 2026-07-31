import { getCheckpoint, isAlreadyProcessed, saveProcessedEmail, saveProcessingError, setCheckpoint } from '../db/client.js';
import { isAlreadyProcessedMock, markProcessedMock } from '../db/mock-store.js';
import { classifyEmail, classifyEmailMock } from '../email/classify.js';
import { levelForScore, scoreEmail, sortByPriority } from '../email/priority.js';
import { prefilterEmail } from '../email/prefilter.js';
import { getSampleMessages } from '../fixtures/sample-messages.js';
import { renderProgress } from '../lib/progress.js';
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

const RELATIVE_WINDOW_PATTERN = /^(\d+)\s*(hour|day)s?$/i;
const MS_PER_UNIT: Record<string, number> = { hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000 };

async function resolveSince(since: string | undefined, provider: ProviderName, mock: boolean): Promise<string> {
  if (since) {
    const relativeMatch = since.match(RELATIVE_WINDOW_PATTERN);
    if (relativeMatch) {
      const [, amount, unit] = relativeMatch;
      return new Date(Date.now() - Number(amount) * MS_PER_UNIT[unit.toLowerCase()]).toISOString();
    }
    const parsed = new Date(since);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Could not parse --since value "${since}". Use an ISO timestamp or e.g. "24 hours" / "14 days".`);
    }
    return parsed.toISOString();
  }

  // --mock never touches the database (see db/mock-store.ts) — the fixture
  // set doesn't change based on the window, so there's no checkpoint to read.
  if (!mock) {
    const checkpoint = await getCheckpoint(checkpointName(provider));
    if (checkpoint) return checkpoint;
  }

  return new Date(Date.now() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

async function classify(email: NormalisedEmail, mock: boolean) {
  const analysis = mock ? classifyEmailMock(email) : prefilterEmail(email) ?? (await classifyEmail(email));
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
  const sinceIso = await resolveSince(options.since, options.provider, options.mock);

  if (!options.mock) {
    console.log(`Fetching ${options.provider} messages since ${sinceIso}...`);
  }

  const fetched: FetchedItem[] = options.mock
    ? getSampleMessages().map((email): FetchedItem => ({ ok: true, email }))
    : await getProvider(options.provider).fetchMessagesSince(sinceIso);

  if (!options.mock) {
    console.log(`Fetched ${fetched.length} message(s). Classifying...`);
  }

  const scored: ScoredEmail[] = [];
  const errors: ProcessingError[] = [];
  let aiCalls = 0;
  let filteredCount = 0;

  for (const [index, item] of fetched.entries()) {
    if (!options.mock) renderProgress(index + 1, fetched.length, item.ok ? item.email.subject : item.subject);

    if (!item.ok) {
      const error: ProcessingError = { messageId: item.id, subject: item.subject, error: item.error };
      errors.push(error);
      if (!options.mock) await saveProcessingError(options.provider, error, runAt.toISOString());
      continue;
    }

    const alreadyProcessed = options.mock
      ? isAlreadyProcessedMock(options.provider, item.email.id)
      : await isAlreadyProcessed(options.provider, item.email.id);
    if (alreadyProcessed) continue;

    if (!options.mock && prefilterEmail(item.email) !== null) filteredCount += 1;
    else if (!options.mock) aiCalls += 1;

    try {
      const scoredItem = await classify(item.email, options.mock);
      scored.push(scoredItem);
      if (options.mock) {
        markProcessedMock(options.provider, item.email.id);
      } else {
        await saveProcessedEmail(options.provider, scoredItem, runAt.toISOString());
      }
    } catch (err) {
      const error: ProcessingError = {
        messageId: item.email.id,
        subject: item.email.subject,
        error: err instanceof Error ? err.message : String(err),
      };
      errors.push(error);
      if (!options.mock) await saveProcessingError(options.provider, error, runAt.toISOString());
    }
  }

  if (!options.mock) {
    console.log(`Classified ${aiCalls} via AI, skipped AI for ${filteredCount} filtered as low-priority.`);
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
    await setCheckpoint(checkpointName(options.provider), runAt.toISOString());
  }

  return { outputPath, processedCount: fetched.length, errorCount: errors.length };
}

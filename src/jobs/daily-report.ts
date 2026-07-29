import {
  getCheckpoint,
  isAlreadyProcessed,
  saveProcessedEmail,
  saveProcessingError,
  setCheckpoint,
} from '../db/client.js';
import { classifyEmail, classifyEmailMock } from '../email/classify.js';
import { levelForScore, scoreEmail, sortByPriority } from '../email/priority.js';
import { normaliseMessage } from '../email/preprocess.js';
import { getSampleMessages } from '../fixtures/sample-messages.js';
import { fetchMessagesSince, type GraphMessageRaw } from '../graph/messages.js';
import { generateMarkdownReport } from '../report/generate.js';
import { saveReport } from '../report/deliver.js';
import type { ProcessingError, ScoredEmail } from '../types.js';

const JOB_NAME = 'daily-report';
const DEFAULT_WINDOW_HOURS = 24;

export interface RunOptions {
  since?: string;
  output: string;
  mock: boolean;
}

export interface RunResult {
  outputPath: string;
  processedCount: number;
  errorCount: number;
}

function resolveSince(since: string | undefined): string {
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

  const checkpoint = getCheckpoint(JOB_NAME);
  if (checkpoint) return checkpoint;

  return new Date(Date.now() - DEFAULT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

async function processMessage(raw: GraphMessageRaw, mock: boolean): Promise<ScoredEmail> {
  const email = normaliseMessage(raw);
  const analysis = mock ? classifyEmailMock(email) : await classifyEmail(email);
  const score = scoreEmail(email, analysis);
  const level = levelForScore(score);
  return { email, analysis, score, level };
}

/**
 * Runs the full pipeline: fetch -> preprocess -> classify -> score -> persist
 * -> generate report -> save. One bad message is caught and logged rather
 * than aborting the whole run (MVP acceptance criteria, "8. Privacy and
 * safety controls").
 */
export async function runDailyReport(options: RunOptions): Promise<RunResult> {
  const runAt = new Date();
  const sinceIso = resolveSince(options.since);

  const rawMessages = options.mock ? getSampleMessages() : await fetchMessagesSince(sinceIso);

  const scored: ScoredEmail[] = [];
  const errors: ProcessingError[] = [];

  for (const raw of rawMessages) {
    if (isAlreadyProcessed(raw.id)) continue;

    try {
      const item = await processMessage(raw, options.mock);
      scored.push(item);
      saveProcessedEmail(item, runAt.toISOString());
    } catch (err) {
      const error: ProcessingError = {
        messageId: raw.id,
        subject: raw.subject ?? '(unknown subject)',
        error: err instanceof Error ? err.message : String(err),
      };
      errors.push(error);
      saveProcessingError(error, runAt.toISOString());
    }
  }

  const sorted = sortByPriority(scored);

  const markdown = generateMarkdownReport({
    generatedAt: runAt,
    processedCount: rawMessages.length,
    items: sorted,
    errors,
  });

  const outputPath = saveReport(markdown, options.output);

  if (!options.mock) {
    setCheckpoint(JOB_NAME, runAt.toISOString());
  }

  return { outputPath, processedCount: rawMessages.length, errorCount: errors.length };
}

import { and, eq } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config, ANALYSIS_VERSION } from '../config.js';
import type { ProviderName } from '../providers/types.js';
import type { ProcessingError, ScoredEmail } from '../types.js';
import { processedEmails, processingErrors, runCheckpoints } from './schema.js';

// Lazy on purpose: importing this module must not require DATABASE_URL or
// open a connection — --mock runs never call these functions (see
// jobs/daily-report.ts, which uses db/mock-store.ts instead) and shouldn't
// need a live Postgres instance at all.
let sql: postgres.Sql | undefined;
let db: PostgresJsDatabase | undefined;

function getDb(): PostgresJsDatabase {
  if (!db) {
    sql = postgres(config.databaseUrl, { max: 5 });
    db = drizzle(sql);
  }
  return db;
}

/** Closes the pool so the CLI process can exit cleanly. No-op if never connected. */
export async function closeDb(): Promise<void> {
  await sql?.end();
}

export async function getCheckpoint(jobName: string): Promise<string | null> {
  const rows = await getDb()
    .select({ lastSuccessAt: runCheckpoints.lastSuccessAt })
    .from(runCheckpoints)
    .where(eq(runCheckpoints.jobName, jobName))
    .limit(1);
  return rows[0]?.lastSuccessAt.toISOString() ?? null;
}

export async function setCheckpoint(jobName: string, isoTimestamp: string): Promise<void> {
  await getDb()
    .insert(runCheckpoints)
    .values({ jobName, lastSuccessAt: new Date(isoTimestamp) })
    .onConflictDoUpdate({ target: runCheckpoints.jobName, set: { lastSuccessAt: new Date(isoTimestamp) } });
}

export async function isAlreadyProcessed(provider: ProviderName, messageId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ messageId: processedEmails.messageId })
    .from(processedEmails)
    .where(and(eq(processedEmails.provider, provider), eq(processedEmails.messageId, messageId)))
    .limit(1);
  return rows.length > 0;
}

export async function saveProcessedEmail(provider: ProviderName, item: ScoredEmail, processedAt: string): Promise<void> {
  await getDb()
    .insert(processedEmails)
    .values({
      provider,
      messageId: item.email.id,
      conversationId: item.email.conversationId,
      receivedAt: new Date(item.email.receivedDateTime),
      senderAddress: item.email.fromAddress,
      subject: item.email.subject,
      summary: item.analysis.summary,
      category: item.analysis.category,
      score: item.score,
      level: item.level,
      action: item.analysis.action,
      deadline: item.analysis.deadline ? new Date(item.analysis.deadline) : null,
      sensitive: item.analysis.sensitive,
      confidence: item.analysis.confidence,
      webLink: item.email.webLink,
      analysisVersion: ANALYSIS_VERSION,
      processedAt: new Date(processedAt),
    })
    .onConflictDoNothing({ target: [processedEmails.provider, processedEmails.messageId] });
}

export async function saveProcessingError(provider: ProviderName, error: ProcessingError, runAt: string): Promise<void> {
  await getDb()
    .insert(processingErrors)
    .values({ provider, messageId: error.messageId, subject: error.subject, runAt: new Date(runAt), error: error.error });
}

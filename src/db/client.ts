import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema.js';
import type { ProcessingError, ScoredEmail } from '../types.js';
import { ANALYSIS_VERSION } from '../config.js';

const DATA_DIR = path.join(process.cwd(), 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'emails.db'));
db.pragma('journal_mode = WAL');
db.exec(SCHEMA_SQL);

export function getCheckpoint(jobName: string): string | null {
  const row = db
    .prepare('SELECT last_success_at FROM run_checkpoints WHERE job_name = ?')
    .get(jobName) as { last_success_at: string } | undefined;
  return row?.last_success_at ?? null;
}

export function setCheckpoint(jobName: string, isoTimestamp: string): void {
  db.prepare(
    `INSERT INTO run_checkpoints (job_name, last_success_at) VALUES (?, ?)
     ON CONFLICT(job_name) DO UPDATE SET last_success_at = excluded.last_success_at`,
  ).run(jobName, isoTimestamp);
}

export function isAlreadyProcessed(messageId: string): boolean {
  return db.prepare('SELECT 1 FROM processed_emails WHERE message_id = ?').get(messageId) !== undefined;
}

export function saveProcessedEmail(item: ScoredEmail, processedAt: string): void {
  db.prepare(
    `INSERT INTO processed_emails (
       message_id, conversation_id, received_at, sender_address, subject, summary,
       category, score, level, action, deadline, sensitive, confidence, web_link,
       analysis_version, processed_at
     ) VALUES (@messageId, @conversationId, @receivedAt, @senderAddress, @subject, @summary,
       @category, @score, @level, @action, @deadline, @sensitive, @confidence, @webLink,
       @analysisVersion, @processedAt)
     ON CONFLICT(message_id) DO NOTHING`,
  ).run({
    messageId: item.email.id,
    conversationId: item.email.conversationId,
    receivedAt: item.email.receivedDateTime,
    senderAddress: item.email.fromAddress,
    subject: item.email.subject,
    summary: item.analysis.summary,
    category: item.analysis.category,
    score: item.score,
    level: item.level,
    action: item.analysis.action,
    deadline: item.analysis.deadline,
    sensitive: item.analysis.sensitive ? 1 : 0,
    confidence: item.analysis.confidence,
    webLink: item.email.webLink,
    analysisVersion: ANALYSIS_VERSION,
    processedAt,
  });
}

export function saveProcessingError(error: ProcessingError, runAt: string): void {
  db.prepare(
    'INSERT INTO processing_errors (message_id, subject, run_at, error) VALUES (?, ?, ?, ?)',
  ).run(error.messageId, error.subject, runAt, error.error);
}

export default db;

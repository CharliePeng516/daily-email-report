import { boolean, doublePrecision, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

// "7. Storage, scheduling and reliability" — minimal record only. The full
// message body is deliberately not persisted; the report links back to the
// provider's own web UI instead of duplicating sensitive content at rest.
//
// message_id is only unique per mailbox provider (Outlook and Gmail have
// separate id spaces), so provider + message_id is the composite key, and
// checkpoints/errors are scoped per provider too — the two mailboxes have
// independent read progress.
//
// This table is the shared contract between the CLI (writer, runs locally —
// see src/db/client.ts) and the web dashboard (reader, deployed — see
// web/lib/db.ts). Keep the two schema files in sync if this changes.
export const processedEmails = pgTable(
  'processed_emails',
  {
    provider: text('provider').notNull(),
    messageId: text('message_id').notNull(),
    conversationId: text('conversation_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    senderAddress: text('sender_address').notNull(),
    subject: text('subject').notNull(),
    summary: text('summary').notNull(),
    category: text('category').notNull(),
    score: integer('score').notNull(),
    level: text('level').notNull(),
    action: text('action'),
    deadline: timestamp('deadline', { withTimezone: true }),
    sensitive: boolean('sensitive').notNull(),
    confidence: doublePrecision('confidence').notNull(),
    webLink: text('web_link').notNull(),
    analysisVersion: text('analysis_version').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.provider, table.messageId] })],
);

export const runCheckpoints = pgTable('run_checkpoints', {
  jobName: text('job_name').primaryKey(),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }).notNull(),
});

export const processingErrors = pgTable('processing_errors', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  provider: text('provider').notNull(),
  messageId: text('message_id').notNull(),
  subject: text('subject').notNull(),
  runAt: timestamp('run_at', { withTimezone: true }).notNull(),
  error: text('error').notNull(),
});

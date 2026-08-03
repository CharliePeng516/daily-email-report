import { boolean, doublePrecision, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

// Mirrors ../../src/db/schema.ts exactly — this app only reads these tables,
// the CLI (running locally, since OAuth device/loopback logins can't run
// unattended on a server) is the only writer. Keep the two files in sync.
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
    actionRequired: boolean('action_required').notNull(),
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

import 'server-only';
import { and, desc, eq, gte } from 'drizzle-orm';
import { getDb } from './db';
import { processedEmails, processingErrors, runCheckpoints } from './schema';

export type ProviderName = 'outlook' | 'gmail';
export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ReportItem {
  messageId: string;
  subject: string;
  senderAddress: string;
  summary: string;
  category: string;
  score: number;
  level: PriorityLevel;
  actionRequired: boolean;
  action: string | null;
  deadline: Date | null;
  sensitive: boolean;
  webLink: string;
  receivedAt: Date;
}

export interface ReportError {
  subject: string;
  error: string;
  runAt: Date;
}

export interface DashboardData {
  items: ReportItem[];
  errors: ReportError[];
  lastRunAt: Date | null;
}

function checkpointName(provider: ProviderName): string {
  return `daily-report:${provider}`;
}

/** Fetches everything the dashboard needs for one provider, windowed to the last `sinceDays` days. */
export async function getDashboardData(provider: ProviderName, sinceDays: number): Promise<DashboardData> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const db = getDb();

  const [items, errorRows, checkpointRows] = await Promise.all([
    db
      .select({
        messageId: processedEmails.messageId,
        subject: processedEmails.subject,
        senderAddress: processedEmails.senderAddress,
        summary: processedEmails.summary,
        category: processedEmails.category,
        score: processedEmails.score,
        level: processedEmails.level,
        actionRequired: processedEmails.actionRequired,
        action: processedEmails.action,
        deadline: processedEmails.deadline,
        sensitive: processedEmails.sensitive,
        webLink: processedEmails.webLink,
        receivedAt: processedEmails.receivedAt,
      })
      .from(processedEmails)
      .where(and(eq(processedEmails.provider, provider), gte(processedEmails.receivedAt, since)))
      .orderBy(desc(processedEmails.score), desc(processedEmails.receivedAt)),
    db
      .select({ subject: processingErrors.subject, error: processingErrors.error, runAt: processingErrors.runAt })
      .from(processingErrors)
      .where(and(eq(processingErrors.provider, provider), gte(processingErrors.runAt, since)))
      .orderBy(desc(processingErrors.runAt)),
    db
      .select({ lastSuccessAt: runCheckpoints.lastSuccessAt })
      .from(runCheckpoints)
      .where(eq(runCheckpoints.jobName, checkpointName(provider)))
      .limit(1),
  ]);

  return {
    items: items as ReportItem[],
    errors: errorRows,
    lastRunAt: checkpointRows[0]?.lastSuccessAt ?? null,
  };
}

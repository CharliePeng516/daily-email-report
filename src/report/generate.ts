import { config } from '../config.js';
import type { PriorityLevel, ProcessingError, ScoredEmail } from '../types.js';

export interface ReportInput {
  generatedAt: Date;
  processedCount: number;
  items: ScoredEmail[];
  errors: ProcessingError[];
}

function formatRunDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: config.timezone,
  }).format(date);
}

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return deadline;
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: config.timezone,
  }).format(parsed);
}

function groupByLevel(items: ScoredEmail[]): Record<PriorityLevel, ScoredEmail[]> {
  const groups: Record<PriorityLevel, ScoredEmail[]> = { Critical: [], High: [], Medium: [], Low: [] };
  for (const item of items) groups[item.level].push(item);
  return groups;
}

// Critical/High get a full breakdown (subject, sender, score, action, deadline, link) —
// these are the items the reader will actually act on.
function renderDetailedSection(title: string, items: ScoredEmail[]): string[] {
  if (items.length === 0) return [];
  const lines = [`## ${title} - ${items.length}`, ''];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.email.subject}`);
    lines.push(`   From: ${item.email.fromName}`);
    lines.push(`   Priority: ${item.score}`);

    if (item.analysis.sensitive) {
      lines.push(`   Note: ${item.analysis.summary}`);
    } else {
      lines.push(`   Summary: ${item.analysis.summary}`);
      if (item.analysis.action) lines.push(`   Action: ${item.analysis.action}`);
    }

    const deadline = formatDeadline(item.analysis.deadline);
    if (deadline) lines.push(`   Deadline: ${deadline}`);
    if (item.email.webLink) lines.push(`   Open: [Outlook link](${item.email.webLink})`);
    lines.push('');
  });

  return lines;
}

// Medium/Low are grouped as one-line summaries so the report stays scannable.
function renderSummarySection(title: string, items: ScoredEmail[]): string[] {
  if (items.length === 0) return [];
  const lines = [`## ${title} - ${items.length}`, ''];

  for (const item of items) {
    const label = item.analysis.sensitive
      ? item.analysis.summary
      : `${item.email.subject} - ${item.analysis.summary}`;
    lines.push(`- ${label}`);
  }

  lines.push('');
  return lines;
}

function renderActionList(items: ScoredEmail[]): string[] {
  const actionable = items.filter(
    (item) => item.analysis.actionRequired && (item.level === 'Critical' || item.level === 'High'),
  );
  if (actionable.length === 0) return [];

  const lines = ["## TODAY'S ACTION LIST", ''];
  for (const item of actionable) {
    const label = item.analysis.sensitive ? item.analysis.summary : item.analysis.action ?? item.email.subject;
    lines.push(`- [ ] ${label}`);
  }
  lines.push('');
  return lines;
}

export function generateMarkdownReport(input: ReportInput): string {
  const { generatedAt, processedCount, items, errors } = input;
  const groups = groupByLevel(items);

  const lines: string[] = [
    '# SCHOOL EMAIL DAILY REPORT',
    formatRunDate(generatedAt),
    '',
    `Processed: ${processedCount} emails`,
    '',
    ...renderDetailedSection('CRITICAL', groups.Critical),
    ...renderDetailedSection('HIGH', groups.High),
    ...renderSummarySection('MEDIUM', groups.Medium),
    ...renderSummarySection('LOW', groups.Low),
    ...renderActionList(items),
  ];

  if (errors.length > 0) {
    lines.push('## PROCESSING ERRORS', '');
    for (const error of errors) {
      lines.push(`- ${error.subject} (${error.messageId}): ${error.error}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

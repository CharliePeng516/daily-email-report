import { htmlToText } from 'html-to-text';
import type { GraphMessageRaw } from '../graph/messages.js';
import type { NormalisedEmail } from '../types.js';

// Common markers that precede quoted history / signatures in replies and
// forwards. We cut the body at the earliest match so the model only sees the
// new content the sender actually wrote.
const QUOTED_HISTORY_PATTERNS: RegExp[] = [
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^On .{0,120} wrote:\s*$/im,
  /^From:.+\n(Sent|Date):.+\nTo:.+\nSubject:.+/im,
  /^_{5,}\s*$/m,
];

const DISCLAIMER_PATTERNS: RegExp[] = [
  /^This (e-?mail|message) (and any attachments )?(is|are) confidential.*$/im,
  /^CRICOS Provider.*$/im,
];

function stripAtEarliestMatch(text: string, patterns: RegExp[]): string {
  let cutIndex = text.length;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.index !== undefined && match.index < cutIndex) {
      cutIndex = match.index;
    }
  }
  return text.slice(0, cutIndex);
}

export function preprocessBody(body: { contentType?: string; content?: string } | undefined): string {
  const raw = body?.content ?? '';
  const text = body?.contentType?.toLowerCase() === 'html'
    ? htmlToText(raw, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] })
    : raw;

  let cleaned = stripAtEarliestMatch(text, QUOTED_HISTORY_PATTERNS);
  for (const pattern of DISCLAIMER_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function recipientAddresses(recipients: GraphMessageRaw['toRecipients']): string[] {
  return (recipients ?? [])
    .map((r) => r.emailAddress?.address)
    .filter((addr): addr is string => Boolean(addr));
}

export function normaliseMessage(raw: GraphMessageRaw): NormalisedEmail {
  const sender = raw.from ?? raw.sender;

  return {
    id: raw.id,
    conversationId: raw.conversationId,
    subject: raw.subject?.trim() || '(no subject)',
    fromName: sender?.emailAddress?.name ?? 'Unknown sender',
    fromAddress: (sender?.emailAddress?.address ?? '').toLowerCase(),
    toRecipients: recipientAddresses(raw.toRecipients),
    ccRecipients: recipientAddresses(raw.ccRecipients),
    receivedDateTime: raw.receivedDateTime,
    importance: raw.importance ?? 'normal',
    isRead: raw.isRead ?? false,
    hasAttachments: raw.hasAttachments ?? false,
    bodyText: preprocessBody(raw.body),
    webLink: raw.webLink ?? '',
  };
}

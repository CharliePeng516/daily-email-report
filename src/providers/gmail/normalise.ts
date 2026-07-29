import { preprocessBody } from '../../email/preprocess.js';
import type { NormalisedEmail } from '../../types.js';
import type { GmailHeader, GmailMessagePart, GmailMessageRaw } from './gmail.js';

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

function findHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseAddressList(value: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => {
      const match = entry.match(/<([^>]+)>/);
      return (match ? match[1] : entry).trim().toLowerCase();
    })
    .filter(Boolean);
}

function parseSender(value: string): { name: string; address: string } {
  const match = value.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    const address = match[2].trim().toLowerCase();
    return { name: name || address, address };
  }
  return { name: value.trim(), address: value.trim().toLowerCase() };
}

function findBodyPart(part: GmailMessagePart | undefined, mimeType: string): GmailMessagePart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findBodyPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

function hasAttachment(part: GmailMessagePart | undefined): boolean {
  if (!part) return false;
  if (part.filename && part.body?.attachmentId) return true;
  return (part.parts ?? []).some(hasAttachment);
}

export function normaliseGmailMessage(raw: GmailMessageRaw): NormalisedEmail {
  const headers = raw.payload?.headers;
  const from = parseSender(findHeader(headers, 'From'));
  const subject = findHeader(headers, 'Subject') || '(no subject)';

  const htmlPart = findBodyPart(raw.payload, 'text/html');
  const textPart = findBodyPart(raw.payload, 'text/plain');
  const chosenPart = htmlPart ?? textPart;
  const rawBody = chosenPart?.body?.data ? decodeBase64Url(chosenPart.body.data) : '';

  const labels = raw.labelIds ?? [];

  return {
    id: raw.id,
    conversationId: raw.threadId,
    subject,
    fromName: from.name,
    fromAddress: from.address,
    toRecipients: parseAddressList(findHeader(headers, 'To')),
    ccRecipients: parseAddressList(findHeader(headers, 'Cc')),
    receivedDateTime: raw.internalDate ? new Date(Number(raw.internalDate)).toISOString() : new Date().toISOString(),
    importance: labels.includes('IMPORTANT') ? 'high' : 'normal',
    isRead: !labels.includes('UNREAD'),
    hasAttachments: hasAttachment(raw.payload),
    bodyText: preprocessBody({ contentType: htmlPart ? 'html' : 'text', content: rawBody }),
    webLink: `https://mail.google.com/mail/u/0/#all/${raw.id}`,
  };
}

import { preprocessBody } from '../../email/preprocess.js';
import type { NormalisedEmail } from '../../types.js';
import type { GraphMessageRaw, GraphRecipient } from './graph.js';

function recipientAddresses(recipients: GraphRecipient[] | undefined): string[] {
  return (recipients ?? [])
    .map((r) => r.emailAddress?.address)
    .filter((addr): addr is string => Boolean(addr));
}

export function normaliseGraphMessage(raw: GraphMessageRaw): NormalisedEmail {
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

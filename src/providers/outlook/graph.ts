import { fetchWithRetry } from '../../lib/http.js';
import { getAccessToken } from './auth.js';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// "Recommended message fields" from "3. Microsoft 365 email connection".
const SELECT_FIELDS = [
  'id',
  'conversationId',
  'subject',
  'from',
  'sender',
  'toRecipients',
  'ccRecipients',
  'receivedDateTime',
  'importance',
  'isRead',
  'hasAttachments',
  'body',
  'webLink',
].join(',');

export interface GraphRecipient {
  emailAddress?: { name?: string; address?: string };
}

export interface GraphMessageRaw {
  id: string;
  conversationId: string;
  subject?: string;
  from?: GraphRecipient;
  sender?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  receivedDateTime: string;
  importance?: 'low' | 'normal' | 'high';
  isRead?: boolean;
  hasAttachments?: boolean;
  body?: { contentType?: string; content?: string };
  webLink?: string;
}

/**
 * Fetches Inbox messages received since `sinceIso`, following
 * @odata.nextLink pagination until every matching message has been read.
 */
export async function fetchGraphMessagesSince(sinceIso: string): Promise<GraphMessageRaw[]> {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const filter = `receivedDateTime ge ${sinceIso}`;
  let url: string | undefined =
    `${GRAPH_BASE}/me/mailFolders/inbox/messages` +
    `?$select=${SELECT_FIELDS}&$filter=${encodeURIComponent(filter)}` +
    `&$orderby=receivedDateTime asc&$top=50`;

  const messages: GraphMessageRaw[] = [];

  while (url) {
    const res = await fetchWithRetry(url, headers);
    const data = (await res.json()) as { value?: GraphMessageRaw[]; '@odata.nextLink'?: string };
    messages.push(...(data.value ?? []));
    url = data['@odata.nextLink'];
    if (url) console.log(`  fetched ${messages.length} message(s) so far, more pages remain...`);
  }

  console.log(`Found ${messages.length} Outlook message(s) in range.`);
  return messages;
}

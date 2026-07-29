import { getAccessToken } from '../auth/microsoft.js';

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

const MAX_RETRIES = 4;

async function fetchWithRetry(url: string, token: string, attempt = 1): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  const isTransient = res.status === 429 || res.status >= 500;
  if (isTransient && attempt <= MAX_RETRIES) {
    const retryAfterHeader = Number(res.headers.get('Retry-After'));
    const delaySeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader
      : 2 ** attempt; // capped exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    return fetchWithRetry(url, token, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Microsoft Graph request failed: ${res.status} ${res.statusText} ${body}`.trim());
  }

  return res;
}

/**
 * Fetches Inbox messages received since `sinceIso`, following
 * @odata.nextLink pagination until every matching message has been read.
 */
export async function fetchMessagesSince(sinceIso: string): Promise<GraphMessageRaw[]> {
  const token = await getAccessToken();
  const filter = `receivedDateTime ge ${sinceIso}`;
  let url: string | undefined =
    `${GRAPH_BASE}/me/mailFolders/inbox/messages` +
    `?$select=${SELECT_FIELDS}&$filter=${encodeURIComponent(filter)}` +
    `&$orderby=receivedDateTime asc&$top=50`;

  const messages: GraphMessageRaw[] = [];

  while (url) {
    const res = await fetchWithRetry(url, token);
    const data = (await res.json()) as { value?: GraphMessageRaw[]; '@odata.nextLink'?: string };
    messages.push(...(data.value ?? []));
    url = data['@odata.nextLink'];
  }

  return messages;
}

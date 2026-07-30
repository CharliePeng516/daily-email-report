import { fetchWithRetry } from '../../lib/http.js';
import { getAccessToken } from './auth.js';

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailMessagePart[];
}

export interface GmailMessageRaw {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate?: string; // epoch millis, as a string
  payload?: GmailMessagePart;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

async function listMessageIds(sinceIso: string): Promise<string[]> {
  const afterSeconds = Math.floor(new Date(sinceIso).getTime() / 1000);
  const headers = await authHeaders();
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GMAIL_BASE}/messages`);
    url.searchParams.set('q', `in:inbox after:${afterSeconds}`);
    url.searchParams.set('maxResults', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetchWithRetry(url.toString(), headers);
    const data = (await res.json()) as { messages?: { id: string }[]; nextPageToken?: string };
    ids.push(...(data.messages ?? []).map((m) => m.id));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return ids;
}

async function getMessage(id: string): Promise<GmailMessageRaw> {
  const headers = await authHeaders();
  const res = await fetchWithRetry(`${GMAIL_BASE}/messages/${id}?format=full`, headers);
  return res.json() as Promise<GmailMessageRaw>;
}

/**
 * Fetches Inbox messages received since `sinceIso`. Gmail's list endpoint
 * only returns ids, so each message is then fetched individually with
 * format=full — acceptable at school-mailbox volumes; not worth the added
 * complexity of the batch HTTP API for a v1 personal tool.
 */
export async function fetchGmailMessagesSince(sinceIso: string): Promise<GmailMessageRaw[]> {
  const ids = await listMessageIds(sinceIso);
  console.log(`Found ${ids.length} Gmail message(s) in range. Fetching details...`);

  const messages: GmailMessageRaw[] = [];
  for (const [index, id] of ids.entries()) {
    if (ids.length > 5 && (index + 1) % 5 === 0) {
      console.log(`  fetched ${index + 1}/${ids.length}...`);
    }
    messages.push(await getMessage(id));
  }
  return messages;
}

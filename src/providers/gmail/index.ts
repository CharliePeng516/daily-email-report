import { fetchGmailMessagesSince } from './gmail.js';
import { normaliseGmailMessage } from './normalise.js';
import type { FetchedItem, MailProvider } from '../types.js';

export const gmailProvider: MailProvider = {
  async fetchMessagesSince(sinceIso) {
    const rawMessages = await fetchGmailMessagesSince(sinceIso);

    return rawMessages.map((raw): FetchedItem => {
      try {
        return { ok: true, email: normaliseGmailMessage(raw) };
      } catch (err) {
        const subject = raw.payload?.headers?.find((h) => h.name.toLowerCase() === 'subject')?.value;
        return {
          ok: false,
          id: raw.id,
          subject: subject ?? '(unknown subject)',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
  },
};

import { fetchGraphMessagesSince } from './graph.js';
import { normaliseGraphMessage } from './normalise.js';
import type { FetchedItem, MailProvider } from '../types.js';

export const outlookProvider: MailProvider = {
  async fetchMessagesSince(sinceIso) {
    const rawMessages = await fetchGraphMessagesSince(sinceIso);

    return rawMessages.map((raw): FetchedItem => {
      try {
        return { ok: true, email: normaliseGraphMessage(raw) };
      } catch (err) {
        return {
          ok: false,
          id: raw.id,
          subject: raw.subject ?? '(unknown subject)',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
  },
};

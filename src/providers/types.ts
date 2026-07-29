import type { NormalisedEmail } from '../types.js';

export type ProviderName = 'outlook' | 'gmail';

export type FetchedItem =
  | { ok: true; email: NormalisedEmail }
  | { ok: false; id: string; subject: string; error: string };

export interface MailProvider {
  /** Fetches and normalises Inbox messages received since `sinceIso`. Per-message
   *  fetch/normalise failures are reported as `{ ok: false, ... }` entries rather
   *  than thrown, so one bad message can't abort the whole run. */
  fetchMessagesSince(sinceIso: string): Promise<FetchedItem[]>;
}

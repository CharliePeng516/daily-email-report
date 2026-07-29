import { config } from '../config.js';
import type { NormalisedEmail } from '../types.js';

/** True when the mailbox owner is a direct To: recipient (not just Cc'd or on a list). */
export function isSentDirectlyToUser(email: NormalisedEmail): boolean {
  if (!config.userEmail) return false;
  const userEmail = config.userEmail.toLowerCase();
  return email.toRecipients.some((addr) => addr.toLowerCase() === userEmail);
}

/** True when the sender is on the configured manager allowlist (MANAGER_EMAILS). */
export function isKnownManager(email: NormalisedEmail): boolean {
  return config.managerEmails.includes(email.fromAddress);
}

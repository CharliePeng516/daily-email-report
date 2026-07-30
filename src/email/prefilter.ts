import type { EmailAnalysis, NormalisedEmail } from '../types.js';

/**
 * Fast, free, deterministic pre-check that skips the AI classifier entirely
 * for unambiguous junk — matches "Rule Engine" in the architecture diagram,
 * which was never actually wired in for real (non-mock) runs before this.
 *
 * Deliberately conservative: only matches patterns specific enough that a
 * false positive (burying something that mattered) is very unlikely. Any
 * email that doesn't match falls through to the real AI classifier — a
 * false negative here just costs one extra API call, which is safe.
 */

const JOB_OR_SOCIAL_NOISE_SUBJECT =
  /^(top jobs from|.+ is hiring for|you have \d+ new invitation|.+ viewed your profile|.+, add .+|.+ just had a work anniversary|i want to connect|new skill available)/i;

const PROMO_SUBJECT_PATTERN =
  /\$\d+(\.\d+)?\s*(value|off|combo)|limited[- ]time|%\s*off|voucher|clearance|new catalogue|weekly specials|burger|nuggets|feast/i;

const PROMO_SENDER_PATTERN = /noreply|no-?reply|newsletter|marketing|promo(tions?)?|deals?@|offers?@/i;
const UNSUBSCRIBE_PATTERN = /unsubscribe/i;

// Order/parcel delivery status pings — not university/work correspondence.
const DELIVERY_NOTIFICATION_PATTERN =
  /delivery time updated|out for delivery|order (has been |is )?(delivered|on its way|confirmed)|your order|tracking (number|update)/i;

// Unrelated side-project noise (adjust/extend as other irrelevant senders show up).
const IRRELEVANT_PROJECT_PATTERN = /quarrylink/i;

export function prefilterEmail(email: NormalisedEmail): EmailAnalysis | null {
  const isJobOrSocialNoise = JOB_OR_SOCIAL_NOISE_SUBJECT.test(email.subject);
  const isPromo =
    PROMO_SUBJECT_PATTERN.test(email.subject) ||
    DELIVERY_NOTIFICATION_PATTERN.test(email.subject) ||
    (PROMO_SENDER_PATTERN.test(email.fromAddress) && UNSUBSCRIBE_PATTERN.test(email.bodyText));
  const isIrrelevantProject =
    IRRELEVANT_PROJECT_PATTERN.test(email.subject) || IRRELEVANT_PROJECT_PATTERN.test(email.fromAddress);

  if (!isJobOrSocialNoise && !isPromo && !isIrrelevantProject) return null;

  const reason = isIrrelevantProject
    ? 'prefilter: unrelated project notification'
    : isPromo
      ? 'prefilter: promotional/marketing content'
      : 'prefilter: job board / social network notification';

  return {
    category: isPromo ? 'newsletter' : 'other',
    summary: email.subject,
    actionRequired: false,
    action: null,
    deadline: null,
    urgency: 0,
    importance: 0,
    senderRole: 'unknown',
    sensitive: false,
    confidence: 0.6,
    reasons: [reason],
  };
}

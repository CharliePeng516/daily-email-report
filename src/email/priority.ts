import { isKnownManager, isSentDirectlyToUser } from './rules.js';
import type { EmailAnalysis, NormalisedEmail, PriorityLevel } from '../types.js';

// "5. Priority scoring and sorting" — deterministic rules on top of the AI
// assessment so the final rank stays explainable and reproducible.
export function scoreEmail(email: NormalisedEmail, analysis: EmailAnalysis): number {
  let score = analysis.urgency * 3 + analysis.importance * 2;

  if (analysis.actionRequired) score += 15;
  if (analysis.deadline) score += 10;
  if (analysis.senderRole === 'manager' || isKnownManager(email)) score += 15;
  if (analysis.senderRole === 'course_admin') score += 12;
  if (isSentDirectlyToUser(email)) score += 5;
  if (email.importance === 'high') score += 5;
  if (analysis.category === 'newsletter') score -= 30;
  if (analysis.category === 'spam') score -= 50;

  return score;
}

export function levelForScore(score: number): PriorityLevel {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

export interface Sortable {
  score: number;
  analysis: EmailAnalysis;
  email: NormalisedEmail;
}

/** Higher score first, then earlier deadline, then more recently received. */
export function sortByPriority<T extends Sortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const aDeadline = a.analysis.deadline ? Date.parse(a.analysis.deadline) : Number.POSITIVE_INFINITY;
    const bDeadline = b.analysis.deadline ? Date.parse(b.analysis.deadline) : Number.POSITIVE_INFINITY;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    return Date.parse(b.email.receivedDateTime) - Date.parse(a.email.receivedDateTime);
  });
}

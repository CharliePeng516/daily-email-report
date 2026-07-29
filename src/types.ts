import { z } from 'zod';

export const EmailCategorySchema = z.enum([
  'urgent_action',
  'student_issue',
  'teaching_admin',
  'meeting',
  'deadline',
  'announcement',
  'newsletter',
  'spam',
  'other',
]);
export type EmailCategory = z.infer<typeof EmailCategorySchema>;

export const SenderRoleSchema = z.enum([
  'manager',
  'course_admin',
  'colleague',
  'student',
  'university_system',
  'unknown',
]);
export type SenderRole = z.infer<typeof SenderRoleSchema>;

// Matches "4. Email analysis schema" in the workflow spec exactly.
export const EmailAnalysisSchema = z.object({
  category: EmailCategorySchema,
  summary: z.string(),
  actionRequired: z.boolean(),
  action: z.string().nullable(),
  deadline: z.string().nullable(),
  urgency: z.number().min(0).max(10),
  importance: z.number().min(0).max(10),
  senderRole: SenderRoleSchema,
  sensitive: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
});
export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

export interface NormalisedEmail {
  id: string;
  conversationId: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  toRecipients: string[];
  ccRecipients: string[];
  receivedDateTime: string; // ISO 8601
  importance: 'low' | 'normal' | 'high';
  isRead: boolean;
  hasAttachments: boolean;
  bodyText: string;
  webLink: string;
}

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ScoredEmail {
  email: NormalisedEmail;
  analysis: EmailAnalysis;
  score: number;
  level: PriorityLevel;
}

export interface ProcessingError {
  messageId: string;
  subject: string;
  error: string;
}

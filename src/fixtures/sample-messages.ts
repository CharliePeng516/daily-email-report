import { preprocessBody } from '../email/preprocess.js';
import type { NormalisedEmail } from '../types.js';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

interface SampleInput extends Omit<NormalisedEmail, 'bodyText'> {
  rawBody: { contentType: 'html' | 'text'; content: string };
}

function buildEmail({ rawBody, ...rest }: SampleInput): NormalisedEmail {
  return { ...rest, bodyText: preprocessBody(rawBody) };
}

/**
 * Provider-agnostic fixture data used by `--mock` runs so the pipeline
 * (preprocess -> classify -> score -> report) can be exercised end to end
 * without Microsoft/Google/OpenAI credentials, regardless of --provider.
 * Mirrors the example items from "6. Daily report design".
 */
export function getSampleMessages(): NormalisedEmail[] {
  return [
    buildEmail({
      id: 'mock-1',
      conversationId: 'conv-1',
      subject: 'COMP4920 attendance records',
      fromName: 'Course Convenor',
      fromAddress: 'convenor@example.edu.au',
      toRecipients: ['you@example.edu.au'],
      ccRecipients: [],
      receivedDateTime: hoursAgo(3),
      importance: 'high',
      isRead: false,
      hasAttachments: true,
      rawBody: {
        contentType: 'html',
        content:
          '<p>Hi,</p><p>Please submit the Week 10 attendance spreadsheet by Friday 5:00pm.</p>' +
          '<p>Thanks,<br/>Course Convenor</p>' +
          '<hr/><p style="font-size:11px">This email and any attachments is confidential.</p>',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-1',
    }),
    buildEmail({
      id: 'mock-2',
      conversationId: 'conv-2',
      subject: 'Tutor meeting moved - confirm availability',
      fromName: 'Head Tutor',
      fromAddress: 'tutor@example.edu.au',
      toRecipients: ['you@example.edu.au'],
      ccRecipients: [],
      receivedDateTime: hoursAgo(5),
      importance: 'normal',
      isRead: false,
      hasAttachments: false,
      rawBody: {
        contentType: 'text',
        content: 'Can you confirm you are free for the tutor meeting, moved to Thursday 2pm?',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-2',
    }),
    buildEmail({
      id: 'mock-3',
      conversationId: 'conv-3',
      subject: 'Marking clarification - reply requested',
      fromName: 'Co-marker',
      fromAddress: 'comarker@example.edu.au',
      toRecipients: ['you@example.edu.au'],
      ccRecipients: [],
      receivedDateTime: hoursAgo(8),
      importance: 'normal',
      isRead: false,
      hasAttachments: false,
      rawBody: {
        contentType: 'text',
        content: 'Quick question about the marking rubric for Q3 - can you reply when free?',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-3',
    }),
    buildEmail({
      id: 'mock-4',
      conversationId: 'conv-4',
      subject: 'Student special consideration request',
      fromName: 'Student Services',
      fromAddress: 'studentservices@example.edu.au',
      toRecipients: ['you@example.edu.au'],
      ccRecipients: [],
      receivedDateTime: hoursAgo(10),
      importance: 'normal',
      isRead: false,
      hasAttachments: false,
      rawBody: {
        contentType: 'text',
        content:
          'A student has submitted a special consideration request citing a health matter. ' +
          'Details are available in the student portal.',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-4',
    }),
    buildEmail({
      id: 'mock-5',
      conversationId: 'conv-5',
      subject: 'Faculty Weekly Newsletter',
      fromName: 'Faculty Comms',
      fromAddress: 'newsletter@example.edu.au',
      toRecipients: ['allstaff@example.edu.au'],
      ccRecipients: [],
      receivedDateTime: hoursAgo(20),
      importance: 'low',
      isRead: true,
      hasAttachments: false,
      rawBody: {
        contentType: 'text',
        content:
          'This week in the faculty: new appointments, upcoming seminars, and more. Unsubscribe at any time.',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-5',
    }),
  ];
}

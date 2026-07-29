import type { GraphMessageRaw } from '../graph/messages.js';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Fixture data used by `--mock` runs so the pipeline (preprocess -> classify
 * -> score -> report) can be exercised end to end without Microsoft/OpenAI
 * credentials. Mirrors the example items from "6. Daily report design".
 */
export function getSampleMessages(): GraphMessageRaw[] {
  return [
    {
      id: 'mock-1',
      conversationId: 'conv-1',
      subject: 'COMP4920 attendance records',
      from: { emailAddress: { name: 'Course Convenor', address: 'convenor@example.edu.au' } },
      toRecipients: [{ emailAddress: { name: 'You', address: 'you@example.edu.au' } }],
      ccRecipients: [],
      receivedDateTime: hoursAgo(3),
      importance: 'high',
      isRead: false,
      hasAttachments: true,
      body: {
        contentType: 'html',
        content:
          '<p>Hi,</p><p>Please submit the Week 10 attendance spreadsheet by Friday 5:00pm.</p>' +
          '<p>Thanks,<br/>Course Convenor</p>' +
          '<hr/><p style="font-size:11px">This email and any attachments is confidential.</p>',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-1',
    },
    {
      id: 'mock-2',
      conversationId: 'conv-2',
      subject: "Tutor meeting moved - confirm availability",
      from: { emailAddress: { name: 'Head Tutor', address: 'tutor@example.edu.au' } },
      toRecipients: [{ emailAddress: { name: 'You', address: 'you@example.edu.au' } }],
      ccRecipients: [],
      receivedDateTime: hoursAgo(5),
      importance: 'normal',
      isRead: false,
      hasAttachments: false,
      body: {
        contentType: 'text',
        content: 'Can you confirm you are free for the tutor meeting, moved to Thursday 2pm?',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-2',
    },
    {
      id: 'mock-3',
      conversationId: 'conv-3',
      subject: 'Marking clarification - reply requested',
      from: { emailAddress: { name: 'Co-marker', address: 'comarker@example.edu.au' } },
      toRecipients: [{ emailAddress: { name: 'You', address: 'you@example.edu.au' } }],
      ccRecipients: [],
      receivedDateTime: hoursAgo(8),
      importance: 'normal',
      isRead: false,
      hasAttachments: false,
      body: {
        contentType: 'text',
        content: 'Quick question about the marking rubric for Q3 - can you reply when free?',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-3',
    },
    {
      id: 'mock-4',
      conversationId: 'conv-4',
      subject: 'Student special consideration request',
      from: { emailAddress: { name: 'Student Services', address: 'studentservices@example.edu.au' } },
      toRecipients: [{ emailAddress: { name: 'You', address: 'you@example.edu.au' } }],
      ccRecipients: [],
      receivedDateTime: hoursAgo(10),
      importance: 'normal',
      isRead: false,
      hasAttachments: false,
      body: {
        contentType: 'text',
        content:
          'A student has submitted a special consideration request citing a health matter. ' +
          'Details are available in the student portal.',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-4',
    },
    {
      id: 'mock-5',
      conversationId: 'conv-5',
      subject: 'Faculty Weekly Newsletter',
      from: { emailAddress: { name: 'Faculty Comms', address: 'newsletter@example.edu.au' } },
      toRecipients: [{ emailAddress: { name: 'All Staff', address: 'allstaff@example.edu.au' } }],
      ccRecipients: [],
      receivedDateTime: hoursAgo(20),
      importance: 'low',
      isRead: true,
      hasAttachments: false,
      body: {
        contentType: 'text',
        content:
          'This week in the faculty: new appointments, upcoming seminars, and more. Unsubscribe at any time.',
      },
      webLink: 'https://outlook.office.com/mail/inbox/id/mock-5',
    },
  ];
}

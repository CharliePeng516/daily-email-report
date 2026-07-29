import { htmlToText } from 'html-to-text';

// Common markers that precede quoted history / signatures in replies and
// forwards. We cut the body at the earliest match so the model only sees the
// new content the sender actually wrote. Shared by every provider — Outlook
// and Gmail both hand this a plain { contentType, content } body.
const QUOTED_HISTORY_PATTERNS: RegExp[] = [
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^On .{0,120} wrote:\s*$/im,
  /^From:.+\n(Sent|Date):.+\nTo:.+\nSubject:.+/im,
  /^_{5,}\s*$/m,
];

const DISCLAIMER_PATTERNS: RegExp[] = [
  /^This (e-?mail|message) (and any attachments )?(is|are) confidential.*$/im,
  /^CRICOS Provider.*$/im,
];

function stripAtEarliestMatch(text: string, patterns: RegExp[]): string {
  let cutIndex = text.length;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.index !== undefined && match.index < cutIndex) {
      cutIndex = match.index;
    }
  }
  return text.slice(0, cutIndex);
}

export function preprocessBody(body: { contentType?: string; content?: string } | undefined): string {
  const raw = body?.content ?? '';
  const text = body?.contentType?.toLowerCase() === 'html'
    ? htmlToText(raw, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] })
    : raw;

  let cleaned = stripAtEarliestMatch(text, QUOTED_HISTORY_PATTERNS);
  for (const pattern of DISCLAIMER_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

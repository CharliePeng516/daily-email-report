import { IBM_Plex_Mono } from 'next/font/google';

// Utility/telemetry voice reserved for chrome — the navbar wordmark, footer
// status line, and timestamps — never the report body (system sans handles
// that). Kept out of theme.ts (a 'use client' module) so Server Components
// can import it directly without crossing a client boundary.
export const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
});

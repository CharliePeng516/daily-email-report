import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Local-dev only: spawns the CLI (in the parent directory of this Next.js
// project) as a child process, reusing its already-authenticated OAuth
// token cache and .env. This cannot work once the dashboard is actually
// deployed — Vercel's servers have no access to files on your Mac. A hosted
// version of this trigger would need the refresh token moved into Postgres
// and the fetch/classify logic run from a server-side job instead.
const CLI_ROOT = path.resolve(process.cwd(), '..');
const TSX_BIN = path.join(CLI_ROOT, 'node_modules', '.bin', 'tsx');
const LOG_DIR = path.join(CLI_ROOT, 'data');

// In-memory only — resets if the dev server restarts. Fine for a best-effort
// local-dev guard against double-clicks; not meant to be a durable lock.
const inFlight = new Set<string>();

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const provider = (body as { provider?: unknown })?.provider;
  if (provider !== 'outlook' && provider !== 'gmail') {
    return NextResponse.json({ error: 'provider must be "outlook" or "gmail".' }, { status: 400 });
  }

  if (!existsSync(path.join(CLI_ROOT, 'src', 'index.ts')) || !existsSync(TSX_BIN)) {
    return NextResponse.json(
      {
        error:
          'This only works when running the dashboard locally (npm run dev in web/), not when deployed — ' +
          'the CLI and its OAuth tokens live on your machine, not on the server.',
      },
      { status: 501 },
    );
  }

  if (inFlight.has(provider)) {
    return NextResponse.json({ status: 'already-running' });
  }

  mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, `refresh-${provider}.log`);
  const logFd = openSync(logPath, 'a');

  inFlight.add(provider);
  const child = spawn(TSX_BIN, ['src/index.ts', 'daily-report', '--provider', provider], {
    cwd: CLI_ROOT,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.on('exit', () => inFlight.delete(provider));
  child.unref();

  return NextResponse.json({ status: 'started', logPath: `data/refresh-${provider}.log` });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ inFlight: [...inFlight] });
}

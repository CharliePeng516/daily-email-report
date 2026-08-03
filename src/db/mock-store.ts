import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// A tiny local stand-in for the "already processed" dedupe table, used only
// by `--mock` runs so they stay fully credential-free (no DATABASE_URL
// needed) while still demonstrating the same duplicate-prevention behavior
// documented for real runs.
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'mock-processed.json');

function key(provider: string, messageId: string): string {
  return `${provider}:${messageId}`;
}

function load(): Set<string> {
  if (!existsSync(STORE_PATH)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(STORE_PATH, 'utf-8')) as string[]);
  } catch {
    return new Set();
  }
}

function save(ids: Set<string>): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify([...ids]), 'utf-8');
}

export function isAlreadyProcessedMock(provider: string, messageId: string): boolean {
  return load().has(key(provider, messageId));
}

export function markProcessedMock(provider: string, messageId: string): void {
  const ids = load();
  ids.add(key(provider, messageId));
  save(ids);
}

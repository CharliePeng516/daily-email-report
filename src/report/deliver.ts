import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Saves the report locally and returns the resolved absolute path. */
export function saveReport(markdown: string, outputPath: string): string {
  const resolved = path.resolve(process.cwd(), outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, markdown, 'utf-8');
  return resolved;
}

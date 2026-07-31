const BAR_WIDTH = 24;
const LABEL_WIDTH = 50;

function truncate(label: string, width: number): string {
  return label.length > width ? `${label.slice(0, width - 1)}…` : label.padEnd(width);
}

/**
 * Renders a single, in-place progress bar (overwrites the same terminal
 * line) instead of one log line per item — used for fetch/classify loops
 * that can run into the hundreds of items.
 *
 * Falls back to periodic plain-text lines when stdout isn't a TTY (piped
 * output, log files), since \r-based redraws don't make sense there.
 */
export function renderProgress(current: number, total: number, label: string): void {
  if (!process.stdout.isTTY) {
    if (current === total || current % 25 === 0) {
      console.log(`  ${current}/${total} ${label}`);
    }
    return;
  }

  const ratio = total === 0 ? 1 : current / total;
  const filled = Math.round(BAR_WIDTH * ratio);
  const bar = '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
  const pct = String(Math.round(ratio * 100)).padStart(3);
  const line = `  [${bar}] ${pct}% (${current}/${total}) ${truncate(label, LABEL_WIDTH)}`;

  process.stdout.write(`\x1b[2K\r${line}`);
  if (current === total) process.stdout.write('\n');
}

#!/usr/bin/env node
import { Command } from 'commander';
import { closeDb } from './db/client.js';
import { runDailyReport } from './jobs/daily-report.js';
import type { ProviderName } from './providers/index.js';

const program = new Command();

program
  .name('daily-email-report')
  .description('Read-first AI agent that scans your inbox and generates a daily priority report.');

program
  .command('daily-report')
  .description('Fetch recent inbox messages, classify and rank them, and write a Markdown report.')
  .requiredOption('--provider <name>', 'Mailbox to read from: "outlook" or "gmail".')
  .option(
    '--since <window>',
    'How far back to read: an ISO timestamp, or e.g. "24 hours" / "14 days". Defaults to the last successful run for this provider, or 24 hours on first run.',
  )
  .option('--output <path>', 'Where to write the Markdown report. Defaults to reports/<provider>-today.md.')
  .option('--mock', 'Run against local fixture data instead of live Microsoft/Google/OpenAI calls.', false)
  .action(async (opts: { provider: string; since?: string; output?: string; mock: boolean }) => {
    if (opts.provider !== 'outlook' && opts.provider !== 'gmail') {
      console.error(`Invalid --provider "${opts.provider}". Use "outlook" or "gmail".`);
      process.exitCode = 1;
      return;
    }
    const provider = opts.provider as ProviderName;
    const output = opts.output ?? `reports/${provider}-today.md`;

    try {
      const result = await runDailyReport({ provider, since: opts.since, output, mock: opts.mock });
      console.log(
        `[${provider}] Processed ${result.processedCount} email(s), ${result.errorCount} error(s). ` +
          `Report written to ${result.outputPath}`,
      );
    } catch (err) {
      console.error(`daily-report failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    } finally {
      // Only opened for real (non-mock) runs — closeDb() is a no-op if it was never used.
      await closeDb();
    }
  });

program.parseAsync(process.argv);

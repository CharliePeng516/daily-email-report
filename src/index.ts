#!/usr/bin/env node
import { Command } from 'commander';
import { runDailyReport } from './jobs/daily-report.js';

const program = new Command();

program
  .name('daily-email-report')
  .description('Read-first AI agent that scans a school mailbox and generates a daily priority report.');

program
  .command('daily-report')
  .description('Fetch recent inbox messages, classify and rank them, and write a Markdown report.')
  .option(
    '--since <window>',
    'How far back to read: an ISO timestamp or e.g. "24 hours". Defaults to the last successful run, or 24 hours on first run.',
  )
  .option('--output <path>', 'Where to write the Markdown report.', 'reports/today.md')
  .option('--mock', 'Run against local fixture data instead of live Microsoft Graph / OpenAI calls.', false)
  .action(async (opts: { since?: string; output: string; mock: boolean }) => {
    try {
      const result = await runDailyReport(opts);
      console.log(
        `Processed ${result.processedCount} email(s), ${result.errorCount} error(s). ` +
          `Report written to ${result.outputPath}`,
      );
    } catch (err) {
      console.error(`daily-report failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);

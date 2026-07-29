# daily-email-report

Scan daily email from a school mailbox, auto filter and sort messages by importance, and generate a
concise daily report.

A **read-first, deterministic workflow with one AI analysis step** — not an autonomous multi-agent
system. Ordinary code controls when data is read, what permissions are available, how scores are
calculated, and where the report is delivered. AI is used only for the semantic step: understanding
intent, extracting actions, and identifying deadlines.

## Pipeline

```
Scheduler
  |
Microsoft Graph Connector   (auth/microsoft.ts, graph/messages.ts)
  |
Email Preprocessor          (email/preprocess.ts)
  |
AI Classifier                (email/classify.ts)
  |
Priority Scorer               (email/rules.ts, email/priority.ts)
  |
SQLite                         (db/client.ts, db/schema.ts)
  |
Daily Report Generator          (report/generate.ts, report/deliver.ts)
```

Orchestrated end to end by [`src/jobs/daily-report.ts`](src/jobs/daily-report.ts) and exposed as a CLI
via [`src/index.ts`](src/index.ts).

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `USER_EMAIL` / `MANAGER_EMAILS` — used by the deterministic scoring rules.
- `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` — a Microsoft Entra ID app registration with delegated,
  **read-only** permissions (`openid`, `profile`, `offline_access`, `User.Read`, `Mail.Read`). Enable
  "Allow public client flows" so the device-code login works. Do not request `Mail.ReadWrite` or
  `Mail.Send` — this version only reads mail. If your tenant requires admin consent that hasn't been
  granted, the CLI fails clearly rather than trying another login path.
- `OPENAI_API_KEY` / `OPENAI_MODEL` — used for structured-output email classification.

## Usage

```bash
# Try the full pipeline without any credentials, using fixture data:
npm run report:mock

# Real run — reads Inbox messages since the last successful run (24h on first run):
npm run report

# Explicit window and output path:
npm run start -- daily-report --since "24 hours" --output reports/today.md
```

The first real run opens a device-code login (prints a URL + code to the console) and caches the
refresh token in `data/token-cache.json`. Re-running reuses that token silently until it expires.

Re-running `--mock` after the first time will report 0 new emails — the fixture message IDs are
already marked processed in `data/emails.db` (this is the same duplicate-prevention checkpoint used
in real runs). Delete `data/emails.db` to reset local state.

## Report format

```
# SCHOOL EMAIL DAILY REPORT
30 July 2026

Processed: 24 emails

## CRITICAL - 2
1. COMP4920 attendance records
   From: Course Convenor
   Priority: 94
   Action: Submit Week 10 attendance spreadsheet
   Deadline: Friday, 31 July, 5:00 pm
   Open: Outlook link

## HIGH - 4
...

## TODAY'S ACTION LIST
- [ ] Submit attendance spreadsheet
- [ ] Confirm tutor meeting time
```

Critical/High items get a full breakdown; Medium/Low are grouped as one-line summaries. Sensitive
items (student welfare, health, academic integrity, etc.) are reduced to a generic note — see
Privacy below.

## Priority scoring

Deterministic on top of the AI assessment, so ranking stays explainable and reproducible
([`src/email/priority.ts`](src/email/priority.ts)):

```
score = urgency * 3
      + importance * 2
      + 15 if action required
      + 10 if a deadline exists
      + 15 if sender is a manager
      + 12 if sender is course admin
      + 5  if sent directly to you
      + 5  if Microsoft importance is high
      - 30 if newsletter
      - 50 if spam
```

| Score  | Level    |
|--------|----------|
| 80–100 | Critical |
| 60–79  | High     |
| 35–59  | Medium   |
| 0–34   | Low      |

Ties break by score, then earlier deadline, then more recent received time.

## Privacy and safety

- Read-only `Mail.Read` scope. No auto-reply, forward, move, or delete.
- Full message bodies are never persisted — only the structured analysis (summary, category, score,
  action, deadline) plus a link back to Outlook. See [`src/db/schema.ts`](src/db/schema.ts).
- Sensitive items (student welfare/health/academic integrity/complaints) are reduced in the report to
  "Sensitive student matter - manual review required." rather than including detail.
- Tokens are cached locally in `data/token-cache.json`, which is gitignored. Encrypting that file at
  rest is a TODO before any shared/production deployment (see the comment in
  [`src/auth/microsoft.ts`](src/auth/microsoft.ts)).
- **This version classifies, sorts, and summarises only.** It does not autonomously contact students
  or make decisions about extensions, marks, welfare, or misconduct.

## Status

Implements roadmap phases 1–5 (connectivity, structured analysis, ranking, daily report,
persistence/checkpointing) as a local CLI. Phase 6 (scheduled deployment) is not wired up yet — see
`package.json`'s `report` script for the command to put behind a scheduler (cron, Azure Function
timer, EventBridge + Lambda, or a scheduled GitHub Action).

## Project structure

```
src/
  index.ts                   CLI entry (commander)
  config.ts                  Env loading
  types.ts                   EmailAnalysis schema (Zod) + shared types
  auth/microsoft.ts          Device-code OAuth via MSAL, token cache
  graph/messages.ts          Microsoft Graph fetch, pagination, retry
  email/preprocess.ts        HTML->text, strip quoted history/disclaimers
  email/classify.ts          OpenAI structured output + mock classifier
  email/rules.ts             Deterministic sender-role helpers
  email/priority.ts          Scoring formula, level, sort
  report/generate.ts         Markdown report rendering
  report/deliver.ts          Save report to disk
  jobs/daily-report.ts       Pipeline orchestration
  fixtures/sample-messages.ts Fixture data for --mock
data/emails.db              SQLite: processed emails, checkpoints, errors (gitignored)
reports/                    Generated Markdown reports (gitignored)
```

## References

- [Microsoft Graph — List messages](https://learn.microsoft.com/graph/api/user-list-messages)
- [Microsoft identity platform OAuth](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Graph change notifications](https://learn.microsoft.com/graph/change-notifications-overview)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)

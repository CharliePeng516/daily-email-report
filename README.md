# daily-email-report

Scan daily email from a school mailbox, auto filter and sort messages by importance, and generate a
concise daily report. Supports two mailbox providers — **Outlook** (Microsoft Graph) and **Gmail**
— behind the same pipeline.

A **read-first, deterministic workflow with one AI analysis step** — not an autonomous multi-agent
system. Ordinary code controls when data is read, what permissions are available, how scores are
calculated, and where the report is delivered. AI is used only for the semantic step: understanding
intent, extracting actions, and identifying deadlines.

## Pipeline

```
Scheduler
  |
Mail Provider (Outlook or Gmail)   (providers/outlook/*, providers/gmail/*)
  |
Email Preprocessor                 (email/preprocess.ts)
  |
AI Classifier                      (email/classify.ts)
  |
Priority Scorer                    (email/rules.ts, email/priority.ts)
  |
SQLite                             (db/client.ts, db/schema.ts)
  |
Daily Report Generator             (report/generate.ts, report/deliver.ts)
```

Everything after the provider step is provider-agnostic: both Outlook and Gmail normalise their raw
messages into the same `NormalisedEmail` shape ([`src/types.ts`](src/types.ts)) and implement the same
`MailProvider` interface ([`src/providers/types.ts`](src/providers/types.ts)), selected at runtime via
`getProvider()` ([`src/providers/index.ts`](src/providers/index.ts)).

Orchestrated end to end by [`src/jobs/daily-report.ts`](src/jobs/daily-report.ts) and exposed as a CLI
via [`src/index.ts`](src/index.ts).

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `USER_EMAIL` / `MANAGER_EMAILS` — used by the deterministic scoring rules (provider-agnostic).
- `LLM_PROVIDER` — `openai` (default) or `deepseek`, then the matching API key
  (`OPENAI_API_KEY` or `DEEPSEEK_API_KEY`). DeepSeek's API is OpenAI-compatible and considerably
  cheaper, but only offers plain JSON mode rather than OpenAI's strict schema-enforced structured
  outputs — see the comment in [`src/email/classify.ts`](src/email/classify.ts). A schema mismatch
  from DeepSeek is treated as a per-message processing error (reported in the daily report), not a
  crash. `LLM_MODEL` / `LLM_BASE_URL` are optional overrides; each provider has a sensible default.
- For `--provider outlook`: `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` — a Microsoft Entra ID app
  registration with delegated, **read-only** permissions (`openid`, `profile`, `offline_access`,
  `User.Read`, `Mail.Read`). Enable "Allow public client flows" so the device-code login works. Do
  not request `Mail.ReadWrite` or `Mail.Send`. If your tenant requires admin consent that hasn't been
  granted (common for university tenants, which lock down third-party mailbox access as an
  anti-consent-phishing control), the CLI fails clearly rather than trying another login path.
- For `--provider gmail`: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — a Google Cloud OAuth client.
  In [Google Cloud Console](https://console.cloud.google.com/): enable the Gmail API, configure the
  OAuth consent screen (External, Testing mode is fine for personal use — add your own Gmail address
  as a test user), then create an OAuth client ID of type **"Desktop app"**. (Not "TVs and Limited
  Input devices" — Google's device-code flow only supports a small scope allowlist that excludes
  Gmail entirely, so that client type can't be used here.) Grants only
  `https://www.googleapis.com/auth/gmail.readonly`.

## Usage

```bash
# Try the full pipeline without any credentials, using fixture data:
npm run report:mock:outlook
npm run report:mock:gmail

# Real run — reads Inbox messages since the last successful run for that provider (24h on first run):
npm run report:outlook
npm run report:gmail

# Explicit window and output path:
npm run start -- daily-report --provider gmail --since "24 hours" --output reports/gmail-today.md
```

The first real run for a provider opens an interactive login and caches the refresh token locally
(`data/outlook-token-cache.json` or `data/gmail-token-cache.json`). Outlook uses a device-code login
(prints a URL + code to the console); Gmail opens a browser tab and listens on a local port for the
redirect (standard OAuth loopback flow — Gmail scopes aren't available via device-code). Re-running
reuses the cached token silently until it expires. Outlook and Gmail have independent
checkpoints and dedupe state, so running one doesn't affect the other's read progress.

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
      + 5  if importance flag is high (Outlook's Importance header, or Gmail's IMPORTANT label)
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

- Read-only scope on both providers (`Mail.Read` / `gmail.readonly`). No auto-reply, forward, move,
  or delete.
- Full message bodies are never persisted — only the structured analysis (summary, category, score,
  action, deadline) plus a link back to the provider's own web UI. See
  [`src/db/schema.ts`](src/db/schema.ts).
- Sensitive items (student welfare/health/academic integrity/complaints) are reduced in the report to
  "Sensitive student matter - manual review required." rather than including detail.
- Tokens are cached locally in `data/*-token-cache.json`, which is gitignored. Encrypting those files
  at rest is a TODO before any shared/production deployment (see the comments in
  [`src/providers/outlook/auth.ts`](src/providers/outlook/auth.ts) and
  [`src/providers/gmail/auth.ts`](src/providers/gmail/auth.ts)).
- **This version classifies, sorts, and summarises only.** It does not autonomously contact students
  or make decisions about extensions, marks, welfare, or misconduct.

## Status

Implements roadmap phases 1–5 (connectivity, structured analysis, ranking, daily report,
persistence/checkpointing) as a local CLI, for both Outlook and Gmail. Phase 6 (scheduled deployment)
is not wired up yet — see `package.json`'s `report:outlook` / `report:gmail` scripts for the commands
to put behind a scheduler (cron, Azure Function timer, EventBridge + Lambda, or a scheduled GitHub
Action).

## Project structure

```
src/
  index.ts                    CLI entry (commander), --provider outlook|gmail
  config.ts                   Env loading
  types.ts                    EmailAnalysis schema (Zod) + shared types (NormalisedEmail, ScoredEmail)
  lib/http.ts                 Shared fetch-with-retry (429/5xx, capped backoff)
  providers/types.ts          MailProvider interface, ProviderName, FetchedItem
  providers/index.ts          getProvider(name) registry
  providers/outlook/          Device-code OAuth (MSAL), Graph fetch, raw->NormalisedEmail mapping
  providers/gmail/            Device-flow OAuth, Gmail API fetch, MIME decode -> NormalisedEmail mapping
  email/preprocess.ts         HTML->text, strip quoted history/disclaimers (shared by both providers)
  email/classify.ts           OpenAI structured output + mock classifier
  email/rules.ts              Deterministic sender-role helpers
  email/priority.ts           Scoring formula, level, sort
  report/generate.ts          Markdown report rendering
  report/deliver.ts           Save report to disk
  jobs/daily-report.ts        Pipeline orchestration, per-provider checkpointing
  fixtures/sample-messages.ts Fixture data for --mock (provider-agnostic)
data/emails.db               SQLite: processed emails, checkpoints, errors — scoped per provider (gitignored)
reports/                     Generated Markdown reports, e.g. outlook-today.md / gmail-today.md (gitignored)
```

## References

- [Microsoft Graph — List messages](https://learn.microsoft.com/graph/api/user-list-messages)
- [Microsoft identity platform OAuth](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Graph change notifications](https://learn.microsoft.com/graph/change-notifications-overview)
- [Gmail API — Users.messages](https://developers.google.com/gmail/api/reference/rest/v1/users.messages)
- [Google OAuth 2.0 for Desktop apps (loopback redirect)](https://developers.google.com/identity/protocols/oauth2/native-app)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [DeepSeek API — JSON mode](https://api-docs.deepseek.com/guides/json_mode)

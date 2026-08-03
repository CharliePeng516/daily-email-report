# daily-email-report

Scan daily email from your inbox, auto filter and sort messages by importance, and generate a
concise daily report — as a live web dashboard, not just a file. Supports two mailbox providers —
**Outlook** (Microsoft Graph) and **Gmail** — behind the same pipeline.

A **read-first, deterministic workflow with one AI analysis step** — not an autonomous multi-agent
system. Ordinary code controls when data is read, what permissions are available, how scores are
calculated, and where the report is delivered. AI is used only for the semantic step: understanding
intent, extracting actions, and identifying deadlines.

## Two parts, one database

```
┌─────────────────────────────────┐        ┌──────────────────────────────┐
│  CLI (this directory)           │        │  web/ (Next.js + MUI)        │
│  Runs locally / on a schedule   │  writes │  Deployed on Vercel           │
│  you control                    │ ──────► │  Reads the same data, live    │
│  Outlook/Gmail OAuth logins are │Postgres │  Password-gated (personal      │
│  interactive, so this can't run │         │  inbox data on a public URL)  │
│  unattended on a server         │         │                                │
└─────────────────────────────────┘        └──────────────────────────────┘
```

The CLI and the web dashboard are two separate npm projects sharing one Postgres database. This
split exists because OAuth device-code / loopback logins require an interactive browser — they can't
run inside a Vercel serverless function. So the CLI stays local (cron, launchd, a scheduled GitHub
Action with a pre-refreshed token, etc.) and the web app is a pure read-only viewer.

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
Postgres (Drizzle)                 (db/client.ts, db/schema.ts)  ──── read by web/
  |
Daily Report Generator             (report/generate.ts, report/deliver.ts)  ── local Markdown copy
```

Everything after the provider step is provider-agnostic: both Outlook and Gmail normalise their raw
messages into the same `NormalisedEmail` shape ([`src/types.ts`](src/types.ts)) and implement the same
`MailProvider` interface ([`src/providers/types.ts`](src/providers/types.ts)), selected at runtime via
`getProvider()` ([`src/providers/index.ts`](src/providers/index.ts)).

Orchestrated end to end by [`src/jobs/daily-report.ts`](src/jobs/daily-report.ts) and exposed as a CLI
via [`src/index.ts`](src/index.ts).

## CLI setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — a hosted Postgres connection string (e.g. from [Neon](https://neon.tech), free
  tier). Not needed for `--mock` runs. Once set, run `npm run db:push` once to create the tables —
  this is the same database the web dashboard reads from.
- `USER_EMAIL` / `MANAGER_EMAILS` — used by the deterministic scoring rules (provider-agnostic).
- `LLM_PROVIDER` — `openai` (default) or `deepseek`, then the matching API key
  (`OPENAI_API_KEY` or `DEEPSEEK_API_KEY`). DeepSeek's API is OpenAI-compatible and considerably
  cheaper, but only offers plain JSON mode rather than OpenAI's strict schema-enforced structured
  outputs — see the comment in [`src/email/classify.ts`](src/email/classify.ts). A schema mismatch
  from DeepSeek is treated as a per-message processing error (reported in the dashboard), not a
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

## CLI usage

```bash
# Try the full pipeline without any credentials, using fixture data (no DATABASE_URL needed):
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
reuses the cached token silently until it expires. Outlook and Gmail have independent checkpoints and
dedupe state in Postgres, so running one doesn't affect the other's read progress.

Re-running `--mock` after the first time will report 0 new emails — the fixture message IDs are
tracked in a local file (`data/mock-processed.json`), the same duplicate-prevention behavior real
runs get from Postgres. Delete that file to reset it.

Each real run also writes a local Markdown copy (`reports/<provider>-today.md`) in the original report
format, in case you want a file alongside the live dashboard.

## Web dashboard

```bash
cd web
npm install
cp .env.example .env
```

Fill in `web/.env`:

- `DATABASE_URL` — the **same** connection string as the CLI's `.env`.
- `DASHBOARD_PASSWORD` — a shared password gating the whole site (see Privacy below).
- `SESSION_SECRET` — any long random string, used to sign the login session cookie.

```bash
npm run dev    # http://localhost:3000
```

The dashboard shows Critical/High items as full cards (subject, sender, action, deadline, link back
to Outlook/Gmail), Medium/Low as compact one-liners, a "Today's Action List", and a processing-errors
panel — reading directly from Postgres, filtered to a configurable window (default: last 2 days).
Provider tabs switch between Outlook and Gmail.

### Deploying to Vercel

1. Push this repo to GitHub, import it in Vercel, and set the **root directory** to `web/` (the CLI
   half isn't deployed — it isn't meant to run on Vercel).
2. Add the three env vars above (`DATABASE_URL`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`) in the
   Vercel project settings.
3. Deploy. Run the CLI locally/on a schedule you control to keep the data fresh — the dashboard
   itself never fetches from Outlook/Gmail.

## Report format (dashboard and Markdown copy)

The Markdown header and provider-link label switch with the mailbox: `SCHOOL EMAIL DAILY REPORT` /
"Outlook link" for Outlook, `DAILY EMAIL REPORT` / "Gmail link" for Gmail (see
[`src/report/generate.ts`](src/report/generate.ts)). Example (Outlook):

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
  [`src/db/schema.ts`](src/db/schema.ts) / [`web/lib/schema.ts`](web/lib/schema.ts).
- Sensitive items (student welfare/health/academic integrity/complaints) are reduced in the report to
  "Sensitive student matter - manual review required." rather than including detail.
- **The web dashboard is password-gated** (`DASHBOARD_PASSWORD`) — it shows personal/university inbox
  summaries on a public URL, so it isn't deployed fully open. See
  [`web/middleware.ts`](web/middleware.ts) and [`web/lib/auth.ts`](web/lib/auth.ts).
- OAuth tokens are cached locally in `data/*-token-cache.json`, which is gitignored. Encrypting those
  files at rest is a TODO before any shared/production deployment of the CLI itself (see the comments
  in [`src/providers/outlook/auth.ts`](src/providers/outlook/auth.ts) and
  [`src/providers/gmail/auth.ts`](src/providers/gmail/auth.ts)).
- **This version classifies, sorts, and summarises only.** It does not autonomously contact students
  or make decisions about extensions, marks, welfare, or misconduct.

## Status

Implements roadmap phases 1–5 (connectivity, structured analysis, ranking, daily report,
persistence/checkpointing) for both Outlook and Gmail, plus a deployed live-dashboard viewer in place
of a plain report file. Phase 6 (scheduled *CLI* execution) is still manual — see the `report:outlook`
/ `report:gmail` scripts for the commands to put behind a scheduler (cron, Azure Function timer,
EventBridge + Lambda, or a scheduled GitHub Action with a pre-authorized token).

## Project structure

```
src/                          CLI (local-only — needs interactive OAuth logins)
  index.ts                    CLI entry (commander), --provider outlook|gmail
  config.ts                   Env loading
  types.ts                    EmailAnalysis schema (Zod) + shared types (NormalisedEmail, ScoredEmail)
  lib/http.ts                 Shared fetch-with-retry (429/5xx, capped backoff)
  providers/types.ts          MailProvider interface, ProviderName, FetchedItem
  providers/index.ts          getProvider(name) registry
  providers/outlook/          Device-code OAuth (MSAL), Graph fetch, raw->NormalisedEmail mapping
  providers/gmail/            Loopback OAuth + PKCE, Gmail API fetch, MIME decode -> NormalisedEmail
  email/preprocess.ts         HTML->text, strip quoted history/disclaimers (shared by both providers)
  email/classify.ts           OpenAI/DeepSeek structured output + mock classifier
  email/rules.ts              Deterministic sender-role helpers
  email/priority.ts           Scoring formula, level, sort
  report/generate.ts          Markdown report rendering (local file copy)
  report/deliver.ts           Save report to disk
  db/schema.ts                Drizzle Postgres schema (shared contract with web/lib/schema.ts)
  db/client.ts                Postgres writes: checkpoints, dedupe, processed emails, errors
  db/mock-store.ts            File-based dedupe stand-in used only by --mock (no DB needed)
  jobs/daily-report.ts        Pipeline orchestration, per-provider checkpointing
  fixtures/sample-messages.ts Fixture data for --mock (provider-agnostic)
drizzle/                      Generated SQL migrations (npm run db:generate / db:push)
data/                         OAuth token caches, mock dedupe store — all gitignored
reports/                      Generated Markdown reports, e.g. outlook-today.md (gitignored)

web/                          Live dashboard (deployed — Next.js App Router + MUI)
  app/page.tsx                Dashboard: provider tabs, priority sections, action list, errors
  app/login/                  Password form + server action
  app/api/logout/route.ts     Clears the session cookie
  middleware.ts                Redirects unauthenticated requests to /login
  lib/db.ts, lib/schema.ts    Read-only Postgres client (same tables as src/db/schema.ts)
  lib/queries.ts               Data-fetching for the dashboard
  lib/auth.ts                  Signed session cookie + password check
  components/                  MUI presentational components
```

## References

- [Microsoft Graph — List messages](https://learn.microsoft.com/graph/api/user-list-messages)
- [Microsoft identity platform OAuth](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Graph change notifications](https://learn.microsoft.com/graph/change-notifications-overview)
- [Gmail API — Users.messages](https://developers.google.com/gmail/api/reference/rest/v1/users.messages)
- [Google OAuth 2.0 for Desktop apps (loopback redirect)](https://developers.google.com/identity/protocols/oauth2/native-app)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [DeepSeek API — JSON mode](https://api-docs.deepseek.com/guides/json_mode)
- [Drizzle ORM — Postgres](https://orm.drizzle.team/docs/get-started-postgresql)
- [Neon — serverless Postgres](https://neon.tech)

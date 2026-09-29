# Architecture

## Job lifecycle
Every task run is a `job` row that moves through explicit states:

```
planned -> running -> extracting -> comparing -> completed
                                          \-> failed (any step)
```

## Pipeline
1. **Task intake** (`POST /api/tasks`) — objective, workflow, destination, frequency, routing.
2. **Planning** (`POST /api/plans`) — `agents/planner.js` reads the workflow's schema
   (`extraction/schemas.js`) and produces a step-by-step plan: which source, which
   tool, which fields, and the fallback behavior if a selector is missing.
3. **Browser execution** (`POST /api/runs`) — `agents/browser_execution/worker.js`
   navigates each planned source and stores the raw page as a `snapshot`.
4. **Extraction** (`POST /api/extract`) — `extraction/parsers.js` parses each snapshot
   against the schema's CSS selectors into normalized, confidence-scored
   `extracted_records`. A missing selector never gets a guessed value — it's
   recorded with a note and a low confidence score instead.
5. **Reasoning loop / comparison** (`POST /api/compare`) — `agents/reasoning_loop.js`
   diffs this job's records against the most recent completed job for the same
   task and classifies each field: `material-change`, `stable`, `low-confidence`,
   or `first-observation`.
6. **Completion** (`POST /api/complete`) — `agents/completion.js` turns the
   comparison into an action-oriented summary with a recommended owner
   (Growth / Revenue & Pricing / Marketing Ops / Partner Ops).
7. **Feedback** (`POST /api/feedback`) — reviewer accepts or rejects a run's findings.

## Why the browser layer is fetch-based here
Real browser automation (Playwright/Chromium) needs a downloadable browser binary.
This sandbox has neither a working `snapd` nor network access to Playwright's
download CDN, so `worker.js` performs plain HTTP fetches against local fixture
pages under `/fixtures` — same navigate → capture → extract → store contract a
real browser worker must satisfy. `agents/browser_execution/worker.playwright.js`
is the real-browser version: same function signature, ready to swap in once this
runs on infrastructure with normal outbound internet access (see README).

## Data model
See `backend/db.js` for the full schema: `tasks`, `jobs`, `snapshots`,
`extracted_records`, `comparisons`, `summaries`, `feedback`. Written in
Postgres-compatible SQL so moving off SQLite is a driver change, not a
redesign.

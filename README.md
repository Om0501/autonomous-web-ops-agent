# Web Ops Agent

A working backend implementation of the Autonomous Web Operations Agent: task
intake → agent planning → browser execution → structured extraction →
change-detection reasoning → completion summary, backed by a real database.

Tested end to end in this repo: create a task, run it twice, and the second
run correctly detects real field-level changes (price ₹7200 → ₹5400,
`Available` → `Limited`, a competitor discount going from 25% to 40%) against
the first run's stored snapshot — see `tests/smoke.test.sh`.

## Important: what's real and what's substituted here

Everything **except live internet browsing** is real: the Express API, the
SQLite job/snapshot/extraction/comparison/summary tables, the planner, the
CSS-selector extraction pipeline, the diff/reasoning logic, and the
completion summaries are all functioning code, not mocked responses.

The **browser execution** step navigates to local fixture pages
(`/fixtures/...`) instead of live competitor/partner sites, because:
- This environment has no working headless browser binary (no `snapd`, and
  Playwright's browser-download CDN isn't reachable from here).
- Real target domains (actual competitor/partner sites) weren't specified,
  and hitting real third-party sites without their permission isn't
  something to do from a shared sandbox anyway.

`agents/browser_execution/worker.playwright.js` is the real-browser
implementation, written against the same interface as the fixture version.
Deploying this on infrastructure with normal outbound internet (Render,
Railway, a Docker image based on `mcr.microsoft.com/playwright`) and pointing
`extraction/schemas.js` at real domains is a small, well-scoped next step —
see "Going to production" below.

## Setup

```bash
npm install
cp .env.example .env
npm start          # listens on :4000 by default
```

## Try it

```bash
# 1. Create a task
curl -X POST localhost:4000/api/tasks -H 'Content-Type: application/json' \
  -d '{"workflow":"pricing","destination":"Goa","frequency":"Daily","routing":"Alert on material change"}'

# 2. Generate a plan for that task (note the taskId from step 1)
curl -X POST localhost:4000/api/plans -H 'Content-Type: application/json' \
  -d '{"taskId":"<TASK_ID>"}'

# 3. Execute, extract, compare, complete (note the jobId from step 2)
curl -X POST localhost:4000/api/runs     -d '{"jobId":"<JOB_ID>"}' -H 'Content-Type: application/json'
curl -X POST localhost:4000/api/extract  -d '{"jobId":"<JOB_ID>"}' -H 'Content-Type: application/json'
curl -X POST localhost:4000/api/compare  -d '{"jobId":"<JOB_ID>"}' -H 'Content-Type: application/json'
curl -X POST localhost:4000/api/complete -d '{"jobId":"<JOB_ID>"}' -H 'Content-Type: application/json'

# Repeat steps 2-3 for the same task — the second run will show real
# material-change comparisons against the first.

# Dashboard aggregate
curl localhost:4000/api/dashboard
```

Or run the scripted version: `bash tests/smoke.test.sh` (with the server
already running).

## API reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tasks` | POST | Create a task (`workflow`, `destination`, `frequency`, `routing`) |
| `/api/tasks` | GET | List tasks |
| `/api/plans` | POST | Generate a plan + job for a task (`taskId`) |
| `/api/runs` | POST | Execute the plan's browser steps, store snapshots (`jobId`) |
| `/api/runs/:id` | GET | Full job detail: task, plan, snapshots, extraction, comparisons, summary |
| `/api/extract` | POST | Parse stored snapshots into structured records (`jobId`) |
| `/api/compare` | POST | Diff against the prior completed job for the task (`jobId`) |
| `/api/complete` | POST | Generate the completion summary (`jobId`) |
| `/api/feedback` | POST | Record reviewer verdict (`jobId`, `verdict`, `note`) |
| `/api/dashboard` | GET | Completion rate, avg. confidence, material-change count, recent runs |

Supported `workflow` values: `competitor`, `pricing`, `campaign` (schemas in
`extraction/schemas.js` — add `partner` and `trend` schemas the same way).

## Repository layout

```
webops-agent/
├── backend/            Express app: server.js, db.js, routes/*.js
├── agents/             planner, browser_execution (fixture + playwright), reasoning_loop, completion
├── extraction/         per-workflow schemas + the HTML → structured-record parser
├── fixtures/           stand-in "target sites" (two time-separated snapshots per source)
├── data/               sample task templates + watchlist CSV
├── docs/architecture.md
├── tests/smoke.test.sh
└── webops.db           created on first run (SQLite)
```

## Going to production

1. **Real browsing**: swap the `require` in `backend/routes/runs.js` from
   `worker` to `worker.playwright`, add real domains to
   `extraction/schemas.js`, and deploy on infra with outbound internet and a
   Playwright-capable image.
2. **Database**: swap `better-sqlite3` for `pg` in `backend/db.js` — the
   schema is already written in Postgres-compatible SQL.
3. **Security**: add a domain allowlist check before `worker.playwright.js`
   navigates anywhere, move any credentials into environment variables (see
   `.env.example`), and add auth/role separation (task creator, reviewer,
   admin) in front of the API routes.
4. **Scheduling**: add a queue/cron layer that calls
   `plans → runs → extract → compare → complete` on each task's `frequency`.
5. **Frontend**: the console UI built earlier in this conversation can be
   pointed at these endpoints instead of its in-browser mock data.

## Known limitations (by design, for this environment)

- Browser execution is fixture-based, not live (see above).
- No auth/role separation yet — every endpoint is open.
- No scheduler — runs are triggered manually via the API.
- Only three of the five workflows in the brief have extraction schemas
  wired up (`competitor`, `pricing`, `campaign`); `partner` and `trend`
  follow the identical pattern in `extraction/schemas.js`.

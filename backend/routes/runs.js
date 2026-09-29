const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { SCHEMAS } = require("../../extraction/schemas");
const { fetchAndExtract } = require("../../agents/browser_execution/worker");

const router = express.Router();

function touch(jobId, state) {
  db.prepare(`UPDATE jobs SET state = ?, updated_at = ? WHERE id = ?`).run(state, new Date().toISOString(), jobId);
}

// Executes the approved plan: navigates each source, captures the page,
// and stores a raw snapshot. Which fixture "day" it fetches depends on how
// many completed runs this task already has, so a second run genuinely
// sees different data than the first (real drift, not scripted).
router.post("/", async (req, res) => {
  const { jobId } = req.body;
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });

  const plan = JSON.parse(job.plan_json);
  const priorCompleted = db
    .prepare(`SELECT COUNT(*) AS n FROM jobs WHERE task_id = ? AND state = 'completed'`)
    .get(job.task_id).n;
  const day = priorCompleted === 0 ? "day1" : "day2";

  touch(jobId, "running");
  const baseUrl = `http://localhost:${process.env.PORT || 4000}`;
  const results = [];

  for (const step of plan.steps) {
    const schema = SCHEMAS[plan.workflow].sources[step.source];
    const pageFile =
      step.source === "ownlanding" ? `campaigns-${day}.html` : `${plan.destination.toLowerCase()}-${day}.html`;

    const result = await fetchAndExtract({ baseUrl, source: step.source, sourceConfig: schema, page: pageFile });

    if (!result.blocked) {
      db.prepare(
        `INSERT INTO snapshots (id, job_id, source, url, fetched_at, raw_html) VALUES (?, ?, ?, ?, ?, ?)`
      ).run("snap-" + crypto.randomUUID(), jobId, step.source, result.url, new Date().toISOString(), result.html);
    }
    results.push({ source: step.source, url: result.url, blocked: result.blocked, note: result.note || null });
  }

  touch(jobId, "extracting");
  res.json({ jobId, state: "extracting", sources: results });
});

router.get("/:id", (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });

  res.json({
    job,
    plan: JSON.parse(job.plan_json),
    task: db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(job.task_id),
    snapshots: db.prepare(`SELECT id, source, url, fetched_at FROM snapshots WHERE job_id = ?`).all(job.id),
    extracted: db.prepare(`SELECT * FROM extracted_records WHERE job_id = ?`).all(job.id),
    comparisons: db.prepare(`SELECT * FROM comparisons WHERE job_id = ?`).all(job.id),
    summary: db.prepare(`SELECT * FROM summaries WHERE job_id = ?`).get(job.id) || null,
  });
});

module.exports = router;

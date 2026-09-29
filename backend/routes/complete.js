const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { summarize } = require("../../agents/completion");

const router = express.Router();

router.post("/", (req, res) => {
  const { jobId } = req.body;
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });

  const plan = JSON.parse(job.plan_json);
  const comparisons = db.prepare(`SELECT * FROM comparisons WHERE job_id = ?`).all(jobId).map((c) => ({
    ...c,
    changeType: c.change_type,
    value: c.new_value,
    prevValue: c.prev_value,
  }));

  const summary = summarize(plan.label, plan.owner, plan.destination, comparisons);
  const id = "sum-" + crypto.randomUUID();

  db.prepare(
    `INSERT INTO summaries (id, job_id, headline, owner, material_count, uncertain_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, jobId, summary.headline, summary.owner, summary.material.length, summary.uncertain.length, new Date().toISOString());

  db.prepare(`UPDATE jobs SET state = 'completed', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), jobId);

  res.json({ jobId, state: "completed", summary });
});

module.exports = router;

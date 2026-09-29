const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { SCHEMAS } = require("../../extraction/schemas");
const { extractFields } = require("../../extraction/parsers");

const router = express.Router();

// Parses every stored snapshot for this job against its workflow's schema
// and writes normalized, confidence-scored records.
router.post("/", (req, res) => {
  const { jobId } = req.body;
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });

  const plan = JSON.parse(job.plan_json);
  const snapshots = db.prepare(`SELECT * FROM snapshots WHERE job_id = ?`).all(jobId);
  const allRecords = [];

  for (const snap of snapshots) {
    const schema = SCHEMAS[plan.workflow].sources[snap.source];
    const fields = extractFields(snap.raw_html, schema.selectors);
    for (const f of fields) {
      const id = "rec-" + crypto.randomUUID();
      db.prepare(
        `INSERT INTO extracted_records (id, job_id, source, url, field, value, snippet, confidence, note, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, jobId, snap.source, snap.url, f.field, f.value, f.snippet, f.confidence, f.note, snap.fetched_at);
      allRecords.push({ id, source: snap.source, url: snap.url, ...f });
    }
  }

  db.prepare(`UPDATE jobs SET state = 'comparing', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), jobId);
  res.json({ jobId, state: "comparing", records: allRecords });
});

module.exports = router;

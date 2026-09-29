const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { compare } = require("../../agents/reasoning_loop");

const router = express.Router();

router.post("/", (req, res) => {
  const { jobId } = req.body;
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });

  const extracted = db.prepare(`SELECT * FROM extracted_records WHERE job_id = ?`).all(jobId);
  const comparisons = compare(job, extracted);

  for (const c of comparisons) {
    db.prepare(
      `INSERT INTO comparisons (id, job_id, source, field, prev_value, new_value, change_type, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("cmp-" + crypto.randomUUID(), jobId, c.source, c.field, c.prevValue, c.value, c.changeType, c.confidence);
  }

  res.json({ jobId, comparisons });
});

module.exports = router;

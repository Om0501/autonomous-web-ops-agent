const express = require("express");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

router.post("/", (req, res) => {
  const { jobId, verdict, note } = req.body;
  if (!["accepted", "rejected"].includes(verdict)) {
    return res.status(400).json({ error: 'verdict must be "accepted" or "rejected"' });
  }
  const id = "fb-" + crypto.randomUUID();
  db.prepare(`INSERT INTO feedback (id, job_id, verdict, note, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    id, jobId, verdict, note || null, new Date().toISOString()
  );
  res.status(201).json({ id, jobId, verdict, note });
});

module.exports = router;

const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const totalJobs = db.prepare(`SELECT COUNT(*) AS n FROM jobs`).get().n;
  const completed = db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE state = 'completed'`).get().n;
  const failed = db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE state = 'failed'`).get().n;
  const avgConfidence = db.prepare(`SELECT AVG(confidence) AS a FROM extracted_records`).get().a;
  const materialChanges = db.prepare(`SELECT COUNT(*) AS n FROM comparisons WHERE change_type = 'material-change'`).get().n;

  const recent = db
    .prepare(
      `SELECT j.id, j.state, j.updated_at, t.workflow, t.destination,
              s.headline, s.owner
       FROM jobs j
       JOIN tasks t ON t.id = j.task_id
       LEFT JOIN summaries s ON s.job_id = j.id
       ORDER BY j.updated_at DESC LIMIT 20`
    )
    .all();

  res.json({
    totalJobs,
    completed,
    failed,
    completionRate: totalJobs ? Math.round((completed / totalJobs) * 100) : null,
    avgConfidence: avgConfidence ? Math.round(avgConfidence * 100) / 100 : null,
    materialChanges,
    recent,
  });
});

module.exports = router;

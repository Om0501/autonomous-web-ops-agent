const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { buildPlan } = require("../../agents/planner");

const router = express.Router();

// Generates a plan for a task and creates the job record that will track
// this run through its lifecycle (planned -> running -> extracting ->
// comparing -> completed).
router.post("/", (req, res) => {
  const { taskId } = req.body;
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
  if (!task) return res.status(404).json({ error: "task not found" });

  const plan = buildPlan(task);
  const jobId = "job-" + crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO jobs (id, task_id, state, plan_json, created_at, updated_at) VALUES (?, ?, 'planned', ?, ?, ?)`
  ).run(jobId, task.id, JSON.stringify(plan), now, now);

  res.status(201).json({ jobId, state: "planned", plan });
});

module.exports = router;

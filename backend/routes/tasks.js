const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { SCHEMAS } = require("../../extraction/schemas");

const router = express.Router();

router.post("/", (req, res) => {
  const { workflow, destination, frequency, routing } = req.body;
  if (!SCHEMAS[workflow]) {
    return res.status(400).json({ error: `Unknown workflow "${workflow}". Valid: ${Object.keys(SCHEMAS).join(", ")}` });
  }
  if (!destination) return res.status(400).json({ error: "destination is required" });

  const id = "task-" + crypto.randomUUID();
  db.prepare(
    `INSERT INTO tasks (id, workflow, destination, frequency, routing, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, workflow, destination, frequency || "Daily", routing || "Dashboard + summary", new Date().toISOString());

  res.status(201).json(db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id));
});

router.get("/", (req, res) => {
  res.json(db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`).all());
});

module.exports = router;

const db = require("../backend/db");

// Compares this job's extracted records against the most recent prior job
// for the same task, and classifies each field. This is where "every page
// difference is not an operational signal" gets enforced: a field only
// counts as material-change if the normalized value actually differs and
// confidence is high enough to trust it.
function compare(job, extractedRecords) {
  const priorJob = db
    .prepare(
      `SELECT id FROM jobs WHERE task_id = ? AND id != ? AND state = 'completed' ORDER BY created_at DESC LIMIT 1`
    )
    .get(job.task_id, job.id);

  const priorRecords = priorJob
    ? db.prepare(`SELECT * FROM extracted_records WHERE job_id = ?`).all(priorJob.id)
    : [];

  const priorByKey = {};
  for (const r of priorRecords) priorByKey[`${r.source}:${r.field}`] = r.value;

  return extractedRecords.map((r) => {
    const prevValue = priorByKey[`${r.source}:${r.field}`] ?? null;
    let changeType = "stable";
    if (r.confidence < 0.7) changeType = "low-confidence";
    else if (prevValue !== null && prevValue !== r.value) changeType = "material-change";
    else if (prevValue === null) changeType = "first-observation";

    return { ...r, prevValue, changeType };
  });
}

module.exports = { compare };

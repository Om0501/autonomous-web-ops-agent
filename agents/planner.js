const { SCHEMAS } = require("../extraction/schemas");

// Converts a task into a structured plan: which sources to visit, what tool
// to use, which fields to extract, and the fallback behavior if a selector
// is missing or the page is unreachable. This is what the Plan Review panel
// shows a reviewer before execution (spec 5.4 "Agent Planning").
function buildPlan(task) {
  const schema = SCHEMAS[task.workflow];
  if (!schema) throw new Error(`Unknown workflow: ${task.workflow}`);

  const steps = Object.entries(schema.sources).map(([sourceKey, src], i) => ({
    step: i + 1,
    source: sourceKey,
    domain: src.base,
    tool: "browser_execution.fetch_and_extract",
    fields: Object.keys(src.selectors),
    action: `Navigate to the ${task.destination} page on ${src.base}, wait for content, capture HTML for schema-defined fields.`,
    fallback: "If a selector is missing, record the field with confidence 0.3-0.4 and a note instead of guessing a value. Retry once on network failure before marking the source blocked.",
  }));

  return {
    workflow: task.workflow,
    label: schema.label,
    owner: schema.owner,
    destination: task.destination,
    steps,
    stop_conditions: [
      "All approved sources visited or marked blocked",
      "Every schema field has a value or an explicit low-confidence note",
    ],
  };
}

module.exports = { buildPlan };

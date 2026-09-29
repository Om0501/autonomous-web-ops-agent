// Turns comparison output into the action-oriented summary the Growth Lead
// asked for: what changed, evidence, and who should act on it. Never treats
// "we didn't find anything" as a silent success — it says so explicitly.
function summarize(planLabel, owner, destination, comparisons) {
  const material = comparisons.filter((c) => c.changeType === "material-change");
  const uncertain = comparisons.filter((c) => c.changeType === "low-confidence");
  const first = comparisons.filter((c) => c.changeType === "first-observation");

  let headline;
  if (material.length) {
    headline = `${material.length} field(s) changed for ${destination} across monitored sources`;
  } else if (first.length && !uncertain.length) {
    headline = `Baseline captured for ${destination} — no prior snapshot to compare against yet`;
  } else {
    headline = `No material change detected for ${destination}`;
  }

  return {
    workflow: planLabel,
    destination,
    owner,
    headline,
    material,
    uncertain,
    requiresHumanReview: uncertain.length > 0,
  };
}

module.exports = { summarize };

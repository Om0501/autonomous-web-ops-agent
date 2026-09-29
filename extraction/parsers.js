const cheerio = require("cheerio");

// Parses raw HTML against a workflow/source's selector schema and returns
// normalized {field, value, snippet, confidence} records. Confidence is
// lowered whenever a selector is missing (the "flag uncertainty instead of
// producing unreliable data" requirement from the CTO's brief).
function extractFields(html, selectors) {
  const $ = cheerio.load(html);
  const records = [];

  for (const [field, selector] of Object.entries(selectors)) {
    const el = $(selector).first();
    if (el.length === 0) {
      records.push({
        field,
        value: null,
        snippet: null,
        confidence: 0.3,
        note: `selector "${selector}" not found — page structure may have changed`,
      });
      continue;
    }
    const raw = el.text().trim();
    records.push({
      field,
      value: normalize(field, raw),
      snippet: raw.slice(0, 160),
      confidence: raw ? 0.92 : 0.4,
      note: raw ? null : "selector matched but element was empty",
    });
  }
  return records;
}

function normalize(field, raw) {
  if (field === "nightly_rate") {
    const n = parseFloat(raw.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? `₹${n}` : raw;
  }
  return raw;
}

module.exports = { extractFields };

// Real-browser variant of worker.js. Not exercised in this sandbox (no
// browser binary available here), but this is the code to point at real
// target domains once deployed on infrastructure with normal internet
// access (Render/Railway/Docker with a Playwright-enabled image, e.g.
// mcr.microsoft.com/playwright).
//
// To switch: in backend/routes/runs.js, replace
//   const { fetchAndExtract } = require("../../agents/browser_execution/worker");
// with
//   const { fetchAndExtract } = require("../../agents/browser_execution/worker.playwright");
// and set real domains in extraction/schemas.js instead of fixture paths.

const { chromium } = require("playwright");
const { extractFields } = require("../../extraction/parsers");

async function fetchAndExtract({ url, sourceConfig }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: "WebOpsAgent/1.0 (+internal-monitoring)" });
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    if (!response || !response.ok()) {
      return { url, blocked: true, records: [], note: `Navigation failed: ${response ? response.status() : "no response"}` };
    }
    await page.waitForTimeout(500); // let dynamic content settle
    const html = await page.content();
    const records = extractFields(html, sourceConfig.selectors);
    return { url, blocked: false, records, html };
  } catch (err) {
    return { url, blocked: true, records: [], note: `Browser error: ${err.message}` };
  } finally {
    await browser.close();
  }
}

module.exports = { fetchAndExtract };

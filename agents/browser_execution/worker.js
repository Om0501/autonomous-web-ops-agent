const { extractFields } = require("../../extraction/parsers");

// PRODUCTION NOTE (read this before deploying):
// This module performs the "browser execution" step, but does so with a
// plain HTTP fetch against a fixture page instead of a real headless browser.
// That substitution is deliberate for this environment only: no browser
// binaries (Chromium/Playwright) can be downloaded here (no snapd, and
// Playwright's CDN is outside the sandbox's network allowlist). The
// navigate -> capture -> extract -> store contract below is the same
// contract a real browser worker must satisfy, so swapping the fetch()
// call for Playwright is a drop-in change — see worker.playwright.js in
// this same folder for the real-browser version, ready to enable once
// this runs somewhere with normal outbound internet access.

async function fetchAndExtract({ baseUrl, source, sourceConfig, page }) {
  const url = `${baseUrl}/fixtures/${source}/${page}`;
  const res = await fetch(url);
  if (!res.ok) {
    return {
      url,
      blocked: true,
      records: [],
      note: `HTTP ${res.status} — source unreachable`,
    };
  }
  const html = await res.text();
  const records = extractFields(html, sourceConfig.selectors);
  return { url, blocked: false, records, html };
}

module.exports = { fetchAndExtract };

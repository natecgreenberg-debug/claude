"use strict";

/**
 * generate-content-batch.js
 *
 * Batch content generation script for the affiliate machine.
 *
 * Modes:
 *   Dry-run (default): reads keywords.json, prints what would be generated.
 *                      No API calls.
 *   --live:            Generates one test article for the first not_started
 *                      keyword, saves to content/{slug}.md, prints token usage
 *                      and cost.
 *
 * Usage:
 *   node scripts/generate-content-batch.js           # dry-run
 *   node scripts/generate-content-batch.js --live    # live (1 article)
 */

const fs = require("fs");
const path = require("path");

const { generateArticle, generateComparison } = require("../lib/content-generator");

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, "..");
const KEYWORDS_PATH = path.join(PROJECT_ROOT, "keywords.json");
const TEMPLATES_DIR = path.join(PROJECT_ROOT, "templates");
const CONTENT_DIR = path.join(PROJECT_ROOT, "content");

// ---------------------------------------------------------------------------
// Content-type → template file mapping
// "versus" is an alias for "comparison"
// ---------------------------------------------------------------------------

const TEMPLATE_MAP = {
  comparison: "comparison.json",
  versus: "comparison.json",
  review: "review.json",
  "best-list": "best-list.json",
  tutorial: "tutorial.json",
  "social-post": "social-post.json",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Slugify a string for use as a filename.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Load and parse a JSON file. Throws with a clear message on failure.
 * @param {string} filePath
 * @returns {unknown}
 */
function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${err.message}`);
  }
}

/**
 * Resolve the template filename for a given content_type.
 * @param {string} contentType
 * @returns {string} filename (e.g. "comparison.json")
 */
function resolveTemplateFile(contentType) {
  const file = TEMPLATE_MAP[contentType];
  if (!file) {
    throw new Error(
      `Unknown content_type "${contentType}". Valid types: ${Object.keys(TEMPLATE_MAP).join(", ")}`
    );
  }
  return file;
}

/**
 * Load a template JSON by filename.
 * @param {string} filename
 * @returns {object}
 */
function loadTemplate(filename) {
  const templatePath = path.join(TEMPLATES_DIR, filename);
  return /** @type {object} */ (loadJson(templatePath));
}

/**
 * Determine which generator function to use based on content_type.
 * @param {string} contentType - keyword's content_type field
 * @returns {"comparison" | "article"}
 */
function resolveGeneratorType(contentType) {
  if (contentType === "comparison" || contentType === "versus") {
    return "comparison";
  }
  return "article";
}

/**
 * Derive product1 / product2 from a keyword's programs array.
 * For versus/comparison content_type we need two products.
 * Falls back gracefully if fewer than two programs listed.
 * @param {string[]} programs
 * @returns {{ product1: string, product2: string }}
 */
function extractProducts(programs) {
  const product1 = programs[0] || "Product A";
  const product2 = programs[1] || "Product B";
  return { product1, product2 };
}

// ---------------------------------------------------------------------------
// Dry-run: print plan table
// ---------------------------------------------------------------------------

/**
 * Run in dry-run mode: load keywords, filter not_started, print plan.
 * @param {object[]} keywords
 */
function runDryRun(keywords) {
  const pending = keywords.filter((k) => k.status === "not_started");

  console.log("\n=== Batch Content Generation — DRY RUN ===\n");
  console.log(`Total keywords:   ${keywords.length}`);
  console.log(`Pending (not_started): ${pending.length}`);
  console.log(`Already done:     ${keywords.length - pending.length}`);
  console.log("");

  if (pending.length === 0) {
    console.log("Nothing to generate — all keywords have been started.");
    return;
  }

  // Column widths
  const COL_NUM    = 4;
  const COL_KW     = 46;
  const COL_TYPE   = 14;
  const COL_TMPL   = 18;
  const COL_GEN    = 12;
  const COL_PLAT   = 28;

  const pad = (s, n) => String(s).padEnd(n).slice(0, n);

  const header =
    pad("#", COL_NUM) +
    pad("Keyword", COL_KW) +
    pad("Content Type", COL_TYPE) +
    pad("Template File", COL_TMPL) +
    pad("Generator", COL_GEN) +
    pad("Platforms", COL_PLAT);

  const divider = "-".repeat(header.length);

  console.log(header);
  console.log(divider);

  pending.forEach((kw, idx) => {
    let templateFile = "(unknown)";
    let generatorType = "(unknown)";
    let error = null;

    try {
      templateFile = resolveTemplateFile(kw.content_type);
      generatorType = resolveGeneratorType(kw.content_type);
    } catch (err) {
      error = err.message;
    }

    const platforms = Array.isArray(kw.platform) ? kw.platform.join(", ") : String(kw.platform);

    const row =
      pad(idx + 1, COL_NUM) +
      pad(kw.keyword, COL_KW) +
      pad(kw.content_type, COL_TYPE) +
      pad(error ? `ERROR: ${error}` : templateFile, COL_TMPL) +
      pad(error ? "" : generatorType, COL_GEN) +
      pad(platforms, COL_PLAT);

    console.log(row);
  });

  console.log(divider);
  console.log(`\n${pending.length} pieces of content would be generated.`);
  console.log("\nRun with --live to generate the first article.\n");
}

// ---------------------------------------------------------------------------
// Live mode: generate one article
// ---------------------------------------------------------------------------

/**
 * Run in live mode: pick the first not_started keyword, generate, save.
 * @param {object[]} keywords
 */
async function runLive(keywords) {
  const pending = keywords.filter((k) => k.status === "not_started");

  if (pending.length === 0) {
    console.log("Nothing to generate — all keywords have been started.");
    return;
  }

  // Ensure content directory exists
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const kw = pending[0];
  const templateFile = resolveTemplateFile(kw.content_type);
  const template = loadTemplate(templateFile);
  const generatorType = resolveGeneratorType(kw.content_type);
  const slug = slugify(kw.keyword);
  const outputPath = path.join(CONTENT_DIR, `${slug}.md`);

  console.log("\n=== Batch Content Generation — LIVE (1 article) ===\n");
  console.log(`Keyword:       ${kw.keyword}`);
  console.log(`Content type:  ${kw.content_type}`);
  console.log(`Template:      ${templateFile}`);
  console.log(`Generator:     ${generatorType}`);
  console.log(`Programs:      ${kw.programs.join(", ")}`);
  console.log(`Platforms:     ${(kw.platform || []).join(", ")}`);
  console.log(`Output file:   ${outputPath}`);
  console.log("");
  console.log("Calling API...");

  const startTime = Date.now();
  let result;

  if (generatorType === "comparison") {
    const { product1, product2 } = extractProducts(kw.programs);
    console.log(`  Comparing: ${product1} vs ${product2}`);
    result = await generateComparison(product1, product2, template);
  } else {
    console.log(`  Topic: ${kw.keyword}`);
    result = await generateArticle(kw.keyword, template);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Build frontmatter + content
  const frontmatter = [
    "---",
    `keyword: "${kw.keyword}"`,
    `content_type: ${kw.content_type}`,
    `programs: [${kw.programs.map((p) => `"${p}"`).join(", ")}]`,
    `platforms: [${(kw.platform || []).map((p) => `"${p}"`).join(", ")}]`,
    `difficulty: ${kw.difficulty}`,
    `intent: ${kw.intent}`,
    `generated_at: ${new Date().toISOString()}`,
    `model: anthropic/claude-sonnet-4`,
    `prompt_tokens: ${result.usage.promptTokens}`,
    `completion_tokens: ${result.usage.completionTokens}`,
    `estimated_cost_usd: ${result.usage.estimatedCost.toFixed(6)}`,
    "---",
    "",
  ].join("\n");

  fs.writeFileSync(outputPath, frontmatter + result.content, "utf-8");

  console.log("\n--- Done ---");
  console.log(`Saved to:          ${outputPath}`);
  console.log(`Elapsed:           ${elapsed}s`);
  console.log(`Prompt tokens:     ${result.usage.promptTokens.toLocaleString()}`);
  console.log(`Completion tokens: ${result.usage.completionTokens.toLocaleString()}`);
  console.log(
    `Estimated cost:    $${result.usage.estimatedCost.toFixed(4)} USD`
  );
  console.log(
    `Content length:    ${result.content.length.toLocaleString()} chars`
  );
  console.log("");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

(async () => {
  const args = process.argv.slice(2);
  const isLive = args.includes("--live");

  let keywords;
  try {
    keywords = /** @type {object[]} */ (loadJson(KEYWORDS_PATH));
  } catch (err) {
    console.error(`Error loading keywords.json: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(keywords)) {
    console.error("keywords.json must be an array.");
    process.exit(1);
  }

  try {
    if (isLive) {
      await runLive(keywords);
    } else {
      runDryRun(keywords);
    }
  } catch (err) {
    console.error(`\nFatal error: ${err.message}`);
    if (err.cause) console.error(`Cause: ${err.cause}`);
    process.exit(1);
  }
})();

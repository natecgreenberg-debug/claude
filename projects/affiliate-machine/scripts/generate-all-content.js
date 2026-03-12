"use strict";

/**
 * generate-all-content.js
 *
 * Reads keywords.json + programs.json, generates all 28 articles using the
 * appropriate template and generator function, embeds real affiliate links,
 * appends disclosure, and saves to content/{slug}.md with YAML frontmatter.
 */

const fs = require("fs");
const path = require("path");
const {
  generateArticle,
  generateComparison,
} = require("../lib/content-generator");

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const KEYWORDS_PATH = path.join(ROOT, "keywords.json");
const PROGRAMS_PATH = path.join(ROOT, "programs.json");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const CONTENT_DIR = path.join(ROOT, "content");

// ── Constants ────────────────────────────────────────────────────────────────
const DELAY_MS = 2000;
const DISCLOSURE =
  "\n\n---\n\n## Disclosure\n\nThis article contains affiliate links. If you purchase through these links, I may earn a commission at no extra cost to you.";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a keyword string to a filesystem-safe slug */
function toSlug(keyword) {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Load a JSON template by filename (without extension) */
function loadTemplate(name) {
  const filePath = path.join(TEMPLATES_DIR, `${name}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/** Build a lookup map: program name (lowercase) → program object */
function buildProgramMap(programs) {
  const map = new Map();
  for (const p of programs) {
    map.set(p.name.toLowerCase(), p);
  }
  return map;
}

/**
 * Post-process generated content:
 *  1. Replace signup_url references with affiliate_link where available
 *  2. Append disclosure section
 */
function postProcess(content, programNames, programMap) {
  let result = content;

  for (const name of programNames) {
    const prog = programMap.get(name.toLowerCase());
    if (!prog) continue;
    if (!prog.affiliate_link) continue;

    // Replace any occurrence of signup_url with the real affiliate link
    if (prog.signup_url) {
      const escapedUrl = prog.signup_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escapedUrl, "g"), prog.affiliate_link);
    }

    // Also replace bare domain references like "systeme.io/affiliate-program"
    // by replacing the signup_url path with the affiliate link in markdown links
    // e.g. [text](https://systeme.io/affiliate-program) → [text](affiliate_link)
    // Already covered above via signup_url replacement.
  }

  // Append disclosure if not already present
  if (!result.includes("## Disclosure") && !result.includes("affiliate links")) {
    result += DISCLOSURE;
  } else if (!result.includes("## Disclosure")) {
    // Has inline disclosure language but no dedicated section — add section anyway
    result += "\n\n---\n\n## Disclosure\n\nThis article contains affiliate links. If you purchase through these links, I may earn a commission at no extra cost to you.";
  }

  return result;
}

/** Build YAML frontmatter string */
function buildFrontmatter(keyword, contentType, programs, platforms) {
  const title = keyword
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return [
    "---",
    `title: "${title}"`,
    `keyword: "${keyword}"`,
    `content_type: "${contentType}"`,
    `programs: [${programs.map((p) => `"${p}"`).join(", ")}]`,
    `platforms: [${platforms.map((p) => `"${p}"`).join(", ")}]`,
    `generated_at: "${new Date().toISOString()}"`,
    `affiliate_links_embedded: true`,
    "---",
    "",
  ].join("\n");
}

/** Sleep for ms milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine template name and generator strategy for a keyword entry.
 * Returns { templateName, strategy, product1, product2 }
 */
function resolveStrategy(entry) {
  const ct = entry.content_type;
  const programs = entry.programs || [];

  if (ct === "comparison" || ct === "versus") {
    // Extract product1 / product2 from programs array
    const product1 = programs[0] || "Product A";
    const product2 = programs[1] || "Product B";
    return { templateName: "comparison", strategy: "comparison", product1, product2 };
  }

  if (ct === "review") {
    return { templateName: "review", strategy: "article" };
  }

  if (ct === "tutorial") {
    return { templateName: "tutorial", strategy: "article" };
  }

  // Fallback
  return { templateName: "best-list", strategy: "article" };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Ensure content directory exists
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  // Load data
  const keywords = JSON.parse(fs.readFileSync(KEYWORDS_PATH, "utf-8"));
  const programs = JSON.parse(fs.readFileSync(PROGRAMS_PATH, "utf-8"));
  const programMap = buildProgramMap(programs);

  const total = keywords.length;
  let succeeded = 0;
  let failed = 0;
  let totalCost = 0;
  const failures = [];

  console.log(`\n=== Affiliate Content Generator ===`);
  console.log(`Total articles to generate: ${total}`);
  console.log(`Output directory: ${CONTENT_DIR}\n`);

  for (let i = 0; i < keywords.length; i++) {
    const entry = keywords[i];
    const { keyword, content_type, programs: entryPrograms, platform } = entry;
    const slug = toSlug(keyword);
    const outputPath = path.join(CONTENT_DIR, `${slug}.md`);
    const idx = i + 1;

    process.stdout.write(`[${idx}/${total}] Generating: ${keyword} ... `);

    try {
      const { templateName, strategy, product1, product2 } =
        resolveStrategy(entry);

      const template = loadTemplate(templateName);

      let result;
      if (strategy === "comparison") {
        result = await generateComparison(product1, product2, template);
      } else {
        // article — pass the keyword as the topic
        result = await generateArticle(keyword, template);
      }

      const { content, usage } = result;
      totalCost += usage.estimatedCost;

      // Post-process: embed real affiliate links + disclosure
      const processed = postProcess(content, entryPrograms, programMap);

      // Build frontmatter
      const frontmatter = buildFrontmatter(
        keyword,
        content_type,
        entryPrograms,
        platform || []
      );

      // Write file
      fs.writeFileSync(outputPath, frontmatter + processed, "utf-8");

      succeeded++;
      console.log(
        `OK ($${usage.estimatedCost.toFixed(4)}, ${usage.completionTokens} tokens)`
      );
    } catch (err) {
      failed++;
      failures.push({ keyword, error: err.message });
      console.log(`FAILED: ${err.message}`);
    }

    // Rate-limit delay (skip after the last item)
    if (i < keywords.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n=== Generation Complete ===");
  console.log(`Succeeded: ${succeeded}/${total}`);
  console.log(`Failed:    ${failed}/${total}`);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  - ${f.keyword}: ${f.error}`);
    }
  }

  console.log(`\nContent saved to: ${CONTENT_DIR}`);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});

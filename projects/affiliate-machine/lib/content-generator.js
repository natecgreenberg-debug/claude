"use strict";

const { getKey } = require("./config");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4";

// OpenRouter pricing for Claude Sonnet (per token)
const INPUT_COST_PER_TOKEN = 3 / 1_000_000; // $3/MTok
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000; // $15/MTok

const API_TIMEOUT_MS = 120_000;
const RETRY_DELAY_MS = 30_000;

/**
 * Calculate estimated cost from token usage.
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {number} estimated cost in USD
 */
function estimateCost(promptTokens, completionTokens) {
  return (
    promptTokens * INPUT_COST_PER_TOKEN +
    completionTokens * OUTPUT_COST_PER_TOKEN
  );
}

/**
 * Call the OpenRouter API with retry logic.
 * @param {Array<{role: string, content: string}>} messages
 * @param {{maxTokens?: number, temperature?: number}} options
 * @returns {Promise<{content: string, usage: {promptTokens: number, completionTokens: number, estimatedCost: number}}>}
 */
async function callOpenRouter(messages, options = {}) {
  const apiKey = getKey("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY not found. Set it in /root/projects/Agent/.env or the project .env file."
    );
  }

  const { maxTokens = 4096, temperature = 0.7 } = options;

  const body = {
    model: MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://github.com/affiliate-machine",
    "X-Title": "Affiliate Machine Content Generator",
  };

  let lastError;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `OpenRouter API key invalid or unauthorized (HTTP ${response.status}): ${errorBody}`
          );
        }
        throw new Error(
          `OpenRouter API error (HTTP ${response.status}): ${errorBody}`
        );
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error("OpenRouter returned no choices in the response.");
      }

      const content = data.choices[0].message.content;
      const usage = data.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;

      return {
        content,
        usage: {
          promptTokens,
          completionTokens,
          estimatedCost: estimateCost(promptTokens, completionTokens),
        },
      };
    } catch (err) {
      lastError = err;

      // Don't retry on auth errors — they won't resolve with a retry
      if (
        err.message.includes("unauthorized") ||
        err.message.includes("invalid")
      ) {
        throw err;
      }

      if (err.name === "AbortError") {
        lastError = new Error(
          `OpenRouter API call timed out after ${API_TIMEOUT_MS / 1000}s`
        );
      }

      if (attempt === 0) {
        console.warn(`Attempt 1 failed: ${lastError.message}`);
      }
    }
  }

  throw lastError;
}

/**
 * Generate a full article based on a template object.
 * @param {string} topic - The article topic/subject
 * @param {object} template - Template object (from templates/*.json)
 * @param {{maxTokens?: number, temperature?: number}} options
 * @returns {Promise<{content: string, usage: {promptTokens: number, completionTokens: number, estimatedCost: number}}>}
 */
async function generateArticle(topic, template, options = {}) {
  const systemPrompt = template.systemPrompt || "You are a helpful content writer.";

  const sectionInstructions = (template.sections || [])
    .map(
      (s) =>
        `## ${s.name}\n${s.prompt}\n(Target: ~${s.wordCount} words)`
    )
    .join("\n\n");

  const structureIntro = template.structure?.intro || "";
  const structureConclusion = template.structure?.conclusion || "";

  const userPrompt = `Write a comprehensive article about: ${topic}

Structure your article as follows:

**Introduction**: ${structureIntro}

${sectionInstructions}

**Conclusion**: ${structureConclusion}

Write the full article now. Use markdown formatting.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return callOpenRouter(messages, {
    maxTokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
  });
}

/**
 * Generate a platform-specific social media post.
 * @param {string} topic - The post topic
 * @param {string} platform - Target platform (linkedin, reddit, quora, medium, blog)
 * @param {string} affiliateLink - The affiliate link to include
 * @returns {Promise<{content: string, usage: {promptTokens: number, completionTokens: number, estimatedCost: number}}>}
 */
async function generateSocialPost(topic, platform, affiliateLink) {
  const systemPrompt =
    "You are a practitioner and founder who posts on social media about tools, systems, and strategies that have worked in your business. You write short sentences. You use line breaks often. You never start a post with 'I.' You never use phrases like 'game-changer' or 'transform your business.' You ask questions that invite real engagement. When you mention a tool, you say something specific about it. Your goal is to drive traffic and affiliate conversions without sounding like that's your goal.";

  const platformGuidance = {
    linkedin:
      "Format for LinkedIn: short paragraphs (1-3 lines max), no more than 2 hashtags at the end, never start with 'I', put affiliate link in first comment suggestion. First 2 lines are the preview — make them count.",
    reddit:
      "Format for Reddit: write as a genuine community contribution, first-person experience framing, no affiliate links in post body — suggest comment placement instead. Include 3 title options.",
    quora:
      "Format for Quora: answer a specific question comprehensively, lead with the direct answer, use bold for key terms, one affiliate link max placed naturally with disclosure.",
    medium:
      "Format for Medium: use as a Short Take or teaser for a longer article, H2/H3 headers, add 1-2 relevant tags.",
    blog:
      "Format for Blog: can be used as a callout box or intro hook within a larger post, keep concise.",
  };

  const userPrompt = `Write a social media post about: ${topic}

Platform: ${platform}
${platformGuidance[platform] || `Platform: ${platform}. Write in an appropriate style.`}

Affiliate link to include (in comment/reply, not post body): ${affiliateLink}

Include:
1. A strong hook (first 1-2 lines)
2. Body with specific details — not vague claims
3. A closing CTA or question
4. Suggested comment text with the affiliate link and FTC disclosure

Write the complete post now.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return callOpenRouter(messages, { maxTokens: 2048, temperature: 0.8 });
}

/**
 * Generate a comparison article between two products.
 * @param {string} product1 - First product name
 * @param {string} product2 - Second product name
 * @param {object} template - Comparison template object (from templates/comparison.json)
 * @returns {Promise<{content: string, usage: {promptTokens: number, completionTokens: number, estimatedCost: number}}>}
 */
async function generateComparison(product1, product2, template) {
  const systemPrompt =
    template.systemPrompt ||
    "You are a senior software reviewer who writes honest, opinionated comparisons.";

  const sectionInstructions = (template.sections || [])
    .map((s) => {
      const prompt = s.prompt
        .replace(/\{toolA\}/g, product1)
        .replace(/\{toolB\}/g, product2);
      return `## ${s.name}\n${prompt}\n(Target: ~${s.wordCount} words)`;
    })
    .join("\n\n");

  const structureIntro = (template.structure?.intro || "")
    .replace(/\{toolA\}/g, product1)
    .replace(/\{toolB\}/g, product2);
  const structureConclusion = (template.structure?.conclusion || "")
    .replace(/\{toolA\}/g, product1)
    .replace(/\{toolB\}/g, product2);

  const userPrompt = `Write a comprehensive comparison article: ${product1} vs ${product2}

Structure your article as follows:

**Introduction**: ${structureIntro}

${sectionInstructions}

**Conclusion**: ${structureConclusion}

Write the full comparison article now. Use markdown formatting. Be decisive — pick a winner.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return callOpenRouter(messages, { maxTokens: 6144, temperature: 0.7 });
}

module.exports = {
  generateArticle,
  generateSocialPost,
  generateComparison,
  callOpenRouter,
};

// Self-test when run directly: node lib/content-generator.js
if (require.main === module) {
  (async () => {
    console.log("=== Content Generator Self-Test ===\n");
    console.log(`Model: ${MODEL}`);
    console.log(`API endpoint: ${OPENROUTER_URL}\n`);

    try {
      // Load comparison template
      const fs = require("fs");
      const path = require("path");
      const templatePath = path.resolve(
        __dirname,
        "..",
        "templates",
        "comparison.json"
      );
      const template = JSON.parse(fs.readFileSync(templatePath, "utf-8"));

      console.log("Generating ~500-word comparison: Systeme.io vs ClickFunnels...\n");

      const result = await generateComparison(
        "Systeme.io",
        "ClickFunnels",
        template
      );

      // Print first 200 chars
      console.log("--- Content Preview (first 200 chars) ---");
      console.log(result.content.slice(0, 200));
      console.log("...\n");

      // Print usage
      console.log("--- Token Usage ---");
      console.log(`Prompt tokens:     ${result.usage.promptTokens}`);
      console.log(`Completion tokens: ${result.usage.completionTokens}`);
      console.log(
        `Estimated cost:    $${result.usage.estimatedCost.toFixed(4)}`
      );

      console.log("\nSelf-test PASSED.");
    } catch (err) {
      console.error("\nSelf-test FAILED:");
      console.error(`Error: ${err.message}`);
      if (err.cause) console.error(`Cause: ${err.cause}`);
      process.exit(1);
    }
  })();
}

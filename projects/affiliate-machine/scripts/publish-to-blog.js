#!/usr/bin/env node
/**
 * publish-to-blog.js
 *
 * Publishes affiliate content articles to the Jekyll blog repo.
 * Reads articles from content/*.md, converts to Jekyll post format,
 * copies to the blog repo, then commits and pushes.
 *
 * Usage:
 *   node scripts/publish-to-blog.js --all
 *   node scripts/publish-to-blog.js --file content/specific-article.md
 *   node scripts/publish-to-blog.js --dry-run --all
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Config ---
const BLOG_REPO_PATH = '/root/projects/blog';
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const POSTS_DIR = path.join(BLOG_REPO_PATH, '_posts');

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const publishAll = args.includes('--all');
const fileIndex = args.indexOf('--file');
const specificFile = fileIndex !== -1 ? args[fileIndex + 1] : null;

if (!publishAll && !specificFile) {
  console.error('Usage: node scripts/publish-to-blog.js [--all | --file content/article.md] [--dry-run]');
  process.exit(1);
}

/**
 * Parse Jekyll frontmatter from a markdown file.
 * Returns { frontmatter, body } where frontmatter is an object.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const lines = match[1].split('\n');
  const frontmatter = {};
  let currentKey = null;

  for (const line of lines) {
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const value = keyMatch[2].trim();
      // Parse arrays
      if (value === '') {
        frontmatter[currentKey] = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[currentKey] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      } else {
        frontmatter[currentKey] = value.replace(/^["']|["']$/g, '');
      }
    } else if (line.trim().startsWith('-') && currentKey) {
      // Array item
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      frontmatter[currentKey].push(line.trim().slice(1).trim().replace(/^["']|["']$/g, ''));
    }
  }

  return { frontmatter, body: match[2] };
}

/**
 * Serialize frontmatter object back to YAML string.
 */
function serializeFrontmatter(fm) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      // Quote strings with special characters
      const needsQuotes = typeof value === 'string' && /[:#\[\]{},]/.test(value);
      const formattedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
      lines.push(`${key}: ${formattedValue}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Convert a content article to Jekyll post format.
 *
 * Adds:
 * - Date prefix to filename (YYYY-MM-DD-)
 * - Required Jekyll frontmatter fields (layout, date)
 * - Affiliate disclosure note if not present
 */
function convertToJekyllPost(sourceFile) {
  const content = fs.readFileSync(sourceFile, 'utf8');
  const filename = path.basename(sourceFile);
  const { frontmatter, body } = parseFrontmatter(content);

  // Determine the post date
  let postDate;
  if (frontmatter.date) {
    // Use existing date from frontmatter
    postDate = new Date(frontmatter.date);
  } else {
    // Use today
    postDate = new Date();
  }

  const dateStr = postDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // Build the output filename
  let outputFilename;
  if (/^\d{4}-\d{2}-\d{2}-/.test(filename)) {
    // Already has date prefix
    outputFilename = filename;
  } else {
    // Add date prefix, remove .md if present and re-add
    const baseName = filename.replace(/\.md$/, '');
    outputFilename = `${dateStr}-${baseName}.md`;
  }

  // Ensure required Jekyll frontmatter
  const jekyllFrontmatter = {
    layout: frontmatter.layout || 'post',
    title: frontmatter.title || filename.replace(/\.md$/, '').replace(/-/g, ' '),
    date: frontmatter.date || `${dateStr} 09:00:00 -0500`,
    categories: frontmatter.categories || [],
    tags: frontmatter.tags || [],
    ...frontmatter,
  };

  // Ensure description is set for SEO
  if (!jekyllFrontmatter.description && body.length > 100) {
    // Extract first sentence as description
    const firstSentence = body.replace(/^#+.*\n/gm, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').trim().split(/[.!?]/)[0];
    if (firstSentence.length > 20) {
      jekyllFrontmatter.description = firstSentence.trim().slice(0, 160);
    }
  }

  // Add affiliate disclosure note to body if not already present
  let outputBody = body;
  const hasDisclosure = body.toLowerCase().includes('disclosure') || body.toLowerCase().includes('affiliate');
  if (!hasDisclosure) {
    outputBody = `*Disclosure: Some links in this post are affiliate links. We earn a commission at no extra cost to you. [Full disclosure here](/disclosure/).*\n\n${body}`;
  }

  const outputContent = `${serializeFrontmatter(jekyllFrontmatter)}\n${outputBody}`;

  return {
    outputFilename,
    outputContent,
    dateStr,
  };
}

/**
 * Copy a converted article to the blog repo _posts directory.
 */
function publishFile(sourceFile) {
  console.log(`\nPublishing: ${sourceFile}`);

  if (!fs.existsSync(sourceFile)) {
    console.error(`  ERROR: File not found: ${sourceFile}`);
    return false;
  }

  let result;
  try {
    result = convertToJekyllPost(sourceFile);
  } catch (err) {
    console.error(`  ERROR converting file: ${err.message}`);
    return false;
  }

  const destPath = path.join(POSTS_DIR, result.outputFilename);
  console.log(`  -> ${destPath}`);

  if (isDryRun) {
    console.log('  [DRY RUN] Would write file.');
    console.log('  Frontmatter preview:');
    const preview = result.outputContent.slice(0, 300);
    console.log(preview + (result.outputContent.length > 300 ? '...' : ''));
    return true;
  }

  // Ensure posts directory exists
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  fs.writeFileSync(destPath, result.outputContent, 'utf8');
  console.log(`  Written: ${result.outputFilename}`);
  return true;
}

/**
 * Commit and push changes to the blog repo.
 */
function gitCommitAndPush(publishedFiles) {
  if (isDryRun) {
    console.log('\n[DRY RUN] Would git commit and push.');
    return;
  }

  console.log('\nCommitting to blog repo...');

  try {
    // Stage all post files
    execSync('git add _posts/', { cwd: BLOG_REPO_PATH, stdio: 'pipe' });

    // Check if there are staged changes
    const status = execSync('git status --porcelain', {
      cwd: BLOG_REPO_PATH,
      encoding: 'utf8',
    });

    if (!status.trim()) {
      console.log('No changes to commit.');
      return;
    }

    const fileList = publishedFiles.map(f => path.basename(f)).join(', ');
    const commitMsg = publishedFiles.length === 1
      ? `feat: publish ${path.basename(publishedFiles[0])}`
      : `feat: publish ${publishedFiles.length} new articles`;

    execSync(`git commit -m "${commitMsg}"`, {
      cwd: BLOG_REPO_PATH,
      stdio: 'inherit',
    });

    console.log('Pushing to GitHub...');
    execSync('git push', {
      cwd: BLOG_REPO_PATH,
      stdio: 'inherit',
    });

    console.log('Done! Changes pushed to GitHub.');
  } catch (err) {
    console.error('Git error:', err.message);
    console.error('You may need to commit and push manually from:', BLOG_REPO_PATH);
  }
}

// --- Main ---
function main() {
  console.log('=== publish-to-blog.js ===');
  if (isDryRun) console.log('[DRY RUN MODE - no files will be written]\n');

  // Validate blog repo exists
  if (!fs.existsSync(BLOG_REPO_PATH)) {
    console.error(`ERROR: Blog repo not found at ${BLOG_REPO_PATH}`);
    console.error('Please set BLOG_REPO_PATH in this script to the correct path.');
    process.exit(1);
  }

  // Validate content dir exists
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`ERROR: Content directory not found at ${CONTENT_DIR}`);
    process.exit(1);
  }

  let filesToPublish = [];

  if (publishAll) {
    // Get all .md files in content/
    filesToPublish = fs.readdirSync(CONTENT_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(CONTENT_DIR, f));

    if (filesToPublish.length === 0) {
      console.log('No .md files found in', CONTENT_DIR);
      process.exit(0);
    }
    console.log(`Found ${filesToPublish.length} files to publish.`);
  } else if (specificFile) {
    filesToPublish = [path.resolve(specificFile)];
  }

  const published = [];
  for (const file of filesToPublish) {
    const success = publishFile(file);
    if (success) published.push(file);
  }

  if (published.length > 0) {
    gitCommitAndPush(published);
    console.log(`\nPublished ${published.length} file(s) successfully.`);
  } else {
    console.log('\nNo files were published.');
  }
}

main();

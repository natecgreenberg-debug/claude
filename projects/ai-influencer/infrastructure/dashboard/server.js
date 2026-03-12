/**
 * Approval Dashboard — AI Influencer Video Queue
 *
 * Shows pending videos one at a time with:
 * - Video player
 * - Script text display
 * - Approve / Reject buttons
 * - Queue status (pending / approved / rejected counts)
 *
 * Usage:
 *   cd projects/ai-influencer/infrastructure/dashboard
 *   npm install
 *   node server.js
 *
 *   Open: http://localhost:3030
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3030;

// Absolute paths to video queue directories
const QUEUE_BASE = path.resolve(__dirname, "../../content/videos/queue");
const PENDING_DIR = path.join(QUEUE_BASE, "pending");
const APPROVED_DIR = path.join(QUEUE_BASE, "approved");
const REJECTED_DIR = path.join(QUEUE_BASE, "rejected");

// Ensure directories exist
[PENDING_DIR, APPROVED_DIR, REJECTED_DIR].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

app.use(express.json());

// Serve video files directly
app.use("/videos/pending", express.static(PENDING_DIR));
app.use("/videos/approved", express.static(APPROVED_DIR));
app.use("/videos/rejected", express.static(REJECTED_DIR));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// --- API Routes ---

/** GET /api/queue — returns queue status + next pending video */
app.get("/api/queue", (req, res) => {
  const pending = getVideoFiles(PENDING_DIR);
  const approved = getVideoFiles(APPROVED_DIR);
  const rejected = getVideoFiles(REJECTED_DIR);

  const nextVideo = pending[0] || null;
  let scriptText = null;

  if (nextVideo) {
    const scriptFile = path.join(PENDING_DIR, nextVideo.replace(".mp4", ".txt"));
    if (fs.existsSync(scriptFile)) {
      scriptText = fs.readFileSync(scriptFile, "utf8");
    }
  }

  res.json({
    counts: {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
    },
    next: nextVideo
      ? {
          filename: nextVideo,
          url: `/videos/pending/${nextVideo}`,
          script: scriptText,
        }
      : null,
  });
});

/** POST /api/approve — move video from pending to approved */
app.post("/api/approve", (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "filename required" });

  try {
    moveFile(PENDING_DIR, APPROVED_DIR, filename);
    // Move companion script file if exists
    const scriptFile = filename.replace(".mp4", ".txt");
    if (fs.existsSync(path.join(PENDING_DIR, scriptFile))) {
      moveFile(PENDING_DIR, APPROVED_DIR, scriptFile);
    }
    res.json({ ok: true, action: "approved", filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/reject — move video from pending to rejected with optional note */
app.post("/api/reject", (req, res) => {
  const { filename, note } = req.body;
  if (!filename) return res.status(400).json({ error: "filename required" });

  try {
    moveFile(PENDING_DIR, REJECTED_DIR, filename);
    const scriptFile = filename.replace(".mp4", ".txt");
    if (fs.existsSync(path.join(PENDING_DIR, scriptFile))) {
      moveFile(PENDING_DIR, REJECTED_DIR, scriptFile);
    }
    // Save rejection note if provided
    if (note) {
      const notePath = path.join(REJECTED_DIR, filename.replace(".mp4", "_note.txt"));
      fs.writeFileSync(notePath, note);
    }
    res.json({ ok: true, action: "rejected", filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/approved — list of approved videos ready to post */
app.get("/api/approved", (req, res) => {
  const files = getVideoFiles(APPROVED_DIR);
  res.json({ videos: files });
});

// --- Helpers ---

function getVideoFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mp4"))
    .sort();
}

function moveFile(fromDir, toDir, filename) {
  const src = path.join(fromDir, filename);
  const dst = path.join(toDir, filename);
  if (!fs.existsSync(src)) throw new Error(`File not found: ${filename}`);
  fs.renameSync(src, dst);
}

app.listen(PORT, () => {
  console.log(`\nApproval Dashboard running at http://localhost:${PORT}`);
  console.log(`Queue: ${QUEUE_BASE}`);
  console.log(`  Pending:  ${PENDING_DIR}`);
  console.log(`  Approved: ${APPROVED_DIR}`);
  console.log(`  Rejected: ${REJECTED_DIR}\n`);
});

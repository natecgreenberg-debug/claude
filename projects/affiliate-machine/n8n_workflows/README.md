# n8n Workflows for Affiliate Machine

## Planned Workflows

### 1. Content Scheduler
- **Trigger**: Cron (daily at 9am EST)
- **Logic**: Read content calendar -> check what's due -> send reminder via webhook/email
- **Nodes**: Schedule Trigger -> Google Sheets -> IF (due today) -> Send notification

### 2. Social Media Cross-Poster
- **Trigger**: New blog post published (webhook or RSS)
- **Logic**: Take blog post -> generate platform-specific versions -> schedule posts
- **Platforms**: LinkedIn (API), Twitter/X (API)
- **Note**: Reddit and Quora must stay manual (auto-posting = ban risk)

### 3. Performance Tracker
- **Trigger**: Weekly cron
- **Logic**: Pull affiliate dashboard data -> log to Google Sheets -> send weekly summary
- **Nodes**: HTTP Request (affiliate APIs) -> Google Sheets -> Email/webhook summary

### 4. Content Repurposer
- **Trigger**: Manual (after publishing a blog post)
- **Logic**: Take blog URL -> Claude API generates: YouTube script, Quora answer drafts, tweet thread, LinkedIn post
- **Output**: Google Doc or Sheet with all variants ready for manual review and posting

## How to Import
1. Open n8n at http://localhost:5678
2. Go to Workflows -> Import from File
3. Select the .json file for the workflow you want

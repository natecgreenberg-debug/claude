# n8n Workflows for Recurring SaaS Affiliate Pipeline

Self-hosted on VPS. All workflows are $0/mo.

## Workflow 1: Content Scheduling Pipeline
- **Trigger**: Schedule Node (daily at 9am EST)
- **Logic**: Read editorial calendar from Google Sheets → check what's due → generate platform-specific content variations via Claude API → route to platform APIs → log with timestamps
- **Nodes**: Schedule Trigger → Google Sheets → Claude API → Split (LinkedIn/Medium/etc.) → Platform APIs → Google Sheets (log)
- **Priority**: HIGH — deploy in Month 2

## Workflow 2: Link Rotation & Management
- **Trigger**: New row in Google Sheets (new affiliate product added)
- **Logic**: Generate Shlink shortened tracking URL → create social caption via Claude API → store tracking URL + metadata → alert via Telegram/email
- **Nodes**: Google Sheets trigger → HTTP (Shlink API) → Claude API → Google Sheets → Notification
- **Priority**: HIGH — deploy in Month 1

## Workflow 3: Analytics Collection & Weekly Reporting
- **Trigger**: Schedule Node (weekly, Sunday 8pm EST)
- **Logic**: Pull traffic from Google Analytics API → YouTube stats → Reddit post performance → aggregate in Google Sheets → generate summary via Claude API → email report
- **Nodes**: Schedule → GA4 API → YouTube API → Reddit API → Google Sheets → Claude API → Email
- **Priority**: MEDIUM — deploy in Month 3

## Workflow 4: Affiliate Program Monitoring
- **Trigger**: Schedule Node (daily at 7am EST)
- **Logic**: Check affiliate dashboard APIs → compare earnings vs previous day → log to Google Sheets → alert if significant changes
- **Nodes**: Schedule → HTTP Request (dashboards) → IF (compare) → Google Sheets → Notification
- **Priority**: LOW — deploy after first commissions

## Workflow 5: Content Repurposing Pipeline
- **Trigger**: Webhook (new blog post published)
- **Logic**: Extract key points via Claude API → generate LinkedIn post, tweet thread, YouTube script outline, Reddit summary, Quora answer draft → store all variants in Google Sheets → queue for distribution
- **Nodes**: Webhook → Claude API (5x for each format) → Google Sheets → Queue
- **Priority**: MEDIUM — deploy in Month 3
- **Note**: Reddit and Quora must stay manual (auto-posting = ban risk)

## Tracking Stack

| Tool | Purpose | Cost |
|------|---------|------|
| Shlink | Self-hosted URL shortener + click tracking | $0 |
| Google Analytics 4 | Traffic + behavior analytics | $0 |
| Google Sheets | Central metrics hub + editorial calendar | $0 |
| UTM Parameters | Link attribution across all platforms | $0 |

## UTM Parameter Convention

```
utm_source = platform (reddit, medium, linkedin, youtube, tiktok, quora)
utm_medium = content-type (article, video, comment, post, carousel, answer)
utm_campaign = tool-name (systeme-io, getresponse, aweber, etc.)
utm_content = specific-piece (review-2026, vs-clickfunnels, tutorial-funnels)
```

## How to Deploy
1. n8n is already available on the VPS
2. Open n8n at http://localhost:5678
3. Create workflows following the designs above
4. Connect Google Sheets, Claude API, and Shlink
5. Set schedule triggers and test each workflow
6. Monitor execution logs for errors

## Research Reference
See: `~/projects/Agent/research/deep-research/2026-03-10_automation-analytics-risk.md`

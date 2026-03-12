# Accounts

This directory holds account credentials and configuration.
**Never committed to git.**

## Expected files (create manually, do not commit):
- `credentials.json` — platform account logins (TikTok, Instagram, YouTube)
- `proxies.json` — proxy IP assignments per account
- `phone_numbers.json` — 5sim numbers used for verification

## credentials.json format:
```json
{
  "tiktok": {
    "handle": "@[PersonaName]",
    "email": "...",
    "password": "...",
    "geelark_instance": "...",
    "proxy": "...",
    "phone": "...",
    "created": "YYYY-MM-DD",
    "warmup_complete": false
  },
  "instagram": { ... },
  "youtube": { ... }
}
```

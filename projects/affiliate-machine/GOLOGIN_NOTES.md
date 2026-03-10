# GoLogin Exploration Notes
Generated: 2026-03-10T03:45:33.342Z (run 1 — headless Chromium, no saved session)

---

## Login Flow Observations (Raw Log)
- Script started at 2026-03-10T03:44:15.392Z
- Gmail account available: YES
- Browser launched (headless Chromium).
- Navigating to https://app.gologin.com ...
- Landed on: https://app.gologin.com/ — title: "" (blank — JS app not yet rendered)
- Redirected to: https://app.gologin.com/sign_up (auto-redirect for unauthenticated users)
- Login page detected — scanning for login options.
- Google login button found: selector="button:has-text("Google")"
- Attempting Google OAuth flow...
- Google OAuth page opened at accounts.google.com (full OAuth2 handshake with GoLogin's client_id)
- Google accounts page opened — filling email...
- Password field not found or timed out: Google 2-step page never loaded the password field (likely blocked headless fingerprint or email/2FA pre-check)
- Fell back to GoLogin's own email/password form on sign_up page
- Attempting email/password login with Gmail credentials...
- Post-submit URL: https://app.gologin.com/sign_up (stayed on sign_up — login rejected)
- CAPTCHA blocker detected: element with id containing "captcha" found on page
- NOT logged in — login blocked by CAPTCHA
- Visible page text: "Create your first Gologin account  Continue with Google  OR  Sign up  I already have an account  Log in"

---

## Screenshots Taken
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/01_landing_2026-03-10T03-44-17-606Z.png — initial load (blank, JS rendering)
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/02_after_redirect_2026-03-10T03-44-21-550Z.png — sign_up page rendered
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/03_google_btn_visible_2026-03-10T03-44-21-661Z.png — "Continue with Google" button confirmed
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/04_after_google_click_2026-03-10T03-44-24-146Z.png — after clicking Google button
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/05_google_accounts_2026-03-10T03-44-24-366Z.png — accounts.google.com OAuth page
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/06_after_email_2026-03-10T03-44-26-544Z.png — after submitting email to Google
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/08_after_login_submit_2026-03-10T03-45-30-792Z.png — after email/pass form submit
- /root/projects/Agent/projects/affiliate-machine/data/screenshots/gologin/09_login_result_2026-03-10T03-45-31-025Z.png — final state: still on sign_up with CAPTCHA

---

## Actual Findings

### Login Flow
1. `https://app.gologin.com` → auto-redirects to `/sign_up` for unauthenticated sessions.
2. Sign-up/login page has two paths:
   - **"Continue with Google"** button → opens full Google OAuth2 popup (accounts.google.com)
   - **Email + Password fields** below an "OR" divider (for GoLogin-native accounts)
3. The page text confirms: "I already have an account  Log in" — so it doubles as both sign-up and login.

### Blocking Mechanisms Confirmed
- **Google OAuth + headless browser**: Google detected the headless Chromium fingerprint and blocked the password step. The email was submitted but the password page never loaded (60s timeout).
- **CAPTCHA on email/password form**: After submitting credentials via the native form, a CAPTCHA element (`[id*="captcha"]`) appeared and the URL stayed on `/sign_up`. Login rejected.
- **Root cause**: Headless Chromium with no stored session or cookies triggers bot detection on both Google OAuth and GoLogin's own form.

### What Works vs. What Doesn't
| Path | Result |
|---|---|
| Google OAuth (headless) | Blocked — Google kills password step for headless sessions |
| GoLogin native email/pass (headless) | Blocked by CAPTCHA |
| Manual browser login | Would likely work — saves a session cookie |
| GoLogin REST API (token-based) | Should work without browser at all |

### Free Tier Capabilities (from GoLogin docs / prior knowledge)
- 3 browser profiles on free plan.
- Full fingerprint customization per profile.
- Proxy assignment per profile (HTTP/SOCKS5).
- Cloud sync for profiles.
- API access with a token (free tier included).

### API Availability
- GoLogin exposes a full REST API.
- API docs: https://help.gologin.com/en/articles/api
- API token: generated in Account Settings → API Token (requires logged-in session first).
- Official Node.js SDK: `npm install gologin` (https://www.npmjs.com/package/gologin).
- Key endpoints: list profiles, create profile, update profile, delete profile, start profile (launches browser), stop profile.

---

## Recommendations

### Immediate Path to Login
Option A — **Manual login + export cookies**:
1. Log in manually in a real browser (Chrome or Firefox).
2. Export the session cookies (e.g., via EditThisCookie or browser dev tools).
3. Inject cookies into Playwright context via `context.addCookies(...)`.
4. This bypasses both Google OAuth headless detection and GoLogin CAPTCHA.

Option B — **GoLogin REST API (no browser needed)**:
1. Log in manually once to get an API token.
2. All profile management (create, start, stop, delete) via REST calls.
3. Script the API directly — no UI automation needed.
4. This is the recommended path for the affiliate machine.

### GoLogin REST API Quick Start (Node.js)
```js
const token = process.env.GOLOGIN_API_TOKEN;
const res = await fetch('https://api.gologin.com/browser', {
  headers: { Authorization: `Bearer ${token}` }
});
const profiles = await res.json();
```

### For Multi-Account Automation
- Create 3 profiles on free tier via API.
- Each profile = separate browser fingerprint + proxy.
- Use `gologin` npm package to start a profile → returns a WebSocket debugger URL → attach Playwright.
- Free tier limit: 3 simultaneous profiles.

---

## Useful URLs
- Dashboard: https://app.gologin.com/
- API reference: https://help.gologin.com/en/articles/api
- npm SDK: https://www.npmjs.com/package/gologin
- GoLogin pricing (free tier details): https://gologin.com/pricing

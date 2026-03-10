# AdsPower Web Dashboard Exploration Notes

**Run date**: 2026-03-10
**Script**: `scripts/adspower-explore.js`
**Login outcome**: `blocked — account requires Google OAuth, web app has no OAuth login button`

---

## Summary

AdsPower's web dashboard (`app.adspower.com`) does **not** offer Google OAuth login. The login page only has email + password fields. Accounts originally created via Google ("Sign up with Google") have no password set and **cannot log in through the web app**. The system displays a popup: *"No login password has been set. Please log in with the third party app find the account has been limited to."* Google login is only available in the **desktop application**, not the web interface.

---

## Login Flow

1. `https://app.adspower.com` immediately redirects to `https://app.adspower.com/login`
2. Login page title: "Log in AdsPower Account"
3. Login form has two visible fields: **E-Mail/Phone number** and **Password**
4. **No Google/OAuth login button present** anywhere on the login page
5. Attempted email + password login with Gmail credentials
6. After submit: popup appeared — *"Tips: No login password has been set. Please log in with the third party app find the account has been limited to."*
7. Page remained on `/login` — login failed

---

## Blocking Mechanisms

- **Google OAuth absent from web app**: The web login page has no Google/social sign-in button. Google login is desktop-app only.
- **Password not set on Gmail-created accounts**: If the AdsPower account was registered via Google OAuth (desktop app), no password exists. The web app cannot be used without setting a password first.
- **To fix**: Log into the desktop app with Google, then set a password via account settings, then web login would work.

---

## Page Structure Analysis

```
Login page (https://app.adspower.com/login):
  - Input: type="text", class="el-input__inner", placeholder="Enter your email address or phone number"
  - Input: type="password", class="el-input__inner", placeholder="Enter password"
  - Input: type="text", class="_hidden_input" (autocomplete trap — do NOT fill this one)
  - Input: type="password", class="_hidden_input" (autocomplete trap — do NOT fill this one)
  - Button: "Log in" (type="button")
  - Link: "Sign up" → https://app.adspower.com/registration

Registration page (https://app.adspower.com/registration):
  - Only "By e-mail" tab (no Google/social tab)
  - Fields: Email, Verification code, Password, Referral code
```

---

## Free Tier Capabilities Observed

- Could not access dashboard (login blocked)
- From public documentation: free tier = 2 browser profiles
- Paid plans start at Team plan

---

## Dashboard Sections / Nav Links

- Not observed (login did not succeed)

---

## API Availability

- AdsPower has a local API (runs on localhost when desktop app is open)
- Base URL: `http://local.adspower.net:50325`
- Endpoints include: `/api/v1/browser/start`, `/api/v1/browser/stop`, `/api/v1/user/list`
- Web app API docs: not accessible without login
- API requires the desktop application to be running — it is NOT a cloud API

---

## Action Required to Enable Web Login

1. Install AdsPower desktop app on a machine
2. Log in with Google account via desktop app
3. Go to Account Settings → set a password
4. Web app login will then work with email + that password

Alternatively: register a new AdsPower account directly with email (not Google), then web login works immediately.

---

## Screenshots Taken

- `/root/projects/Agent/projects/affiliate-machine/data/screenshots/adspower/01_landing_2026-03-10T03-47-19-633Z.png` — Login page on landing
- `/root/projects/Agent/projects/affiliate-machine/data/screenshots/adspower/02_login_page_2026-03-10T03-47-19-709Z.png` — Login page clean state
- `/root/projects/Agent/projects/affiliate-machine/data/screenshots/adspower/03_form_filled_2026-03-10T03-47-45-880Z.png` — Form filled with credentials
- `/root/projects/Agent/projects/affiliate-machine/data/screenshots/adspower/04_after_submit_2026-03-10T03-47-53-264Z.png` — After submit: "no password set" popup visible
- `/root/projects/Agent/projects/affiliate-machine/data/screenshots/adspower/08_final_state_2026-03-10T03-47-59-478Z.png` — Final state (still on login page)

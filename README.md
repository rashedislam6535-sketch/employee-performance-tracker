# WorkPulse — daily work tracker

A personal work log that replaces the Google Sheet: log what you did each day (tickets, chats, KYC, calls, emails, training), see it on a dashboard / timeline / calendar, and generate weekly reports you can download as Word, Markdown or PDF.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL (Supabase / Neon / any Postgres) · Drizzle ORM

---

## Deploy for free (recommended: Vercel + Supabase)

Both have free plans, no credit card needed. Total time: about 10 minutes.

### Step 1 — Put the code on GitHub

1. Create a free account at <https://github.com> and click **New repository** (e.g. `workpulse`, private is fine).
2. Upload the project:
   - **Without Git:** on the empty repository page click **uploading an existing file**, drag the whole project folder in (skip `node_modules` and `.next` — they are huge and not needed), then **Commit changes**.
   - **With Git:**
     ```bash
     git init
     git add .
     git commit -m "WorkPulse"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/workpulse.git
     git push -u origin main
     ```
   The included `.gitignore` keeps `.env` (your database password) out of the repository.

### Step 2 — Create the free database on Supabase

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project** → pick a name, set a **strong database password (save it!)**, choose the region closest to you (e.g. Singapore for Bangladesh) → **Create new project**. Wait ~1 minute.
3. Click the **Connect** button at the top of the dashboard.
4. Under **Connection string**, choose **Transaction pooler** (port `6543`) and copy the URI. It looks like:
   ```
   postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password from step 2. Keep this string for the next step.

> Use the **pooler** string, not the "Direct connection" one — the direct host is IPv6-only on the free plan and Vercel cannot reach it.

You do **not** need to create tables. The app creates them automatically the first time it runs.

### Step 3 — Deploy on Vercel

1. Go to <https://vercel.com> → **Sign up** with GitHub.
2. **Add New… → Project** → **Import** your `workpulse` repository.
3. Open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | the Supabase connection string from step 2 |
   | `OWNER_NAME` | your name (optional — can be set later on the Profile page) |
   | `OWNER_DEPARTMENT` | e.g. `Customer Support` (optional) |

4. Click **Deploy**. After ~1 minute you get a URL like `https://workpulse.vercel.app`.
5. Open it — the tables and a blank profile are created on first load. Set your name on **Profile**, then start logging.

Every later `git push` (or file upload on GitHub) redeploys automatically.

### After deploying

- **Settings → Profile**: change your name/department any time.
- **Reports → Generate report**: pick *This week / Last week / Last 7 days / This month*, edit the text, then download **Word (.doc)**, **Markdown**, or **PDF** (print dialog → "Save as PDF").
- **Performance → Export Excel (CSV)**: the monthly sheet for your manager.
- The database starts completely empty — no sample data. **Profile** → set your name and photo, then check in and log your first activity.

---

## Alternative free options

### A) Vercel + Neon (everything inside Vercel)

1. In your Vercel project open the **Storage** tab → **Create Database** → **Neon** (free plan) → **Continue**.
2. Vercel adds `DATABASE_URL` to the project automatically. Add `OWNER_NAME` / `OWNER_DEPARTMENT` under **Settings → Environment Variables**.
3. **Deployments → Redeploy**. Done.

Neon's free database sleeps when idle and wakes automatically on the next request (first load may take ~1 s).

### B) Free VPS with Coolify (self-hosted, no vendor limits)

Oracle Cloud's *Always Free* tier gives a small permanent VM (Ampere A1, up to 4 OCPU / 24 GB RAM).

1. Create the VM (Ubuntu 22.04), open ports **80/443/8000** in its security list, SSH in.
2. Install Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash` and open `http://YOUR_IP:8000`.
3. **Resources → New → Database → PostgreSQL** → Start. Copy the *internal* connection URL.
4. **Resources → New → Public Repository** (or GitHub app) → paste your repo URL → build pack **Nixpacks** (auto-detects Next.js), port `3000`.
5. Environment variables: `DATABASE_URL` = the internal URL **with `?sslmode=disable` appended**, plus `OWNER_NAME`, `OWNER_DEPARTMENT`.
6. Deploy. Optionally attach a domain and Coolify issues a free HTTPS certificate.

The same steps work on a paid VPS (Hostinger, Hetzner, DigitalOcean…).

### C) Any server with Docker (docker compose)

```bash
git clone https://github.com/YOUR_USERNAME/workpulse.git && cd workpulse
# edit docker-compose.yml: change the password and OWNER_NAME
docker compose up -d --build
```
Open `http://YOUR_SERVER_IP:3000`. Put Caddy or Nginx in front for HTTPS.

---

## Run locally

```bash
cp .env.example .env         # set DATABASE_URL to any Postgres (local, Supabase or Neon)
npm install
npm run dev                  # http://localhost:3000
```

Tables are created automatically on first load; the database starts empty. To apply schema changes after editing `src/db/schema.ts`:

```bash
npx drizzle-kit push --dialect=postgresql --schema=./src/db/schema.ts --url="$DATABASE_URL"
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | Postgres connection string. SSL is enabled automatically for remote hosts; append `?sslmode=disable` for Postgres inside a Docker/Coolify network, or `?sslmode=verify-full` for strict certificate checks. |
| `OWNER_NAME` | no | Name pre-filled on first run. Editable on the Profile page. |
| `OWNER_DEPARTMENT` | no | Department pre-filled on first run. |

`DATABASE_URL` is only needed at runtime, never at build time.

---

## Free-tier limits (as of 2026 — check the providers' pricing pages)

| Provider | Free plan | Notes |
|----------|-----------|-------|
| Vercel Hobby | 100 GB bandwidth/month, serverless functions included | Personal / non-commercial use |
| Supabase Free | 2 projects, 500 MB database | **Pauses after 7 days without activity** — reopen the Supabase dashboard and click *Restore project* (your data is kept). Logging work daily keeps it active. |
| Neon Free | 0.5 GB storage, 1 project | Auto-sleeps, auto-wakes |
| Oracle Cloud Always Free | 1 Ampere VM (up to 4 OCPU / 24 GB) | Needs a card for identity verification, but is not charged |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Vercel build fails with `DATABASE_URL is not set` | Add the variable under **Settings → Environment Variables** (all environments) and **Redeploy**. |
| `ENETUNREACH` / `ECONNREFUSED` / timeouts on Vercel | You used Supabase's *Direct connection* string. Switch to the **Transaction pooler** string (port 6543). |
| `password authentication failed` | The `[YOUR-PASSWORD]` placeholder wasn't replaced, or the password contains special characters — URL-encode them (`@` → `%40`, `#` → `%23`, `/` → `%2F`). You can reset the password in Supabase → Project Settings → Database. |
| `The server does not support SSL connections` | Postgres inside Docker/Coolify: append `?sslmode=disable` to `DATABASE_URL`. |
| Site suddenly errors after a week | Supabase paused the free project — open its dashboard and restore it. |

---

## Project structure

```
src/
  app/
    api/            dashboard, updates, reports, attendance, profile, reset, health
    layout.tsx      theme bootstrap (light/dark, no flash)
    page.tsx
  components/       Dashboard, DailyUpdateForm, Timeline, Calendar, Performance, Reports, Settings, charts
  context/          app state (profile, theme, notifications, search)
  db/               schema.ts (Drizzle), index.ts (client), seed.ts (auto table creation + first-run data)
  lib/utils.ts      dates, scoring, CSV/download helpers
Dockerfile, docker-compose.yml   self-hosting
.env.example                     configuration template
```

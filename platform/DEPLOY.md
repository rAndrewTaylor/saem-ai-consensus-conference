# Deploying the SAEM AI Consensus Platform

## Option 1: Railway (Recommended)

Railway gives you a managed PostgreSQL database, automatic HTTPS, and deploys from GitHub with zero DevOps.

### Steps

1. **Go to [railway.app](https://railway.app)** and sign in with GitHub

2. **Create a new project** → "Deploy from GitHub Repo" → select `rAndrewTaylor/saem-ai-consensus-conference`

3. **Set the root directory** to `platform` (Settings → Root Directory)

4. **Add PostgreSQL** → Click "New" → "Database" → "PostgreSQL"
   - Railway auto-sets `DATABASE_URL` for you

5. **Set environment variables** (Settings → Variables):
   ```
   ADMIN_SECRET=<pick a strong password for admin login>
   JWT_SECRET=<random 32+ character string>
   ANTHROPIC_API_KEY=<your Anthropic API key>
   ALLOWED_ORIGINS=https://<your-railway-domain>.up.railway.app
   LOG_LEVEL=INFO
   ```

6. **Deploy** — Railway builds the Docker image (installs Python deps, builds React frontend, bundles everything). First deploy takes ~3-5 minutes.

7. **Get your URL** — Settings → Domains → Generate Domain (or add a custom domain)

8. **Test** — Visit `https://your-domain.up.railway.app` and `https://your-domain.up.railway.app/health`

### Custom Domain

Settings → Domains → Add Custom Domain → enter your domain (e.g., `consensus.saem.org`) → add the CNAME record to your DNS.

Update `ALLOWED_ORIGINS` to include your custom domain.

### Cost

~$5-20/month depending on usage. PostgreSQL included. Free trial available.

---

## Option 2: Render

Similar to Railway but with a more traditional interface.

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo, set root directory to `platform`
3. Environment: Docker
4. Add a PostgreSQL database (Render dashboard → New → PostgreSQL)
5. Set the same environment variables as above
6. Render auto-deploys on push to main

---

## Option 3: Docker Compose (Self-hosted)

For running on your own server (e.g., a university VM):

```bash
cd platform

# Create .env file
cp .env.example .env
# Edit .env with real values (especially ADMIN_SECRET, JWT_SECRET)

# Start everything
docker compose up -d

# The app is now at http://localhost:8000
# Add nginx/Caddy in front for HTTPS
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (auto on Railway) | PostgreSQL connection string |
| `ADMIN_SECRET` | Yes | Password for admin dashboard login |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens (random 32+ chars) |
| `ANTHROPIC_API_KEY` | For AI features | Anthropic API key for Claude synthesis |
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed CORS origins |
| `LOG_LEVEL` | No | Logging level (default: INFO) |
| `PORT` | No (auto on Railway) | HTTP port (default: 8000) |

---

## Post-Deploy Checklist

- [ ] Visit `/health` — should show `{"status": "ok", "database": "connected"}`
- [ ] Visit `/` — should show the React landing page
- [ ] Visit `/dashboard` — log in with your ADMIN_SECRET
- [ ] Add questions to a working group via the dashboard
- [ ] Test the survey flow: visit `/survey/1/round_1`
- [ ] Share the URL with co-leads for testing
- [ ] Set up a custom domain if desired

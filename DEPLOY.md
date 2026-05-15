# Deployment Guide (Vercel + Neon + Upstash)

## Step 1 — Postgres (Neon, free tier)

1. Go to https://neon.tech and create a project
2. Copy the **connection string** → `DATABASE_URL`

## Step 2 — Redis (Upstash, free tier)

1. Go to https://upstash.com and create a Redis database
2. Copy the **Redis URL** (starts with `rediss://`) → `REDIS_URL`

## Step 3 — Push schema and seed

```bash
# In your local repo with .env.local filled in:
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

## Step 4 — Deploy to Vercel

```bash
npx vercel --prod
```

Set these environment variables in the Vercel dashboard (Settings → Environment Variables):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon connection URL |
| `REDIS_URL` | Upstash Redis URL |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` |
| `CRON_SECRET` | Any random string |

## Step 5 — Verify cron

The `vercel.json` configures a cron job at `* * * * *` (every minute) hitting
`/api/cron/expire-reservations`. You can confirm it's running in the Vercel
dashboard under Deployments → Functions → Cron Jobs.

## That's it

The live URL + seeded DB means reviewers can demo the full flow immediately.

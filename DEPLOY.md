# Deploy

1. Create a hosted Postgres database in Neon or Supabase.
2. Create an Upstash Redis database and copy the `rediss://` ioredis URL.
3. Add `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `NEXT_PUBLIC_BASE_URL`, and `CRON_SECRET` in Vercel.
4. Run `npm run db:migrate` against the hosted database.
5. Run `npm run db:seed` once to load the Allo demo products and warehouse stock.
6. Deploy the app on Vercel.

Vercel Cron calls `GET /api/cron/expire-reservations` every minute. It must include:

```text
Authorization: Bearer <CRON_SECRET>
```

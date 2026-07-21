# Deploy & apply (you must run these)

The spike builds and runs locally. Public deploy + Superteam apply need your accounts.

## Deploy (Vercel)

```bash
npm i -g vercel   # or use npx
vercel login
vercel          # link project
vercel --prod
```

Set env vars in Vercel from `.env.example` (at minimum `DATABASE_URL` — use Neon Postgres for production, or keep SQLite only for local demos).

For Postgres: change `prisma/schema.prisma` `provider` to `postgresql`, install `@prisma/adapter-neon` (or pg), update `src/lib/db.ts`, set `DATABASE_URL`.

## Apply

1. Put live URL + GitHub URL into `docs/APPLICATION.md`
2. Submit on https://superteam.fun/earn/listing/full-stack-solana-developer-for-production-mvp
3. Message https://t.me/martabytes with the Telegram script in `docs/APPLICATION.md`

Local demo: `npm run dev` → http://localhost:3000

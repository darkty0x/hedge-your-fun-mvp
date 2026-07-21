# Hedge Your Fun — Production MVP Spike

Independent **technical spike** for the [Superteam Earn project listing](https://superteam.fun/earn/listing/full-stack-solana-developer-for-production-mvp).

> Not affiliated with Hedge Your Fun’s production repository. Built to demonstrate how the listing’s production MVP checklist can be implemented.

## What’s included

- Privy embedded wallet integration (demo auth if `NEXT_PUBLIC_PRIVY_APP_ID` unset)
- Solana SOL + USDC balance reads (`@solana/web3.js` + SPL)
- Polymarket + Kalshi provider adapters (live keys or fixture/paper mode)
- Prisma persistence (hedges, positions, P&L snapshots, notifications, referrals)
- SSE realtime P&L (replaces polling)
- Intent → market matching prompt pipeline
- Rate limiting, structured errors, retries, dual API key rotation
- Referral links + shareable SVG hedge cards
- Installable PWA

See [docs/SPIKE.md](docs/SPIKE.md) and [docs/APPLICATION.md](docs/APPLICATION.md).

## Quick start

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) · TypeScript · Prisma · Privy · Solana web3.js · PWA

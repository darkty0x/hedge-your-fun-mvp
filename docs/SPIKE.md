# Spike map — Hedge Your Fun listing

Independent technical spike for the [Superteam Earn listing](https://superteam.fun/earn/listing/full-stack-solana-developer-for-production-mvp).

**Disclaimer:** Not affiliated with Hedge Your Fun’s production codebase. Built as an evaluation artifact for the application.

## Listing → code

| Listing requirement | Implementation |
|---|---|
| Live Kalshi / Polymarket APIs (replace mocks) | `src/lib/providers/types.ts`, `polymarket.ts`, `kalshi.ts`, `src/app/api/markets/route.ts`, `src/app/api/hedges/route.ts` — shared `MarketProvider` interface; fixtures when keys absent; paper orders |
| Privy embedded wallets + SOL/USDC via web3.js / SPL | `src/components/Providers.tsx`, `HedgeApp.tsx`, `src/lib/solana/balances.ts`, `src/app/api/balances/route.ts` |
| Persistent data (leave localStorage) | Prisma models in `prisma/schema.prisma` — User, Hedge, Position, PnLSnapshot, Notification, Referral; SQLite locally / Postgres-ready |
| Realtime P&L (beyond 30s polling) | SSE `src/app/api/pnl/stream/route.ts` + `EventSource` in UI (~2s ticks + snapshots) |
| Prompt pipeline (intent, matching, edge cases) | `src/lib/prompt/pipeline.ts`, `src/app/api/prompt/route.ts` — heuristic + optional OpenAI refine, refusals |
| Referral + shareable hedge cards | `src/app/api/refer/route.ts`, `src/app/api/share/[userId]/route.ts`, UI share section |
| API hardening (rate limit, errors, retry, key rotation) | `src/lib/api/rate-limit.ts`, `errors.ts`, `retry.ts`, `keys.ts` |
| Android / iOS distribution | PWA: `public/manifest.webmanifest`, `public/sw.js`, `ServiceWorkerRegister` |

## Product loop

1. Auth (Privy or demo mode)
2. Read SOL/USDC
3. NL intent → ranked markets (Polymarket + Kalshi)
4. Open/close hedge → DB
5. SSE P&L stream
6. Referral code + OG-style SVG card

## Run

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

Optional env: `NEXT_PUBLIC_PRIVY_APP_ID`, `POLYMARKET_API_KEY`, `KALSHI_API_KEY`, `OPENAI_API_KEY`, Postgres `DATABASE_URL`.

## Post-hire (explicitly out of spike)

- React Native wrapper
- Full KYC / key custody
- Sponsor’s existing proprietary mocks and brand

import { getActiveApiKey } from "@/lib/api/keys";
import { withRetry } from "@/lib/api/retry";
import type {
  MarketProvider,
  MarketQuote,
  OrderRequest,
  OrderResult,
  PositionQuote,
} from "@/lib/providers/types";

const FIXTURES: MarketQuote[] = [
  {
    id: "pm-btc-100k",
    provider: "polymarket",
    title: "Will Bitcoin hit $100k by year end?",
    description: "Resolves YES if BTC/USD >= 100000 before Dec 31.",
    yesPrice: 0.42,
    noPrice: 0.58,
    volume: 12_400_000,
    endDate: "2026-12-31",
    live: false,
  },
  {
    id: "pm-fed-cut",
    provider: "polymarket",
    title: "Fed rate cut at next FOMC?",
    description: "YES if the Fed cuts rates at the next meeting.",
    yesPrice: 0.61,
    noPrice: 0.39,
    volume: 8_200_000,
    endDate: "2026-09-30",
    live: false,
  },
  {
    id: "pm-sol-ath",
    provider: "polymarket",
    title: "SOL above $300 this quarter?",
    description: "YES if SOL/USD trades at or above 300.",
    yesPrice: 0.27,
    noPrice: 0.73,
    volume: 3_100_000,
    endDate: "2026-09-30",
    live: false,
  },
];

const paperPositions = new Map<string, PositionQuote>();

function normalizeGammaMarket(raw: Record<string, unknown>): MarketQuote | null {
  const id = String(raw.id ?? raw.condition_id ?? "");
  if (!id) return null;
  const outcomes = String(raw.outcomes ?? '["Yes","No"]');
  const prices = String(raw.outcomePrices ?? '["0.5","0.5"]');
  let yesPrice = 0.5;
  let noPrice = 0.5;
  try {
    const p = JSON.parse(prices) as string[];
    yesPrice = Number(p[0] ?? 0.5);
    noPrice = Number(p[1] ?? 1 - yesPrice);
  } catch {
    /* keep defaults */
  }
  return {
    id,
    provider: "polymarket",
    title: String(raw.question ?? raw.title ?? "Untitled market"),
    description: String(raw.description ?? ""),
    yesPrice,
    noPrice,
    volume: Number(raw.volume ?? raw.volumeNum ?? 0),
    endDate: raw.endDate ? String(raw.endDate) : undefined,
    live: true,
  };
}

export function createPolymarketProvider(): MarketProvider {
  const apiKey = getActiveApiKey("POLYMARKET");
  const base = process.env.POLYMARKET_API_BASE ?? "https://gamma-api.polymarket.com";

  return {
    id: "polymarket",
    // Gamma market data is public — treat as live when fetch succeeds
    isLive: true,

    async searchMarkets(query: string, limit = 8) {
      try {
        const url = new URL(`${base}/public-search`);
        url.searchParams.set("q", query || "solana");
        url.searchParams.set("limit_per_type", String(Math.max(limit, 6)));

        let list: unknown[] = [];
        try {
          const res = await withRetry(async () => {
            const r = await fetch(url.toString(), {
              headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
              next: { revalidate: 20 },
            });
            if (!r.ok) throw new Error(`Polymarket search ${r.status}`);
            return r;
          });
          const data = (await res.json()) as {
            events?: Array<{ markets?: unknown[]; title?: string }>;
            markets?: unknown[];
          };
          list =
            data.markets ??
            data.events?.flatMap((e) => e.markets ?? []) ??
            [];
        } catch {
          const fallback = new URL(`${base}/markets`);
          fallback.searchParams.set("limit", String(limit));
          fallback.searchParams.set("active", "true");
          fallback.searchParams.set("closed", "false");
          if (query) fallback.searchParams.set("search", query);
          const res = await withRetry(async () => {
            const r = await fetch(fallback.toString(), { next: { revalidate: 20 } });
            if (!r.ok) throw new Error(`Polymarket markets ${r.status}`);
            return r;
          });
          const data = (await res.json()) as unknown;
          list = Array.isArray(data)
            ? data
            : ((data as { markets?: unknown[] }).markets ?? []);
        }

        const markets = list
          .map((item) => normalizeGammaMarket(item as Record<string, unknown>))
          .filter((m): m is MarketQuote => Boolean(m));

        if (markets.length) {
          const q = query.toLowerCase();
          const ranked = markets
            .map((m) => {
              const hay = `${m.title} ${m.description ?? ""}`.toLowerCase();
              const hit = q
                .split(/\s+/)
                .filter((t) => t.length > 2)
                .reduce((s, t) => s + (hay.includes(t) ? 2 : 0), 0);
              return { m, hit };
            })
            .sort((a, b) => b.hit - a.hit || (b.m.volume ?? 0) - (a.m.volume ?? 0))
            .map((x) => x.m)
            .slice(0, limit);
          return ranked.length ? ranked : markets.slice(0, limit);
        }
      } catch {
        /* fall through to fixtures */
      }

      const q = query.toLowerCase();
      return FIXTURES.filter(
        (m) =>
          !q ||
          m.title.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          q.split(/\s+/).some((t) => t.length > 2 && m.title.toLowerCase().includes(t)),
      ).slice(0, limit);
    },

    async getMarket(marketId: string) {
      const all = await this.searchMarkets("", 50);
      return all.find((m) => m.id === marketId) ?? FIXTURES.find((m) => m.id === marketId) ?? null;
    },

    async placeOrder(order: OrderRequest): Promise<OrderResult> {
      const market = await this.getMarket(order.marketId);
      if (!market) {
        return {
          externalId: "",
          marketId: order.marketId,
          side: order.side,
          size: 0,
          entryPrice: 0,
          status: "rejected",
          paper: true,
        };
      }
      const entryPrice = order.side === "YES" ? market.yesPrice : market.noPrice;
      const externalId = `pm-paper-${Date.now()}`;
      const size = order.sizeUsd / Math.max(entryPrice, 0.01);
      const position: PositionQuote = {
        externalId,
        marketId: order.marketId,
        side: order.side,
        size,
        entryPrice,
        currentPrice: entryPrice,
        unrealizedPnL: 0,
      };
      paperPositions.set(externalId, position);
      return {
        externalId,
        marketId: order.marketId,
        side: order.side,
        size,
        entryPrice,
        status: "filled",
        paper: !Boolean(apiKey),
      };
    },

    async getPosition(externalId: string) {
      const pos = paperPositions.get(externalId);
      if (!pos) return null;
      // Simulate mild price drift for realtime P&L demos
      const drift = (Math.sin(Date.now() / 5000) + 1) * 0.02;
      const currentPrice = Math.min(0.99, Math.max(0.01, pos.entryPrice + drift - 0.02));
      const direction = pos.side === "YES" ? 1 : -1;
      const unrealizedPnL =
        (currentPrice - pos.entryPrice) * pos.size * direction * (pos.side === "NO" ? -1 : 1);
      // Correct P&L: (current - entry) * size for YES; for NO invert
      const pnl =
        pos.side === "YES"
          ? (currentPrice - pos.entryPrice) * pos.size
          : (pos.entryPrice - currentPrice) * pos.size;
      return { ...pos, currentPrice, unrealizedPnL: pnl };
    },

    async closePosition(externalId: string): Promise<OrderResult> {
      const pos = await this.getPosition(externalId);
      if (!pos) {
        return {
          externalId,
          marketId: "",
          side: "YES",
          size: 0,
          entryPrice: 0,
          status: "rejected",
          paper: true,
        };
      }
      paperPositions.delete(externalId);
      return {
        externalId,
        marketId: pos.marketId,
        side: pos.side,
        size: pos.size,
        entryPrice: pos.currentPrice,
        status: "filled",
        paper: true,
      };
    },
  };
}

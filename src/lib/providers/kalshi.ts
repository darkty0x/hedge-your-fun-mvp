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
    id: "kx-cpi",
    provider: "kalshi",
    title: "Will CPI print above 3.0% next release?",
    description: "Kalshi economics market (stub/fixture when keys absent).",
    yesPrice: 0.34,
    noPrice: 0.66,
    volume: 1_800_000,
    endDate: "2026-08-15",
    live: false,
  },
  {
    id: "kx-election",
    provider: "kalshi",
    title: "Party control of Senate after midterms?",
    description: "Political hedge market fixture.",
    yesPrice: 0.48,
    noPrice: 0.52,
    volume: 4_500_000,
    endDate: "2026-11-10",
    live: false,
  },
];

const paperPositions = new Map<string, PositionQuote>();

export function createKalshiProvider(): MarketProvider {
  const apiKey = getActiveApiKey("KALSHI");
  const base = process.env.KALSHI_API_BASE ?? "https://trading-api.kalshi.com/trade-api/v2";

  return {
    id: "kalshi",
    isLive: Boolean(apiKey),

    async searchMarkets(query: string, limit = 8) {
      if (!apiKey) {
        const q = query.toLowerCase();
        return FIXTURES.filter(
          (m) =>
            !q ||
            m.title.toLowerCase().includes(q) ||
            q.split(/\s+/).some((t) => t.length > 2 && m.title.toLowerCase().includes(t)),
        ).slice(0, limit);
      }

      try {
        const url = new URL(`${base}/markets`);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("status", "open");
        if (query) url.searchParams.set("series_ticker", query);

        const res = await withRetry(async () => {
          const r = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
          });
          if (!r.ok) throw new Error(`Kalshi ${r.status}`);
          return r;
        });

        const data = (await res.json()) as {
          markets?: Array<Record<string, unknown>>;
        };
        return (data.markets ?? []).slice(0, limit).map((m) => ({
          id: String(m.ticker ?? m.event_ticker ?? ""),
          provider: "kalshi" as const,
          title: String(m.title ?? m.subtitle ?? "Kalshi market"),
          description: String(m.rules_primary ?? ""),
          yesPrice: Number(m.yes_bid ?? m.last_price ?? 50) / 100,
          noPrice: 1 - Number(m.yes_bid ?? m.last_price ?? 50) / 100,
          volume: Number(m.volume ?? 0),
          endDate: m.close_time ? String(m.close_time) : undefined,
          live: true,
        }));
      } catch {
        return FIXTURES.slice(0, limit);
      }
    },

    async getMarket(marketId: string) {
      const all = await this.searchMarkets("", 50);
      return all.find((m) => m.id === marketId) ?? null;
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
      const externalId = `kx-paper-${Date.now()}`;
      const size = order.sizeUsd / Math.max(entryPrice, 0.01);
      paperPositions.set(externalId, {
        externalId,
        marketId: order.marketId,
        side: order.side,
        size,
        entryPrice,
        currentPrice: entryPrice,
        unrealizedPnL: 0,
      });
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
      const drift = (Math.cos(Date.now() / 4000) + 1) * 0.015;
      const currentPrice = Math.min(0.99, Math.max(0.01, pos.entryPrice + drift - 0.015));
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

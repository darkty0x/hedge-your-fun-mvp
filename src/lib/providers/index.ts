import { createKalshiProvider } from "@/lib/providers/kalshi";
import { createPolymarketProvider } from "@/lib/providers/polymarket";
import type { MarketProvider, MarketProviderId, MarketQuote } from "@/lib/providers/types";

const providers: Record<MarketProviderId, MarketProvider> = {
  polymarket: createPolymarketProvider(),
  kalshi: createKalshiProvider(),
};

export function getProvider(id: MarketProviderId): MarketProvider {
  return providers[id];
}

export function listProviders(): MarketProvider[] {
  return Object.values(providers);
}

export async function searchAllMarkets(query: string, limit = 10): Promise<MarketQuote[]> {
  const results = await Promise.all(
    listProviders().map((p) => p.searchMarkets(query, Math.ceil(limit / 2))),
  );
  return results.flat().slice(0, limit);
}

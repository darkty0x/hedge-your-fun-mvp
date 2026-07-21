import { jsonError, jsonOk } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { searchAllMarkets, getProvider } from "@/lib/providers";
import type { MarketProviderId } from "@/lib/providers/types";

export async function GET(req: Request) {
  try {
    await enforceRateLimit("markets", 60);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const provider = searchParams.get("provider") as MarketProviderId | null;
    const limit = Number(searchParams.get("limit") ?? 10);

    if (provider === "polymarket" || provider === "kalshi") {
      const markets = await getProvider(provider).searchMarkets(q, limit);
      return jsonOk({
        markets,
        providers: [
          { id: "polymarket", live: getProvider("polymarket").isLive },
          { id: "kalshi", live: getProvider("kalshi").isLive },
        ],
      });
    }

    const markets = await searchAllMarkets(q, limit);
    return jsonOk({
      markets,
      providers: [
        { id: "polymarket", live: getProvider("polymarket").isLive },
        { id: "kalshi", live: getProvider("kalshi").isLive },
      ],
    });
  } catch (err) {
    return jsonError(err);
  }
}

import { z } from "zod";
import { jsonError, jsonOk, ApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import type { MarketProviderId, MarketSide } from "@/lib/providers/types";
import { upsertUser } from "@/lib/users";

const createSchema = z.object({
  privyId: z.string().min(1),
  walletAddress: z.string().optional().nullable(),
  intent: z.string().min(1),
  parsedIntent: z.string().min(1),
  provider: z.enum(["polymarket", "kalshi"]),
  marketId: z.string().min(1),
  marketTitle: z.string().min(1),
  side: z.enum(["YES", "NO"]),
  stakeUsd: z.number().positive().max(10_000),
});

export async function GET(req: Request) {
  try {
    await enforceRateLimit("hedges-list", 60);
    const privyId = new URL(req.url).searchParams.get("privyId");
    if (!privyId) throw new ApiError(400, "privyId required", "bad_request");

    const user = await prisma.user.findUnique({ where: { privyId } });
    if (!user) return jsonOk({ hedges: [], positions: [] });

    const hedges = await prisma.hedge.findMany({
      where: { userId: user.id },
      include: { positions: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ hedges, user });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    await enforceRateLimit("hedges-create", 20);
    const body = createSchema.parse(await req.json());
    const user = await upsertUser({
      privyId: body.privyId,
      walletAddress: body.walletAddress,
    });

    const provider = getProvider(body.provider as MarketProviderId);
    const order = await provider.placeOrder({
      marketId: body.marketId,
      side: body.side as MarketSide,
      sizeUsd: body.stakeUsd,
      userId: user.id,
    });

    if (order.status === "rejected") {
      throw new ApiError(400, "Order rejected by provider", "order_rejected");
    }

    const hedge = await prisma.hedge.create({
      data: {
        userId: user.id,
        intent: body.intent,
        parsedIntent: body.parsedIntent,
        provider: body.provider,
        marketId: body.marketId,
        marketTitle: body.marketTitle,
        side: body.side,
        stakeUsd: body.stakeUsd,
        status: "open",
        positions: {
          create: {
            userId: user.id,
            provider: body.provider,
            externalId: order.externalId,
            marketId: body.marketId,
            side: body.side,
            size: order.size,
            entryPrice: order.entryPrice,
            currentPrice: order.entryPrice,
            unrealizedPnL: 0,
            status: "open",
          },
        },
      },
      include: { positions: true },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "hedge_opened",
        title: "Hedge opened",
        body: `${body.side} on ${body.marketTitle} · $${body.stakeUsd}`,
      },
    });

    await prisma.pnLSnapshot.create({
      data: {
        userId: user.id,
        hedgeId: hedge.id,
        totalPnL: 0,
        payload: JSON.stringify({ order, paper: order.paper }),
      },
    });

    return jsonOk({ hedge, order });
  } catch (err) {
    return jsonError(err);
  }
}

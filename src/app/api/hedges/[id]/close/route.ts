import { z } from "zod";
import { jsonError, jsonOk, ApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import type { MarketProviderId } from "@/lib/providers/types";

const schema = z.object({
  privyId: z.string().min(1),
  positionId: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await enforceRateLimit("hedges-close", 20);
    const { id: hedgeId } = await ctx.params;
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { privyId: body.privyId } });
    if (!user) throw new ApiError(404, "User not found", "not_found");

    const position = await prisma.position.findFirst({
      where: { id: body.positionId, hedgeId, userId: user.id, status: "open" },
    });
    if (!position) throw new ApiError(404, "Position not found", "not_found");

    const provider = getProvider(position.provider as MarketProviderId);
    const closed = position.externalId
      ? await provider.closePosition(position.externalId)
      : null;

    const quote = position.externalId
      ? await provider.getPosition(position.externalId)
      : null;

    const realized =
      quote?.unrealizedPnL ??
      (closed ? (closed.entryPrice - position.entryPrice) * position.size : 0);

    await prisma.position.update({
      where: { id: position.id },
      data: {
        status: "closed",
        realizedPnL: realized,
        currentPrice: quote?.currentPrice ?? position.currentPrice,
        unrealizedPnL: 0,
      },
    });

    const hedge = await prisma.hedge.update({
      where: { id: hedgeId },
      data: { status: "closed" },
      include: { positions: true },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "hedge_closed",
        title: "Hedge closed",
        body: `Realized P&L: ${realized.toFixed(2)} USDC`,
      },
    });

    return jsonOk({ hedge, realizedPnL: realized, closed });
  } catch (err) {
    return jsonError(err);
  }
}

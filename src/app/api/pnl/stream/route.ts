import { jsonError, ApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import type { MarketProviderId } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await enforceRateLimit("pnl-stream", 10);
    const privyId = new URL(req.url).searchParams.get("privyId");
    if (!privyId) throw new ApiError(400, "privyId required", "bad_request");

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        send({ type: "hello", at: new Date().toISOString() });

        const tick = async () => {
          if (closed) return;
          const user = await prisma.user.findUnique({ where: { privyId } });
          if (!user) {
            send({ type: "pnl", totalPnL: 0, positions: [] });
            return;
          }

          const positions = await prisma.position.findMany({
            where: { userId: user.id, status: "open" },
          });

          let totalPnL = 0;
          const live = [];

          for (const pos of positions) {
            const provider = getProvider(pos.provider as MarketProviderId);
            const quote = pos.externalId
              ? await provider.getPosition(pos.externalId)
              : null;
            const unrealized = quote?.unrealizedPnL ?? pos.unrealizedPnL;
            const currentPrice = quote?.currentPrice ?? pos.currentPrice;
            totalPnL += unrealized;

            if (quote) {
              await prisma.position.update({
                where: { id: pos.id },
                data: { unrealizedPnL: unrealized, currentPrice },
              });
            }

            live.push({
              id: pos.id,
              marketId: pos.marketId,
              side: pos.side,
              unrealizedPnL: unrealized,
              currentPrice,
              entryPrice: pos.entryPrice,
            });
          }

          await prisma.pnLSnapshot.create({
            data: {
              userId: user.id,
              totalPnL,
              payload: JSON.stringify({ positions: live }),
            },
          });

          send({
            type: "pnl",
            totalPnL,
            positions: live,
            at: new Date().toISOString(),
          });
        };

        await tick();
        const interval = setInterval(() => {
          void tick();
        }, 2000);

        const ping = setInterval(() => {
          send({ type: "ping", at: new Date().toISOString() });
        }, 15000);

        req.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          clearInterval(ping);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

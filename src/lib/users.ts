import { prisma } from "@/lib/db";

function makeReferralCode() {
  return `HYF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function upsertUser(input: {
  privyId: string;
  walletAddress?: string | null;
  referralCode?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { privyId: input.privyId } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        walletAddress: input.walletAddress ?? existing.walletAddress,
      },
    });
  }

  const user = await prisma.user.create({
    data: {
      privyId: input.privyId,
      walletAddress: input.walletAddress ?? null,
      referralCode: makeReferralCode(),
    },
  });

  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: input.referralCode },
    });
    if (referrer && referrer.id !== user.id) {
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId: user.id,
          code: input.referralCode,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { referredById: referrer.id },
      });
      await prisma.notification.create({
        data: {
          userId: referrer.id,
          type: "referral",
          title: "New referral",
          body: `Someone joined with your code ${input.referralCode}`,
        },
      });
    }
  }

  return user;
}

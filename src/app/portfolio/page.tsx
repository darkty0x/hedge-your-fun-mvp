import Link from "next/link";

export const metadata = {
  title: "Portfolio — Daisuke Hiroki",
  description: "Shipped consumer products: AskTheHive + Hedge production MVP spike",
};

export default function PortfolioPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[var(--ink)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Portfolio
      </p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Consumer products shipped</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
        Examples of consumer-facing Solana / full-stack work — for the Hedge Your Fun Superteam
        application.
      </p>

      <article className="mt-10 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <p className="text-[12px] uppercase tracking-wide text-[var(--accent)]">01 · Production</p>
        <h2 className="mt-2 font-serif text-3xl">AskTheHive / Hive Labs</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
          Founding engineer. Mobile-first Solana consumer DeFi: wallets, settlement UX, APIs, and
          data. Hackathon win, $60K grant, production TVL growth.
        </p>
        <a
          href="https://askthehive.ai"
          className="mt-5 inline-flex rounded-2xl bg-[var(--ink)] px-4 py-3 text-[14px] font-semibold text-[#0c0b0a]"
        >
          Open askthehive.ai
        </a>
      </article>

      <article className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <p className="text-[12px] uppercase tracking-wide text-[var(--accent)]">
          02 · Evaluation spike
        </p>
        <h2 className="mt-2 font-serif text-3xl">Hedge — production MVP spike</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
          Independent spike mapped to the listing: intent → Polymarket/Kalshi match → open hedge →
          SSE realtime P&amp;L → DB persistence → referrals/share cards → PWA. Not their production
          repo — a hire evaluation artifact.
        </p>
        <ul className="mt-4 space-y-2 text-[14px] text-[var(--muted)]">
          <li>· Privy-ready Solana wallet + SOL/USDC reads</li>
          <li>· Provider adapters with paper/live paths</li>
          <li>· Prisma hedges / positions / P&amp;L / notifications</li>
          <li>· Prompt pipeline + rate limit / retry / key rotation</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-2xl bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-[#1a1208]"
          >
            Try the demo
          </Link>
          <a
            href="https://github.com/darkty0x/hedge-your-fun-mvp"
            className="inline-flex rounded-2xl border border-[var(--line)] px-4 py-3 text-[14px]"
          >
            Source
          </a>
        </div>
      </article>

      <p className="mt-10 text-[13px] text-[var(--muted)]">
        Also see{" "}
        <Link className="underline" href="/cv">
          CV
        </Link>{" "}
        · Telegram{" "}
        <a className="underline" href="https://t.me/daisukehiroki25">
          @daisukehiroki25
        </a>
      </p>
    </main>
  );
}

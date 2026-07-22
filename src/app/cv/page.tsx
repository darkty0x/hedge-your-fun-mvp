import Link from "next/link";

export const metadata = {
  title: "CV — Daisuke Hiroki",
  description: "Founding engineer, Solana consumer products — AskTheHive / Hive Labs",
};

export default function CvPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[var(--ink)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Curriculum Vitae
      </p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Daisuke Hiroki</h1>
      <p className="mt-2 text-[15px] text-[var(--muted)]">
        Founding Engineer · Full-stack Solana · TypeScript / Next.js / Node
      </p>
      <p className="mt-1 text-[14px] text-[var(--muted)]">
        Telegram{" "}
        <a className="text-[var(--ink)] underline" href="https://t.me/daisukehiroki25">
          @daisukehiroki25
        </a>{" "}
        · GitHub{" "}
        <a className="text-[var(--ink)] underline" href="https://github.com/darkty0x">
          darkty0x
        </a>
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="font-serif text-2xl">Summary</h2>
        <p className="text-[15px] leading-relaxed text-[var(--muted)]">
          Founding engineer who ships consumer crypto products end-to-end: Next.js/Node APIs,
          Solana wallets &amp; SPL balances, persistent data, and production reliability. Built
          AskTheHive from hackathon → grant → live Solana TVL.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-serif text-2xl">Experience</h2>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-[13px] text-[var(--accent)]">Founding Engineer</p>
          <h3 className="mt-1 text-lg">AskTheHive / Hive Labs</h3>
          <p className="mt-1 text-[13px] text-[var(--muted)]">Solana · Consumer DeFi</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[var(--muted)]">
            <li>Owned full-stack delivery (TypeScript, Next.js, Node) from zero to production.</li>
            <li>Designed Solana wallet UX, SPL/USDC flows, and settlement paths for non-experts.</li>
            <li>Built APIs, data layer, and reliability patterns (retries, errors, key handling).</li>
            <li>Hackathon win → $60K grant → production usage with large Solana TVL.</li>
          </ul>
          <a
            className="mt-4 inline-block text-[14px] text-[var(--ink)] underline"
            href="https://askthehive.ai"
          >
            askthehive.ai →
          </a>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-serif text-2xl">Skills</h2>
        <p className="text-[14px] leading-relaxed text-[var(--muted)]">
          TypeScript · Next.js · Node.js · Prisma / Postgres · Solana web3.js / SPL · Privy-style
          embedded wallets · REST / serverless · prediction-market &amp; financial APIs · SSE /
          realtime · PWA
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-serif text-2xl">Relevant proof for Hedge Your Fun</h2>
        <p className="text-[14px] leading-relaxed text-[var(--muted)]">
          Built a production-style spike covering Privy/Solana balances, Polymarket + Kalshi
          adapters, DB-backed hedges, SSE P&amp;L, intent→market matching, referrals, API hardening,
          and PWA — mapped to their Superteam listing checklist.
        </p>
        <div className="flex flex-wrap gap-3 text-[14px]">
          <Link className="underline" href="/">
            Live demo
          </Link>
          <Link className="underline" href="/portfolio">
            Portfolio
          </Link>
          <a className="underline" href="https://github.com/darkty0x/hedge-your-fun-mvp">
            GitHub
          </a>
        </div>
      </section>
    </main>
  );
}

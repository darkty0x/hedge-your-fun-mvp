"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Loader2,
  LogOut,
  Share2,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { cn, formatUsd, shortAddress } from "@/lib/utils";

type Tab = "home" | "hedge" | "positions" | "activity";

type MarketMatch = {
  id: string;
  provider: "polymarket" | "kalshi";
  title: string;
  yesPrice: number;
  noPrice: number;
  live: boolean;
  score: number;
  reason: string;
  volume?: number;
};

type Hedge = {
  id: string;
  marketTitle: string;
  side: string;
  stakeUsd: number;
  status: string;
  provider: string;
  positions: Array<{
    id: string;
    unrealizedPnL: number;
    currentPrice: number;
    entryPrice: number;
    status: string;
  }>;
};

type Notification = { id: string; title: string; body: string; createdAt?: string };

const SUGGESTIONS = [
  { label: "SOL crash shield", text: "Protect my SOL bag if it crashes — $50" },
  { label: "BTC downside", text: "Hedge BTC downside into year end — $100" },
  { label: "Fed cut", text: "Position for a Fed rate cut — $25" },
];

const DEMO_ID = "demo-founder";
const PRIVY_READY = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export function HedgeApp() {
  if (!PRIVY_READY) return <AppShell demoMode privyId={DEMO_ID} />;
  return <PrivyGate />;
}

function PrivyGate() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const solWallet =
    wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];

  if (!ready) {
    return (
      <Frame>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--lime)]" />
          <p className="text-sm text-[var(--muted)]">Connecting Privy…</p>
        </div>
      </Frame>
    );
  }

  if (!authenticated || !user) {
    return <Welcome onLogin={() => login()} />;
  }

  return (
    <AppShell
      demoMode={false}
      privyId={user.id}
      walletAddress={solWallet?.address}
      email={user.email?.address ?? user.google?.email}
      onLogout={() => logout()}
      onLogin={() => login()}
    />
  );
}

function Welcome({ onLogin }: { onLogin: () => void }) {
  return (
    <Frame>
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden p-6 pb-8">
        <motion.div
          className="pointer-events-none absolute -right-10 top-10 h-48 w-48 rounded-full bg-[var(--lime)]/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="pt-4">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--lime)]"
          >
            Hedge
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-4 font-serif text-[3.1rem] leading-[1.02] tracking-[-0.03em]"
          >
            Protect plans
            <br />
            with markets.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-4 max-w-sm text-[15px] leading-relaxed text-[var(--muted)]"
          >
            Privy embedded Solana wallet. Intent → Polymarket/Kalshi match → open hedge →
            realtime P&amp;L over SSE.
          </motion.p>
        </div>

        <div className="space-y-3">
          {[
            "Embedded wallet + SOL/USDC reads",
            "Live Gamma market search",
            "Persistent hedges · not localStorage",
          ].map((t, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 + i * 0.07 }}
              className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-[13px]"
            >
              <Zap className="h-4 w-4 text-[var(--lime)]" />
              {t}
            </motion.div>
          ))}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            onClick={onLogin}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--lime)] py-4 text-[15px] font-semibold text-[#10140a]"
          >
            <Wallet className="h-4 w-4" />
            Continue with Privy
          </motion.button>
          <p className="text-center text-[11px] text-[var(--muted)]">
            Email / social / Solana wallet · creates embedded wallet on login
          </p>
        </div>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-3 py-4 sm:py-8">
      <div className="noise relative flex min-h-[min(920px,100dvh-2rem)] flex-1 flex-col overflow-hidden rounded-[2.1rem] border border-[var(--line)] bg-[#0a0c10]/95] shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lime)]/50 to-transparent" />
        {children}
      </div>
      <p className="mt-4 text-center text-[11px] text-[var(--muted)]">
        <Link href="/portfolio" className="underline-offset-2 hover:underline">
          Portfolio
        </Link>
        {" · "}
        <Link href="/cv" className="underline-offset-2 hover:underline">
          CV
        </Link>
        {" · "}
        Independent Superteam spike
      </p>
    </main>
  );
}

function AppShell({
  demoMode,
  privyId,
  walletAddress,
  email,
  onLogout,
  onLogin,
}: {
  demoMode: boolean;
  privyId: string;
  walletAddress?: string;
  email?: string;
  onLogout?: () => void;
  onLogin?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("home");
  const [intent, setIntent] = useState(SUGGESTIONS[0].text);
  const [matches, setMatches] = useState<MarketMatch[]>([]);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [hedges, setHedges] = useState<Hedge[]>([]);
  const [balances, setBalances] = useState<{ sol: number; usdc: number } | null>(null);
  const [pnl, setPnl] = useState(0);
  const [livePositions, setLivePositions] = useState<
    Array<{ id: string; unrealizedPnL: number; currentPrice: number }>
  >([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [referral, setReferral] = useState<{
    referralCode: string;
    shareUrl: string;
    cardUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [side, setSide] = useState<"YES" | "NO">("NO");
  const [providersLive, setProvidersLive] = useState({ polymarket: false, kalshi: false });

  const pnlMv = useMotionValue(0);
  const pnlSpring = useSpring(pnlMv, { stiffness: 120, damping: 18 });
  const pnlText = useTransform(pnlSpring, (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`);

  useEffect(() => {
    pnlMv.set(pnl);
  }, [pnl, pnlMv]);

  const ensureUser = useCallback(async () => {
    const ref =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("ref")
        : null;
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        privyId,
        walletAddress: demoMode ? null : walletAddress,
        referralCode: ref,
      }),
    });
  }, [privyId, walletAddress, demoMode]);

  const refreshHedges = useCallback(async () => {
    const res = await fetch(`/api/hedges?privyId=${encodeURIComponent(privyId)}`);
    const json = await res.json();
    if (json.ok) setHedges(json.data.hedges ?? []);
  }, [privyId]);

  const refreshReferral = useCallback(async () => {
    const res = await fetch(`/api/refer?privyId=${encodeURIComponent(privyId)}`);
    const json = await res.json();
    if (json.ok) {
      setReferral(json.data);
      setNotifications(json.data.notifications ?? []);
    }
  }, [privyId]);

  useEffect(() => {
    void (async () => {
      await ensureUser();
      await refreshHedges();
      await refreshReferral();
    })();
  }, [ensureUser, refreshHedges, refreshReferral]);

  useEffect(() => {
    if (demoMode || !walletAddress) {
      setBalances({ sol: 12.48, usdc: 1280.4 });
      return;
    }
    void fetch(`/api/balances?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setBalances({ sol: json.data.sol, usdc: json.data.usdc });
      });
  }, [walletAddress, demoMode]);

  useEffect(() => {
    const es = new EventSource(`/api/pnl/stream?privyId=${encodeURIComponent(privyId)}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          type: string;
          totalPnL?: number;
          positions?: Array<{ id: string; unrealizedPnL: number; currentPrice: number }>;
        };
        if (data.type === "pnl") {
          setPnl(data.totalPnL ?? 0);
          setLivePositions(data.positions ?? []);
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [privyId]);

  useEffect(() => {
    void fetch("/api/markets?q=solana&limit=1")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data?.providers) {
          const p = json.data.providers as Array<{ id: string; live: boolean }>;
          setProvidersLive({
            polymarket: Boolean(p.find((x) => x.id === "polymarket")?.live),
            kalshi: Boolean(p.find((x) => x.id === "kalshi")?.live),
          });
        }
      });
  }, []);

  async function runMatch(text = intent) {
    setBusy("Matching live markets…");
    setToast(null);
    try {
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: text }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Match failed");
      setParsed(json.data.intent);
      setMatches(json.data.matches ?? []);
      if (json.data.intent?.sideBias) setSide(json.data.intent.sideBias);
      if (json.data.intent?.refusal) setToast(json.data.intent.refusal);
      else {
        setTab("hedge");
        setToast(`Found ${json.data.matches?.length ?? 0} markets`);
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Match failed");
    } finally {
      setBusy("");
    }
  }

  async function openHedge(market: MarketMatch) {
    setBusy("Opening hedge…");
    try {
      const stakeUsd =
        typeof parsed?.stakeUsd === "number" ? (parsed.stakeUsd as number) : 50;
      const res = await fetch("/api/hedges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          walletAddress: demoMode ? null : walletAddress,
          intent,
          parsedIntent: JSON.stringify(parsed ?? {}),
          provider: market.provider,
          marketId: market.id,
          marketTitle: market.title,
          side,
          stakeUsd,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Open failed");
      await refreshHedges();
      await refreshReferral();
      setTab("positions");
      setToast("Hedge opened · P&L streaming");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Open failed");
    } finally {
      setBusy("");
    }
  }

  async function closeHedge(hedge: Hedge) {
    const position = hedge.positions.find((p) => p.status === "open");
    if (!position) return;
    setBusy("Closing…");
    try {
      const res = await fetch(`/api/hedges/${hedge.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyId, positionId: position.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Close failed");
      await refreshHedges();
      await refreshReferral();
      setToast(`Closed · ${Number(json.data.realizedPnL).toFixed(2)} USDC`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy("");
    }
  }

  const openCount = useMemo(
    () => hedges.filter((h) => h.status === "open").length,
    [hedges],
  );

  return (
    <Frame>
      <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lime)]">
            Hedge
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                demoMode ? "bg-[var(--muted)]" : "bg-[var(--mint)] animate-glow",
              )}
            />
            {demoMode
              ? "Demo mode"
              : email ?? shortAddress(walletAddress)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {demoMode && onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="rounded-full bg-[var(--lime)] px-3 py-1.5 text-[11px] font-semibold text-[#10140a]"
            >
              Connect Privy
            </button>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)]"
              aria-label="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-24 pt-2">
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <section className="glass relative overflow-hidden rounded-[1.6rem] p-5">
                <motion.div
                  className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--lime)]/15 blur-2xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-[12px] text-[var(--muted)]">Realtime P&amp;L</p>
                <div className="mt-1 flex items-end gap-2">
                  <motion.span className="font-serif text-[3rem] leading-none tracking-tight text-[var(--mint)]">
                    {pnlText}
                  </motion.span>
                  <span className="mb-2 text-[13px] text-[var(--muted)]">USDC</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat label="USDC" value={balances ? formatUsd(balances.usdc, 0) : "—"} />
                  <Stat label="SOL" value={balances ? balances.sol.toFixed(2) : "—"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <Pill ok={providersLive.polymarket}>Polymarket</Pill>
                  <Pill ok={providersLive.kalshi}>Kalshi</Pill>
                  <Pill ok={!demoMode}>Privy</Pill>
                  <Pill ok>SSE</Pill>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="px-1 text-[13px] text-[var(--muted)]">Quick hedge</h2>
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s.label}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      setIntent(s.text);
                      void runMatch(s.text);
                    }}
                    className="glass flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left"
                  >
                    <div>
                      <p className="text-[14px] font-medium">{s.label}</p>
                      <p className="text-[12px] text-[var(--muted)]">{s.text}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                  </motion.button>
                ))}
              </section>

              <button
                type="button"
                onClick={() => setTab("hedge")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--lime)] py-3.5 text-[14px] font-semibold text-[#10140a]"
              >
                <Sparkles className="h-4 w-4" />
                Custom intent
              </button>
            </motion.div>
          )}

          {tab === "hedge" && (
            <motion.div
              key="hedge"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="font-serif text-3xl tracking-tight">Compose hedge</h2>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-[var(--line)] bg-black/30 p-4 text-[15px] outline-none focus:border-[var(--lime)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void runMatch()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--lime)] py-3.5 text-[14px] font-semibold text-[#10140a] disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Match markets
                </button>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as "YES" | "NO")}
                  className="rounded-2xl border border-[var(--line)] bg-black/30 px-3 text-[13px]"
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div className="space-y-3">
                {matches.map((m, i) => (
                  <motion.article
                    key={`${m.provider}-${m.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-[1.4rem] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                          {m.provider}
                          {m.live ? " · live" : " · fallback"}
                        </p>
                        <h3 className="mt-1 text-[15px] font-medium leading-snug">{m.title}</h3>
                      </div>
                      <span className="rounded-full bg-[var(--lime)]/15 px-2 py-1 font-mono text-[11px] text-[var(--lime)]">
                        {m.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <PriceBar label="YES" price={m.yesPrice} tone="mint" />
                      <PriceBar label="NO" price={m.noPrice} tone="lime" />
                    </div>
                    <p className="mt-3 text-[12px] text-[var(--muted)]">{m.reason}</p>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => void openHedge(m)}
                      className="mt-4 flex w-full items-center justify-center gap-1 rounded-2xl bg-[var(--ink)] py-3 text-[14px] font-semibold text-[#0a0c10]"
                    >
                      Open {side}
                      <ArrowUpRight className="h-4 w-4" />
                    </motion.button>
                  </motion.article>
                ))}
                {!matches.length && (
                  <p className="text-[13px] text-[var(--muted)]">
                    Run a match to pull live Polymarket/Kalshi markets.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {tab === "positions" && (
            <motion.div
              key="positions"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-end justify-between">
                <h2 className="font-serif text-3xl tracking-tight">Positions</h2>
                <p className="text-[12px] text-[var(--muted)]">{openCount} open</p>
              </div>
              {hedges.map((h, i) => {
                const live = livePositions.find((p) =>
                  h.positions.some((hp) => hp.id === p.id),
                );
                return (
                  <motion.article
                    key={h.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass rounded-[1.4rem] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                          {h.side} · {h.provider} · ${h.stakeUsd}
                        </p>
                        <h3 className="mt-1 text-[15px] leading-snug">{h.marketTitle}</h3>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[14px]",
                          (live?.unrealizedPnL ?? 0) >= 0
                            ? "text-[var(--mint)]"
                            : "text-[var(--coral)]",
                        )}
                      >
                        {live
                          ? `${live.unrealizedPnL >= 0 ? "+" : ""}${live.unrealizedPnL.toFixed(2)}`
                          : h.status}
                      </span>
                    </div>
                    {h.status === "open" && (
                      <button
                        type="button"
                        onClick={() => void closeHedge(h)}
                        className="mt-4 w-full rounded-2xl border border-[var(--line)] py-2.5 text-[13px] text-[var(--muted)]"
                      >
                        Close position
                      </button>
                    )}
                  </motion.article>
                );
              })}
              {!hedges.length && (
                <p className="text-[13px] text-[var(--muted)]">No hedges yet — start from Home.</p>
              )}
              {referral?.cardUrl && (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
                    <Share2 className="h-3.5 w-3.5" /> Share card · {referral.referralCode}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referral.cardUrl}
                    alt="Share card"
                    className="w-full rounded-2xl border border-[var(--line)]"
                  />
                </div>
              )}
            </motion.div>
          )}

          {tab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="font-serif text-3xl tracking-tight">Activity</h2>
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass flex gap-3 rounded-2xl p-4"
                >
                  <Bell className="mt-0.5 h-4 w-4 text-[var(--lime)]" />
                  <div>
                    <p className="text-[14px] font-medium">{n.title}</p>
                    <p className="text-[12px] text-[var(--muted)]">{n.body}</p>
                  </div>
                </motion.div>
              ))}
              {!notifications.length && (
                <p className="text-[13px] text-[var(--muted)]">
                  Opens, closes, and referrals land here (DB-backed).
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(toast || busy) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="pointer-events-none fixed bottom-28 left-1/2 z-50 w-[min(92%,24rem)] -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-[#12151c]/95 px-4 py-3 text-center text-[13px] shadow-xl backdrop-blur"
            >
              {busy || toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="absolute inset-x-3 bottom-3 z-20 grid grid-cols-4 gap-1 rounded-[1.4rem] border border-[var(--line)] bg-[#0c0f14]/92 p-1.5 backdrop-blur-xl">
        {(
          [
            ["home", "Home", Activity],
            ["hedge", "Hedge", Sparkles],
            ["positions", "Book", Wallet],
            ["activity", "Feed", Bell],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10px]",
                active ? "text-[#10140a]" : "text-[var(--muted)]",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl bg-[var(--lime)]"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>
    </Frame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/25 px-3 py-2.5">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="font-mono text-[15px]">{value}</p>
    </div>
  );
}

function Pill({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1",
        ok
          ? "border-[var(--mint)]/30 bg-[var(--mint)]/10 text-[var(--mint)]"
          : "border-[var(--line)] text-[var(--muted)]",
      )}
    >
      {children}
    </span>
  );
}

function PriceBar({
  label,
  price,
  tone,
}: {
  label: string;
  price: number;
  tone: "mint" | "lime";
}) {
  return (
    <div className="rounded-2xl bg-black/25 p-3">
      <div className="flex justify-between text-[11px] text-[var(--muted)]">
        <span>{label}</span>
        <span className="font-mono text-[var(--ink)]">{(price * 100).toFixed(0)}¢</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={cn(
            "h-full rounded-full",
            tone === "mint" ? "bg-[var(--mint)]" : "bg-[var(--lime)]",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(6, Math.min(100, price * 100))}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

import { useState } from "react";
import { Crown, Dices, Medal, Trophy } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api, type LeaderboardState, type Player } from "@/lib/liveboard";
import { usePolling } from "@/hooks/usePolling";
import { AnimatedNumber } from "./AnimatedNumber";
import { GlassCard, SectionHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

const PODIUM_STYLES = [
  {
    // rank 1
    card: "from-amber-400/25 via-violet-500/10 border-amber-300/30",
    medal: "text-amber-300",
    glow: "glow-violet",
    step: "h-28",
    label: "1st",
  },
  {
    // rank 2
    card: "from-slate-300/20 via-slate-400/5 border-slate-300/25",
    medal: "text-slate-300",
    glow: "glow-cyan",
    step: "h-20",
    label: "2nd",
  },
  {
    // rank 3
    card: "from-orange-400/20 via-coral-400/5 border-orange-300/25",
    medal: "text-orange-300",
    glow: "glow-coral",
    step: "h-14",
    label: "3rd",
  },
];

function PodiumCard({ player, index, onAward, pending }: {
  player: Player;
  index: number;
  onAward: (p: Player) => void;
  pending: string | null;
}) {
  const style = PODIUM_STYLES[index];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass relative flex flex-col items-center justify-between gap-3 rounded-2xl border bg-gradient-to-b p-4 text-center",
        style.card,
        style.glow,
      )}
    >
      {index === 0 && (
        <Crown className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 text-amber-300 drop-shadow-[0_0_10px_hsl(45_93%_47%/0.8)]" />
      )}
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl shadow-inner">
          <span className="animate-float inline-block">{player.avatar}</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">{player.name}</p>
        <p className={cn("mono text-[10px] uppercase tracking-widest", style.medal)}>
          {style.label} · {player.score.toLocaleString()} pts
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAward(player)}
        disabled={pending === player.id}
        aria-label={`Award random points to ${player.name}`}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all hover:border-white/25 hover:bg-white/10 hover:shadow-[0_0_18px_-4px_hsl(258_90%_66%/0.6)] disabled:opacity-50"
      >
        <Dices className="mr-1 inline h-3.5 w-3.5" />
        +Points
      </button>
      <div className={cn("w-full rounded-t-lg bg-gradient-to-t from-white/10 to-transparent", style.step)} />
    </motion.div>
  );
}

function PlayerRow({ player, onAward, pending }: {
  player: Player;
  onAward: (p: Player) => void;
  pending: string | null;
}) {
  const top3 = player.rank <= 3;
  return (
    <motion.div
      layout
      layoutId={player.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        top3
          ? "border-violet-400/20 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent"
          : "border-white/5 bg-white/[0.02]",
      )}
    >
      <span
        className={cn(
          "mono w-7 text-center text-sm font-bold",
          player.rank === 1 ? "text-amber-300" : player.rank === 2 ? "text-slate-300" : player.rank === 3 ? "text-orange-300" : "text-slate-500",
        )}
      >
        {player.rank}
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg">
        {player.avatar}
      </span>
      <span className="flex-1 truncate text-sm font-medium text-slate-100">
        {player.name}
      </span>
      <span className="mono text-sm font-semibold text-white tabular-nums">
        <AnimatedNumber value={player.score} />
      </span>
      <button
        type="button"
        onClick={() => onAward(player)}
        disabled={pending === player.id}
        aria-label={`Award random points to ${player.name}`}
        className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:border-violet-400/40 hover:bg-violet-500/15 hover:text-white hover:shadow-[0_0_16px_-4px_hsl(258_90%_66%/0.7)] disabled:opacity-50"
      >
        <Dices className={cn("h-4 w-4", pending === player.id && "animate-spin")} />
      </button>
    </motion.div>
  );
}

export function Leaderboard() {
  const { data, error, loading, refresh } = usePolling<LeaderboardState>(
    api.leaderboard,
    5000,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [lastAward, setLastAward] = useState<{ name: string; points: number; id: string } | null>(null);

  const players = data?.players ?? [];
  const podium = players.slice(0, 3);
  // visual podium order: 2nd, 1st, 3rd
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
  const podiumStyleIndex = (visualIndex: number) => (visualIndex === 1 ? 0 : visualIndex === 0 ? 1 : 2);

  const award = async (player: Player) => {
    setPending(player.id);
    try {
      const result = await api.awardPoints(player.id);
      setLastAward({ name: result.name ?? player.name, points: result.awarded ?? 0, id: player.id });
      refresh();
      toast.success(`${result.name ?? player.name} +${result.awarded} pts`, {
        description: `ZINCRBY → new score ${result.score}`,
      });
    } catch (err) {
      toast.error("Award failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section id="leaderboard" className="scroll-mt-24">
      <SectionHeader
        id="leaderboard"
        title="Real-Time Leaderboard"
        subtitle="Redis Sorted Sets · ZADD / ZINCRBY / ZREVRANGE"
        icon={<Trophy className="h-5 w-5" />}
        actions={
          lastAward ? (
            <motion.span
              key={lastAward.id + lastAward.points}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mono rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
            >
              {lastAward.name} +{lastAward.points}
            </motion.span>
          ) : undefined
        }
      />

      <div className="mt-4">
        {/* gradient podium */}
        <div className="grid grid-cols-3 items-end gap-3">
          {loading && !players.length
            ? [0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-44 rounded-2xl" />
              ))
            : podiumOrder.map((player, visualIndex) => (
                <PodiumCard
                  key={player.id}
                  player={player}
                  index={podiumStyleIndex(visualIndex)}
                  onAward={award}
                  pending={pending}
                />
              ))}
        </div>

        {/* full ranked list */}
        <GlassCard className="mt-4 p-4" delay={0.1}>
          <div className="flex flex-col gap-2">
            {loading && !players.length
              ? [0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))
              : players.map((player) => (
                  <PlayerRow key={player.id} player={player} onAward={award} pending={pending} />
                ))}
          </div>
          {players.length > 0 && (
            <p className="mono mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
              <Medal className="h-3 w-3" />
              {players.length} players seeded once · ZCARD liveboard:leaderboard
            </p>
          )}
        </GlassCard>
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300/80" role="alert">
          {error} — retrying automatically…
        </p>
      )}
    </section>
  );
}
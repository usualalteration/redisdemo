import { useState } from "react";
import { Eye, Gauge, RotateCcw, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api, type CounterId, type CountersState } from "@/lib/liveboard";
import { usePolling } from "@/hooks/usePolling";
import { AnimatedNumber } from "./AnimatedNumber";
import { GlassCard, SectionHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

interface CounterMeta {
  id: CounterId;
  label: string;
  hint: string;
  icon: React.ReactNode;
  glowClass: string;
  iconClass: string;
  barClass: string;
}

const COUNTERS: CounterMeta[] = [
  {
    id: "page_views",
    label: "Page Views",
    hint: "INCR liveboard:counter:page_views",
    icon: <Eye className="h-5 w-5" />,
    glowClass: "glow-violet",
    iconClass: "from-violet-500/30 to-violet-500/5 text-violet-300 border-violet-400/20",
    barClass: "from-violet-400 to-fuchsia-400",
  },
  {
    id: "api_requests",
    label: "API Requests",
    hint: "INCR liveboard:counter:api_requests",
    icon: <Zap className="h-5 w-5" />,
    glowClass: "glow-cyan",
    iconClass: "from-cyan-400/30 to-cyan-400/5 text-cyan-300 border-cyan-400/20",
    barClass: "from-cyan-400 to-sky-400",
  },
  {
    id: "active_sessions",
    label: "Active Sessions",
    hint: "INCR liveboard:counter:active_sessions",
    icon: <Users className="h-5 w-5" />,
    glowClass: "glow-coral",
    iconClass: "from-rose-400/30 to-rose-400/5 text-rose-300 border-rose-400/20",
    barClass: "from-rose-400 to-orange-400",
  },
];

export function Counters() {
  const { data, error, loading, refresh } = usePolling<CountersState>(
    api.counters,
    4000,
  );
  const [pending, setPending] = useState<CounterId | null>(null);

  const increment = async (counter: CounterMeta) => {
    setPending(counter.id);
    try {
      const result = await api.incrementCounter(counter.id);
      refresh();
      toast.success(`${counter.label} +1`, {
        description: `Redis INCR → ${result.value ?? result.counters[counter.id]}`,
      });
    } catch (err) {
      toast.error("Increment failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(null);
    }
  };

  const reset = async (counter: CounterMeta | "all") => {
    setPending(counter === "all" ? "page_views" : counter.id);
    try {
      const label = counter === "all" ? "All counters" : counter.label;
      await api.resetCounter(counter === "all" ? "all" : counter.id);
      await refresh();
      toast(`${label} reset to 0`, {
        icon: <RotateCcw className="h-4 w-4 text-slate-300" />,
      });
    } catch (err) {
      toast.error("Reset failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section id="counters" className="scroll-mt-24">
      <SectionHeader
        id="counters"
        title="Live Counters"
        subtitle="Atomic INCR operations, backed by Redis"
        icon={<Gauge className="h-5 w-5" />}
        actions={
          <button
            type="button"
            onClick={() => reset("all")}
            className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white hover:shadow-[0_0_18px_-4px_hsl(258_90%_66%/0.5)]"
          >
            <RotateCcw className="h-3.5 w-3.5 transition-transform group-hover:-rotate-90" />
            Reset all
          </button>
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COUNTERS.map((counter, index) => {
          const value = data?.counters[counter.id] ?? 0;
          return (
            <GlassCard
              key={counter.id}
              glow={counter.glowClass as "violet" | "cyan" | "coral"}
              delay={index * 0.08}
              className="relative overflow-hidden p-5"
            >
              <div className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-70", counter.barClass)} />
              <div className="flex items-start justify-between">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border bg-gradient-to-b", counter.iconClass)}>
                  {counter.icon}
                </div>
                <span className="mono text-[10px] uppercase tracking-widest text-slate-500">
                  INCR
                </span>
              </div>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {counter.label}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  {loading && !data ? (
                    <div className="skeleton h-10 w-24 rounded-lg" />
                  ) : (
                    <span className="text-4xl font-bold tracking-tight text-white">
                      <AnimatedNumber value={value} />
                    </span>
                  )}
                </div>
                <p className="mono mt-2 text-[10px] text-slate-500">{counter.hint}</p>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending === counter.id}
                  onClick={() => increment(counter)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-all hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
                >
                  <motion.span
                    key={`inc-${value}`}
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex"
                  >
                    <Zap className={cn("mr-1 h-3.5 w-3.5", pending === counter.id && "animate-pulse")} />
                  </motion.span>
                  Increment +1
                </button>
                <button
                  type="button"
                  aria-label={`Reset ${counter.label}`}
                  disabled={pending === counter.id}
                  onClick={() => reset(counter)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300/80" role="alert">
          {error} — retrying automatically…
        </p>
      )}
    </section>
  );
}
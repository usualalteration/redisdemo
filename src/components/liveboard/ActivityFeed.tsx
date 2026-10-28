import { Activity, Cpu, Gauge, Server, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, type ActivityEvent, type ActivityState } from "@/lib/liveboard";
import { usePolling } from "@/hooks/usePolling";
import { GlassCard, SectionHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, { icon: React.ReactNode; ring: string; glow: string; chip: string }> = {
  counter: {
    icon: <Gauge className="h-3.5 w-3.5" />,
    ring: "border-cyan-400/30 bg-cyan-500/15 text-cyan-300",
    glow: "shadow-[0_0_14px_-2px_hsl(187_92%_53%/0.55)]",
    chip: "text-cyan-300/80",
  },
  score: {
    icon: <Trophy className="h-3.5 w-3.5" />,
    ring: "border-violet-400/30 bg-violet-500/15 text-violet-300",
    glow: "shadow-[0_0_14px_-2px_hsl(258_90%_66%/0.55)]",
    chip: "text-violet-300/80",
  },
  cache: {
    icon: <Server className="h-3.5 w-3.5" />,
    ring: "border-rose-400/30 bg-rose-500/15 text-rose-300",
    glow: "shadow-[0_0_14px_-2px_hsl(351_96%_67%/0.55)]",
    chip: "text-rose-300/80",
  },
  system: {
    icon: <Cpu className="h-3.5 w-3.5" />,
    ring: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
    glow: "shadow-[0_0_14px_-2px_hsl(158_84%_47%/0.55)]",
    chip: "text-emerald-300/80",
  },
};

function relativeTime(ts: number, now: number): string {
  const delta = Math.max(0, Math.floor((now - ts) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  const minutes = Math.floor(delta / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

export function ActivityFeed({ now }: { now: number }) {
  const { data, error, loading } = usePolling<ActivityState>(api.activity, 4000);
  const events = data?.events ?? [];
  const streamLength = data?.streamLength ?? 0;

  return (
    <section id="activity" className="scroll-mt-24">
      <SectionHeader
        id="activity"
        title="Live Activity Feed"
        subtitle="Redis Streams · XADD / XREVRANGE — refreshed every few seconds"
        icon={<Activity className="h-5 w-5" />}
        actions={
          <span className="mono rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">
            XLEN {streamLength}
          </span>
        }
      />

      <GlassCard className="mt-4 p-4" delay={0.05}>
        <div className="relative max-h-[420px] overflow-y-auto pr-1">
          {/* timeline spine */}
          <span className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/40 via-cyan-500/20 to-transparent" />

          {loading && !events.length ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-9 w-9 rounded-full" />
                  <div className="skeleton h-5 flex-1 rounded-lg" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No events yet — interact with the dashboard and they will stream in.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {events.map((event: ActivityEvent, index: number) => {
                const style = TYPE_STYLES[event.type] ?? TYPE_STYLES.system;
                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
                    className="relative flex items-start gap-3 py-2"
                  >
                    <span
                      className={cn(
                        "z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border backdrop-blur",
                        style.ring,
                        style.glow,
                      )}
                    >
                      {style.icon}
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="text-sm text-slate-100">{event.message}</p>
                        <span className={cn("mono text-[10px] uppercase tracking-wider", style.chip)}>
                          {event.type}
                        </span>
                      </div>
                      <p className="mono truncate text-[11px] text-slate-500">
                        {event.detail}
                      </p>
                    </div>
                    <span className="mono shrink-0 pt-1 text-[10px] text-slate-500">
                      {relativeTime(event.ts, now)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </GlassCard>

      {error && (
        <p className="mt-3 text-xs text-rose-300/80" role="alert">
          {error} — retrying automatically…
        </p>
      )}
    </section>
  );
}
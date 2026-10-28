import { BarChart3, Boxes, Database, MemoryStick, Percent, Radio, Server, Users } from "lucide-react";
import { motion } from "framer-motion";
import { formatUptime, type StatsState } from "@/lib/liveboard";
import { GlassCard, SectionHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  tone: "violet" | "cyan" | "coral" | "emerald";
  loading?: boolean;
}

const TONE_CLASS: Record<StatTileProps["tone"], { icon: string; text: string }> = {
  violet: { icon: "border-violet-400/20 bg-violet-500/10 text-violet-300", text: "text-white" },
  cyan: { icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300", text: "text-white" },
  coral: { icon: "border-rose-400/20 bg-rose-500/10 text-rose-300", text: "text-white" },
  emerald: { icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300", text: "text-white" },
};

function StatTile({ label, value, hint, icon, tone, loading }: StatTileProps) {
  const cls = TONE_CLASS[tone];
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md border", cls.icon)}>
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="skeleton mt-2 h-6 w-16 rounded" />
      ) : (
        <p className={cn("mono mt-1 text-xl font-bold", cls.text)}>{value}</p>
      )}
      {hint && <p className="mono mt-1 text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}

export function StatsPanel({ stats, connected }: { stats: StatsState | null; connected: boolean }) {
  const demo = stats?.demo;
  const server = stats?.server;
  const loading = !stats;
  const counts = stats?.activity.counts ?? [];
  const maxCount = Math.max(1, ...counts);

  return (
    <section id="stats" className="scroll-mt-24">
      <SectionHeader
        id="stats"
        title="Redis Health & Statistics"
        subtitle="Demo metrics vs. shared server-wide stats · INFO / DBSIZE"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
              connected
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                : "border-rose-400/25 bg-rose-500/10 text-rose-300",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-400" : "bg-rose-400")} />
            {connected ? "Healthy" : "Degraded"}
          </span>
        }
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* demo metrics */}
        <GlassCard className="p-5 lg:col-span-3" glow="cyan" delay={0}>
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-semibold text-slate-100">LiveBoard Demo Metrics</h3>
            <span className="mono rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">liveboard:*</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="Demo Keys" tone="cyan" loading={loading}
              value={demo?.keys ?? "—"} icon={<Database className="h-3 w-3" />}
              hint="SCAN liveboard:*"
            />
            <StatTile
              label="Cache Hits" tone="emerald" loading={loading}
              value={demo?.cacheHits ?? "—"} icon={<Radio className="h-3 w-3" />}
              hint="INCR stats:cache_hits"
            />
            <StatTile
              label="Cache Misses" tone="coral" loading={loading}
              value={demo?.cacheMisses ?? "—"} icon={<Percent className="h-3 w-3" />}
              hint="INCR stats:cache_misses"
            />
            <StatTile
              label="Hit Rate" tone="violet" loading={loading}
              value={demo ? (demo.hitRate !== null ? `${demo.hitRate}%` : "—") : "—"}
              icon={<Percent className="h-3 w-3" />} hint="hits / (hits+misses)"
            />
            <StatTile
              label="Stream Events" tone="cyan" loading={loading}
              value={demo?.streamEvents ?? "—"} icon={<Activity3Icon />}
              hint="XLEN liveboard:activity"
            />
            <StatTile
              label="Counters" tone="violet" loading={loading}
              value={connected ? "3" : "—"} icon={<Database className="h-3 w-3" />}
              hint="atomic INCR keys"
            />
          </div>

          {/* live activity chart */}
          <div className="mt-5 rounded-xl border border-white/5 bg-black/25 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Recent activity — events per 10s
              </p>
              <p className="mono text-[10px] text-slate-600">XREVRANGE · last 100s</p>
            </div>
            <div className="mt-3 flex h-24 items-end gap-1.5">
              {loading
                ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <div key={i} className="skeleton flex-1 rounded-t" style={{ height: "40%" }} />
                  ))
                : counts.map((count, index) => (
                    <motion.div
                      key={`${index}-${count}`}
                      initial={{ height: 4 }}
                      animate={{ height: `${Math.max(6, (count / maxCount) * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "flex-1 rounded-t-md",
                        count > 0
                          ? "bg-gradient-to-t from-violet-600/70 to-cyan-400/80"
                          : "bg-white/5",
                      )}
                      title={`${count} events`}
                    />
                  ))}
            </div>
            <div className="mono mt-1.5 flex justify-between text-[9px] text-slate-600">
              <span>-90s</span>
              <span>-50s</span>
              <span>now</span>
            </div>
          </div>
        </GlassCard>

        {/* server-wide stats */}
        <GlassCard className="p-5 lg:col-span-2" glow="violet" delay={0.08}>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-violet-300" />
            <h3 className="text-sm font-semibold text-slate-100">Redis Server</h3>
            <span className="mono rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">shared instance</span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-300">
                  <MemoryStick className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-300">Used Memory</p>
                  <p className="mono text-[10px] text-slate-600">INFO memory</p>
                </div>
              </div>
              <p className="mono text-sm font-bold text-white">
                {loading ? "—" : server?.usedMemoryHuman ?? "n/a"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Version" tone="violet" loading={loading}
                value={server?.redisVersion ?? "—"} icon={<Server className="h-3 w-3" />}
                hint="INFO server"
              />
              <StatTile
                label="DBSIZE" tone="cyan" loading={loading}
                value={server?.dbsize ?? "—"} icon={<Database className="h-3 w-3" />}
                hint="server-wide keys"
              />
              <StatTile
                label="Clients" tone="emerald" loading={loading}
                value={server?.connectedClients ?? "—"} icon={<Users className="h-3 w-3" />}
                hint="INFO clients"
              />
              <StatTile
                label="Uptime" tone="cyan" loading={loading}
                value={server ? formatUptime(server.uptimeSeconds) : "—"}
                icon={<Server className="h-3 w-3" />} hint="since start"
              />
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Peak Memory</p>
                <p className="mono text-xs font-semibold text-slate-200">
                  {loading ? "—" : server?.peakMemoryHuman ?? "n/a"}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      server && server.usedMemoryBytes > 0
                        ? `${Math.min(100, (server.usedMemoryBytes / 2097152) * 100)}%`
                        : "2%",
                  }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400"
                />
              </div>
              <p className="mono mt-1.5 text-[10px] text-slate-600">
                used vs 2 MiB reference scale
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

function Activity3Icon() {
  return <Radio className="h-3 w-3" />;
}
import { useEffect, useState } from "react";
import { Database, KeyRound, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { api, type CacheEntry, type CacheState } from "@/lib/liveboard";
import { usePolling, useTicker } from "@/hooks/usePolling";
import { GlassCard, SectionHeader } from "./GlassCard";
import { cn } from "@/lib/utils";

const TTL_OPTIONS: Array<{ value: 30 | 60 | 300; label: string }> = [
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 300, label: "5m" },
];

/** Smallest configured TTL that can still contain the remaining time. */
function barTotal(remaining: number): number {
  for (const ttl of [30, 60, 300]) {
    if (remaining <= ttl) return ttl;
  }
  return 300;
}

function TtlBar({ remaining, total }: { remaining: number; total: number }) {
  const ratio = Math.max(0, Math.min(1, remaining / total));
  const urgent = remaining <= 10;
  const soon = remaining <= total * 0.4;
  return (
    <div className="w-32">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            urgent
              ? "bg-gradient-to-r from-rose-500 to-orange-400"
              : soon
                ? "bg-gradient-to-r from-amber-400 to-rose-400"
                : "bg-gradient-to-r from-violet-400 to-cyan-400",
          )}
        />
      </div>
      <p className="mono mt-1 text-right text-[10px] text-slate-500">
        expires in {remaining}s
      </p>
    </div>
  );
}

export function CacheExplorer() {
  const { data, error, loading, refresh } = usePolling<CacheState>(api.cacheList, 3000);
  const now = useTicker(500); // re-render clock for smooth countdowns
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());

  useEffect(() => {
    if (data) setFetchedAt(Date.now());
  }, [data]);

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState<30 | 60 | 300>(60);
  const [lookup, setLookup] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const entries = data?.entries ?? [];
  const hits = data?.hits ?? 0;
  const misses = data?.misses ?? 0;

  const createOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value.trim()) return;
    setPending("set");
    try {
      const result = await api.cacheSet(name.trim(), value.trim(), ttl);
      refresh();
      toast.success(
        result.existed ? `Key "${name.trim()}" updated` : `Key "${name.trim()}" created`,
        { description: `SET liveboard:cache:${name.trim()} EX ${ttl}` },
      );
      setValue("");
    } catch (err) {
      toast.error("SET failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(null);
    }
  };

  const getByLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = lookup.trim();
    if (!target) return;
    setPending("lookup");
    try {
      const result = await api.cacheGet(target);
      if (result.hit) {
        toast.success(`Cache HIT on "${target}"`, {
          description: `→ "${result.value}"`,
        });
      } else {
        toast.warning(`Cache MISS on "${target}"`, {
          description: "GET returned nil — key does not exist (or expired)",
        });
      }
      refresh();
    } catch (err) {
      toast.error("GET failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(null);
    }
  };

  const hitOnRow = async (entry: CacheEntry) => {
    setPending(entry.name);
    try {
      const result = await api.cacheGet(entry.name);
      if (result.hit) {
        toast.success(`Cache HIT on "${entry.name}"`, {
          description: `→ "${result.value}"`,
        });
      }
      refresh();
    } catch (err) {
      toast.error("GET failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(null);
    }
  };

  const remove = async (entry: CacheEntry) => {
    setPending(entry.name);
    try {
      const result = await api.cacheDelete(entry.name);
      refresh();
      toast(`DEL liveboard:cache:${entry.name}`, {
        description: result.deleted ? "Key deleted" : "Key was already gone",
        icon: <Trash2 className="h-4 w-4 text-rose-300" />,
      });
    } catch (err) {
      toast.error("DEL failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section id="cache" className="scroll-mt-24">
      <SectionHeader
        id="cache"
        title="Cache Explorer"
        subtitle="Key-value editor with TTL expiry · SET / GET / DEL / EXPIRE"
        icon={<Database className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2 text-[10px]">
            <span className="mono rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              hits {hits}
            </span>
            <span className="mono rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-rose-300">
              misses {misses}
            </span>
          </div>
        }
      />

      <GlassCard className="mt-4 overflow-hidden p-0" glow="none" delay={0}>
        {/* terminal header */}
        <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.03] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="mono ml-2 text-[11px] text-slate-400">
            redis-liveboard · keyspace liveboard:cache:*
          </span>
        </div>

        <div className="p-4">
          {/* SET form */}
          <form onSubmit={createOrUpdate} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="cache-key-input" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Key
              </label>
              <input
                id="cache-key-input"
                name="key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="session-token"
                maxLength={40}
                autoComplete="off"
                className="mono w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-cyan-200 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
            <div className="flex-[1.4]">
              <label htmlFor="cache-value-input" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Value
              </label>
              <input
                id="cache-value-input"
                name="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Hello from Redis LiveBoard"
                maxLength={500}
                autoComplete="off"
                className="mono w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                TTL
              </label>
              <div className="flex gap-1.5" role="group" aria-label="TTL selection">
                {TTL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTtl(opt.value)}
                    aria-pressed={ttl === opt.value}
                    className={cn(
                      "mono rounded-lg border px-3 py-2 text-xs transition-all",
                      ttl === opt.value
                        ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200 shadow-[0_0_16px_-4px_hsl(187_92%_53%/0.6)]"
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={pending === "set" || !name.trim() || !value.trim()}
              className="mono rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-600/40 to-fuchsia-600/30 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-violet-300/60 hover:shadow-[0_0_22px_-4px_hsl(258_90%_66%/0.8)] disabled:opacity-40"
            >
              SET
            </button>
          </form>

          {/* GET-by-name lookup (hit / miss demo) */}
          <form onSubmit={getByLookup} className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="cache-lookup-input" className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                GET by key (test a hit or a miss)
              </label>
              <input
                id="cache-lookup-input"
                name="lookup"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="try an expired key for a MISS"
                maxLength={40}
                autoComplete="off"
                className="mono w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
              />
            </div>
            <button
              type="submit"
              disabled={pending === "lookup" || !lookup.trim()}
              aria-label="GET key"
              className="mono rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition-all hover:border-emerald-300/60 hover:shadow-[0_0_22px_-4px_hsl(158_84%_47%/0.7)] disabled:opacity-40"
            >
              <Search className="inline h-3.5 w-3.5" /> GET
            </button>
          </form>

          {/* keyspace rows */}
          <div className="mt-4 flex flex-col gap-2">
            {loading && !entries.length ? (
              [0, 1].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
                <KeyRound className="h-6 w-6 text-slate-600" />
                <p className="text-sm text-slate-400">No cache keys yet</p>
                <p className="mono text-[11px] text-slate-600">
                  create one above — then watch its TTL countdown
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {entries.map((entry) => {
                  const remaining = Math.max(0, entry.ttl - Math.floor((now - fetchedAt) / 1000));
                  const total = barTotal(entry.ttl);
                  return (
                    <motion.div
                      key={entry.name}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-black/25 px-4 py-3"
                    >
                      <span className="mono truncate text-sm text-cyan-300">
                        liveboard:cache:{entry.name}
                      </span>
                      <span className="mono hidden max-w-[220px] truncate rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300 sm:inline-block">
                        "{entry.value}"
                      </span>
                      <span className="flex-1" />
                      <TtlBar remaining={remaining} total={total} />
                      <button
                        type="button"
                        onClick={() => hitOnRow(entry)}
                        disabled={pending === entry.name}
                        aria-label={`GET ${entry.name}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        GET
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(entry)}
                        disabled={pending === entry.name}
                        aria-label={`Delete ${entry.name}`}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
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
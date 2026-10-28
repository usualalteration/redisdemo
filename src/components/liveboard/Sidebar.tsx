import { Database, Gauge, Activity, BarChart3, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, scrollToSection } from "./nav";

interface SidebarProps {
  activeId: string;
  connected: boolean;
}

export function Sidebar({ activeId, connected }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/5 bg-[hsl(222_53%_6%/0.72)] backdrop-blur-xl md:flex">
      {/* illuminated logo */}
      <div className="relative px-5 pb-5 pt-6">
        <div className="pointer-events-none absolute left-3 top-4 h-16 w-16 rounded-full bg-violet-500/30 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="glow-violet relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg">
            <Zap className="h-5 w-5 text-white" fill="currentColor" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">
              Redis <span className="text-gradient-violet">LiveBoard</span>
            </p>
            <p className="mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              live demo
            </p>
          </div>
        </div>
      </div>

      {/* navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "font-medium text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-glow"
                  className="absolute inset-0 rounded-xl border border-violet-400/25 bg-gradient-to-r from-violet-500/15 to-cyan-500/10"
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-4 w-4 transition-colors",
                  active ? "text-violet-300" : "text-slate-500 group-hover:text-slate-300",
                )}
              />
              <span className="relative">{item.label}</span>
              {active && (
                <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_hsl(187_92%_53%/0.9)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* connection footer */}
      <div className="px-5 pb-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "pulse-dot h-2 w-2 rounded-full",
                connected ? "bg-emerald-400" : "bg-rose-400",
              )}
            />
            <p className={cn("text-[11px] font-medium", connected ? "text-emerald-300" : "text-rose-300")}>
              {connected ? "Redis connected" : "Reconnecting…"}
            </p>
          </div>
          <p className="mono mt-1.5 text-[9px] leading-relaxed text-slate-600">
            React → OpenServerless → Redis
          </p>
        </div>
      </div>
    </aside>
  );
}
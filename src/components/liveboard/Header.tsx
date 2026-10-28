import { Database, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, scrollToSection } from "./nav";

interface HeaderProps {
  connected: boolean;
  redisVersion: string | null;
}

export function Header({ connected, redisVersion }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[hsl(222_53%_7%/0.75)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          {/* compact logo for mobile */}
          <div className="glow-violet flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 md:hidden">
            <Radio className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Redis <span className="text-gradient-violet">Command Center</span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Interactive dashboard · every value below lives in Redis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* live connection indicator */}
          <span
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium",
              connected
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                : "border-rose-400/25 bg-rose-500/10 text-rose-300",
            )}
            role="status"
          >
            <span
              className={cn(
                "pulse-dot h-2 w-2 rounded-full",
                connected ? "bg-emerald-400" : "bg-rose-400",
              )}
            />
            {connected ? "Live" : "Offline"}
          </span>

          {/* Redis status badge */}
          <span className="mono flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 shadow-[0_0_20px_-6px_hsl(258_90%_66%/0.6)]">
            <Database className="h-3.5 w-3.5" />
            {redisVersion ? `Redis ${redisVersion}` : "Redis"}
          </span>
        </div>
      </div>

      {/* mobile horizontal nav */}
      <nav
        className="flex items-center gap-1.5 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden"
        aria-label="Dashboard sections"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-all active:bg-white/10"
            >
              <Icon className="h-3 w-3 text-slate-400" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
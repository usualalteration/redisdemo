import { useEffect, useState } from "react";
import { api, type StatsState } from "@/lib/liveboard";
import { usePolling, useTicker } from "@/hooks/usePolling";
import { Sidebar } from "@/components/liveboard/Sidebar";
import { Header } from "@/components/liveboard/Header";
import { Counters } from "@/components/liveboard/Counters";
import { Leaderboard } from "@/components/liveboard/Leaderboard";
import { CacheExplorer } from "@/components/liveboard/CacheExplorer";
import { ActivityFeed } from "@/components/liveboard/ActivityFeed";
import { StatsPanel } from "@/components/liveboard/StatsPanel";

const Index = () => {
  // Shared stats polling feeds the header badge, the connection
  // indicator and the statistics panel without extra API calls.
  const { data: stats, error: statsError } = usePolling<StatsState>(api.stats, 6000);
  const connected = !statsError;
  const redisVersion = stats?.server?.redisVersion ?? null;

  const now = useTicker(1000); // clock for relative timestamps

  const [activeId, setActiveId] = useState("counters");

  // Highlight the nav item for the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: 0 },
    );
    ["counters", "leaderboard", "cache", "activity", "stats"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* ambient background layers */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#080D1A]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <div className="pointer-events-none fixed -top-40 left-1/4 -z-10 h-96 w-96 rounded-full bg-violet-600/25 blur-[128px]" />
      <div className="pointer-events-none fixed right-0 top-1/3 -z-10 h-80 w-80 rounded-full bg-cyan-500/15 blur-[128px]" />
      <div className="pointer-events-none fixed bottom-0 left-1/3 -z-10 h-72 w-72 rounded-full bg-rose-500/10 blur-[128px]" />

      <Sidebar activeId={activeId} connected={connected} />

      <div className="md:pl-56">
        <Header connected={connected} redisVersion={redisVersion} />

        <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 md:px-8">
          <Counters />
          <Leaderboard />
          <CacheExplorer />
          <ActivityFeed now={now} />
          <StatsPanel stats={stats} connected={connected} />

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 py-6 text-[11px] text-slate-600">
            <p className="mono">
              Redis LiveBoard · React → Nuvolaris OpenServerless → Redis
            </p>
            <p className="mono">
              counters · sorted sets · TTL keys · streams · INFO stats
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
import { Activity, BarChart3, Database, Gauge, Trophy } from "lucide-react";

export const NAV_ITEMS = [
  { id: "counters", label: "Counters", icon: Gauge },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "cache", label: "Cache", icon: Database },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "stats", label: "Statistics", icon: BarChart3 },
];

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
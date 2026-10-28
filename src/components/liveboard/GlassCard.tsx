import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type GlowColor = "violet" | "cyan" | "coral" | "emerald" | "none";

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  glow?: GlowColor;
  delay?: number;
}

const glowClass: Record<GlowColor, string> = {
  violet: "glow-violet",
  cyan: "glow-cyan",
  coral: "glow-coral",
  emerald: "glow-emerald",
  none: "",
};

/** Glassmorphism panel with soft gradient glow behind it. */
export function GlassCard({ className, glow = "none", delay = 0, children, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn("glass rounded-2xl", glowClass[glow], className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface SectionHeaderProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
}

/** Section title row shared by the five demo panels. */
export function SectionHeader({ title, subtitle, icon, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-300 shadow-[0_0_20px_-6px_hsl(187_92%_53%/0.6)]">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

/** Skeleton bar for loading states. */
export function SkeletonRow({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}
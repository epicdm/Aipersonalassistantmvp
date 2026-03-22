import { LucideIcon } from "lucide-react";

const COLOR_MAP = {
  indigo: {
    bg: "bg-indigo-500/10",
    icon: "text-indigo-400",
    glow: "shadow-indigo-500/10",
  },
  green: {
    bg: "bg-green-500/10",
    icon: "text-green-400",
    glow: "shadow-green-500/10",
  },
  violet: {
    bg: "bg-violet-500/10",
    icon: "text-violet-400",
    glow: "shadow-violet-500/10",
  },
  amber: {
    bg: "bg-amber-500/10",
    icon: "text-amber-400",
    glow: "shadow-amber-500/10",
  },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: keyof typeof COLOR_MAP;
}

export default function StatCard({ icon: Icon, label, value, sub, color = "indigo" }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg ${c.glow}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-zinc-100 font-mono">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
        </div>
        <div className={`${c.bg} p-2.5 rounded-xl`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}

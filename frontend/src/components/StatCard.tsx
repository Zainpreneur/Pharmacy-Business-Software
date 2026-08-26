interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

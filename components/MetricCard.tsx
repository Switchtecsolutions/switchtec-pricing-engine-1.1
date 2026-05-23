import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  tone?: "dark" | "light" | "accent";
  icon?: ReactNode;
}

export function MetricCard({ label, value, tone = "light", icon }: MetricCardProps) {
  const styles = {
    dark: "bg-switchtec-forest text-white shadow-soft",
    light: "border border-switchtec-line/80 bg-[#fffdf8] text-switchtec-ink shadow-panel",
    accent: "border border-[#D7DDD4] bg-[#EEF3EA] text-switchtec-ink shadow-panel"
  };

  return (
    <div className={`rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-soft ${styles[tone]}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={`text-sm font-medium ${tone === "light" ? "text-[#66756f]" : "text-current/75"}`}>
          {label}
        </p>
        {icon ? <div className="text-current/75">{icon}</div> : null}
      </div>
      <p className="text-2xl font-bold tracking-normal">{value}</p>
    </div>
  );
}

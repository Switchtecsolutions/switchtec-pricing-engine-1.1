import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#66756f]">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs leading-5 text-[#7b8780]">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-switchtec-line bg-[#fbfaf6] px-4 text-sm font-medium text-switchtec-ink outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus:border-switchtec-sage focus:bg-white focus:ring-4 focus:ring-[#6F8A75]/15";

export const selectClass =
  "h-12 w-full rounded-xl border border-switchtec-line bg-[#fbfaf6] px-4 text-sm font-medium text-switchtec-ink outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus:border-switchtec-sage focus:bg-white focus:ring-4 focus:ring-[#6F8A75]/15";

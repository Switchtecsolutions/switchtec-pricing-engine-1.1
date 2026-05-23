import { BatteryCharging, Calculator, FileText, Settings, SunMedium, Zap } from "lucide-react";
import type { View } from "../App";

interface SidebarProps {
  view: View;
  setView: (view: View) => void;
}

const nav = [
  { view: "calculator" as const, label: "Pricing", icon: Calculator },
  { view: "quote" as const, label: "Client Quote", icon: FileText },
  { view: "saved" as const, label: "Saved Quotes", icon: BatteryCharging },
  { view: "settings" as const, label: "Settings", icon: Settings }
];

export function Sidebar({ view, setView }: SidebarProps) {
  return (
    <aside className="flex min-h-full flex-col bg-switchtec-forest p-6 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72">
      <div className="mb-10 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-switchtec-sand text-switchtec-forest shadow-lg">
          <Zap size={25} strokeWidth={2.6} />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-normal">Switchtec</p>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#EDE6DA]/75">
            Pricing Engine
          </p>
        </div>
      </div>

      <nav className="space-y-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium transition ${
                active
                  ? "bg-[#FAF8F3] text-switchtec-forest shadow-lg"
                  : "text-[#FAF8F3]/72 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.07] p-4">
        <div className="mb-3 flex items-center gap-2 text-switchtec-sand">
          <SunMedium size={18} />
          <span className="text-sm font-semibold">Residential Solar</span>
        </div>
        <p className="text-sm leading-6 text-[#FAF8F3]/68">
          Built for fast, consistent solar and battery quotes across Australian installs.
        </p>
      </div>
    </aside>
  );
}

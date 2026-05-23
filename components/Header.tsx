import { Download, Save } from "lucide-react";

interface HeaderProps {
  onSave: () => void;
  onExport: () => void;
}

export function Header({ onSave, onExport }: HeaderProps) {
  return (
    <header className="mb-9 flex flex-col justify-between gap-5 border-b border-switchtec-line/80 pb-7 md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-32 shrink-0 items-center justify-center rounded-2xl border border-switchtec-line bg-white/80 p-2 shadow-panel">
          <span className="text-2xl font-bold text-switchtec-forest">S</span>
          <img
            src="/switchtec-logo.png"
            alt="Switchtec logo"
            width={220}
            height={88}
            className="absolute inset-2 max-h-[calc(100%-1rem)] max-w-[calc(100%-1rem)] object-contain"
            style={{ width: "220px", maxWidth: "100%", height: "auto", maxHeight: "56px", objectFit: "contain" }}
            onLoad={(event) => {
              const fallback = event.currentTarget.previousElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "none";
            }}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-switchtec-sage">
            Solar + Battery quoting
          </p>
          <h1 className="text-3xl font-bold tracking-normal text-switchtec-ink md:text-4xl">
            Switchtec Pricing Engine
          </h1>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onSave}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-switchtec-line bg-[#fffdf8] px-5 text-sm font-semibold text-switchtec-ink shadow-panel transition hover:-translate-y-0.5 hover:bg-white hover:shadow-soft"
        >
          <Save size={18} />
          Save quote
        </button>
        <button
          onClick={onExport}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-switchtec-forest px-5 text-sm font-semibold text-white shadow-panel transition hover:-translate-y-0.5 hover:bg-switchtec-green hover:shadow-soft"
        >
          <Download size={18} />
          Export PDF
        </button>
      </div>
    </header>
  );
}

import { FolderOpen, Trash2 } from "lucide-react";
import { money, number1 } from "../utils/format";
import type { SavedQuote } from "../types";

interface SavedQuotesProps {
  quotes: SavedQuote[];
  onOpen: (quote: SavedQuote) => void;
  onDelete: (id: string) => void;
}

export function SavedQuotes({ quotes, onOpen, onDelete }: SavedQuotesProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-switchtec-sage">
          Local archive
        </p>
        <h2 className="text-3xl font-bold tracking-normal text-switchtec-ink">Saved Quotes</h2>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-switchtec-line bg-[#fffdf8] p-10 text-center shadow-panel">
          <p className="text-lg font-semibold text-switchtec-ink">No saved quotes yet</p>
          <p className="mt-2 text-slate-500">Save a quote from the pricing screen and it will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <article
              key={quote.input.id}
              className="rounded-2xl border border-switchtec-line/70 bg-[#fffdf8] p-5 shadow-panel transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-switchtec-ink">{quote.input.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {quote.input.clientName || "Residential Customer"} - {number1(quote.input.solarSizeKw)} kW solar -{" "}
                    {number1(quote.calculations.batterySizeKwh)} kWh battery
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="rounded-2xl bg-switchtec-mint px-4 py-3 text-lg font-bold text-switchtec-ink">
                    {money(quote.calculations.finalSellPrice)}
                  </p>
                  <button
                    onClick={() => onOpen(quote)}
                    className="grid h-11 w-11 place-items-center rounded-xl bg-switchtec-forest text-white transition hover:bg-switchtec-green"
                    aria-label="Open quote"
                  >
                    <FolderOpen size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(quote.input.id)}
                    className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                    aria-label="Delete quote"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

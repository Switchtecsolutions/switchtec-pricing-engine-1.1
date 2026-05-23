import { useEffect, useMemo, useRef, useState } from "react";

export interface SearchableOption {
  value: string;
  label: string;
  searchText?: string;
  stockRank?: number;
  data?: unknown;
}

const normalizeComboboxSearch = (value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[-_/.,()]+/g, " ")
    .replace(/\bgate\s+way\b/g, "gateway")
    .replace(/\bchange\s+over\b/g, "changeover")
    .replace(/\bsigen\s*stor\b/g, "sigenstor")
    .replace(/\bwi\s*fi\b/g, "wifi")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const additions = new Set<string>();
  if (/\bgateway\b/.test(normalized)) additions.add("gate way backup gateway energy gateway smart gateway");
  if (/\bsigenergy\b|\bsigen\b|\bsigenstor\b/.test(normalized)) additions.add("sigenergy sigen sigenstor");
  if (/\bcomms?\b|\bcommunication\b/.test(normalized)) additions.add("comms communication");
  if (/\bct\b|\bcurrent transformer\b/.test(normalized)) additions.add("ct current transformer");
  if (/\bmeter\b|\bsmart meter\b/.test(normalized)) additions.add("meter smart meter");
  if (/\bbackup\b/.test(normalized)) additions.add("backup gateway backup interface");
  if (/\bchangeover\b/.test(normalized)) additions.add("change over change-over changeover switch");
  if (/\bswitch(?:es)?\b/.test(normalized)) additions.add("switch switches");
  return [normalized, ...additions].join(" ");
};

interface SearchableSelectProps {
  value: string;
  options: SearchableOption[];
  placeholder: string;
  emptyMessage?: string;
  minQueryLength?: number;
  maxResults?: number;
  onChange: (value: string, option?: SearchableOption) => void;
}

export function SearchableSelect({
  value,
  options,
  placeholder,
  emptyMessage = "No matching products found.",
  minQueryLength = 0,
  maxResults = 50,
  onChange
}: SearchableSelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setIsSearching(false);
    }
  }, [open, selected?.label]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filteredOptions = useMemo(() => {
    const trimmedQuery = normalizeComboboxSearch(isSearching ? query : "");
    const terms = trimmedQuery.split(/\s+/).filter(Boolean);
    if (trimmedQuery.length < minQueryLength) return [];
    return options
      .map((option, index) => ({ option, index, text: normalizeComboboxSearch(option.searchText ?? option.label) }))
      .filter(({ text }) => {
        return terms.every((term) => text.includes(term));
      })
      .sort((a, b) => {
        const stock = (a.option.stockRank ?? 1) - (b.option.stockRank ?? 1);
        if (stock) return stock;
        const relevance = scoreSearchResult(a.text, terms) - scoreSearchResult(b.text, terms);
        if (relevance) return relevance;
        return a.index - b.index;
      })
      .map(({ option }) => option)
      .slice(0, maxResults);
  }, [isSearching, maxResults, minQueryLength, options, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length, query, open]);

  const displayValue = isSearching ? query : selected?.label ?? "";

  const selectOption = (option: SearchableOption) => {
    onChange(option.value, option);
    setQuery("");
    setIsSearching(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          className="h-12 w-full rounded-xl border border-switchtec-line bg-[#FBFAF6] px-4 pr-24 text-sm font-medium text-switchtec-ink outline-none transition focus:border-switchtec-green focus:ring-4 focus:ring-switchtec-green/10"
          value={displayValue}
          placeholder={placeholder}
          onFocus={(event) => {
            setOpen(true);
            setIsSearching(false);
            event.currentTarget.select();
          }}
          onClick={() => {
            setOpen(true);
            setIsSearching(false);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsSearching(true);
            setOpen(true);
            if (value) onChange("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setHighlightedIndex((index) => Math.min(index + 1, Math.max(filteredOptions.length - 1, 0)));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setHighlightedIndex((index) => Math.max(index - 1, 0));
              return;
            }
            if (event.key === "Enter" && open && filteredOptions[highlightedIndex]) {
              event.preventDefault();
              selectOption(filteredOptions[highlightedIndex]);
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="absolute right-10 top-2.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#66756f] transition hover:bg-switchtec-mint"
            onClick={() => {
              setQuery("");
              setIsSearching(true);
              onChange("");
              setOpen(true);
            }}
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          className="absolute right-3 top-2.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#66756f] transition hover:bg-switchtec-mint"
          aria-label="Open options"
          onClick={() => {
            setOpen(true);
            setIsSearching(false);
          }}
        >
          v
        </button>
      </div>
      {open ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-switchtec-line bg-[#fffdf8] p-2 shadow-panel">
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm text-switchtec-ink transition hover:bg-switchtec-mint ${
                  index === highlightedIndex ? "bg-switchtec-mint" : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-[#66756f]">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function scoreSearchResult(text: string, terms: string[]) {
  if (!terms.length) return 0;
  return terms.reduce((score, term) => {
    const index = text.indexOf(term);
    return score + (index >= 0 ? index : 1000);
  }, 0);
}

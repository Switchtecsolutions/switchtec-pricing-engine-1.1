import { BadgeCheck, CalendarDays, PenLine } from "lucide-react";
import { money, number1 } from "../utils/format";
import type { QuoteCalculations, QuoteInput } from "../types";

interface ClientQuoteProps {
  input: QuoteInput;
  calculations: QuoteCalculations;
}

export function ClientQuote({ input, calculations }: ClientQuoteProps) {
  const quoteDate = new Date(input.createdAt).toLocaleDateString("en-AU");
  const hasBattery = input.batteryName !== "No Battery";

  return (
    <div className="quote-page overflow-hidden rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] shadow-soft print:rounded-none print:border-0 print:shadow-none">
      <div className="border-b border-switchtec-line/70 bg-[#FAF8F3] px-8 py-8 md:px-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-40 shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
              <span className="text-xl font-semibold text-switchtec-forest">S</span>
              <img
                src="/switchtec-logo.png"
                alt="Switchtec logo"
                width={260}
                height={104}
                className="absolute inset-2 max-h-[calc(100%-1rem)] max-w-[calc(100%-1rem)] object-contain"
                style={{ width: "260px", maxWidth: "100%", height: "auto", maxHeight: "80px", objectFit: "contain" }}
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
              <p className="text-xl font-semibold tracking-normal text-switchtec-ink">
                Switchtec Electrical & Solar Solutions
              </p>
              <p className="mt-1 text-sm font-medium text-[#66756f]">Residential solar + battery proposal</p>
            </div>
          </div>
          <div className="space-y-1 text-sm leading-6 text-[#66756f] md:text-right">
            <p>
              <span className="font-medium text-switchtec-ink">Website:</span>{" "}
              <a href="https://www.switchtecsolutions.com.au">www.switchtecsolutions.com.au</a>
            </p>
            <p>
              <span className="font-medium text-switchtec-ink">Email:</span>{" "}
              <a href="mailto:info@switchtecsolutions.com.au">info@switchtecsolutions.com.au</a>
            </p>
            <p>
              <span className="font-medium text-switchtec-ink">Licence:</span> 302858C
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 md:p-12">
        <div className="mb-10 grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-switchtec-sage">
              Prepared for
            </p>
            <h1 className="text-4xl font-semibold tracking-normal text-switchtec-ink">
              {input.clientName || "Residential Customer"}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              {input.address || "Australian residential installation"} {input.postcode ? `, ${input.postcode}` : ""}
            </p>
            <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>
                <span className="font-medium text-switchtec-ink">Quote:</span> {input.name}
              </p>
              <p>
                <span className="font-medium text-switchtec-ink">Quote date:</span> {quoteDate}
              </p>
              <p>
                <span className="font-medium text-switchtec-ink">Valid until:</span>{" "}
                {calculations.quoteValidUntil}
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-switchtec-line bg-[#F7F4EE] p-7">
            <p className="text-sm font-medium text-switchtec-sage">Final Customer Price inc GST</p>
            <p className="mt-3 text-4xl font-semibold tracking-normal text-switchtec-ink">
              {money(calculations.finalSellPrice)}
            </p>
            <p className="mt-2 text-sm font-medium text-switchtec-ink/75">
              Total GST included: {money(calculations.totalGst)}
            </p>
            <div className="mt-6 space-y-3 border-t border-switchtec-line/70 pt-5 text-sm">
              <PriceLine label="Total system price before rebates inc GST" value={money(calculations.priceBeforeRebatesIncGst)} />
              <PriceLine label="Less solar rebate GST-free" value={`-${money(calculations.solarRebate)}`} good />
              <PriceLine label="Less battery rebate GST-free" value={`-${money(calculations.batteryRebate)}`} good />
              <PriceLine label="Final customer price inc GST" value={money(calculations.finalCustomerPriceIncGst)} strong />
            </div>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-3">
          <QuoteStat label="Solar" value={`${number1(calculations.actualSolarKw)} kW system / ${calculations.solarPanelCount} panels`} />
          <QuoteStat
            label="Battery"
            value={hasBattery ? `${number1(calculations.batterySizeKwh)} kWh` : "No battery selected"}
          />
          <QuoteStat label="Inverter" value={`${input.inverterType} - ${input.inverterBrand} ${input.inverterSize} ${input.phase}`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-switchtec-line bg-white/70 p-7">
            <div className="mb-5 flex items-center gap-3">
              <BadgeCheck className="text-switchtec-green" size={22} />
              <h2 className="text-xl font-medium text-switchtec-ink">System Summary</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <Line label="Requested solar size" value={`${number1(input.solarSizeKw)} kW`} />
              <Line label="Actual installed kW" value={`${number1(calculations.actualSolarKw)} kW`} />
              <Line label="Roof type" value={input.roofType} />
              <Line label="Phase" value={input.phase} />
              <Line label="Panel" value={input.panelName} />
              <Line label="Panel count" value={`${calculations.solarPanelCount} panels`} />
              <Line label="Battery" value={input.batteryName} />
              <Line
                label="Battery capacity"
                value={hasBattery ? `${number1(calculations.batterySizeKwh)} kWh` : "No battery selected"}
              />
              <Line
                label="Inverter"
                value={`${input.inverterType} - ${input.inverterBrand} ${input.inverterSize}`}
              />
            </dl>
          </section>
          <section className="rounded-3xl border border-switchtec-line bg-white/70 p-7">
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays className="text-switchtec-green" size={22} />
              <h2 className="text-xl font-medium text-switchtec-ink">Notes / Inclusions</h2>
            </div>
            <p className="text-sm leading-7 text-slate-600">
              Includes standard residential installation, selected inverter, selected panels, selected battery
              storage where listed, mounting for the nominated roof type, commissioning and handover. Estimated
              rebates are GST-free and applied after GST is calculated. Included accessories and commissioning
              equipment are provided as required for the selected system.
            </p>
            {input.extraNote ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                <span className="font-medium text-switchtec-ink">Additional inclusion:</span> {input.extraNote}
              </p>
            ) : null}
          </section>
        </div>

        <div className="mt-10 rounded-3xl border border-dashed border-[#BFC8BA] p-7">
          <div className="mb-8 flex items-center gap-3 text-switchtec-ink">
            <PenLine size={22} />
            <h2 className="text-xl font-medium">Payment / Acceptance</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <Signature label="Customer signature" />
            <Signature label="Date" />
          </div>
          <p className="mt-6 text-sm leading-6 text-slate-500">
            Acceptance confirms approval to proceed with the quoted system and final customer price inc GST shown
            above, subject to final site inspection and network approvals where applicable.
          </p>
        </div>

        <footer className="mt-10 border-t border-switchtec-line/70 pt-6 text-center text-xs leading-6 text-[#66756f]">
          <p className="font-medium text-switchtec-ink">Thank you for choosing Switchtec Electrical & Solar Solutions.</p>
          <p>
            Switchtec Electrical & Solar Solutions | www.switchtecsolutions.com.au | info@switchtecsolutions.com.au |
            Licence 302858C
          </p>
        </footer>
      </div>
    </div>
  );
}

function QuoteStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-switchtec-line/70 bg-[#FAF8F3] p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal text-switchtec-ink">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-5 border-b border-slate-100 pb-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-switchtec-ink">{value}</dd>
    </div>
  );
}

function PriceLine({ label, value, strong, good }: { label: string; value: string; strong?: boolean; good?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-switchtec-line/70 pt-3" : ""}`}>
      <span className={strong ? "font-medium text-switchtec-ink" : "text-switchtec-ink/70"}>{label}</span>
      <strong className={`${good ? "text-switchtec-green" : "text-switchtec-ink"} ${strong ? "font-semibold" : "font-medium"}`}>
        {value}
      </strong>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="h-16 border-b border-slate-300" />
      <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

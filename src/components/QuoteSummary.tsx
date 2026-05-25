import { CheckCircle2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { money, number1 } from "../utils/format";
import type { QuoteCalculations, QuoteInput } from "../types";

interface QuoteSummaryProps {
  input: QuoteInput;
  calculations: QuoteCalculations;
}

export function QuoteSummary({ input, calculations }: QuoteSummaryProps) {
  const batteryItems = input.selectedBatteryItems ?? [];
  const batterySummary = batteryItems.length
    ? batteryItems.map((item) => `${item.qty} x ${item.name}`).join(", ")
    : calculations.batterySizeKwh > 0
      ? input.batteryName
      : "No battery selected";

  return (
    <aside className="space-y-5 lg:sticky lg:top-8">
      <div className="rounded-3xl bg-switchtec-forest p-7 text-white shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-switchtec-sand">
              Final Customer Price inc GST
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-normal">
              {money(calculations.finalCustomerPriceIncGst)}
            </h2>
          </div>
          <Sparkles className="text-switchtec-sand" size={26} />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-sm">
          <div>
            <p className="text-white/60">Solar</p>
            <p className="font-semibold">{number1(calculations.actualSolarKw)} kW</p>
          </div>
          <div>
            <p className="text-white/60">Battery</p>
            <p className="font-semibold">{number1(calculations.batterySizeKwh)} kWh</p>
          </div>
          <div className="col-span-2">
            <p className="text-white/60">Inverter</p>
            <p className="font-semibold">
              {input.inverterType} - {input.inverterBrand} {input.inverterSize} {input.phase}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <MetricCard label="Fast Win" value={money(calculations.fastWinPrice)} icon={<TrendingUp size={19} />} />
        <MetricCard
          label="Balanced"
          value={money(calculations.balancedPrice)}
          tone="accent"
          icon={<CheckCircle2 size={19} />}
        />
        <MetricCard
          label="High Margin"
          value={money(calculations.highMarginPrice)}
          icon={<ShieldCheck size={19} />}
        />
      </div>

      <div className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <h3 className="mb-4 text-lg font-semibold text-switchtec-ink">Cost Breakdown</h3>
        <dl className="space-y-4 text-base">
          <Group label="System" />
          <Row label="Requested solar size" value={`${number1(input.solarSizeKw)} kW`} />
          <Row label="Panel type" value={input.panelName} />
          <Row label="Panel count" value={`${calculations.solarPanelCount} panels`} />
          <Row label="Actual installed kW" value={`${number1(calculations.actualSolarKw)} kW`} />
          <Row label="Battery items" value={batterySummary} />
          <Row label="Battery kWh" value={`${number1(calculations.batterySizeKwh)} kWh`} />
          <Row label="Inverter type" value={input.inverterType} />
          <Row label="Phase" value={input.phase} />
          <Row label="Inverter" value={`${input.inverterBrand} ${input.inverterSize}`} />

          <Group label="Hardware" />
          <Row label="Solar panels ex GST" value={money(calculations.solarHardwareCost)} />
          <Row label="Battery ex GST" value={money(calculations.batteryHardwareCost)} />
          <Row label="Inverter ex GST" value={money(calculations.inverterHardwareCost)} />
          {input.roofType === "Tile" ? (
            <Row label="Tile kits" value={`${calculations.tileKitCount} / ${money(calculations.tileKitCost)}`} />
          ) : (
            <Row label="Tin kits" value={`${calculations.tinKitCount} / ${money(calculations.tinKitCost)}`} />
          )}
          <Row label="Rails" value={`${calculations.railCount} / ${money(calculations.railCost)}`} />
          <Row label="Roof add-on ex GST" value={money(calculations.roofAddonCost)} />
          <Row label="Mounting ex GST" value={money(calculations.mountingCost)} strong />
          <Row label="Accessories ex GST" value={money(calculations.accessoryTotalExGst)} />
          <Row label="Hardware ex GST" value={money(calculations.hardwareExGst)} strong />
          <Row label="Hardware GST" value={money(calculations.hardwareGst)} />
          <Row label="Hardware inc GST" value={money(calculations.hardwareIncGst)} strong />

          <Group label="Business Pricing" />
          <Row label="Solar install ex GST" value={money(calculations.solarInstallExGst)} />
          <Row label="Battery install ex GST" value={money(calculations.batteryInstallExGst)} />
          <Row label="Extras ex GST" value={money(calculations.extrasExGst)} />
          <Row label="Margin ex GST" value={money(calculations.marginExGst)} />
          <Row label="Business pricing GST" value={money(calculations.businessGst)} />
          <Row label="Business pricing inc GST" value={money(calculations.businessTotalIncGst)} strong />

          <Group label="Rebates" />
          <Row label="Actual installed kW" value={`${number1(calculations.actualSolarKw)} kW`} />
          <Row label="Solar zone rating" value={String(calculations.solarZoneRating)} />
          <Row label="Solar deeming years" value={String(calculations.solarDeemingYears)} />
          <Row label="Solar STCs" value={String(calculations.solarStcs)} />
          <Row label="Solar STC price" value={money(calculations.solarStcPrice)} />
          <Row label="Solar rebate GST-free" value={`-${money(calculations.solarRebate)}`} good />
          <Row label="Battery rebate GST-free" value={`-${money(calculations.batteryRebate)}`} good />

          <Group label="Final" />
          <Row label="Customer price before rebates inc GST" value={money(calculations.priceBeforeRebatesIncGst)} strong />
          <Row label="Final customer price inc GST" value={money(calculations.finalCustomerPriceIncGst)} strong />
        </dl>
      </div>
    </aside>
  );
}

function Group({ label }: { label: string }) {
  return (
    <dt className="border-t border-switchtec-line/70 pt-5 text-xs font-semibold uppercase tracking-[0.16em] text-switchtec-sage">
      {label}
    </dt>
  );
}

function Row({ label, value, strong, good }: { label: string; value: string; strong?: boolean; good?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-slate-100 pt-3" : ""}`}>
      <dt className={strong ? "font-semibold text-switchtec-ink" : "text-[#66756f]"}>{label}</dt>
      <dd className={`text-lg font-bold text-right ${good ? "text-switchtec-sage" : "text-switchtec-ink"}`}>{value}</dd>
    </div>
  );
}

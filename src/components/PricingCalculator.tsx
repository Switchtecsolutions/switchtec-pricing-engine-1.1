import { useState } from "react";
import type { ReactNode } from "react";
import { Battery, MapPin, PanelsTopLeft, Plus, Trash2 } from "lucide-react";
import { Field, inputClass, selectClass } from "./Field";
import { SearchableSelect, type SearchableOption } from "./SearchableSelect";
import { money, number1 } from "../utils/format";
import { activeManualBatteries, activeManualPanels } from "../utils/manualProducts";
import {
  dedupeSupplierPanels,
  effectiveProductPrice,
  getNormalizedCategory,
  isAccessorySearchProduct,
  isBatteryDropdownProduct,
  isPanelDropdownProduct,
  isProductSelectableForQuote,
  normalizeSearchText,
  batteryProductLabel,
  productLabel,
  stockLabel,
  stockSortRank,
  supplierProductSearchText
} from "../utils/supplierProducts";
import type {
  BatteryName,
  InverterBrand,
  InverterSize,
  InverterType,
  PanelName,
  Phase,
  PricingConfig,
  QuoteCalculations,
  QuoteInput,
  RoofType,
  SupplierProduct
} from "../types";

interface PricingCalculatorProps {
  input: QuoteInput;
  config: PricingConfig;
  calculations: QuoteCalculations;
  supplierProducts: SupplierProduct[];
  onChange: (patch: Partial<QuoteInput>) => void;
}

const roofTypes: RoofType[] = ["Tin", "Klip Lok", "Tile"];
const phases: Phase[] = ["Single Phase", "3 Phase"];
const inverterTypes: InverterType[] = ["Hybrid inverter", "Grid inverter"];
const modules = Array.from({ length: 12 }, (_, index) => index + 1);

export function PricingCalculator({ input, config, calculations, supplierProducts, onChange }: PricingCalculatorProps) {
  const [panelBrandFilter, setPanelBrandFilter] = useState("");
  const [batteryBrandFilter, setBatteryBrandFilter] = useState("");
  const [accessoryBrandFilter, setAccessoryBrandFilter] = useState("");
  const [accessoryProductId, setAccessoryProductId] = useState("");
  const [selectedAccessoryProduct, setSelectedAccessoryProduct] = useState<SupplierProduct | null>(null);
  const [accessoryQuantity, setAccessoryQuantity] = useState(1);
  const [accessoryValidation, setAccessoryValidation] = useState("");
  const unhiddenProducts = supplierProducts.filter((product) => !product.hidden);
  const approvedBrands = config.approvedTradezoneBrands;
  const activeProducts = supplierProducts.filter((product) => isProductSelectableForQuote(product, approvedBrands));
  const manualPanels = activeManualPanels(config);
  const manualBatteries = activeManualBatteries(config);
  const selectedBatteryProduct = unhiddenProducts.find((product) => product.id === input.batteryProductId);
  const selectedInverterProduct = unhiddenProducts.find((product) => product.id === input.inverterProductId);
  const selectedBattery =
    selectedBatteryProduct ??
    config.batteries.find((battery) => battery.name === input.batteryName) ??
    config.batteries[0];
  const hasBattery = Boolean(input.batteryProductId) || input.batteryName !== "No Battery";
  const inverterTable =
    config.invertersByType[input.inverterType]?.[input.phase] ??
    config.invertersByType["Hybrid inverter"]["Single Phase"];
  const selectedSizeKw = parseKw(input.inverterSize);

  const selectablePanels = dedupeSupplierPanels(activeProducts.filter((product) => isPanelDropdownProduct(product, approvedBrands)));
  const selectableBatteries = activeProducts.filter((product) => isBatteryDropdownProduct(product, approvedBrands));
  const panelBrands = uniqueBrands([
    ...manualPanels.map((panel) => panel.brand || brandFromText(panel.name)),
    ...selectablePanels.map((product) => product.brand || product.manufacturer)
  ]);
  const batteryBrands = uniqueBrands([
    ...manualBatteries.filter((battery) => battery.name !== "No Battery").map((battery) => battery.brand || brandFromText(battery.name)),
    ...selectableBatteries.map((product) => product.brand || product.manufacturer)
  ]);
  const manualPanelOptions = manualPanels.filter((panel) => brandFilterMatches(`${panel.brand ?? ""} ${panel.name}`, panelBrandFilter));
  const manualBatteryOptions = manualBatteries.filter(
    (battery) =>
      battery.name === "No Battery" ||
      brandFilterMatches(`${battery.brand ?? ""} ${battery.name} ${manualAliases(battery)}`, batteryBrandFilter)
  );
  const importedPanels = selectablePanels.filter((product) => brandMatchesProduct(product, panelBrandFilter));
  const importedBatteries = selectableBatteries.filter((product) => brandMatchesProduct(product, batteryBrandFilter));
  const importedInverters = activeProducts.filter((product) => {
    const category = input.inverterType === "Hybrid inverter" ? "Hybrid Inverter" : "Grid Inverter";
    return supplierInverterMatches(product, category, input.phase, input.inverterBrand, selectedSizeKw);
  });
  const inverterBrands = Array.from(
    new Set([
      ...Object.keys(inverterTable),
      ...activeProducts
        .filter((product) => {
          const category = input.inverterType === "Hybrid inverter" ? "Hybrid Inverter" : "Grid Inverter";
          return getNormalizedCategory(product) === category && phaseMatchesProduct(product, input.phase);
        })
        .map((product) => product.brand)
    ])
  ) as InverterBrand[];
  const sizeFallbacks = [
    "1kW",
    "1.1kW",
    "1.5kW",
    "2kW",
    "2.5kW",
    "3kW",
    "3.3kW",
    "3.6kW",
    "3.7kW",
    "4kW",
    "4.2kW",
    "4.6kW",
    "5kW",
    "6kW",
    "7kW",
    "7.5kW",
    "8kW",
    "10kW",
    "12kW",
    "15kW",
    "17kW",
    "19.9kW",
    "20kW",
    "25kW",
    "29kW",
    "29.9kW",
    "30kW",
    "33kW",
    "40kW",
    "50kW",
    "60kW",
    "75kW",
    "80kW",
    "100kW",
    "110kW",
    "125kW",
    "150kW",
    "250kW",
    "255kW"
  ];
  const importedSizes = activeProducts
    .filter((product) => {
      const category = input.inverterType === "Hybrid inverter" ? "Hybrid Inverter" : "Grid Inverter";
      return getNormalizedCategory(product) === category && brandMatchesProduct(product, input.inverterBrand) && phaseMatchesProduct(product, input.phase) && product.sizeKw;
    })
    .map((product) => `${product.sizeKw}kW`);
  const inverterSizes = Array.from(
    new Set([...(inverterTable[input.inverterBrand] ? Object.keys(inverterTable[input.inverterBrand]) : []), ...importedSizes, ...sizeFallbacks])
  ) as InverterSize[];

  const accessoryProducts = unhiddenProducts.filter((product) => {
    const handledProductIds = new Set([input.panelProductId, input.batteryProductId, input.inverterProductId].filter(Boolean));
    return !handledProductIds.has(product.id) && isAccessorySearchProduct(product, approvedBrands);
  });
  const accessoryBrands = uniqueBrands(accessoryProducts.map((product) => product.brand || product.manufacturer || product.compatibleBrand));
  const filteredAccessoryProducts = accessoryProducts.filter((product) => brandMatchesProduct(product, accessoryBrandFilter));
  const selectedAccessories = input.selectedAccessories
    .map((accessory, index) => ({
      ...accessory,
      lineKey: accessoryLineKey(accessory, index),
      product: unhiddenProducts.find((product) => product.id === accessory.productId)
    }))
    .filter((accessory): accessory is typeof accessory & { product: SupplierProduct } => Boolean(accessory.product));

  const addAccessory = () => {
    const product = selectedAccessoryProduct ?? unhiddenProducts.find((item) => item.id === accessoryProductId);
    if (!product) {
      setAccessoryValidation("Select an accessory item first.");
      return;
    }

    const quantityToAdd = Math.max(1, Number(accessoryQuantity) || Number(product.defaultQuantity) || 1);
    const unitPriceExGst = effectiveProductPrice(product);
    const lineItem = {
      id: `accessory-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      productId: product.id,
      supplier: product.supplier || "Manual",
      sku: product.sku || product.supplierPartNumber || "",
      name: product.productName || product.model || product.description,
      brand: product.brand || "",
      quantity: quantityToAdd,
      qty: quantityToAdd,
      type: "Misc" as const,
      unitPriceExGst,
      lineTotalExGst: quantityToAdd * unitPriceExGst,
      stockStatus: product.stockStatus || "unknown",
      category: getNormalizedCategory(product)
    };

    onChange({ selectedAccessories: [...input.selectedAccessories, lineItem] });
    setAccessoryProductId("");
    setSelectedAccessoryProduct(null);
    setAccessoryQuantity(1);
    setAccessoryValidation("");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-switchtec-mint text-switchtec-forest">
            <PanelsTopLeft size={21} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-switchtec-ink">System Inputs</h2>
            <p className="text-sm text-slate-500">Client details, system products, mounting and accessories.</p>
          </div>
        </div>

        <InputGroup title="Job / Client Fields">
          <Field label="Quote Name">
            <input className={inputClass} value={input.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Client Name">
            <input className={inputClass} value={input.clientName} onChange={(e) => onChange({ clientName: e.target.value })} />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={input.address} onChange={(e) => onChange({ address: e.target.value })} />
          </Field>
          <Field label="Postcode">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                className={`${inputClass} pl-11`}
                value={input.postcode}
                inputMode="numeric"
                onChange={(e) => onChange({ postcode: e.target.value })}
              />
            </div>
          </Field>
        </InputGroup>

        <InputGroup title="Solar Panel Selection">
          <Field label="Requested Solar Size (kW)">
            <input
              className={inputClass}
              type="number"
              step="0.1"
              value={input.solarSizeKw}
              onChange={(e) => onChange({ solarSizeKw: Number(e.target.value) })}
            />
          </Field>
          <Field label="Panel Brand">
            <SearchableSelect
              value={panelBrandFilter || "__all"}
              placeholder="All panel brands"
              options={brandSelectOptions(panelBrands)}
              onChange={(value) => setPanelBrandFilter(value === "__all" ? "" : value)}
            />
          </Field>
          <Field label="Panel Type">
            <SearchableSelect
              value={input.panelProductId ? `supplier:${input.panelProductId}` : `manual:${input.panelName}`}
              placeholder="Search panels by brand, wattage or supplier"
              options={[
                ...manualPanelOptions.map((panel) => ({
                  value: `manual:${panel.name}`,
                  label: `Manual | ${manualPanelLabel(panel.name, panel.brand, panel.watt)} | ${panel.watt}W | ${money(panel.price)} ex GST`,
                  searchText: `manual ${panel.brand || ""} ${panel.name} ${panel.watt} ${panel.price}`
                })),
                ...importedPanels.map((panel) => productOption(panel, "supplier:"))
              ]}
              onChange={(value) => {
                const [source, productValue] = value.split(":");
                if (source === "supplier") {
                  const product = activeProducts.find((item) => item.id === productValue);
                  onChange({ panelProductId: productValue, panelName: product?.description ?? input.panelName });
                } else if (productValue) {
                  onChange({ panelProductId: "", panelName: productValue as PanelName });
                } else {
                  onChange({ panelProductId: "" });
                }
              }}
            />
          </Field>
        </InputGroup>

        <InputGroup title="Battery Selection">
          <Field label="Battery Brand">
            <SearchableSelect
              value={batteryBrandFilter || "__all"}
              placeholder="All battery brands"
              options={brandSelectOptions(batteryBrands)}
              onChange={(value) => setBatteryBrandFilter(value === "__all" ? "" : value)}
            />
          </Field>
          <Field label="Battery Type" hint={hasBattery ? `${batteryModuleKwh(selectedBattery)} kWh per module` : "Solar-only quote"}>
            <SearchableSelect
              value={input.batteryProductId ? `supplier:${input.batteryProductId}` : `manual:${input.batteryName}`}
              placeholder="Search batteries by brand or model"
              options={[
                ...manualBatteryOptions.map((battery) => ({
                  value: `manual:${battery.name}`,
                  label:
                    battery.name === "No Battery"
                      ? "No Battery"
                      : `Manual | ${battery.brand || "Battery"} | ${battery.name} | ${battery.kWh}kWh/module | ${money(battery.price)} ex GST`,
                  searchText: `manual ${battery.brand || ""} ${battery.name} ${manualAliases(battery)} ${battery.kWh} ${battery.price}`
                })),
                ...importedBatteries.map((battery) => batteryProductOption(battery, "supplier:"))
              ]}
              onChange={(value) => {
                const [source, productValue] = value.split(":");
                if (source === "supplier") {
                  const product = activeProducts.find((item) => item.id === productValue);
                  onChange({ batteryProductId: productValue, batteryName: product?.productName ?? product?.description ?? "Imported Battery" });
                } else if (productValue) {
                  onChange({ batteryProductId: "", batteryName: productValue as BatteryName });
                } else {
                  onChange({ batteryProductId: "" });
                }
              }}
            />
          </Field>
          {hasBattery ? (
            <Field label="Battery Modules">
              <select className={selectClass} value={input.batteryModules} onChange={(e) => onChange({ batteryModules: Number(e.target.value) })}>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </InputGroup>

        <InputGroup title="Inverter Selection">
          <Field label="Inverter Type">
            <select className={selectClass} value={input.inverterType} onChange={(e) => onChange({ inverterType: e.target.value as InverterType })}>
              {inverterTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Phase">
            <select className={selectClass} value={input.phase} onChange={(e) => onChange({ phase: e.target.value as Phase })}>
              {phases.map((phase) => (
                <option key={phase}>{phase}</option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select
              className={selectClass}
              value={input.inverterBrand}
              onChange={(e) => {
                const inverterBrand = e.target.value as InverterBrand;
                const nextSize = (inverterTable[inverterBrand] ? Object.keys(inverterTable[inverterBrand])[0] : input.inverterSize) as InverterSize;
                onChange({ inverterBrand, inverterSize: nextSize, inverterProductId: "" });
              }}
            >
              {inverterBrands.map((brand) => (
                <option key={brand}>{brand}</option>
              ))}
            </select>
          </Field>
          <Field label="Inverter Size">
            <select className={selectClass} value={input.inverterSize} onChange={(e) => onChange({ inverterSize: e.target.value as InverterSize, inverterProductId: "" })}>
              {inverterSizes.map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Supplier Inverter Product"
            hint={selectedInverterProduct ? productLabel(selectedInverterProduct) : "Optional supplier price override."}
          >
            <SearchableSelect
              value={input.inverterProductId}
              placeholder="Search matching supplier inverters"
              emptyMessage="No matching supplier inverter found - use manual pricing or change filters."
              options={importedInverters.map((inverter) => productOption(inverter))}
              onChange={(value) => onChange({ inverterProductId: value })}
            />
          </Field>
        </InputGroup>

        <InputGroup title="Roof / Mounting Selection">
          <Field label="Roof Type">
            <select className={selectClass} value={input.roofType} onChange={(e) => onChange({ roofType: e.target.value as RoofType })}>
              {roofTypes.map((roof) => (
                <option key={roof}>{roof}</option>
              ))}
            </select>
          </Field>
          <Field label="Extra amount ex GST">
            <input className={inputClass} inputMode="decimal" value={input.extraAmountExGst} onChange={(e) => onChange({ extraAmountExGst: Number(e.target.value) })} />
          </Field>
          <Field label="Extra note / description">
            <input className={inputClass} value={input.extraNote} onChange={(e) => onChange({ extraNote: e.target.value })} />
          </Field>
        </InputGroup>

        <InputGroup title="Accessories & Extra Items">
          <div className="rounded-2xl bg-[#F7F4EE] px-4 py-3 text-sm leading-6 text-[#66756f] xl:col-span-3">
            Search Tradezone/manual accessories like changeover switches, breakers, isolators, deck tites, label kits,
            meters and other extras.
          </div>
          <Field label="Accessory Brand">
            <SearchableSelect
              value={accessoryBrandFilter || "__all"}
              placeholder="All accessory brands"
              options={brandSelectOptions(accessoryBrands)}
              onChange={(value) => {
                setAccessoryBrandFilter(value === "__all" ? "" : value);
                setAccessoryProductId("");
                setSelectedAccessoryProduct(null);
                setAccessoryValidation("");
              }}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Product search">
              <SearchableSelect
                value={accessoryProductId}
                placeholder="Type changeover switch, breaker, isolator, deck tite, conduit..."
                emptyMessage="Type at least 2 characters to search current Tradezone and manual products."
                minQueryLength={2}
                maxResults={40}
                options={filteredAccessoryProducts.map((product) => productOption(product))}
                onChange={(value, option) => {
                  setAccessoryProductId(value);
                  setSelectedAccessoryProduct((option?.data as SupplierProduct | undefined) ?? filteredAccessoryProducts.find((product) => product.id === value) ?? null);
                  setAccessoryValidation("");
                }}
              />
              {accessoryValidation ? <p className="mt-2 text-sm font-semibold text-rose-600">{accessoryValidation}</p> : null}
            </Field>
          </div>
          <Field label="Qty">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={accessoryQuantity}
              onChange={(event) => setAccessoryQuantity(Math.max(1, Number(event.target.value) || 1))}
            />
          </Field>
          <button
            type="button"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-switchtec-forest px-5 text-sm font-semibold text-white shadow-panel transition hover:-translate-y-0.5 hover:bg-switchtec-green"
            onClick={addAccessory}
          >
            <Plus size={17} />
            Add Item
          </button>
        </InputGroup>

        <SelectedAccessoriesTable
          accessories={selectedAccessories}
          input={input}
          onChange={onChange}
        />
      </section>

      <section className="rounded-2xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-switchtec-mint text-switchtec-forest">
            <PanelsTopLeft size={21} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-switchtec-ink">Calculated System Summary</h2>
            <p className="text-sm text-slate-500">Calculated from panel rounding and selected battery module.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DisplayField label="Requested Size" value={`${number1(input.solarSizeKw)} kW`} />
          <DisplayField label="Panel Count" value={`${calculations.solarPanelCount} panels`} />
          <DisplayField label="Actual Installed" value={`${number1(calculations.actualSolarKw)} kW`} />
          <DisplayField label="Battery Capacity" value={`${number1(calculations.batterySizeKwh)} kWh`} />
        </div>
      </section>

      <section className="rounded-2xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-switchtec-mint text-switchtec-forest">
            <Battery size={21} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-switchtec-ink">Internal Notes</h2>
            <p className="text-sm text-slate-500">Saved with the quote, hidden from print pricing blocks.</p>
          </div>
        </div>
        <textarea className={`${inputClass} min-h-28 py-3`} value={input.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </section>
    </div>
  );
}

function SelectedAccessoriesTable({
  accessories,
  input,
  onChange
}: {
  accessories: Array<{ product: SupplierProduct; productId: string; quantity: number; type?: "System" | "Misc"; unitPriceOverrideExGst?: number; id?: string; lineKey: string }>;
  input: QuoteInput;
  onChange: (patch: Partial<QuoteInput>) => void;
}) {
  if (!accessories.length) {
    return (
      <p className="mt-6 rounded-2xl bg-[#F7F4EE] p-4 text-sm text-[#66756f]">
        No accessories or extra items selected.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-left text-sm">
        <thead className="text-[#66756f]">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Unit price ex GST</th>
            <th className="px-3 py-2">Line total ex GST</th>
            <th className="px-3 py-2">Stock status</th>
            <th className="px-3 py-2">Remove</th>
          </tr>
        </thead>
        <tbody>
        {accessories.map(({ product, quantity, unitPriceOverrideExGst, lineKey }) => {
          const unitPrice = unitPriceOverrideExGst ?? effectiveProductPrice(product);
          return (
              <tr key={lineKey} className="bg-[#F7F4EE]">
                <td className="rounded-l-xl px-3 py-3 font-semibold text-switchtec-ink">{product.productName || product.description}</td>
                <td className="px-3 py-3">{product.supplier}</td>
                <td className="px-3 py-3">{product.sku}</td>
                <td className="px-3 py-3">
                  <input
                    className={`${inputClass} h-10 w-24`}
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) =>
                      onChange({
                        selectedAccessories: input.selectedAccessories.map((accessory, accessoryIndex) =>
                          accessoryLineKey(accessory, accessoryIndex) === lineKey
                            ? { ...accessory, quantity: Math.max(1, Number(event.target.value) || 1) }
                            : accessory
                        )
                      })
                    }
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    className={`${inputClass} h-10 w-32`}
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(event) =>
                      onChange({
                        selectedAccessories: input.selectedAccessories.map((accessory, accessoryIndex) =>
                          accessoryLineKey(accessory, accessoryIndex) === lineKey
                            ? { ...accessory, unitPriceOverrideExGst: Number(event.target.value) }
                            : accessory
                        )
                      })
                    }
                  />
                </td>
                <td className="px-3 py-3 font-semibold">{money(unitPrice * quantity)}</td>
                <td className="px-3 py-3">{stockLabel(product)}</td>
                <td className="rounded-r-xl px-3 py-3">
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                    onClick={() =>
                      onChange({
                        selectedAccessories: input.selectedAccessories.filter((accessory, accessoryIndex) => accessoryLineKey(accessory, accessoryIndex) !== lineKey)
                      })
                    }
                    aria-label="Remove accessory"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function accessoryLineKey(accessory: QuoteInput["selectedAccessories"][number], index: number) {
  return accessory.id ?? `${accessory.productId}-${accessory.type ?? "Misc"}-${index}`;
}

function productOption(product: SupplierProduct, valuePrefix = ""): SearchableOption {
  return {
    value: `${valuePrefix}${product.id}`,
    label: productLabel(product),
    searchText: supplierProductSearchText(product),
    stockRank: stockSortRank(product),
    data: product
  };
}

function batteryProductOption(product: SupplierProduct, valuePrefix = ""): SearchableOption {
  return {
    value: `${valuePrefix}${product.id}`,
    label: batteryProductLabel(product),
    searchText: supplierProductSearchText(product),
    stockRank: stockSortRank(product),
    data: product
  };
}

function InputGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-switchtec-line/70 py-6 first:border-t-0 first:pt-0 last:pb-0">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-switchtec-sage">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function DisplayField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-switchtec-line bg-[#EEF3EA] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-switchtec-sage">{label}</p>
      <p className="mt-2 text-xl font-bold text-switchtec-ink">{value}</p>
    </div>
  );
}

function parseKw(size: string) {
  return Number(String(size).replace(/kw/i, "")) || 0;
}

function brandSelectOptions(brands: string[]): SearchableOption[] {
  return [
    { value: "__all", label: "All brands", searchText: "all brands" },
    ...brands.map((brand) => ({ value: brand, label: brand, searchText: brand }))
  ];
}

function uniqueBrands(brands: Array<string | undefined>) {
  return Array.from(
    new Set(
      brands
        .map((brand) => (brand || "").trim())
        .filter((brand) => brand && brand.toLowerCase() !== "generic" && brand.toLowerCase() !== "none")
    )
  ).sort((a, b) => a.localeCompare(b));
}

function brandFromText(value: string) {
  return brandFromBatteryName(value) || "Manual";
}

function brandFilterMatches(text: string, selectedBrand: string) {
  if (!selectedBrand) return true;
  const aliases = brandAliases(selectedBrand).map(normalizeSearchText);
  const haystack = normalizeSearchText(text);
  return aliases.some((alias) => haystack.includes(alias));
}

function brandFromBatteryName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("jinko")) return "Jinko";
  if (lower.includes("tcl")) return "TCL";
  if (lower.includes("aiko")) return "AIKO";
  if (lower.includes("rec")) return "REC";
  if (lower.includes("trina")) return "Trina";
  if (lower.includes("longi")) return "Longi";
  if (lower.includes("tongwei")) return "Tongwei";
  if (lower.includes("tindo")) return "Tindo";
  if (lower.includes("canadian")) return "Canadian Solar";
  if (lower.includes("ja")) return "JA";
  if (lower.includes("sungrow")) return "Sungrow";
  if (lower.includes("sigenergy") || lower.includes("sigen")) return "Sigenergy";
  if (lower.includes("goodwe")) return "GoodWe";
  if (lower.includes("solax")) return "SolaX";
  if (lower.includes("byd")) return "BYD";
  if (lower.includes("fox")) return "FoxESS";
  return "";
}

function brandAliases(brand: string) {
  const lower = brand.toLowerCase();
  if (!brand) return [];
  if (lower.includes("sigenergy") || lower.includes("sigen")) return ["Sigenergy", "Sigen", "SigenStor"];
  if (lower.includes("solaredge") || lower.includes("solar edge")) return ["SolarEdge", "Solar Edge"];
  if (lower.includes("solax")) return ["SolaX", "Sola X"];
  if (lower.includes("goodwe")) return ["GoodWe", "Goodwe", "Good We"];
  if (lower.includes("fox")) return ["FoxESS", "Fox ESS"];
  return [brand];
}

function brandMatchesProduct(product: SupplierProduct, selectedBrand: string) {
  if (!selectedBrand) return true;
  const aliases = brandAliases(selectedBrand).map(normalizeSearchText);
  const brandText = normalizeSearchText(`${product.brand} ${product.manufacturer} ${product.compatibleBrand}`);
  const productText = supplierProductSearchText(product);
  return aliases.some((alias) => brandText.includes(alias) || productText.includes(alias));
}

function phaseMatchesProduct(product: SupplierProduct, selectedPhase: Phase) {
  if (product.phase === selectedPhase) return true;
  const text = supplierProductSearchText(product);
  if (selectedPhase === "3 Phase") return /\b3 phase\b|three phase|\b3p\b|\brt\b|\bsh\d+(?:\.\d+)?t\b|\bsg\d+(?:\.\d+)?rt\b|\beta\b/.test(text);
  return /\b1 phase\b|one phase|single phase|\b1p\b|\bsh\d+(?:\.\d+)?rs\b|\bsg\d+(?:\.\d+)?rs\b|\beha\b|primo/.test(text);
}

function sizeMatchesProduct(product: SupplierProduct, selectedSizeKw: number) {
  if (!selectedSizeKw) return true;
  if (product.sizeKw !== undefined && Math.abs(product.sizeKw - selectedSizeKw) <= 0.15) return true;
  const size = String(selectedSizeKw).replace(/\.0$/, "");
  const text = supplierProductSearchText(product);
  return new RegExp(`(?:^|\\b)(?:${size}\\s*kw|sh${size}|sg${size}|et${size}|es${size}|x1${size}|x3${size}|h1${size}|h3${size})(?:\\b|\\D)`).test(text);
}

function supplierInverterMatches(
  product: SupplierProduct,
  category: "Hybrid Inverter" | "Grid Inverter",
  phase: Phase,
  brand: string,
  selectedSizeKw: number
) {
  return (
    getNormalizedCategory(product) === category &&
    phaseMatchesProduct(product, phase) &&
    brandMatchesProduct(product, brand) &&
    sizeMatchesProduct(product, selectedSizeKw)
  );
}

function manualPanelLabel(name: string, brand = "", watt: number) {
  const panelName = name.trim();
  const panelBrand = brand.trim();
  const withBrand =
    panelBrand && !panelName.toLowerCase().includes(panelBrand.toLowerCase())
      ? `${panelBrand} ${panelName}`
      : panelName;
  return /\d+\s*w/i.test(withBrand) ? withBrand : withBrand.replace(String(watt), `${watt}W`);
}

function manualAliases(item: { aliases?: string[] }) {
  return Array.isArray(item.aliases) ? item.aliases.join(" ") : "";
}

function batteryModuleKwh(battery: SupplierProduct | PricingConfig["batteries"][number]) {
  if ("kWh" in battery) return battery.kWh;
  return battery.batteryKwh ?? battery.sizeKw ?? 0;
}

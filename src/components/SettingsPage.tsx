import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { RotateCcw, Save } from "lucide-react";
import defaultPricing from "../config/pricing.json";
import { Field, inputClass, selectClass } from "./Field";
import { money } from "../utils/format";
import { defaultManualInverterRows, mergeDefaultManualInverters } from "../utils/manualProducts";
import {
  availabilityStatuses,
  defaultApprovedTradezoneBrands,
  detectTradezoneWebsiteQuotable,
  effectiveProductName,
  effectiveProductPrice,
  getLastSupplierImportSummary,
  getNormalizedCategory,
  matchesProductSearch,
  readSupplierProductFile,
  reclassifySupplierProduct,
  supplierDisplayStatus,
  stockLabel,
  stockStatuses,
  supplierCategories,
  unitTypes
} from "../utils/supplierProducts";
import type {
  AvailabilityStatus,
  InverterType,
  ManualAccessoryProduct,
  ManualBatteryProduct,
  ManualInverterProduct,
  ManualPanelProduct,
  MarginMode,
  NormalizedCategory,
  Phase,
  PricingConfig,
  StockStatus,
  SupplierProduct,
  UnitType
} from "../types";

interface SettingsPageProps {
  config: PricingConfig;
  supplierProducts: SupplierProduct[];
  onConfigChange: (config: PricingConfig) => void;
  onSupplierProductsChange: (products: SupplierProduct[]) => void;
}

type NumberSettingKey = "gstRate" | "batteryStcsPerKwh" | "quoteValidityDays";

const inverterSections: Array<{ title: string; type: InverterType; phase: Phase }> = [
  { title: "Single Phase Hybrid Inverter Pricing", type: "Hybrid inverter", phase: "Single Phase" },
  { title: "Three Phase Hybrid Inverter Pricing", type: "Hybrid inverter", phase: "3 Phase" },
  { title: "Single Phase Grid Inverter Pricing", type: "Grid inverter", phase: "Single Phase" },
  { title: "Three Phase Grid Inverter Pricing", type: "Grid inverter", phase: "3 Phase" }
];

const manualAccessoryCategories = [
  "Meter",
  "CT",
  "Gateway",
  "Backup Box",
  "Changeover Switch",
  "Label Kit",
  "Deck Tite",
  "Isolator",
  "Breaker",
  "Cable",
  "Mounting Accessory",
  "Battery Accessory",
  "Miscellaneous"
];

type KnownBrandOptions = {
  panels: string[];
  batteries: string[];
  inverters: string[];
  accessories: string[];
  mounting: string[];
};

const accessoryBrandCategories = new Set<NormalizedCategory>([
  "System Accessory",
  "Battery Accessory",
  "Meter",
  "Smart Meter",
  "CT",
  "Gateway",
  "Backup Gateway",
  "Backup Box",
  "Backup Interface",
  "Dongle / WiFi / Comms",
  "Monitoring",
  "Controller",
  "Energy Controller",
  "Battery Base",
  "Battery Bracket",
  "Battery Cable",
  "Optimiser",
  "Mounting Accessory",
  "Changeover Switch",
  "Deck Tite",
  "Isolator",
  "Breaker",
  "Cable",
  "Label Kit",
  "Miscellaneous"
]);

const mountingBrandCategories = new Set<NormalizedCategory>([
  "Mounting",
  "Rail",
  "Tin Kit",
  "Tile Kit",
  "Klip Lok Kit",
  "Mounting Accessory",
  "Deck Tite"
]);

function getKnownBrandOptions(
  config: PricingConfig,
  supplierProducts: SupplierProduct[],
  manualInverters: ManualInverterProduct[],
  manualAccessories: ManualAccessoryProduct[]
): KnownBrandOptions {
  const panels = new Set<string>();
  const batteries = new Set<string>();
  const inverters = new Set<string>();
  const accessories = new Set<string>();
  const mounting = new Set<string>();

  const add = (set: Set<string>, value?: string) => {
    const brand = (value ?? "").trim();
    if (brand && brand.toLowerCase() !== "none") set.add(brand);
  };

  [...defaultPricing.panels, ...config.panels].forEach((panel) => add(panels, panel.brand));
  [...defaultPricing.batteries, ...config.batteries].forEach((battery) => add(batteries, battery.brand));
  [...defaultManualInverterRows(), ...manualInverters].forEach((inverter) => add(inverters, inverter.brand));
  manualAccessories.forEach((item) => add(accessories, item.brand));

  supplierProducts.forEach((product) => {
    const category = getNormalizedCategory(product);
    const brand = product.brand || product.manufacturer || product.compatibleBrand;
    if (category === "Panel") add(panels, brand);
    if (category === "Battery") add(batteries, brand);
    if (category === "Hybrid Inverter" || category === "Grid Inverter") add(inverters, brand);
    if (accessoryBrandCategories.has(category)) add(accessories, brand);
    if (mountingBrandCategories.has(category)) add(mounting, brand);
  });

  return {
    panels: sortedBrands(panels),
    batteries: sortedBrands(batteries),
    inverters: sortedBrands(inverters),
    accessories: sortedBrands(accessories),
    mounting: sortedBrands(mounting)
  };
}

function sortedBrands(brands: Set<string>) {
  return Array.from(brands).sort((a, b) => a.localeCompare(b));
}

export function SettingsPage({ config, supplierProducts, onConfigChange, onSupplierProductsChange }: SettingsPageProps) {
  const [importMessage, setImportMessage] = useState("");
  const [importPreview, setImportPreview] = useState("");
  const [productFilters, setProductFilters] = useState({
    supplier: "",
    category: "",
    normalizedCategory: "",
    brand: "",
    availabilityStatus: "",
    stockStatus: "",
    showInQuoting: "",
    unitType: "",
    showInPanelDropdown: "",
    needsReview: "",
    hasPrice: "",
    search: ""
  });
  const [visibleProductCount, setVisibleProductCount] = useState(5);
  const [editingProductId, setEditingProductId] = useState("");
  const setNumber = (key: NumberSettingKey, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  const setSolarStc = (patch: Partial<PricingConfig["solarStc"]>) => {
    onConfigChange({ ...config, solarStc: { ...config.solarStc, ...patch } });
  };

  const setSolarZoneRating = (zone: keyof PricingConfig["solarStc"]["zoneRatings"], value: number) => {
    onConfigChange({
      ...config,
      solarStc: {
        ...config.solarStc,
        zoneRatings: { ...config.solarStc.zoneRatings, [zone]: value }
      }
    });
  };

  const setMounting = (key: keyof PricingConfig["mounting"], value: number) => {
    onConfigChange({ ...config, mounting: { ...config.mounting, [key]: value } });
  };

  const setPanel = (index: number, patch: Partial<PricingConfig["panels"][number]>) => {
    onConfigChange({
      ...config,
      panels: config.panels.map((panel, panelIndex) =>
        panelIndex === index ? { ...panel, ...patch } : panel
      )
    });
  };

  const setBattery = (index: number, patch: Partial<PricingConfig["batteries"][number]>) => {
    onConfigChange({
      ...config,
      batteries: config.batteries.map((battery, batteryIndex) =>
        batteryIndex === index ? { ...battery, ...patch } : battery
      )
    });
  };

  const addPanel = () => {
    onConfigChange({
      ...config,
      panels: [
        ...config.panels,
        { id: createManualId("panel"), name: "", brand: "", watt: 0, price: 0, active: true }
      ]
    });
  };

  const removePanel = (index: number) => {
    onConfigChange({ ...config, panels: config.panels.filter((_, panelIndex) => panelIndex !== index) });
  };

  const addBattery = () => {
    onConfigChange({
      ...config,
      batteries: [
        ...config.batteries,
        { id: createManualId("battery"), name: "", brand: "", kWh: 0, price: 0, active: true }
      ]
    });
  };

  const removeBattery = (index: number) => {
    onConfigChange({
      ...config,
      batteries: config.batteries.filter((battery, batteryIndex) => battery.name === "No Battery" || batteryIndex !== index)
    });
  };

  const manualAccessories = (config.manualAccessories ?? []) as ManualAccessoryProduct[];
  const setManualAccessories = (manualAccessories: ManualAccessoryProduct[]) => {
    onConfigChange({ ...config, manualAccessories } as PricingConfig);
  };
  const addManualAccessory = () => {
    setManualAccessories([
      ...manualAccessories,
      {
        id: createManualId("accessory"),
        name: "",
        brand: "",
        category: "Miscellaneous",
        description: "",
        sku: "",
        price: 0,
        defaultQuantity: 1,
        active: true
      }
    ]);
  };
  const updateManualAccessory = (id: string, patch: Partial<ManualAccessoryProduct>) => {
    setManualAccessories(manualAccessories.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const removeManualAccessory = (id: string) => {
    setManualAccessories(manualAccessories.filter((item) => item.id !== id));
  };

  const manualInverters = mergeDefaultManualInverters(
    (config.manualInverters ?? []) as ManualInverterProduct[],
    config.deletedManualInverterDefaultIds
  );
  const setManualInverters = (manualInverters: ManualInverterProduct[]) => {
    onConfigChange({ ...config, manualInverters } as PricingConfig);
  };
  const addManualInverter = (type: InverterType, phase: Phase) => {
    setManualInverters([
      ...manualInverters,
      {
        id: createManualId("inverter"),
        type,
        phase,
        brand: "",
        model: "",
        sizeKw: 0,
        price: 0,
        active: true
      }
    ]);
  };
  const updateManualInverter = (id: string, patch: Partial<ManualInverterProduct>) => {
    setManualInverters(manualInverters.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const removeManualInverter = (id: string) => {
    const deletedDefaultIds = id.startsWith("default-inverter-")
      ? Array.from(new Set([...(config.deletedManualInverterDefaultIds ?? []), id]))
      : config.deletedManualInverterDefaultIds;
    onConfigChange({
      ...config,
      manualInverters: manualInverters.filter((item) => item.id !== id),
      deletedManualInverterDefaultIds: deletedDefaultIds
    } as PricingConfig);
  };

  const databaseProducts = useMemo(
    () => supplierProducts.filter((product) => product.supplier !== "Solar Juice"),
    [supplierProducts]
  );
  const knownBrands = useMemo(
    () => getKnownBrandOptions(config, databaseProducts, manualInverters, manualAccessories),
    [config, databaseProducts, manualAccessories, manualInverters]
  );

  const visibleSupplierProducts = useMemo(() => {
    return databaseProducts.filter((product) => {
      const supplierMatches = !productFilters.supplier || product.supplier === productFilters.supplier;
      const categoryMatches = !productFilters.category || getNormalizedCategory(product) === productFilters.category;
      const normalizedCategoryMatches =
        !productFilters.normalizedCategory || getNormalizedCategory(product) === productFilters.normalizedCategory;
      const brandMatches = !productFilters.brand || product.brand === productFilters.brand;
      const availabilityMatches =
        !productFilters.availabilityStatus || product.availabilityStatus === productFilters.availabilityStatus;
      const stockMatches = !productFilters.stockStatus || product.stockStatus === productFilters.stockStatus;
      const showInQuotingMatches =
        !productFilters.showInQuoting ||
        String(product.showInQuoting === true) === productFilters.showInQuoting;
      const unitTypeMatches = !productFilters.unitType || product.unitType === productFilters.unitType;
      const panelDropdownMatches =
        !productFilters.showInPanelDropdown ||
        String(product.showInPanelDropdown === true) === productFilters.showInPanelDropdown;
      const reviewMatches = !productFilters.needsReview || String(product.needsReview === true) === productFilters.needsReview;
      const priceMatches =
        !productFilters.hasPrice ||
        String(effectiveProductPrice(product) > 0) === productFilters.hasPrice;
      return (
        supplierMatches &&
        categoryMatches &&
        normalizedCategoryMatches &&
        brandMatches &&
        availabilityMatches &&
        stockMatches &&
        showInQuotingMatches &&
        unitTypeMatches &&
        panelDropdownMatches &&
        reviewMatches &&
        priceMatches &&
        matchesProductSearch(product, productFilters.search)
      );
    });
  }, [databaseProducts, productFilters]);

  useEffect(() => {
    setVisibleProductCount(5);
  }, [
    productFilters.supplier,
    productFilters.category,
    productFilters.normalizedCategory,
    productFilters.brand,
    productFilters.availabilityStatus,
    productFilters.stockStatus,
    productFilters.showInQuoting,
    productFilters.unitType,
    productFilters.showInPanelDropdown,
    productFilters.needsReview,
    productFilters.hasPrice,
    productFilters.search
  ]);

  const updateSupplierProduct = (id: string, patch: Partial<SupplierProduct>) => {
    onSupplierProductsChange(
      supplierProducts.map((product) => {
        if (product.id !== id) return product;
        const next = reclassifySupplierProduct({ ...product, ...patch }, config.approvedTradezoneBrands ?? defaultApprovedTradezoneBrands);
        return {
          ...next,
          priceIncGst: effectiveProductPrice(next) * (1 + next.gstRate / 100)
        };
      })
    );
  };

  const reclassifyProducts = () => {
    onSupplierProductsChange(
      supplierProducts.map((product) =>
        product.supplier === "Tradezone"
          ? reclassifySupplierProduct(product, config.approvedTradezoneBrands ?? defaultApprovedTradezoneBrands)
          : product
      )
    );
    setImportMessage("Reclassified Tradezone products and preserved manual overrides.");
  };

  const whyNotInDropdown = (product: SupplierProduct) => {
    const category = getNormalizedCategory(product);
    const reasons: string[] = [];
    if (product.hidden) reasons.push("hidden manually");
    if (product.showInQuoting !== true) reasons.push("showInQuoting is false");
    if (effectiveProductPrice(product) <= 0) reasons.push("missing or zero price");
    if (category === "Other" || category === "Unclassified") reasons.push(`normalised category is ${category}`);
    if (category === "Battery Accessory") reasons.push("battery accessory products do not appear in Battery Type");
    if (category === "Panel") {
      if (product.unitType !== "single") reasons.push("unitType is not single");
      if (product.showInPanelDropdown !== true) reasons.push("show in panel dropdown is off");
      if (!product.wattage) reasons.push("panel wattage is missing");
    }
    if (category === "Hybrid Inverter" || category === "Grid Inverter") {
      if (!product.phase) reasons.push("phase is missing");
      if (!product.sizeKw) reasons.push("sizeKw is missing");
      if (!product.brand || product.brand === "Generic") reasons.push("brand is missing or generic");
    }
    if (category === "Battery" && !product.batteryKwh) reasons.push("battery kWh is missing");
    if (["inactive", "discontinued", "clearance"].includes(product.availabilityStatus ?? "")) {
      reasons.push(`availabilityStatus is ${product.availabilityStatus}`);
    }
    setImportMessage(
      `${product.supplier} ${product.sku || product.description}: ${
        reasons.length ? reasons.join("; ") : "This product should appear in the matching dropdown/search for its category."
      }`
    );
  };

  const importProducts = async (file: File | null) => {
    if (!file) return;
    try {
      setImportMessage("Importing supplier products...");
      const products = await readSupplierProductFile(file);
      const productKey = (product: SupplierProduct) =>
        `${product.supplier.toLowerCase()}::${(product.sku || product.supplierPartNumber || product.tradezonePartNumber || product.id).toLowerCase()}`;
      const byId = new Map(supplierProducts.map((product) => [productKey(product), product]));
      products.forEach((product) => {
        const key = productKey(product);
        const existing = byId.get(key);
        byId.set(key, {
          ...reclassifySupplierProduct(
            {
              ...product,
              hidden: existing?.hidden ?? product.hidden,
              manualOverridePriceExGst: existing?.manualOverridePriceExGst,
              manualNormalizedCategory: existing?.manualNormalizedCategory,
              manualUnitType: existing?.manualUnitType,
              manualShowInPanelDropdown: existing?.manualShowInPanelDropdown,
              manualAvailabilityStatus: existing?.manualAvailabilityStatus,
              manualShowInQuoting: existing?.manualShowInQuoting,
              manualTradezoneWebsiteQuotable: existing?.manualTradezoneWebsiteQuotable,
              manualProductName: existing?.manualProductName,
              notes: existing?.notes,
              stockStatus: existing?.stockStatus,
              compatibleBrand: existing?.compatibleBrand ?? product.compatibleBrand
            },
            config.approvedTradezoneBrands ?? defaultApprovedTradezoneBrands
          )
        });
      });
      onSupplierProductsChange(Array.from(byId.values()));
      const summary = getLastSupplierImportSummary();
      setImportPreview(summary?.textPreview ?? "");
      const categorySummary = summary
        ? Object.entries(summary.categoryCounts)
            .map(([category, count]) => `${category}: ${count}`)
            .join(", ")
        : "";
      setImportMessage(
        summary
          ? `Imported ${summary.productsImported.toLocaleString("en-AU")} ${summary.supplier} products from ${summary.totalRows.toLocaleString("en-AU")} extracted rows. Pages scanned: ${summary.pagesScanned ?? summary.pageCount ?? "-"}. Text items: ${summary.textItemsExtracted ?? "-"}. Candidate rows: ${summary.candidateRowsFound ?? summary.totalRows}. Classified: ${summary.productsClassified ?? "-"}. Needs review: ${summary.productsNeedingReview ?? 0}. No-price rows: ${summary.rowsWithNoPrice ?? 0}. Duplicates ignored: ${summary.duplicateRowsIgnored ?? 0}.${categorySummary ? ` ${categorySummary}.` : ""}${summary.skippedRows.length ? ` Skipped ${summary.skippedRows.length} rows for review.` : ""}`
          : `Imported ${products.length.toLocaleString("en-AU")} supplier products.`
      );
    } catch (error) {
      const summary = getLastSupplierImportSummary();
      setImportPreview(summary?.textPreview ?? "");
      setImportMessage(error instanceof Error ? error.message : "Could not import products.");
    }
  };

  const exportSupplierCatalogue = () => {
    const blob = new Blob([JSON.stringify(supplierProducts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "switchtec-supplier-catalogue.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadImportArtifact = (type: "raw" | "csv") => {
    const summary = getLastSupplierImportSummary();
    const content = type === "raw" ? summary?.rawText : summary?.parsedRowsCsv;
    if (!content) {
      setImportMessage(`No ${type === "raw" ? "raw text" : "parsed rows"} available from the last import.`);
      return;
    }
    const blob = new Blob([content], { type: type === "raw" ? "text/plain" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = type === "raw" ? "supplier-extracted-text.txt" : "supplier-parsed-rows.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-switchtec-forest p-7 text-white shadow-soft md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-switchtec-sand">
            Pricing controls
          </p>
          <h2 className="text-3xl font-bold tracking-normal">Settings</h2>
        </div>
        <button
          onClick={() =>
            onConfigChange({
              ...defaultPricing,
              manualInverters: defaultManualInverterRows(),
              deletedManualInverterDefaultIds: []
            } as PricingConfig)
          }
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FAF8F3] px-5 text-sm font-semibold text-switchtec-ink transition hover:-translate-y-0.5"
        >
          <RotateCcw size={18} />
          Reset defaults
        </button>
      </div>

      <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <div className="mb-6 flex items-center gap-3">
          <Save className="text-switchtec-green" size={22} />
          <h3 className="text-xl font-semibold text-switchtec-ink">Core Rebate + GST Settings</h3>
        </div>
        <div className="space-y-6">
          <SettingsGroup title="GST Settings">
            <NumberField label="GST rate %" value={config.gstRate} onChange={(v) => setNumber("gstRate", v)} />
          </SettingsGroup>

          <SettingsGroup title="Solar STC Settings">
            <NumberField label="Solar STC price" value={config.solarStc.price} onChange={(v) => setSolarStc({ price: v })} />
            <NumberField
              label="Solar deeming years"
              value={config.solarStc.deemingYears}
              onChange={(v) => setSolarStc({ deemingYears: v })}
            />
            <NumberField
              label="Solar zone rating"
              value={config.solarStc.zoneRating}
              onChange={(v) => setSolarStc({ zoneRating: v, calculationMode: "Manual zone rating" })}
              step="0.001"
            />
            <Field label="Solar zone label">
              <select
                className={selectClass}
                value={config.solarStc.zoneLabel}
                onChange={(event) => {
                  const zoneLabel = event.target.value;
                  const zoneKey: keyof PricingConfig["solarStc"]["zoneRatings"] = zoneLabel.startsWith("Zone 1")
                    ? "Zone 1"
                    : zoneLabel.startsWith("Zone 2")
                      ? "Zone 2"
                      : zoneLabel.startsWith("Zone 4")
                        ? "Zone 4"
                        : "Zone 3";
                  setSolarStc({
                    zoneLabel,
                    calculationMode: zoneLabel,
                    zoneRating: config.solarStc.zoneRatings[zoneKey]
                  });
                }}
              >
                <option>Zone 1</option>
                <option>Zone 2</option>
                <option>Zone 3 NSW default</option>
                <option>Zone 4</option>
              </select>
            </Field>
            <Field label="Solar STC calculation mode">
              <input
                className={inputClass}
                value={config.solarStc.calculationMode}
                onChange={(event) => setSolarStc({ calculationMode: event.target.value })}
              />
            </Field>
            {Object.entries(config.solarStc.zoneRatings).map(([zone, value]) => (
              <NumberField
                key={zone}
                label={`${zone} rating`}
                value={value}
                onChange={(next) => setSolarZoneRating(zone as keyof PricingConfig["solarStc"]["zoneRatings"], next)}
                step="0.001"
              />
            ))}
          </SettingsGroup>

          <SettingsGroup title="Battery Rebate Settings">
            <NumberField
              label="Battery STC price"
              value={config.batteryStcPrice}
              onChange={(v) => onConfigChange({ ...config, batteryStcPrice: v })}
            />
            <NumberField
              label="Battery STCs/kWh"
              value={config.batteryStcsPerKwh}
              onChange={(v) => setNumber("batteryStcsPerKwh", v)}
            />
          </SettingsGroup>

          <SettingsGroup title="Quote Settings">
            <NumberField
              label="Quote validity days"
              value={config.quoteValidityDays}
              onChange={(v) => setNumber("quoteValidityDays", v)}
            />
          </SettingsGroup>
        </div>
      </section>

      <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-xl font-semibold text-switchtec-ink">Supplier Product Database</h3>
            <p className="mt-2 text-sm leading-6 text-[#66756f]">
              Admin Supplier Import. Use this to update the app's supplier catalogue. Normal quoting users do not need to upload supplier files.
              Manual pricing tables remain available and selected manual prices still override imported products.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#F7F4EE] px-5 text-sm font-semibold text-switchtec-ink transition hover:-translate-y-0.5"
              onClick={reclassifyProducts}
            >
              Reclassify Tradezone Products
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#F7F4EE] px-5 text-sm font-semibold text-switchtec-ink transition hover:-translate-y-0.5"
              onClick={exportSupplierCatalogue}
            >
              Export Supplier Catalogue JSON
            </button>
            <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-switchtec-forest px-5 text-sm font-semibold text-white shadow-panel transition hover:-translate-y-0.5 hover:bg-switchtec-green">
              Admin import supplier file
              <input
                className="hidden"
                type="file"
                accept=".zip,.csv,.xlsx"
                onChange={(event) => importProducts(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
        {importMessage ? <p className="mb-4 rounded-2xl bg-switchtec-mint p-4 text-sm text-switchtec-ink">{importMessage}</p> : null}
        {importPreview ? (
          <details className="mb-4 rounded-2xl border border-switchtec-line/70 bg-[#F7F4EE] p-4 text-sm text-switchtec-ink">
            <summary className="cursor-pointer font-semibold">Show extracted text preview</summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[#66756f]">{importPreview}</pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-lg bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-switchtec-ink"
                onClick={() => downloadImportArtifact("raw")}
              >
                Download extracted text
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-switchtec-ink"
                onClick={() => downloadImportArtifact("csv")}
              >
                Download parsed rows CSV
              </button>
            </div>
          </details>
        ) : null}
        <details className="mb-5 rounded-2xl border border-switchtec-line/70 bg-[#F7F4EE] p-5">
          <summary className="cursor-pointer text-sm font-semibold text-switchtec-ink">Edit Approved Brands</summary>
          <div className="mt-4">
            <Field label="Approved Tradezone Brands">
              <textarea
                className={`${inputClass} min-h-24 py-3`}
                value={(config.approvedTradezoneBrands ?? defaultApprovedTradezoneBrands).join(", ")}
                onChange={(event) =>
                  onConfigChange({
                    ...config,
                    approvedTradezoneBrands: event.target.value
                      .split(",")
                      .map((brand) => brand.trim())
                      .filter(Boolean)
                  })
                }
              />
            </Field>
          </div>
        </details>
        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <Field label="Supplier">
            <select
              className={selectClass}
              value={productFilters.supplier}
              onChange={(event) => setProductFilters({ ...productFilters, supplier: event.target.value })}
            >
              <option value="">All suppliers</option>
              {Array.from(new Set(databaseProducts.map((product) => product.supplier))).map((supplier) => (
                <option key={supplier}>{supplier}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className={selectClass}
              value={productFilters.category}
              onChange={(event) => setProductFilters({ ...productFilters, category: event.target.value })}
            >
              <option value="">All categories</option>
              {supplierCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select
              className={selectClass}
              value={productFilters.brand}
              onChange={(event) => setProductFilters({ ...productFilters, brand: event.target.value })}
            >
              <option value="">All brands</option>
              {Array.from(new Set(databaseProducts.map((product) => product.brand).filter(Boolean))).map((brand) => (
                <option key={brand}>{brand}</option>
              ))}
            </select>
          </Field>
          <Field label="Search">
            <input
              className={inputClass}
              value={productFilters.search}
              onChange={(event) => setProductFilters({ ...productFilters, search: event.target.value })}
              placeholder="sungrow meter, change over switch, jinko 475"
            />
          </Field>
        </div>
        <details className="mb-5 rounded-2xl border border-switchtec-line/70 bg-[#F7F4EE] p-5">
          <summary className="cursor-pointer text-sm font-semibold text-switchtec-ink">Advanced filters</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <Field label="Availability">
            <select
              className={selectClass}
              value={productFilters.availabilityStatus}
              onChange={(event) => setProductFilters({ ...productFilters, availabilityStatus: event.target.value })}
            >
              <option value="">All statuses</option>
              {availabilityStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            </Field>
            <Field label="Stock status">
            <select
              className={selectClass}
              value={productFilters.stockStatus}
              onChange={(event) => setProductFilters({ ...productFilters, stockStatus: event.target.value })}
            >
              <option value="">All stock states</option>
              {stockStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            </Field>
            <Field label="Available for quoting">
            <select
              className={selectClass}
              value={productFilters.showInQuoting}
              onChange={(event) => setProductFilters({ ...productFilters, showInQuoting: event.target.value })}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            </Field>
            <Field label="Unit type">
            <select
              className={selectClass}
              value={productFilters.unitType}
              onChange={(event) => setProductFilters({ ...productFilters, unitType: event.target.value })}
            >
              <option value="">All unit types</option>
              {unitTypes.map((unitType) => (
                <option key={unitType}>{unitType}</option>
              ))}
            </select>
            </Field>
            <Field label="Show in panel dropdown">
            <select
              className={selectClass}
              value={productFilters.showInPanelDropdown}
              onChange={(event) => setProductFilters({ ...productFilters, showInPanelDropdown: event.target.value })}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            </Field>
            <Field label="Needs review">
            <select
              className={selectClass}
              value={productFilters.needsReview}
              onChange={(event) => setProductFilters({ ...productFilters, needsReview: event.target.value })}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            </Field>
            <Field label="Has price">
            <select
              className={selectClass}
              value={productFilters.hasPrice}
              onChange={(event) => setProductFilters({ ...productFilters, hasPrice: event.target.value })}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            </Field>
          </div>
        </details>
        <div className="mb-3 text-sm text-[#66756f]">
          Showing {Math.min(visibleSupplierProducts.length, visibleProductCount).toLocaleString("en-AU")} of{" "}
          {visibleSupplierProducts.length.toLocaleString("en-AU")} products.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-[#66756f]">
              <tr>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Product name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Price ex GST</th>
                <th className="px-3 py-2">Effective price ex GST</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleSupplierProducts.slice(0, visibleProductCount).map((product) => {
                const effectivePrice = effectiveProductPrice(product);
                const isEditing = editingProductId === product.id;
                return (
                  <Fragment key={product.id}>
                  <tr className={product.hidden ? "bg-rose-50/70" : "bg-[#F7F4EE]"}>
                    <td className="rounded-l-xl px-3 py-3">{product.supplier}</td>
                    <td className="px-3 py-3">{product.brand || "-"}</td>
                    <td className="px-3 py-3">{product.sku}</td>
                    <td className="px-3 py-3 font-semibold text-switchtec-ink">{effectiveProductName(product)}</td>
                    <td className="max-w-xl px-3 py-3">{product.description}</td>
                    <td className="px-3 py-3">{getNormalizedCategory(product)}</td>
                    <td className="px-3 py-3">{money(product.priceExGst)}</td>
                    <td className="px-3 py-3 font-semibold">{money(effectivePrice)}</td>
                    <td className="px-3 py-3"><StatusBadge label={supplierDisplayStatus(product)} /></td>
                    <td className="px-3 py-3"><StockBadge label={stockLabel(product)} /></td>
                    <td className="rounded-r-xl px-3 py-3">
                      <button
                        type="button"
                        className="rounded-lg bg-switchtec-mint px-3 py-2 text-xs font-semibold text-switchtec-ink"
                        onClick={() => setEditingProductId(isEditing ? "" : product.id)}
                      >
                        {isEditing ? "Close" : "Edit"}
                      </button>
                    </td>
                  </tr>
                  {isEditing ? (
                    <tr>
                      <td colSpan={11} className="rounded-2xl bg-[#fffdf8] p-5">
                        <SupplierProductEditPanel
                          product={product}
                          onChange={(patch) => updateSupplierProduct(product.id, patch)}
                          onClose={() => setEditingProductId("")}
                          approvedBrands={config.approvedTradezoneBrands ?? defaultApprovedTradezoneBrands}
                        />
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {visibleProductCount < visibleSupplierProducts.length ? (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-switchtec-forest px-4 text-sm font-semibold text-white transition hover:bg-switchtec-green"
              onClick={() => setVisibleProductCount((count) => count + 20)}
            >
              Show more
            </button>
          ) : null}
          {visibleProductCount > 5 ? (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#F7F4EE] px-4 text-sm font-semibold text-switchtec-ink transition hover:-translate-y-0.5"
              onClick={() => setVisibleProductCount(5)}
            >
              Show less
            </button>
          ) : null}
        </div>
      </section>

      <ManualPanelTable
        panels={config.panels as ManualPanelProduct[]}
        brandOptions={knownBrands.panels}
        onChange={setPanel}
        onAdd={addPanel}
        onRemove={removePanel}
      />

      <ManualBatteryTable
        batteries={config.batteries as ManualBatteryProduct[]}
        brandOptions={knownBrands.batteries}
        onChange={setBattery}
        onAdd={addBattery}
        onRemove={removeBattery}
      />

      <ManualAccessoryTable
        accessories={manualAccessories}
        brandOptions={knownBrands.accessories}
        onAdd={addManualAccessory}
        onChange={updateManualAccessory}
        onRemove={removeManualAccessory}
      />

      <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <h3 className="mb-6 text-xl font-semibold text-switchtec-ink">Mounting Pricing</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            label="Tin kit price per 6 panels ex GST"
            value={config.mounting.tinKitPrice}
            onChange={(v) => setMounting("tinKitPrice", v)}
          />
          <NumberField
            label="Klip Lok extra per 6 panels ex GST"
            value={config.mounting.klipLokExtraPerKit}
            onChange={(v) => setMounting("klipLokExtraPerKit", v)}
          />
          <NumberField
            label="Tile extra per 6 panels ex GST"
            value={config.mounting.tileExtraPerKit}
            onChange={(v) => setMounting("tileExtraPerKit", v)}
          />
          <NumberField
            label="Rail price per rail ex GST"
            value={config.mounting.railPrice}
            onChange={(v) => setMounting("railPrice", v)}
          />
          <NumberField
            label="Panels per tin kit"
            value={config.mounting.panelsPerTinKit}
            onChange={(v) => setMounting("panelsPerTinKit", v)}
          />
          <NumberField
            label="Panels per tile kit"
            value={config.mounting.panelsPerTileKit}
            onChange={(v) => setMounting("panelsPerTileKit", v)}
          />
          <NumberField
            label="Panels per rail set"
            value={config.mounting.panelsPerRailSet}
            onChange={(v) => setMounting("panelsPerRailSet", v)}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <h3 className="mb-6 text-xl font-semibold text-switchtec-ink">Install Pricing</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            label="Solar install price per watt ex GST"
            value={config.install.pricePerWatt}
            onChange={(value) => onConfigChange({ ...config, install: { ...config.install, pricePerWatt: value } })}
          />
          <NumberField
            label="Battery install base price ex GST"
            value={config.install.batteryBasePrice}
            onChange={(value) =>
              onConfigChange({ ...config, install: { ...config.install, batteryBasePrice: value } })
            }
          />
          <NumberField
            label="Battery install base included capacity kWh"
            value={config.install.batteryIncludedCapacityKwh}
            onChange={(value) =>
              onConfigChange({ ...config, install: { ...config.install, batteryIncludedCapacityKwh: value } })
            }
          />
          <NumberField
            label="Battery install extra step kWh"
            value={config.install.batteryExtraStepKwh}
            onChange={(value) =>
              onConfigChange({ ...config, install: { ...config.install, batteryExtraStepKwh: value } })
            }
          />
          <NumberField
            label="Battery install extra step price ex GST"
            value={config.install.batteryExtraStepPrice}
            onChange={(value) =>
              onConfigChange({ ...config, install: { ...config.install, batteryExtraStepPrice: value } })
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
        <h3 className="mb-6 text-xl font-semibold text-switchtec-ink">Margin Settings</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Margin mode">
            <select
              className={selectClass}
              value={config.margin.mode}
              onChange={(event) =>
                onConfigChange({ ...config, margin: { ...config.margin, mode: event.target.value as MarginMode } })
              }
            >
              <option>Preset percentage</option>
              <option>Manual percentage</option>
              <option>Manual dollar amount</option>
            </select>
          </Field>
          <Field label="Preset margin %">
            <select
              className={selectClass}
              value={config.margin.presetPercent}
              onChange={(event) =>
                onConfigChange({ ...config, margin: { ...config.margin, presetPercent: Number(event.target.value) } })
              }
            >
              {[10, 15, 20, 25, 30, 35, 40].map((percent) => (
                <option key={percent} value={percent}>
                  {percent}%
                </option>
              ))}
            </select>
          </Field>
          <NumberField
            label="Manual margin %"
            value={config.margin.manualPercent}
            onChange={(value) => onConfigChange({ ...config, margin: { ...config.margin, manualPercent: value } })}
          />
          <NumberField
            label="Manual margin dollar amount ex GST"
            value={config.margin.manualAmount}
            onChange={(value) => onConfigChange({ ...config, margin: { ...config.margin, manualAmount: value } })}
          />
        </div>
      </section>

      {inverterSections.map((section) => (
        <InverterTable
          key={`${section.type}-${section.phase}`}
          title={section.title}
          type={section.type}
          phase={section.phase}
          rows={manualInverters.filter((item) => item.type === section.type && item.phase === section.phase)}
          brandOptions={knownBrands.inverters}
          onManualAdd={() => addManualInverter(section.type, section.phase)}
          onManualChange={updateManualInverter}
          onManualRemove={removeManualInverter}
        />
      ))}
    </div>
  );
}

interface EditableColumn<T> {
  key: keyof T;
  type: "text" | "number";
  step?: string;
}

function EditableTable<T extends { name: string }>({
  title,
  headers,
  rows,
  columns,
  onChange
}: {
  title: string;
  headers: string[];
  rows: T[];
  columns: Array<EditableColumn<T>>;
  onChange: (index: number, patch: Partial<T>) => void;
}) {
  return (
    <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
      <h3 className="mb-6 text-xl font-semibold text-switchtec-ink">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              {headers.map((header) => (
                <th key={header} className="px-4 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.name}-${index}`} className="bg-[#F7F4EE]">
                {columns.map((column, columnIndex) => (
                  <td
                    key={String(column.key)}
                    className={`px-2 py-2 ${columnIndex === 0 ? "rounded-l-lg" : ""} ${
                      columnIndex === columns.length - 1 ? "rounded-r-lg" : ""
                    }`}
                  >
                    <input
                      className={`${inputClass} h-11 min-w-[7rem] px-3 ${column.key === "name" ? "min-w-[14rem]" : ""}`}
                      type={column.type}
                      step={column.step}
                      value={row[column.key] as string | number}
                      onChange={(event) =>
                        onChange(index, {
                          [column.key]:
                            column.type === "number" ? Number(event.target.value) : event.target.value
                        } as Partial<T>)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SupplierProductEditPanel({
  product,
  onChange,
  onClose,
  approvedBrands
}: {
  product: SupplierProduct;
  onChange: (patch: Partial<SupplierProduct>) => void;
  onClose: () => void;
  approvedBrands: string[];
}) {
  const tradezoneDecision = detectTradezoneWebsiteQuotable(product, approvedBrands);
  const useOverride = product.manualOverridePriceExGst !== undefined;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Product name">
          <input className={inputClass} value={effectiveProductName(product)} onChange={(event) => onChange({ manualProductName: event.target.value })} />
        </Field>
        <Field label="Brand">
          <input className={inputClass} value={product.brand} onChange={(event) => onChange({ brand: event.target.value })} />
        </Field>
        <Field label="Category">
          <select className={selectClass} value={getNormalizedCategory(product)} onChange={(event) => onChange({ manualNormalizedCategory: event.target.value as NormalizedCategory })}>
            {supplierCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="Price override ex GST">
          <input
            className={inputClass}
            type="number"
            step="0.01"
            value={product.manualOverridePriceExGst ?? ""}
            disabled={!useOverride}
            placeholder={String(product.priceExGst)}
            onChange={(event) => onChange({ manualOverridePriceExGst: event.target.value === "" ? 0 : Number(event.target.value) })}
          />
        </Field>
        <label className="flex items-center gap-2 rounded-2xl bg-[#F7F4EE] px-4 py-3 text-sm font-semibold text-[#66756f]">
          <input
            type="checkbox"
            checked={useOverride}
            onChange={(event) => onChange({ manualOverridePriceExGst: event.target.checked ? effectiveProductPrice(product) : undefined })}
          />
          Use override price
        </label>
        <label className="flex items-center gap-2 rounded-2xl bg-[#F7F4EE] px-4 py-3 text-sm font-semibold text-[#66756f]">
          <input type="checkbox" checked={product.showInQuoting === true} onChange={(event) => onChange({ manualShowInQuoting: event.target.checked })} />
          Active / show in quoting
        </label>
        {product.supplier === "Tradezone" ? (
          <label className="flex items-center gap-2 rounded-2xl bg-[#F7F4EE] px-4 py-3 text-sm font-semibold text-[#66756f]">
            <input
              type="checkbox"
              checked={(product.manualTradezoneWebsiteQuotable ?? product.tradezoneWebsiteQuotable ?? tradezoneDecision.quotable) === true}
              onChange={(event) =>
                onChange({
                  manualTradezoneWebsiteQuotable: event.target.checked,
                  manualShowInQuoting: event.target.checked ? true : product.manualShowInQuoting
                })
              }
            />
            Show this Tradezone product in quoting
          </label>
        ) : null}
        <Field label="Stock status">
          <select className={selectClass} value={product.stockStatus ?? "unknown"} onChange={(event) => onChange({ stockStatus: event.target.value as StockStatus })}>
            {stockStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>
        <Field label="Compatible brand">
          <input className={inputClass} value={product.compatibleBrand ?? "Generic"} onChange={(event) => onChange({ compatibleBrand: event.target.value })} />
        </Field>
        <Field label="Notes">
          <input className={inputClass} value={product.notes ?? ""} onChange={(event) => onChange({ notes: event.target.value })} />
        </Field>
      </div>
      <div className="rounded-2xl border border-switchtec-line/70 bg-[#F7F4EE] p-4 text-sm leading-6 text-[#66756f]">
        <p><strong className="text-switchtec-ink">Supplier:</strong> {product.supplier}</p>
        <p><strong className="text-switchtec-ink">Normalised category:</strong> {getNormalizedCategory(product)}</p>
        <p><strong className="text-switchtec-ink">Manufacturer:</strong> {product.manufacturer || "-"}</p>
        <p><strong className="text-switchtec-ink">Price:</strong> {money(effectiveProductPrice(product))} ex GST</p>
        {product.supplier === "Tradezone" ? (
          <>
            <p><strong className="text-switchtec-ink">Website quotable:</strong> {(product.manualTradezoneWebsiteQuotable ?? product.tradezoneWebsiteQuotable ?? tradezoneDecision.quotable) ? "Yes" : "No"}</p>
            <p><strong className="text-switchtec-ink">Reason:</strong> {product.notQuotableReason || tradezoneDecision.reason || "-"}</p>
          </>
        ) : null}
        <button type="button" className="mt-4 rounded-lg bg-switchtec-mint px-3 py-2 text-xs font-semibold text-switchtec-ink" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  const tone = label === "Active" ? "bg-switchtec-mint text-switchtec-forest" : label === "Hidden" ? "bg-rose-50 text-rose-700" : "bg-[#EDE6DA] text-[#6b6258]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function StockBadge({ label }: { label: string }) {
  const tone = label.startsWith("In stock") ? "bg-switchtec-mint text-switchtec-forest" : label.startsWith("Out") ? "bg-rose-50 text-rose-700" : "bg-[#EDE6DA] text-[#6b6258]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function BrandCombobox({
  value,
  options,
  onChange,
  disabled = false
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const query = isTyping ? value : "";
  const normalizedQuery = normalizeBrandSearch(query);
  const filteredOptions = options.filter((option) => normalizeBrandSearch(option).includes(normalizedQuery)).slice(0, 40);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setIsTyping(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative min-w-36" ref={wrapperRef}>
      <input
        className={`${inputClass} h-11 min-w-36 pr-8`}
        value={value}
        disabled={disabled}
        placeholder="Select or type brand"
        onFocus={() => {
          setOpen(true);
          setIsTyping(false);
        }}
        onClick={() => {
          setOpen(true);
          setIsTyping(false);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setIsTyping(true);
        }}
      />
      {!disabled && value ? (
        <button
          type="button"
          className="absolute right-2 top-2.5 rounded-md px-1.5 py-0.5 text-xs font-semibold text-[#66756f] transition hover:bg-switchtec-mint"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange("");
            setOpen(true);
            setIsTyping(false);
          }}
          aria-label="Clear brand"
        >
          x
        </button>
      ) : null}
      {open && !disabled ? (
        <div className="absolute z-40 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-switchtec-line bg-[#fffdf8] p-2 shadow-panel">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-switchtec-ink transition hover:bg-switchtec-mint"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setIsTyping(false);
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-xs text-[#66756f]">Type a new brand to add it.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeBrandSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function ManualPanelTable({
  panels,
  brandOptions,
  onChange,
  onAdd,
  onRemove
}: {
  panels: ManualPanelProduct[];
  brandOptions: string[];
  onChange: (index: number, patch: Partial<ManualPanelProduct>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
      <ManualTableHeader title="Panel Pricing" buttonLabel="Add Panel" onAdd={onAdd} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Panel Name</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Wattage</th>
              <th className="px-4 py-2">Price per panel ex GST</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {panels.map((panel, index) => (
              <tr key={panel.id ?? `panel-${index}`} className="bg-[#F7F4EE]">
                <td className="rounded-l-xl px-4 py-3">
                  <input type="checkbox" checked={panel.active !== false} onChange={(event) => onChange(index, { active: event.target.checked })} />
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-52`} value={panel.name} onChange={(event) => onChange(index, { name: event.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <BrandCombobox value={panel.brand ?? ""} options={brandOptions} onChange={(brand) => onChange(index, { brand })} />
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-28`} type="number" value={panel.watt} onChange={(event) => onChange(index, { watt: Number(event.target.value) })} />
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-36`} type="number" step="0.01" value={panel.price} onChange={(event) => onChange(index, { price: Number(event.target.value) })} />
                </td>
                <td className="rounded-r-xl px-4 py-3">
                  <DeleteButton onClick={() => onRemove(index)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <AddRowButton label="Add Panel" onClick={onAdd} />
      </div>
    </section>
  );
}

function ManualBatteryTable({
  batteries,
  brandOptions,
  onChange,
  onAdd,
  onRemove
}: {
  batteries: ManualBatteryProduct[];
  brandOptions: string[];
  onChange: (index: number, patch: Partial<ManualBatteryProduct>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
      <ManualTableHeader title="Battery Pricing" buttonLabel="Add Battery" onAdd={onAdd} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Battery Name</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">kWh per module/unit</th>
              <th className="px-4 py-2">Price per module/unit ex GST</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {batteries.map((battery, index) => {
              const isNoBattery = battery.name === "No Battery";
              return (
                <tr key={battery.id ?? `battery-${index}`} className="bg-[#F7F4EE]">
                  <td className="rounded-l-xl px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isNoBattery || battery.active !== false}
                      disabled={isNoBattery}
                      onChange={(event) => onChange(index, { active: event.target.checked })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input className={`${inputClass} h-11 min-w-52`} value={battery.name} disabled={isNoBattery} onChange={(event) => onChange(index, { name: event.target.value })} />
                  </td>
                  <td className="px-2 py-2">
                    <BrandCombobox
                      value={battery.brand ?? ""}
                      options={brandOptions}
                      disabled={isNoBattery}
                      onChange={(brand) => onChange(index, { brand })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input className={`${inputClass} h-11 min-w-32`} type="number" step="0.01" value={battery.kWh} disabled={isNoBattery} onChange={(event) => onChange(index, { kWh: Number(event.target.value) })} />
                  </td>
                  <td className="px-2 py-2">
                    <input className={`${inputClass} h-11 min-w-36`} type="number" step="0.01" value={battery.price} disabled={isNoBattery} onChange={(event) => onChange(index, { price: Number(event.target.value) })} />
                  </td>
                  <td className="rounded-r-xl px-4 py-3">
                    {isNoBattery ? <span className="text-xs text-[#66756f]">Required</span> : <DeleteButton onClick={() => onRemove(index)} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <AddRowButton label="Add Battery" onClick={onAdd} />
      </div>
    </section>
  );
}

function ManualAccessoryTable({
  accessories,
  brandOptions,
  onAdd,
  onChange,
  onRemove
}: {
  accessories: ManualAccessoryProduct[];
  brandOptions: string[];
  onAdd: () => void;
  onChange: (id: string, patch: Partial<ManualAccessoryProduct>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
      <ManualTableHeader title="Manual Accessory Items" buttonLabel="Add Manual Accessory" onAdd={onAdd} />
      <p className="mb-5 text-sm leading-6 text-[#66756f]">
        Active manual accessories appear in Accessories & Extra Items and are included in quote hardware totals when selected.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Accessory name</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">SKU / Part number</th>
              <th className="px-4 py-2">Price ex GST</th>
              <th className="px-4 py-2">Default qty</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {accessories.map((item) => (
              <tr key={item.id} className="bg-[#F7F4EE]">
                <td className="rounded-l-xl px-4 py-3">
                  <input type="checkbox" checked={item.active !== false} onChange={(event) => onChange(item.id, { active: event.target.checked })} />
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-56`} value={item.name} onChange={(event) => onChange(item.id, { name: event.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <BrandCombobox value={item.brand} options={brandOptions} onChange={(brand) => onChange(item.id, { brand })} />
                </td>
                <td className="px-2 py-2">
                  <select className={`${selectClass} h-11 min-w-44`} value={item.category} onChange={(event) => onChange(item.id, { category: event.target.value })}>
                    {manualAccessoryCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-72`} value={item.description} onChange={(event) => onChange(item.id, { description: event.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-40`} value={item.sku} onChange={(event) => onChange(item.id, { sku: event.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-32`} type="number" step="0.01" value={item.price} onChange={(event) => onChange(item.id, { price: Number(event.target.value) })} />
                </td>
                <td className="px-2 py-2">
                  <input className={`${inputClass} h-11 min-w-24`} type="number" min={1} value={item.defaultQuantity} onChange={(event) => onChange(item.id, { defaultQuantity: Math.max(1, Number(event.target.value) || 1) })} />
                </td>
                <td className="rounded-r-xl px-4 py-3">
                  <DeleteButton onClick={() => onRemove(item.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <AddRowButton label="Add Manual Accessory" onClick={onAdd} />
      </div>
    </section>
  );
}

function InverterTable({
  title,
  type,
  phase,
  rows,
  brandOptions,
  onManualAdd,
  onManualChange,
  onManualRemove
}: {
  title: string;
  type: InverterType;
  phase: Phase;
  rows: ManualInverterProduct[];
  brandOptions: string[];
  onManualAdd: () => void;
  onManualChange: (id: string, patch: Partial<ManualInverterProduct>) => void;
  onManualRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-switchtec-line/70 bg-[#fffdf8] p-7 shadow-panel">
      <ManualTableHeader title={title} buttonLabel="Add Inverter" onAdd={onManualAdd} />
      <p className="mb-5 text-sm leading-6 text-[#66756f]">
        Default inverter rows are editable quoting templates. Confirm product availability and approval with supplier/CEC before quoting.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Model / product name</th>
              <th className="px-4 py-2">Size kW</th>
              <th className="px-4 py-2">Phase</th>
              <th className="px-4 py-2">Inverter type</th>
              <th className="px-4 py-2">Price ex GST</th>
              <th className="px-4 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item) => (
                <tr key={item.id} className="bg-[#F7F4EE]">
                  <td className="rounded-l-xl px-4 py-3">
                    <input type="checkbox" checked={item.active !== false} onChange={(event) => onManualChange(item.id, { active: event.target.checked })} />
                  </td>
                  <td className="px-2 py-2">
                    <BrandCombobox value={item.brand} options={brandOptions} onChange={(brand) => onManualChange(item.id, { brand })} />
                  </td>
                  <td className="px-2 py-2">
                    <input className={`${inputClass} h-11 min-w-56`} value={item.model} onChange={(event) => onManualChange(item.id, { model: event.target.value })} />
                  </td>
                  <td className="px-2 py-2">
                    <input className={`${inputClass} h-11 min-w-28`} type="number" step="0.1" value={item.sizeKw} onChange={(event) => onManualChange(item.id, { sizeKw: Number(event.target.value) })} />
                  </td>
                  <td className="px-4 py-3 text-[#66756f]">{item.phase}</td>
                  <td className="px-4 py-3 text-[#66756f]">{item.type}</td>
                  <td className="px-2 py-2">
                    <input className={`${inputClass} h-11 min-w-32`} type="number" step="0.01" value={item.price} onChange={(event) => onManualChange(item.id, { price: Number(event.target.value) })} />
                  </td>
                  <td className="rounded-r-xl px-4 py-3">
                    <DeleteButton onClick={() => onManualRemove(item.id)} />
                  </td>
                </tr>
              ))
            ) : (
              <tr className="bg-[#F7F4EE]">
                <td className="rounded-xl px-4 py-4 text-sm text-[#66756f]" colSpan={8}>
                  No manual {phase} {type.toLowerCase()} products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <AddRowButton label="Add Inverter" onClick={onManualAdd} />
      </div>
    </section>
  );
}

function ManualTableHeader({ title, buttonLabel, onAdd }: { title: string; buttonLabel: string; onAdd: () => void }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <h3 className="text-xl font-semibold text-switchtec-ink">{title}</h3>
      <AddRowButton label={buttonLabel} onClick={onAdd} />
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-11 items-center justify-center rounded-xl bg-switchtec-forest px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-switchtec-green"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
      onClick={onClick}
    >
      Delete
    </button>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-switchtec-line/70 bg-[#F7F4EE] p-5">
      <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-switchtec-sage">{title}</h4>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

function createManualId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function NumberField({
  label,
  value,
  onChange,
  step = "0.01"
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

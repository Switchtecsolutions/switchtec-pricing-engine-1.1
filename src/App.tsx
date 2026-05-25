import { useMemo, useState } from "react";
import defaultPricing from "./config/pricing.json";
import seededSupplierProducts from "./data/supplierProducts.json";
import { Header } from "./components/Header";
import { PricingCalculator } from "./components/PricingCalculator";
import { QuoteSummary } from "./components/QuoteSummary";
import { Sidebar } from "./components/Sidebar";
import { ClientQuote } from "./components/ClientQuote";
import { SettingsPage } from "./components/SettingsPage";
import { SavedQuotes } from "./components/SavedQuotes";
import { calculateQuote } from "./utils/pricing";
import { manualQuoteProducts, mergeDefaultManualInverters } from "./utils/manualProducts";
import { getNormalizedCategory, reclassifySupplierProduct } from "./utils/supplierProducts";
import { loadLocal, saveLocal } from "./utils/storage";
import { todayIso } from "./utils/format";
import type { ManualInverterProduct, PricingConfig, QuoteInput, SavedQuote, SelectedBatteryItem, SupplierProduct } from "./types";

export type View = "calculator" | "quote" | "settings" | "saved";

const SETTINGS_KEY = "switchtec-pricing-settings";
const QUOTES_KEY = "switchtec-saved-quotes";
const SUPPLIER_PRODUCTS_KEY = "switchtec-supplier-products";
const seededSupplierProductList = seededSupplierProducts as SupplierProduct[];

const supplierKey = (product: SupplierProduct) =>
  `${product.supplier.toLowerCase()}::${(product.sku || product.supplierPartNumber || product.tradezonePartNumber || product.id).toLowerCase()}`;

const manualOverrideFields = (product?: SupplierProduct) => ({
  hidden: product?.hidden,
  manualOverridePriceExGst: product?.manualOverridePriceExGst,
  manualNormalizedCategory: product?.manualNormalizedCategory,
  manualUnitType: product?.manualUnitType,
  manualShowInPanelDropdown: product?.manualShowInPanelDropdown,
  manualAvailabilityStatus: product?.manualAvailabilityStatus,
  manualShowInQuoting: product?.manualShowInQuoting,
  manualTradezoneWebsiteQuotable: product?.manualTradezoneWebsiteQuotable,
  manualProductName: product?.manualProductName,
  compatibleBrand: product?.compatibleBrand,
  stockStatus: product?.stockStatus,
  notes: product?.notes
});

const mergeSupplierProducts = (seeded: SupplierProduct[], local: SupplierProduct[], config: PricingConfig) => {
  const merged = new Map<string, SupplierProduct>();
  seeded.forEach((product) => {
    merged.set(supplierKey(product), reclassifySupplierProduct(product, config.approvedTradezoneBrands));
  });
  local.forEach((product) => {
    const key = supplierKey(product);
    const seededProduct = merged.get(key);
    merged.set(
      key,
      reclassifySupplierProduct(
        seededProduct
          ? {
              ...seededProduct,
              ...manualOverrideFields(product),
              compatibleBrand: product.compatibleBrand ?? seededProduct.compatibleBrand
            }
          : product,
        config.approvedTradezoneBrands
      )
    );
  });
  return Array.from(merged.values());
};

const hasLocalSupplierOverride = (product: SupplierProduct, seededProduct?: SupplierProduct) =>
  !seededProduct ||
  product.hidden !== seededProduct.hidden ||
  product.manualOverridePriceExGst !== undefined ||
  product.manualNormalizedCategory !== undefined ||
  product.manualUnitType !== undefined ||
  product.manualShowInPanelDropdown !== undefined ||
  product.manualAvailabilityStatus !== undefined ||
  product.manualShowInQuoting !== undefined ||
  product.manualTradezoneWebsiteQuotable !== undefined ||
  product.manualProductName !== undefined ||
  product.stockStatus !== seededProduct.stockStatus ||
  (product.notes ?? "") !== (seededProduct.notes ?? "") ||
  (product.compatibleBrand ?? "") !== (seededProduct.compatibleBrand ?? "");

const localSupplierProductsToPersist = (products: SupplierProduct[], seeded: SupplierProduct[]) => {
  const seededByKey = new Map(seeded.map((product) => [supplierKey(product), product]));
  return products.filter((product) => hasLocalSupplierOverride(product, seededByKey.get(supplierKey(product))));
};

const persistSupplierProducts = (products: SupplierProduct[]) => {
  const localProducts = localSupplierProductsToPersist(products, seededSupplierProductList);
  try {
    saveLocal(SUPPLIER_PRODUCTS_KEY, localProducts);
    return products;
  } catch {
    const quoteRelevantProducts = localProducts.filter((product) => getNormalizedCategory(product) !== "Other");
    try {
      saveLocal(SUPPLIER_PRODUCTS_KEY, quoteRelevantProducts);
    } catch {
      saveLocal(SUPPLIER_PRODUCTS_KEY, []);
    }
    return products;
  }
};

const createQuoteInput = (config: PricingConfig): QuoteInput => ({
  id: crypto.randomUUID(),
  name: "Residential Solar + Battery Quote",
  clientName: "",
  address: "",
  postcode: "2000",
  solarSizeKw: 13,
  panelName: config.panels[0].name,
  batteryName: config.batteries[0].name,
  batteryModules: 0,
  selectedBatteryItems: [],
  stcPrice: config.solarStc.price,
  roofType: "Tin",
  phase: "Single Phase",
  inverterType: "Hybrid inverter",
  inverterBrand: "FoxESS",
  inverterSize: "10kW",
  panelProductId: "",
  batteryProductId: "",
  inverterProductId: "",
  selectedAccessories: [],
  extraAmountExGst: 0,
  extraNote: "",
  notes: "",
  createdAt: todayIso()
});

const brandFromManualName = (name = "") => {
  const lower = name.toLowerCase();
  if (lower.includes("jinko")) return "Jinko";
  if (lower.includes("tcl")) return "TCL";
  if (lower.includes("sungrow")) return "Sungrow";
  if (lower.includes("sigenergy") || lower.includes("sigen")) return "Sigenergy";
  if (lower.includes("solax")) return "SolaX";
  if (lower.includes("goodwe")) return "GoodWe";
  if (lower.includes("byd")) return "BYD";
  if (lower.includes("fox")) return "FoxESS";
  if (lower.includes("ja")) return "JA";
  return "Manual";
};

const manualRowSlug = (value = "row") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "row";

const ensurePanelIds = (panels: PricingConfig["panels"]): PricingConfig["panels"] =>
  panels.map((panel, index) => ({
    ...panel,
    id: panel.id ?? `manual-panel-${index}-${manualRowSlug(panel.name || panel.brand || "panel")}`
  }));

const ensureBatteryIds = (batteries: PricingConfig["batteries"]): PricingConfig["batteries"] =>
  batteries.map((battery, index) => ({
    ...battery,
    id: battery.id ?? `manual-battery-${index}-${manualRowSlug(battery.name || battery.brand || "battery")}`
  }));

const legacyCq7BatteryNames: Record<string, string> = {
  "FoxESS CQ7-M Master Module": "FoxESS CQ7-M",
  "FoxESS CQ7-S Slave Module": "FoxESS CQ7-S"
};

const requiredFoxBatteryNames = new Set([
  "FoxESS CQ7-M",
  "FoxESS CQ7-S",
  "FoxESS CQ6-M",
  "FoxESS CQ6-S",
  "FoxESS EQ4800-M",
  "FoxESS EQ4800-S"
]);

const requiredFoxDefaultBatteries = defaultPricing.batteries.filter((battery) =>
  requiredFoxBatteryNames.has(battery.name)
) as PricingConfig["batteries"];

const requiredFoxDefaultByName = new Map(requiredFoxDefaultBatteries.map((battery) => [battery.name, battery]));

const canonicalBatteryName = (name: string) => legacyCq7BatteryNames[name] ?? name;

const isOldCq7SeedPrice = (price: number) => price === 1262;

const defaultBatteryPrice = (battery: PricingConfig["batteries"][number], batteryDefault: PricingConfig["batteries"][number]) => {
  const price = Number(battery.price) || 0;
  return price > 0 && !isOldCq7SeedPrice(price) ? price : batteryDefault.price;
};

const mergeRequiredBatteryDefaults = (batteries: PricingConfig["batteries"]): PricingConfig["batteries"] => {
  const merged: PricingConfig["batteries"] = [];
  const requiredIndexes = new Map<string, number>();

  batteries.forEach((battery) => {
    const name = canonicalBatteryName(battery.name);
    const requiredDefault = requiredFoxDefaultByName.get(name);
    if (!requiredDefault) {
      merged.push(battery);
      return;
    }

    const normalizedBattery = {
      ...requiredDefault,
      ...battery,
      name,
      brand: "FoxESS",
      kWh: requiredDefault.kWh,
      price: defaultBatteryPrice(battery, requiredDefault),
      active: battery.active ?? true,
      aliases: requiredDefault.aliases,
      notes: battery.notes ?? requiredDefault.notes
    };

    const existingIndex = requiredIndexes.get(name);
    if (existingIndex === undefined) {
      requiredIndexes.set(name, merged.length);
      merged.push(normalizedBattery);
      return;
    }

    const existingBattery = merged[existingIndex];
    merged[existingIndex] = {
      ...normalizedBattery,
      price: defaultBatteryPrice(existingBattery, requiredDefault)
    };
  });

  requiredFoxDefaultBatteries.forEach((battery) => {
    if (!requiredIndexes.has(battery.name)) {
      merged.push(battery);
    }
  });

  return merged;
};

const normalizeConfig = (raw: Partial<PricingConfig>): PricingConfig => ({
  ...defaultPricing,
  ...(raw.panels?.length && raw.batteries?.[0]?.name === "No Battery" && raw.invertersByType ? raw : {}),
  roofTypeAdders: { ...defaultPricing.roofTypeAdders, ...raw.roofTypeAdders },
  phaseAdders: { ...defaultPricing.phaseAdders, ...raw.phaseAdders },
  solarStc: {
    ...defaultPricing.solarStc,
    ...raw.solarStc,
    price: Number(raw.solarStc?.price ?? raw.stcPrice ?? defaultPricing.solarStc.price),
    deemingYears: Number(raw.solarStc?.deemingYears ?? defaultPricing.solarStc.deemingYears),
    zoneRating: Number(raw.solarStc?.zoneRating ?? defaultPricing.solarStc.zoneRating),
    zoneRatings: { ...defaultPricing.solarStc.zoneRatings, ...(raw.solarStc?.zoneRatings ?? {}) }
  },
  batteryStcPrice: Number(raw.batteryStcPrice ?? raw.stcPrice ?? defaultPricing.batteryStcPrice),
  mounting: { ...defaultPricing.mounting, ...raw.mounting },
  install: { ...defaultPricing.install, ...raw.install },
  extras: { ...defaultPricing.extras, ...raw.extras },
  margin: { ...defaultPricing.margin, ...raw.margin },
  supplierSettings: { ...defaultPricing.supplierSettings, ...raw.supplierSettings },
  invertersByType:
    raw.panels?.length && raw.batteries?.[0]?.name === "No Battery" && raw.invertersByType
      ? raw.invertersByType
      : defaultPricing.invertersByType,
  panels: ensurePanelIds(raw.panels?.length ? raw.panels : defaultPricing.panels).map((panel) => ({
    ...panel,
    brand: panel.brand ?? brandFromManualName(panel.name),
    active: panel.active ?? true
  })),
  batteries: ensureBatteryIds(mergeRequiredBatteryDefaults(raw.batteries?.[0]?.name === "No Battery" ? raw.batteries : defaultPricing.batteries)).map((battery) => ({
    ...battery,
    brand: battery.brand ?? (battery.name === "No Battery" ? "None" : brandFromManualName(battery.name)),
    active: battery.name === "No Battery" ? true : battery.active ?? true
  })),
  manualAccessories: raw.manualAccessories ?? defaultPricing.manualAccessories,
  manualInverters: mergeDefaultManualInverters(
    raw.manualInverters ?? [],
    (raw as Partial<PricingConfig> & { deletedManualInverterDefaultIds?: string[] }).deletedManualInverterDefaultIds ?? []
  ) as PricingConfig["manualInverters"],
  deletedManualInverterDefaultIds: (raw as Partial<PricingConfig> & { deletedManualInverterDefaultIds?: string[] }).deletedManualInverterDefaultIds ?? [],
  approvedTradezoneBrands: raw.approvedTradezoneBrands?.length
    ? raw.approvedTradezoneBrands
    : defaultPricing.approvedTradezoneBrands
});

const normalizeQuote = (raw: Partial<QuoteInput>, config: PricingConfig): QuoteInput => {
  const legacyBatteryNames: Record<string, string> = {
    "FoxESS CQ module": "FoxESS CQ",
    "FoxESS EQ module": "FoxESS EQ",
    "FoxESS CQ": "FoxESS CQ",
    "Sungrow SBR": "Sungrow 5kWh Module",
    "Sungrow 5kWh module": "Sungrow 5kWh Module",
    "SolaX Triple module": "SolaX Triple",
    Sigenergy: "Sigenergy 8kWh",
    "Sigenergy 8kWh unit": "Sigenergy 8kWh",
    "BYD HVM module": "BYD HVM"
  };
  const base = { ...createQuoteInput(config), ...raw };
  const batteryName = legacyBatteryNames[base.batteryName] ?? base.batteryName;
  const panelName = config.panels.some((panel) => panel.name === base.panelName)
    ? base.panelName
    : config.panels[0].name;
  const normalizedBatteryName = config.batteries.some((battery) => battery.name === batteryName)
    ? batteryName
    : config.batteries[0].name;
  const selectedBatteryItems = normalizeSelectedBatteryItems(base, config, normalizedBatteryName);
  const phase = base.phase === "3 Phase" ? "3 Phase" : "Single Phase";
  const inverterType =
    base.inverterType && config.invertersByType[base.inverterType]
      ? base.inverterType
      : "Hybrid inverter";
  const phaseInverters = config.invertersByType[inverterType][phase];
  const manualInverterRows = (config.manualInverters as ManualInverterProduct[]).filter(
    (item) => item.active !== false && item.type === inverterType && item.phase === phase
  );
  const availableInverterBrands = Array.from(
    new Set([...Object.keys(phaseInverters), ...manualInverterRows.map((item) => item.brand)])
  );
  const inverterBrand = availableInverterBrands.includes(base.inverterBrand)
    ? base.inverterBrand
    : (availableInverterBrands[0] as QuoteInput["inverterBrand"]);
  const manualInverterSizes = manualInverterRows
    .filter((item) => item.brand === inverterBrand)
    .map((item) => `${item.sizeKw}kW`);
  const availableInverterSizes = Array.from(
    new Set([...(phaseInverters[inverterBrand] ? Object.keys(phaseInverters[inverterBrand]) : []), ...manualInverterSizes])
  );
  const inverterSize = availableInverterSizes.includes(base.inverterSize)
    ? base.inverterSize
    : (availableInverterSizes[0] as QuoteInput["inverterSize"]);

  return {
    ...base,
    phase,
    inverterType,
    panelName,
    batteryName: normalizedBatteryName,
    selectedBatteryItems,
    inverterBrand,
    inverterSize,
    panelProductId: base.panelProductId ?? "",
    batteryProductId: base.batteryProductId ?? "",
    inverterProductId: base.inverterProductId ?? "",
    selectedAccessories: Array.isArray(base.selectedAccessories) ? base.selectedAccessories : [],
    extraAmountExGst: Number(base.extraAmountExGst ?? 0),
    extraNote: base.extraNote ?? "",
    stcPrice: Number(base.stcPrice ?? config.solarStc.price)
  };
};

const normalizeSelectedBatteryItems = (
  input: Partial<QuoteInput>,
  config: PricingConfig,
  normalizedBatteryName: string
): SelectedBatteryItem[] => {
  if (Array.isArray(input.selectedBatteryItems) && input.selectedBatteryItems.length) {
    return input.selectedBatteryItems
      .map((item, index) => normalizeBatteryLineItem(item, index))
      .filter((item): item is SelectedBatteryItem => Boolean(item));
  }

  const modules = Math.max(0, Number(input.batteryModules) || 0);
  if (!modules || normalizedBatteryName === "No Battery" || input.batteryProductId) return [];

  const battery = config.batteries.find((item) => item.name === normalizedBatteryName);
  if (!battery) return [];

  return [
    createBatteryLineItem({
      id: `legacy-battery-${manualRowSlug(battery.name)}-${modules}`,
      productId: battery.id ?? battery.name,
      brand: battery.brand ?? brandFromManualName(battery.name),
      name: battery.name,
      qty: modules,
      kwhEach: Number(battery.kWh) || 0,
      unitPriceExGst: Number(battery.price) || 0
    })
  ];
};

const normalizeBatteryLineItem = (item: Partial<SelectedBatteryItem>, index: number): SelectedBatteryItem | null => {
  const qty = Math.max(1, Number(item.qty) || 1);
  const kwhEach = Math.max(0, Number(item.kwhEach) || 0);
  const unitPriceExGst = Math.max(0, Number(item.unitPriceExGst) || 0);
  const name = item.name || "Battery item";
  return createBatteryLineItem({
    id: item.id || `battery-line-${index}-${manualRowSlug(name)}`,
    productId: item.productId || item.id || name,
    brand: item.brand || brandFromManualName(name),
    name,
    qty,
    kwhEach,
    unitPriceExGst
  });
};

const createBatteryLineItem = ({
  id,
  productId,
  brand,
  name,
  qty,
  kwhEach,
  unitPriceExGst
}: {
  id: string;
  productId: string;
  brand: string;
  name: string;
  qty: number;
  kwhEach: number;
  unitPriceExGst: number;
}): SelectedBatteryItem => ({
  id,
  productId,
  brand,
  name,
  qty,
  kwhEach,
  unitPriceExGst,
  lineTotalKwh: qty * kwhEach,
  lineTotalExGst: qty * unitPriceExGst
});

export default function App() {
  const [view, setView] = useState<View>("calculator");
  const [config, setConfigState] = useState<PricingConfig>(() => {
    const normalized = normalizeConfig(loadLocal<Partial<PricingConfig>>(SETTINGS_KEY, defaultPricing));
    saveLocal(SETTINGS_KEY, normalized);
    return normalized;
  });
  const [input, setInput] = useState<QuoteInput>(() =>
    normalizeQuote(loadLocal<Partial<QuoteInput>>("switchtec-current-quote", createQuoteInput(config)), config)
  );
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(() =>
    loadLocal<SavedQuote[]>(QUOTES_KEY, [])
  );
  const [supplierProducts, setSupplierProductsState] = useState<SupplierProduct[]>(() =>
    mergeSupplierProducts(
      seededSupplierProductList,
      loadLocal<SupplierProduct[]>(SUPPLIER_PRODUCTS_KEY, []),
      config
    )
  );
  const quoteProducts = useMemo(
    () => [
      ...manualQuoteProducts(config),
      ...supplierProducts.filter((product) => product.supplier !== "Solar Juice")
    ],
    [config, supplierProducts]
  );

  const calculations = useMemo(
    () => calculateQuote(input, config, quoteProducts),
    [input, config, quoteProducts]
  );

  const updateInput = (patch: Partial<QuoteInput>) => {
    const next = { ...input, ...patch };
    if (
      patch.inverterProductId === undefined &&
      (patch.phase !== undefined ||
        patch.inverterType !== undefined ||
        patch.inverterBrand !== undefined ||
        patch.inverterSize !== undefined)
    ) {
      next.inverterProductId = "";
    }
    setInput(next);
    saveLocal("switchtec-current-quote", next);
  };

  const setConfig = (next: PricingConfig) => {
    setConfigState(next);
    saveLocal(SETTINGS_KEY, next);
  };

  const setSupplierProducts = (next: SupplierProduct[]) => {
    setSupplierProductsState(persistSupplierProducts(next));
  };

  const saveQuote = () => {
    const saved: SavedQuote = { input, calculations };
    const next = [saved, ...savedQuotes.filter((quote) => quote.input.id !== input.id)];
    setSavedQuotes(next);
    saveLocal(QUOTES_KEY, next);
  };

  const openQuote = (quote: SavedQuote) => {
    const normalized = normalizeQuote(quote.input, config);
    setInput(normalized);
    saveLocal("switchtec-current-quote", normalized);
    setView("calculator");
  };

  const deleteQuote = (id: string) => {
    const next = savedQuotes.filter((quote) => quote.input.id !== id);
    setSavedQuotes(next);
    saveLocal(QUOTES_KEY, next);
  };

  const exportPdf = () => {
    setView("quote");
    window.setTimeout(() => window.print(), 150);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#2D2D2D]">
      <Sidebar view={view} setView={setView} />
      <main className="lg:pl-72">
        <div className="mx-auto max-w-[1680px] p-4 md:p-8 lg:p-10">
          {view === "calculator" ? (
            <>
              <Header onSave={saveQuote} onExport={exportPdf} />
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
                <PricingCalculator
                  input={input}
                  config={config}
                  calculations={calculations}
                  supplierProducts={quoteProducts}
                  onChange={updateInput}
                />
                <QuoteSummary input={input} calculations={calculations} />
              </div>
            </>
          ) : null}

          {view === "quote" ? (
            <div className="mx-auto max-w-5xl">
              <Header onSave={saveQuote} onExport={exportPdf} />
              <ClientQuote input={input} calculations={calculations} />
            </div>
          ) : null}

          {view === "settings" ? (
            <SettingsPage
              config={config}
              supplierProducts={supplierProducts}
              onConfigChange={setConfig}
              onSupplierProductsChange={setSupplierProducts}
            />
          ) : null}

          {view === "saved" ? (
            <SavedQuotes quotes={savedQuotes} onOpen={openQuote} onDelete={deleteQuote} />
          ) : null}
        </div>
      </main>
    </div>
  );
}

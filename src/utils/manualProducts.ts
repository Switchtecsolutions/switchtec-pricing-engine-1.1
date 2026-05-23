import type {
  ManualAccessoryProduct,
  ManualBatteryProduct,
  ManualInverterProduct,
  ManualPanelProduct,
  NormalizedCategory,
  Phase,
  PricingConfig,
  SupplierProduct
} from "../types";
import defaultPricing from "../config/pricing.json";

export const manualAccessoryIdPrefix = "manual-accessory:";
export const manualInverterIdPrefix = "manual-inverter:";

const manualCategories = new Set<NormalizedCategory>([
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
]);

export function activeManualPanels(config: PricingConfig): ManualPanelProduct[] {
  return ((config.panels ?? []) as ManualPanelProduct[]).filter((panel) => panel.active !== false);
}

export function activeManualBatteries(config: PricingConfig): ManualBatteryProduct[] {
  return ((config.batteries ?? []) as ManualBatteryProduct[]).filter(
    (battery) => battery.name === "No Battery" || battery.active !== false
  );
}

export function manualAccessories(config: PricingConfig): ManualAccessoryProduct[] {
  return ((config.manualAccessories ?? []) as ManualAccessoryProduct[]).filter((item) => item.active !== false);
}

export function manualInverters(config: PricingConfig): ManualInverterProduct[] {
  return ((config.manualInverters ?? []) as ManualInverterProduct[]).filter((item) => item.active !== false);
}

export function defaultManualInverterRows(): ManualInverterProduct[] {
  const seeds: Array<{ brand: string; type: ManualInverterProduct["type"]; phase: ManualInverterProduct["phase"]; sizes: number[] }> = [
    { brand: "FoxESS", type: "Hybrid inverter", phase: "Single Phase", sizes: [3, 3.7, 4.6, 5, 6, 8, 10] },
    { brand: "FoxESS", type: "Hybrid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25, 29, 30, 40, 50] },
    { brand: "FoxESS", type: "Grid inverter", phase: "Single Phase", sizes: [3, 3.7, 4.6, 5, 6, 8, 10] },
    { brand: "FoxESS", type: "Grid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25, 29, 30, 40, 50] },

    { brand: "GoodWe", type: "Hybrid inverter", phase: "Single Phase", sizes: [3, 3.6, 5, 6, 8, 10] },
    { brand: "GoodWe", type: "Hybrid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25, 29.9, 30, 50] },
    { brand: "GoodWe", type: "Grid inverter", phase: "Single Phase", sizes: [3, 3.6, 4.2, 5, 6, 8, 10] },
    { brand: "GoodWe", type: "Grid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25, 29.9, 30, 50, 60, 75, 100, 110] },

    { brand: "Sungrow", type: "Hybrid inverter", phase: "Single Phase", sizes: [3, 5, 6, 8, 10] },
    { brand: "Sungrow", type: "Hybrid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25] },
    { brand: "Sungrow", type: "Grid inverter", phase: "Single Phase", sizes: [3, 5, 6, 8, 10] },
    { brand: "Sungrow", type: "Grid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25, 30, 33, 40, 50, 75, 100, 110, 125, 250] },

    { brand: "Sigenergy", type: "Hybrid inverter", phase: "Single Phase", sizes: [5, 6, 8, 10, 12] },
    { brand: "Sigenergy", type: "Hybrid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25, 30, 50, 60, 80, 100, 110, 125] },

    { brand: "Solis", type: "Hybrid inverter", phase: "Single Phase", sizes: [3, 3.6, 5, 6, 8, 10] },
    { brand: "Solis", type: "Hybrid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 15, 20, 25, 29.9, 30, 40, 50] },
    { brand: "Solis", type: "Grid inverter", phase: "Single Phase", sizes: [1, 1.5, 2, 2.5, 3, 3.6, 4, 5, 6, 8, 10] },
    { brand: "Solis", type: "Grid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 20, 25, 29.9, 30, 40, 50, 60, 75, 80, 100, 110, 125, 150, 255] },

    { brand: "SolaX", type: "Hybrid inverter", phase: "Single Phase", sizes: [3, 3.7, 4.6, 5, 6, 7.5] },
    { brand: "SolaX", type: "Hybrid inverter", phase: "3 Phase", sizes: [5, 6, 8, 10, 12, 15, 19.9, 20, 25, 30] },
    { brand: "SolaX", type: "Grid inverter", phase: "Single Phase", sizes: [1.1, 1.5, 2, 2.5, 3, 3.3, 3.6, 4.2, 5, 6, 7, 8, 10] },
    { brand: "SolaX", type: "Grid inverter", phase: "3 Phase", sizes: [3, 4, 5, 6, 8, 10, 12, 15, 17, 20, 25, 30, 40, 50, 60, 80, 100, 110] }
  ];

  return seeds.flatMap(({ brand, type, phase, sizes }) =>
    sizes.map((sizeKw) => createDefaultManualInverterRow(brand, type, phase, sizeKw))
  );
}

const defaultManualInverterPrices = new Map<string, number>([
  [defaultManualInverterPriceKey("FoxESS", "Hybrid inverter", "Single Phase", 5), 1280],
  [defaultManualInverterPriceKey("FoxESS", "Hybrid inverter", "Single Phase", 8), 1750],
  [defaultManualInverterPriceKey("FoxESS", "Hybrid inverter", "Single Phase", 10), 1950],
  [defaultManualInverterPriceKey("GoodWe", "Hybrid inverter", "Single Phase", 5), 1114],
  [defaultManualInverterPriceKey("GoodWe", "Hybrid inverter", "Single Phase", 8), 1689],
  [defaultManualInverterPriceKey("GoodWe", "Hybrid inverter", "Single Phase", 10), 1826],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "Single Phase", 5), 1749],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "Single Phase", 6), 1949],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "Single Phase", 8), 2399],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "Single Phase", 10), 2749],

  [defaultManualInverterPriceKey("FoxESS", "Hybrid inverter", "3 Phase", 8), 2150],
  [defaultManualInverterPriceKey("FoxESS", "Hybrid inverter", "3 Phase", 10), 2250],
  [defaultManualInverterPriceKey("FoxESS", "Hybrid inverter", "3 Phase", 15), 2650],
  [defaultManualInverterPriceKey("GoodWe", "Hybrid inverter", "3 Phase", 5), 1876],
  [defaultManualInverterPriceKey("GoodWe", "Hybrid inverter", "3 Phase", 10), 1876],
  [defaultManualInverterPriceKey("GoodWe", "Hybrid inverter", "3 Phase", 15), 2000],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "3 Phase", 5), 2799],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "3 Phase", 10), 3399],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "3 Phase", 15), 3989],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "3 Phase", 20), 5019],
  [defaultManualInverterPriceKey("Sungrow", "Hybrid inverter", "3 Phase", 25), 6019],

  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "Single Phase", 3), 795],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "Single Phase", 5), 879],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "Single Phase", 8), 1649],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "Single Phase", 10), 1749],

  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "3 Phase", 5), 1299],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "3 Phase", 8), 1399],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "3 Phase", 10), 1649],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "3 Phase", 15), 1949],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "3 Phase", 20), 2149],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "3 Phase", 30), 3250],
  [defaultManualInverterPriceKey("Sungrow", "Grid inverter", "3 Phase", 50), 3835]
]);

export function mergeDefaultManualInverters(
  existingRows: ManualInverterProduct[] = [],
  deletedDefaultIds: string[] = []
): ManualInverterProduct[] {
  const deleted = new Set(deletedDefaultIds);
  const existingByKey = new Map(existingRows.map((row) => [manualInverterKey(row), row]));
  const defaultRows = defaultManualInverterRows();
  const defaultKeys = new Set(defaultRows.map(manualInverterKey));
  const rows = defaultRows
    .filter((row) => !deleted.has(row.id))
    .map((row) => {
      const existing = existingByKey.get(manualInverterKey(row));
      if (!existing) return row;
      if (existing.id.startsWith("matrix-")) {
        const defaultMatrixPrice = defaultMatrixInverterPrice(existing);
        const wasAutoMatrixPrice = defaultMatrixPrice > 0 && Number(existing.price) === defaultMatrixPrice;
        const existingPrice = Number(existing.price) || 0;
        return {
          ...row,
          active: existing.active ?? row.active,
          price: existingPrice === 0 || wasAutoMatrixPrice ? row.price : existing.price
        };
      }
      const existingPrice = Number(existing.price) || 0;
      const shouldUseUpdatedDefaultPrice = existingPrice === 0 && row.price > 0 && existing.id.startsWith("default-inverter-");
      return {
        ...row,
        ...existing,
        id: existing.id || row.id,
        price: shouldUseUpdatedDefaultPrice ? row.price : existing.price
      };
    });

  existingRows.forEach((row) => {
    if (!defaultKeys.has(manualInverterKey(row))) rows.push(row);
  });

  return rows;
}

export function inverterMatrixToManualRows(config: PricingConfig): ManualInverterProduct[] {
  const rows: ManualInverterProduct[] = [];
  Object.entries(config.invertersByType).forEach(([type, phaseTables]) => {
    Object.entries(phaseTables).forEach(([phase, brandTables]) => {
      Object.entries(brandTables).forEach(([brand, sizePrices]) => {
        Object.entries(sizePrices).forEach(([size, price]) => {
          const sizeKw = Number(String(size).replace(/kw/i, ""));
          const numericPrice = Number(price) || 0;
          if (!sizeKw || numericPrice <= 0) return;
          const typeLabel = type.replace(" inverter", "");
          rows.push({
            id: `matrix-${slug(type)}-${slug(phase)}-${slug(brand)}-${sizeKw}`,
            type: type as ManualInverterProduct["type"],
            phase: phase as ManualInverterProduct["phase"],
            brand,
            model: `${brand} ${sizeKw}kW ${phase} ${typeLabel}`,
            sizeKw,
            price: numericPrice,
            active: true
          });
        });
      });
    });
  });
  return rows;
}

export function manualQuoteProducts(config: PricingConfig): SupplierProduct[] {
  return [
    ...manualAccessoriesAsSupplierProducts(config),
    ...manualInvertersAsSupplierProducts(config)
  ];
}

export function manualAccessoriesAsSupplierProducts(config: PricingConfig): SupplierProduct[] {
  return manualAccessories(config).map((item) => {
    const price = Math.max(0, Number(item.price) || 0);
    const brand = item.brand || "Generic";
    const category = normalizeManualAccessoryCategory(item.category);
    return {
      id: `${manualAccessoryIdPrefix}${item.id}`,
      supplier: "Manual",
      sku: item.sku || item.id,
      brand,
      model: item.name,
      productName: item.name,
      description: item.description || item.name,
      category,
      rawCategory: "Manual Accessory",
      normalizedCategory: category,
      subCategory: String(item.category || category),
      priceExGst: price,
      priceIncGst: price * 1.1,
      gstRate: 10,
      manufacturer: brand,
      compatibleBrand: brand === "Generic" ? "Generic" : brand,
      isAccessory: true,
      defaultQuantity: Math.max(1, Number(item.defaultQuantity) || 1),
      unitType: "single",
      availabilityStatus: "active",
      showInQuoting: true,
      stockStatus: "unknown",
      lastUpdated: new Date().toISOString()
    };
  });
}

export function manualInvertersAsSupplierProducts(config: PricingConfig): SupplierProduct[] {
  return manualInverters(config).map((item) => {
    const price = Math.max(0, Number(item.price) || 0);
    const category: NormalizedCategory = item.type === "Hybrid inverter" ? "Hybrid Inverter" : "Grid Inverter";
    const inverterType = item.type === "Hybrid inverter" ? "Hybrid" : "Grid";
    const brand = item.brand || "Manual";
    return {
      id: `${manualInverterIdPrefix}${item.id}`,
      supplier: "Manual",
      sku: item.id,
      brand,
      model: item.model,
      productName: item.model,
      description: `${brand} ${item.model} ${item.sizeKw}kW ${item.phase} ${item.type}`,
      category,
      rawCategory: "Manual Inverter",
      normalizedCategory: category,
      subCategory: item.type,
      priceExGst: price,
      priceIncGst: price * 1.1,
      gstRate: 10,
      manufacturer: brand,
      sizeKw: Number(item.sizeKw) || 0,
      phase: item.phase as Phase,
      inverterType,
      unitType: "single",
      availabilityStatus: "active",
      showInQuoting: true,
      stockStatus: "unknown",
      lastUpdated: new Date().toISOString()
    };
  });
}

function normalizeManualAccessoryCategory(category: string): NormalizedCategory {
  if (manualCategories.has(category as NormalizedCategory)) return category as NormalizedCategory;
  return "Miscellaneous";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createDefaultManualInverterRow(
  brand: string,
  type: ManualInverterProduct["type"],
  phase: ManualInverterProduct["phase"],
  sizeKw: number
): ManualInverterProduct {
  const shortType = type === "Hybrid inverter" ? "Hybrid" : "Grid";
  return {
    id: `default-inverter-${slug(brand)}-${slug(phase)}-${slug(shortType)}-${slug(String(sizeKw))}`,
    type,
    phase,
    brand,
    model: `${brand} ${formatSize(sizeKw)}kW ${phaseLabel(phase)} ${shortType}`,
    sizeKw,
    price: defaultManualInverterPrices.get(defaultManualInverterPriceKey(brand, type, phase, sizeKw)) ?? 0,
    active: true
  };
}

function defaultManualInverterPriceKey(
  brand: string,
  type: ManualInverterProduct["type"],
  phase: ManualInverterProduct["phase"],
  sizeKw: number
) {
  return [slug(brand), slug(type), slug(phase), Number(sizeKw)].join("|");
}

function manualInverterKey(row: ManualInverterProduct) {
  return [slug(row.type), slug(row.phase), slug(row.brand), Number(row.sizeKw)].join("|");
}

function defaultMatrixInverterPrice(row: ManualInverterProduct) {
  const sizeKey = `${formatSize(Number(row.sizeKw))}kW`;
  return Number((defaultPricing.invertersByType as Record<string, any>)[row.type]?.[row.phase]?.[row.brand]?.[sizeKey]) || 0;
}

function phaseLabel(phase: ManualInverterProduct["phase"]) {
  return phase === "3 Phase" ? "Three Phase" : "Single Phase";
}

function formatSize(size: number) {
  return Number.isInteger(size) ? String(size) : String(size).replace(/\.0$/, "");
}

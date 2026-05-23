import type {
  AvailabilityStatus,
  NormalizedCategory,
  SupplierInverterType,
  SupplierPhase,
  SupplierProduct,
  StockStatus,
  UnitType
} from "../types";

const GST_RATE = 10;

export const supplierCategories: NormalizedCategory[] = [
  "Panel",
  "Battery",
  "Battery Accessory",
  "Hybrid Inverter",
  "Grid Inverter",
  "System Accessory",
  "Mounting",
  "Rail",
  "Tin Kit",
  "Tile Kit",
  "Klip Lok Kit",
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
  "EV Charger",
  "Miscellaneous",
  "Unclassified",
  "Other"
];

export const unitTypes: UnitType[] = ["single", "pallet", "pack", "carton", "bundle", "unknown"];
export const availabilityStatuses: AvailabilityStatus[] = ["active", "inactive", "discontinued", "clearance", "unknown"];
export const stockStatuses: StockStatus[] = ["in_stock", "out_of_stock", "unknown"];

export const defaultApprovedTradezoneBrands = [
  "Jinko",
  "TCL",
  "AIKO",
  "REC",
  "Trina",
  "Longi",
  "Tongwei",
  "Tindo",
  "Canadian Solar",
  "Sungrow",
  "GoodWe",
  "Fronius",
  "SolarEdge",
  "Sigenergy",
  "SolaX",
  "Growatt",
  "SMA",
  "Solis",
  "Sofar",
  "Tesla",
  "Enphase",
  "BYD",
  "Clenergy",
  "Schletter",
  "S-5",
  "Mibet",
  "Grace",
  "PowerWave",
  "Tradezone",
  "Cabac",
  "NHP",
  "Clipsal",
  "Hager",
  "Schneider"
];

const systemAccessoryCategories = new Set<NormalizedCategory>([
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
  "Deck Tite",
  "Cable",
  "Label Kit"
]);

const legacyCategoryMap: Record<string, NormalizedCategory> = {
  Panels: "Panel",
  Batteries: "Battery",
  "Hybrid Inverters": "Hybrid Inverter",
  "Grid Inverters": "Grid Inverter",
  Accessories: "System Accessory",
  Meters: "Meter",
  CTs: "CT",
  "Dongles / WiFi / Comms": "Dongle / WiFi / Comms",
  Isolators: "Isolator",
  "EV Chargers": "EV Charger",
  Mounting: "Mounting",
  Rails: "Rail",
  "Tin Kits": "Tin Kit",
  "Tile Kits": "Tile Kit",
  "Klip Lok Kits": "Klip Lok Kit",
  Other: "Other"
};

export interface SupplierImportSummary {
  supplier: string;
  totalRows: number;
  productsImported: number;
  pageCount?: number;
  pagesScanned?: number;
  textItemsExtracted?: number;
  candidateRowsFound?: number;
  productsClassified?: number;
  productsNeedingReview?: number;
  rowsWithNoPrice?: number;
  duplicateRowsIgnored?: number;
  textPreview?: string;
  rawText?: string;
  parsedRowsCsv?: string;
  skippedRows: string[];
  reviewRows: string[];
  categoryCounts: Record<string, number>;
}

let lastImportSummary: SupplierImportSummary | null = null;

export function getLastSupplierImportSummary() {
  return lastImportSummary;
}

export function effectiveProductPrice(product: SupplierProduct) {
  return Math.max(0, Number(product.manualOverridePriceExGst ?? product.priceExGst) || 0);
}

export function getNormalizedCategory(product: SupplierProduct): NormalizedCategory {
  return product.manualNormalizedCategory ?? product.normalizedCategory ?? legacyCategoryMap[product.category] ?? "Other";
}

export function isQuotingProduct(product: SupplierProduct) {
  return !product.hidden && product.showInQuoting === true;
}

export function isProductSelectableForQuote(product: SupplierProduct, approvedBrands = defaultApprovedTradezoneBrands) {
  const supplier = product.supplier.toLowerCase();
  if (supplier === "solar juice") return false;
  if (!isQuotingProduct(product)) return false;
  if (supplier !== "manual" && effectiveProductPrice(product) <= 0) return false;
  if (["inactive", "discontinued", "clearance"].includes(product.availabilityStatus ?? "")) return false;
  const category = getNormalizedCategory(product);
  if (category === "Other" || category === "Unclassified") return false;
  if (supplier === "tradezone") {
    return isTradezoneProductSelectable(product, approvedBrands);
  }
  return true;
}

export function isTradezoneProductSelectable(product: SupplierProduct, approvedBrands = defaultApprovedTradezoneBrands) {
  if (product.supplier.toLowerCase() !== "tradezone") return false;
  if (product.hidden || !isQuotingProduct(product)) return false;
  if (effectiveProductPrice(product) <= 0) return false;
  if (["inactive", "discontinued", "clearance"].includes(product.availabilityStatus ?? "")) return false;
  const category = getNormalizedCategory(product);
  if (category === "Other" || category === "Unclassified") return false;
  const decision = detectTradezoneWebsiteQuotable(product, approvedBrands);
  const websiteQuotable = product.manualTradezoneWebsiteQuotable ?? product.tradezoneWebsiteQuotable ?? decision.quotable;
  if (websiteQuotable !== true) return false;
  return decision.quotable || product.manualTradezoneWebsiteQuotable === true;
}

export function isAccessorySearchProduct(product: SupplierProduct, approvedBrands = defaultApprovedTradezoneBrands) {
  if (product.supplier.toLowerCase() === "solar juice") return false;
  if (product.hidden || effectiveProductPrice(product) <= 0) return false;
  if (["inactive", "discontinued", "clearance"].includes(product.availabilityStatus ?? "")) return false;
  const category = getNormalizedCategory(product);
  if (["Panel", "Battery", "Grid Inverter", "Hybrid Inverter"].includes(category)) return false;
  if (product.supplier.toLowerCase() !== "tradezone") return product.showInQuoting !== false;

  const decision = detectTradezoneWebsiteQuotable(product, approvedBrands);
  if (product.manualTradezoneWebsiteQuotable === false || product.manualShowInQuoting === false) return false;
  if (product.manualTradezoneWebsiteQuotable === true || product.manualShowInQuoting === true) return true;

  const hardReject = /old|legacy|internal|bulk|pallet|freight|labou?r|delivery|missing price|discontinued|obsolete|inactive|nla|clearance|damaged|display|sample|warranty|repair|credit|fee/i.test(
    decision.reason || product.notQuotableReason || ""
  );
  if (hardReject) return false;

  const text = supplierProductSearchText(product);
  if (/\b(discontinued|obsolete|superseded|legacy|archived|inactive|deleted|nla|no longer available|clearance only|runout|end of life|eol|damaged|display stock|sample|demo|warranty|repair|service item|labou?r|freight|delivery|internal|adjustment|credit|fee|3pl)\b/.test(text)) {
    return false;
  }
  return true;
}

export function isPanelDropdownProduct(product: SupplierProduct, approvedBrands = defaultApprovedTradezoneBrands) {
  return (
    isProductSelectableForQuote(product, approvedBrands) &&
    getNormalizedCategory(product) === "Panel" &&
    product.unitType === "single" &&
    product.showInPanelDropdown === true
  );
}

export function isBatteryDropdownProduct(product: SupplierProduct, approvedBrands = defaultApprovedTradezoneBrands) {
  return (
    isProductSelectableForQuote(product, approvedBrands) &&
    getNormalizedCategory(product) === "Battery" &&
    !isBatteryAccessoryProduct(product)
  );
}

export function effectiveProductName(product: SupplierProduct) {
  return product.manualProductName || product.productName || product.model || product.description;
}

export function dedupeSupplierPanels(products: SupplierProduct[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = [
      product.supplier,
      product.brand,
      product.wattage ?? "",
      normalizeText(`${product.model} ${product.description}`).replace(/\b(sku|model)\b/g, ""),
      effectiveProductPrice(product).toFixed(2)
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function productLabel(product: SupplierProduct) {
  const price = effectiveProductPrice(product).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const category = getNormalizedCategory(product);
  const specs = [
    product.wattage ? `${product.wattage}W` : "",
    (category === "Hybrid Inverter" || category === "Grid Inverter") && product.sizeKw ? `${product.sizeKw}kW` : "",
    category === "Battery" && product.batteryKwh ? `${product.batteryKwh}kWh` : "",
    (category === "Hybrid Inverter" || category === "Grid Inverter") ? product.phase ?? "" : "",
    (category === "Hybrid Inverter" || category === "Grid Inverter") ? product.inverterType ?? "" : ""
  ].filter(Boolean);
  const model = effectiveProductName(product);
  return `${product.supplier} | ${product.brand || product.manufacturer || "Generic"} | ${model}${specs.length ? ` | ${specs.join(" ")}` : ""} | ${price} ex GST | ${stockLabel(product)}`;
}

export function batteryProductLabel(product: SupplierProduct) {
  const price = effectiveProductPrice(product).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const capacity = product.batteryKwh ? `${product.batteryKwh}kWh` : "Capacity unknown";
  return `${product.supplier} | ${effectiveProductName(product)} | ${capacity} | ${price} ex GST`;
}

export function supplierProductSearchText(product: SupplierProduct) {
  const raw = [
    product.supplier,
    product.sku,
    product.supplierPartNumber,
    product.tradezonePartNumber,
    product.brand,
    product.manufacturer,
    product.model,
    product.productName,
    product.manualProductName,
    product.description,
    product.category,
    product.rawCategory,
    product.normalizedCategory,
    product.subCategory,
    product.unitType,
    product.availabilityStatus,
    product.stock,
    product.stockStatus,
    product.tradezoneWebsiteQuotable ? "website quotable" : "",
    product.notQuotableReason,
    product.notes,
    product.needsReview ? "needs review" : "",
    product.stockQuantity !== undefined ? `${product.stockQuantity} stock` : "",
    product.sourceInfo,
    product.sourcePage ? `page ${product.sourcePage}` : ""
  ]
    .filter(Boolean)
    .join(" ");
  return expandSearchSynonyms(raw);
}

export function matchesProductSearch(product: SupplierProduct, search: string) {
  const terms = normalizeSearchText(search).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = supplierProductSearchText(product);
  return terms.every((term) => haystack.includes(term));
}

export function isBatteryAccessoryProduct(product: SupplierProduct) {
  const category = getNormalizedCategory(product);
  if (category === "Battery Accessory") return true;
  const text = supplierProductSearchText(product);
  return isBatteryAccessoryText(text) && !/\bbattery\s*(module|unit)\b|\bac battery\b|\bkwh battery\b/.test(text);
}

export function supplierDisplayStatus(product: SupplierProduct) {
  if (product.hidden) return "Hidden";
  if (product.needsReview) return "Needs review";
  if (["inactive", "discontinued", "clearance"].includes(product.availabilityStatus ?? "")) return "Discontinued";
  return "Active";
}

export function isSafeMiscSearchProduct(product: SupplierProduct, includeNonQuotableTradezone = false, approvedBrands = defaultApprovedTradezoneBrands) {
  if (product.supplier.toLowerCase() === "solar juice") return false;
  if (product.hidden || effectiveProductPrice(product) <= 0) return false;
  if (["inactive", "discontinued", "clearance"].includes(product.availabilityStatus ?? "")) return false;
  const category = getNormalizedCategory(product);
  if (["Panel", "Battery", "Grid Inverter", "Hybrid Inverter"].includes(category)) return false;
  if (product.supplier.toLowerCase() === "tradezone") {
    const decision = detectTradezoneWebsiteQuotable(product, approvedBrands);
    const websiteQuotable = product.manualTradezoneWebsiteQuotable ?? product.tradezoneWebsiteQuotable ?? decision.quotable;
    if (!includeNonQuotableTradezone && decision.reason && /old|legacy|bulk|pallet|freight|labour|internal|missing price|discontinued/i.test(decision.reason)) return false;
    if (!includeNonQuotableTradezone && websiteQuotable !== true) return false;
  }
  return true;
}

export function normalizeSearchText(value: string) {
  return value
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
}

export function stockLabel(product: SupplierProduct) {
  const status = product.stockStatus ?? "unknown";
  const quantity = product.stockQuantity;
  if (status === "in_stock") {
    return quantity !== undefined ? `In stock: ${quantity} available` : "In stock";
  }
  if (status === "out_of_stock") return "Out of stock";
  return "Stock unknown";
}

export function stockSortRank(product: SupplierProduct) {
  if (product.stockStatus === "in_stock") return 0;
  if (product.stockStatus === "out_of_stock") return 2;
  return 1;
}

export function expandSearchSynonyms(value: string) {
  const normalized = normalizeSearchText(value);
  const additions = new Set<string>();
  if (/\bgateway\b/.test(normalized)) {
    additions.add("gate way");
    additions.add("backup gateway");
    additions.add("energy gateway");
    additions.add("smart gateway");
  }
  if (/\bsigenergy\b|\bsigen\b|\bsigenstor\b/.test(normalized)) {
    additions.add("sigenergy");
    additions.add("sigen");
    additions.add("sigenstor");
  }
  if (/\bcomms?\b|\bcommunication\b/.test(normalized)) {
    additions.add("comms");
    additions.add("communication");
  }
  if (/\bct\b|\bcurrent transformer\b/.test(normalized)) {
    additions.add("ct");
    additions.add("current transformer");
  }
  if (/\bmeter\b|\bsmart meter\b/.test(normalized)) {
    additions.add("meter");
    additions.add("smart meter");
  }
  if (/\bbackup\b/.test(normalized)) {
    additions.add("backup gateway");
    additions.add("backup interface");
  }
  if (/\bchangeover\b/.test(normalized)) {
    additions.add("change over");
    additions.add("change-over");
    additions.add("changeover switch");
  }
  if (/\bswitch(?:es)?\b/.test(normalized)) {
    additions.add("switch");
    additions.add("switches");
  }
  return [normalized, ...additions].join(" ").trim();
}

export async function readSupplierProductFile(file: File): Promise<SupplierProduct[]> {
  const lowerName = file.name.toLowerCase();
  const lastUpdated = new Date().toISOString();
  const supplier = detectSupplierFromFile(file.name);
  if (lowerName.endsWith(".csv")) {
    const rows = parseCsv(await file.text());
    const products = mapRowsToProducts(rows, lastUpdated, supplier);
    setImportSummary(supplier, rows.length, products);
    return products;
  }

  const bytes = await file.arrayBuffer();
  if (lowerName.endsWith(".zip")) {
    const entries = await readZipEntries(bytes);
    const csvEntry = entries.find((entry) => entry.name.toLowerCase().endsWith(".csv"));
    if (csvEntry) {
      const rows = parseCsv(await blobToText(csvEntry.blob));
      const products = mapRowsToProducts(rows, lastUpdated, supplier);
      setImportSummary(supplier, rows.length, products);
      return products;
    }
    const rows = await parseXlsxRows(entries);
    const products = mapRowsToProducts(rows, lastUpdated, supplier);
    setImportSummary(supplier, rows.length, products);
    return products;
  }

  if (lowerName.endsWith(".xlsx")) {
    const rows = await parseXlsxRows(await readZipEntries(bytes));
    const products = mapRowsToProducts(rows, lastUpdated, supplier);
    setImportSummary(supplier, rows.length, products);
    return products;
  }

  if (lowerName.endsWith(".pdf")) {
    const parsed = await parsePdfRows(new Uint8Array(bytes), supplier);
    const products = mapRowsToProducts(parsed.rows, lastUpdated, supplier);
    lastImportSummary = {
      supplier,
      totalRows: Math.max(0, parsed.rows.length - 1),
      productsImported: products.length,
      pageCount: parsed.pageCount,
      pagesScanned: parsed.pageCount,
      textItemsExtracted: parsed.textItemsExtracted,
      candidateRowsFound: parsed.candidateRowsFound,
      productsClassified: products.filter((product) => getNormalizedCategory(product) !== "Unclassified").length,
      productsNeedingReview: products.filter((product) => product.needsReview || getNormalizedCategory(product) === "Unclassified").length,
      rowsWithNoPrice: parsed.rowsWithNoPrice,
      duplicateRowsIgnored: parsed.duplicateRowsIgnored,
      textPreview: parsed.textPreview,
      rawText: parsed.rawText,
      parsedRowsCsv: rowsToCsv(parsed.rows),
      skippedRows: parsed.skippedRows,
      reviewRows: parsed.reviewRows,
      categoryCounts: countCategories(products)
    };
    if (products.length) return products;
    const preview = parsed.textPreview ? ` First extracted lines: ${parsed.textPreview}` : "";
    throw new Error(
      parsed.pageCount
        ? `PDF import failed. Text extraction read ${parsed.pageCount} pages but no product rows were recognised.${preview}`
        : "PDF import failed. This PDF appears to be scanned/image-based. Text extraction did not find product rows. Upload a text-based PDF or OCR version."
    );
  }

  throw new Error("Unsupported file type. Please import a ZIP, CSV, XLSX or supplier PDF file.");
}

export function reclassifySupplierProduct(product: SupplierProduct, approvedBrands = defaultApprovedTradezoneBrands): SupplierProduct {
  const rawCategory = product.rawCategory || product.category || "";
  const derivedProductName = deriveProductName(product.description || product.productName || "", product.brand || product.manufacturer, rawCategory);
  const productName = product.manualProductName || derivedProductName;
  const combined = `${productName} ${product.description} ${rawCategory} ${product.subCategory} ${product.manufacturer} ${product.brand} ${product.sku} ${product.supplierPartNumber} ${product.stock}`;
  const detectedCategory = classifyCategory(combined);
  const detectedUnitType = detectUnitType(combined);
  const availabilityStatus = product.manualAvailabilityStatus ?? detectAvailabilityStatus(product, combined);
  const stockQuantity = product.stockQuantity ?? extractStockQuantity(product.stock ?? "");
  const stockStatus = detectStockStatus(product.stock, stockQuantity, product.stockStatus);
  const normalizedCategory = product.manualNormalizedCategory ?? detectedCategory;
  const unitType = product.manualUnitType ?? detectedUnitType;
  const batteryKwh = product.batteryKwh ?? extractBatteryKwh(combined);
  const needsReview =
    normalizedCategory === "Unclassified" ||
    (!product.manualNormalizedCategory && normalizedCategory === "Battery" && !batteryKwh && !isClearlyBatteryStorageText(combined));
  const showInPanelDropdown =
    product.manualShowInPanelDropdown ??
    (normalizedCategory === "Panel" &&
      unitType === "single" &&
      Boolean(product.wattage) &&
      effectiveProductPrice(product) > 0);
  const showInQuoting =
    product.manualShowInQuoting ??
    detectShowInQuoting(
      { ...product, normalizedCategory, unitType, availabilityStatus, showInPanelDropdown },
      approvedBrands
    );
  const tradezoneDecision = detectTradezoneWebsiteQuotable(
    { ...product, normalizedCategory, unitType, availabilityStatus, showInPanelDropdown, showInQuoting, batteryKwh },
    approvedBrands
  );
  const tradezoneWebsiteQuotable =
    product.supplier === "Tradezone"
      ? product.manualTradezoneWebsiteQuotable ?? tradezoneDecision.quotable
      : product.tradezoneWebsiteQuotable;

  return {
    ...product,
    productName,
    rawCategory,
    normalizedCategory,
    unitType,
    batteryKwh,
    showInPanelDropdown,
    availabilityStatus,
    stockQuantity,
    stockStatus,
    showInQuoting,
    tradezoneWebsiteQuotable,
    notQuotableReason:
      product.supplier === "Tradezone"
        ? product.manualTradezoneWebsiteQuotable === true
          ? "Manually approved for quoting"
          : product.manualTradezoneWebsiteQuotable === false
            ? "Manually hidden from quoting"
            : tradezoneDecision.reason
        : product.notQuotableReason,
    needsReview,
    isBatteryAccessory: normalizedCategory === "Battery Accessory",
    isAccessory: systemAccessoryCategories.has(normalizedCategory),
    priceIncGst: effectiveProductPrice(product) * (1 + (Number(product.gstRate) || GST_RATE) / 100)
  };
}

function setImportSummary(supplier: string, totalRows: number, products: SupplierProduct[], skippedRows: string[] = [], reviewRows: string[] = []) {
  lastImportSummary = {
    supplier,
    totalRows: Math.max(0, totalRows - 1),
    productsImported: products.length,
    productsClassified: products.filter((product) => getNormalizedCategory(product) !== "Unclassified").length,
    productsNeedingReview: products.filter((product) => product.needsReview || getNormalizedCategory(product) === "Unclassified").length,
    skippedRows,
    reviewRows,
    categoryCounts: countCategories(products)
  };
}

function countCategories(products: SupplierProduct[]) {
  return products.reduce<Record<string, number>>((counts, product) => {
    const category = getNormalizedCategory(product);
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
}

function mapRowsToProducts(rows: string[][], lastUpdated: string, supplier: string): SupplierProduct[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const value = (row: string[], names: string[]) => {
    const index = headers.findIndex((header) => names.some((name) => header === normalizeHeader(name)));
    return index >= 0 ? (row[index] ?? "").trim() : "";
  };

  return rows
    .slice(1)
    .map((row, index) => {
      const tradezonePartNumber = value(row, ["Tradezone Part Number", "TradezonePartNumber"]);
      const supplierPartNumber = value(row, ["Supplier Part Number", "SupplierPartNumber", "Supplier Code", "Part Number", "Product Code", "Item Code", "SKU"]);
      const description = value(row, ["Description", "Product Description", "Item Description", "Name"]);
      const importedProductName = value(row, ["Product Name", "ProductName", "Title"]);
      const group = value(row, ["Group", "Category", "Product Group"]);
      const subGroup = value(row, ["Sub Group", "SubGroup", "Subcategory", "Sub Category", "Sub-Category"]);
      const manufacturer = value(row, ["Manufacturer", "Brand"]);
      const priceExGst = parseMoney(value(row, ["Trade Price", "TradePrice", "Price ex GST", "Price Ex GST", "Ex GST", "Trade", "Price", "Strategic Price"]));
      const stock = value(row, ["Stock", "Stock On Hand", "Availability", "Stock Availability", "Stock Status"]);
      const stockQuantity = extractStockQuantity(
        value(row, ["Stock Quantity", "Qty Available", "Available Quantity", "Quantity Available", "Stock On Hand"]) || stock
      );
      const sourcePage = Number(value(row, ["Page", "Source Page"])) || undefined;
      const sourceInfo = value(row, ["Source Info", "Source", "Import Source"]);
      const needsReviewValue = value(row, ["Needs Review", "NeedsReview", "Review"]);
      const combined = `${description} ${group} ${subGroup} ${manufacturer} ${supplierPartNumber}`;
      const compatibleBrand = detectCompatibleBrand(combined, manufacturer);
      const brand = compatibleBrand !== "Generic" ? compatibleBrand : manufacturer || "Generic";
      const rawCategory = group || subGroup;
      const productName = importedProductName || deriveProductName(description, brand, rawCategory);
      const normalizedCategory = classifyCategory(`${productName} ${combined}`);
      const stableIdSource =
        tradezonePartNumber ||
        supplierPartNumber ||
        (supplier === "Solar Juice"
          ? `${normalizeText(productName)}-${priceExGst.toFixed(2)}-${sourcePage ?? index}`
          : normalizeText(description)) ||
        index;
      const product: SupplierProduct = {
        id: `${supplier.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stableIdSource}`,
        supplier,
        tradezonePartNumber,
        supplierPartNumber,
        sku: supplierPartNumber || tradezonePartNumber || `${supplier.slice(0, 2).toUpperCase()}-${index + 1}`,
        brand,
        model: supplierPartNumber || extractModel(description, brand),
        productName,
        description,
        category: rawCategory || "Other",
        rawCategory,
        normalizedCategory,
        subCategory: subGroup || group,
        priceExGst,
        priceIncGst: priceExGst * (1 + GST_RATE / 100),
        gstRate: GST_RATE,
        manufacturer,
        wattage: extractWattage(combined),
        sizeKw: extractSizeKw(combined),
        batteryKwh: extractBatteryKwh(`${productName} ${combined}`),
        phase: detectPhase(combined),
        inverterType: detectInverterType(combined),
        compatibleBrand,
        stock,
        stockQuantity,
        stockStatus: detectStockStatus(stock, stockQuantity),
        needsReview: needsReviewValue ? /^true|yes|1|review/i.test(needsReviewValue) : normalizedCategory === "Unclassified",
        sourcePage,
        sourceInfo,
        lastUpdated
      };
      if (product.phase === "Unknown") delete product.phase;
      if (product.inverterType === "Unknown") delete product.inverterType;
      if (product.compatibleBrand === "Generic") delete product.compatibleBrand;
      return reclassifySupplierProduct(product);
    })
    .filter((product) => product.description || product.sku);
}

function detectSupplierFromFile(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.includes("solar juice")) return "Solar Juice";
  if (lower.includes("one stop")) return "One Stop Warehouse";
  if (lower.includes("blue sun")) return "Blue Sun Group";
  if (lower.includes("tradezone") || lower.includes("simpro")) return "Tradezone";
  return "Tradezone";
}

function classifyCategory(text: string): NormalizedCategory {
  const lower = normalizeSearchText(text);
  const has = (...terms: string[]) => terms.some((term) => lower.includes(normalizeSearchText(term)));
  const ctLike = /\bct\b|current transformer/.test(lower);
  const meterLike = /\bmeter\b/.test(lower);
  const commsLike = has("dongle", "wifi dongle", "wi-fi dongle", "wifi module", "wi-fi module", "lan module", "rs485", "comms module", "comms kit", "communication kit", "communication module", "power sensor comms");
  const clearInverterPowerLike = has("mppt") && (has("kw") || /\b(?:sh|sg|et|es|x1|x3|h1|h3)\d{1,3}/i.test(text));
  const batteryAccessoryLike = isBatteryAccessoryText(lower);
  const clearBatteryStorageLike = isClearlyBatteryStorageText(lower);
  const accessoryOnlyLike =
    batteryAccessoryLike ||
    has(
      "smart meter",
      "energy meter",
      "current transformer",
      "ct clamp",
      "power sensor",
      "external ct",
      "gateway",
      "gate way",
      "backup gateway",
      "backup interface",
      "backup box",
      "dongle",
      "wifi dongle",
      "comms kit",
      "communication kit",
      "communication module",
      "controller decorative cover",
      "handle kit",
      "wall connector",
      "wall mount kit",
      "stacking kit",
      "expansion harness",
      "harness",
        "dolly",
        "front cover",
        "remote energy meter"
    );
  const panelLike =
    Boolean(extractWattage(text)) &&
    has("panel", "module", "solar panel", "pv module") &&
    !has("kit to suit", "mounting kit", "rail kit", "clamp", "interface", "battery module");
  const batteryLike = clearBatteryStorageLike && !has("inverter only", "cabinet only", "enclosure only");
  const inverterLike =
    has("inverter", "grid inverter", "pv inverter", "string inverter", "hybrid inverter") ||
    (has("mppt") && has("kw") && !has("battery module")) ||
    /\b(gen24|sh\d|sg\d|et\d|es\d|esa\b|x1[-\s]?\d|x3[-\s]?\d|h1[-\s]?\d|h3[-\s]?\d|symo|primo|sigenstor|cx[-\s]?\d*|sg\d+(?:\.\d+)?(?:rs|rt|cx)|sh\d+(?:\.\d+)?(?:rs|rt|t)?)\b/i.test(text);
  const systemAccessoryLike = has(
    "backup box",
    "backup device",
    "backup interface",
    "battery accessory",
    "battery accessories",
    "solar battery accessories",
    "dongle",
    "wifi dongle",
    "power sensor",
    "external ct",
    "comms kit",
    "communication kit",
    "communication module",
    "controller",
    "energy controller",
    "ems",
    "pcs",
    "inverter accessory",
    "terminal protective cover",
    "protective cover",
    "gateway",
    "gate way",
    "inverter cover",
    "battery cover",
    "cover powder coated"
  );

  if (panelLike) return "Panel";
  const actualBatteryProductWording = /\bbattery\s*(module|unit)\b|\bac battery\b|\bkwh battery\b/.test(lower);
  if (accessoryOnlyLike && !clearInverterPowerLike && !actualBatteryProductWording) {
    if (has("backup gateway")) return "Backup Gateway";
    if (has("backup interface")) return "Backup Interface";
    if (has("backup box", "backup device")) return "Backup Box";
    if (has("gateway", "gate way")) return "Gateway";
    if (has("smart meter")) return "Smart Meter";
    if (ctLike || has("power sensor", "external ct")) return "CT";
    if (meterLike || has("energy meter", "remote energy meter")) return "Meter";
    if (commsLike) return "Dongle / WiFi / Comms";
    if (batteryAccessoryLike) return "Battery Accessory";
    if (has("dolly", "front cover", "handle kit")) return "System Accessory";
  }
  if (batteryLike) return "Battery";
  if (systemAccessoryLike) {
    if (has("backup gateway")) return "Backup Gateway";
    if (has("backup interface")) return "Backup Interface";
    if (has("backup box", "backup device")) return "Backup Box";
    if (has("power sensor", "external ct")) return "CT";
    if (commsLike) return "Dongle / WiFi / Comms";
    if (has("gateway", "gate way")) return "Gateway";
    if (has("energy controller")) return "Energy Controller";
    if (has("controller", "ems")) return "Controller";
    if (batteryAccessoryLike) return "Battery Accessory";
    return "System Accessory";
  }
  if (has("inverter cover", "battery cover", "cover powder coated", "cover") && has("inverter")) return "System Accessory";
  if (inverterLike && isHybridInverter(lower)) return "Hybrid Inverter";
  if (inverterLike) return "Grid Inverter";
  if (has("smart meter")) return "Smart Meter";
  if (ctLike) return "CT";
  if (meterLike) return "Meter";
  if (commsLike) return "Dongle / WiFi / Comms";
  if (has("ev charger", "wall connector", "wattpilot")) return "EV Charger";
  if (has("energy meter", "power meter")) return "Meter";
  if (has("backup gateway")) return "Backup Gateway";
  if (has("gateway", "gate way")) return "Gateway";
  if (has("backup interface")) return "Backup Interface";
  if (has("backup box", "backup device")) return "Backup Box";
  if (has("monitoring", "datamanager", "logger")) return "Monitoring";
  if (has("label kit", "labels", "shutdown label", "warning label")) return "Label Kit";
  if (has("energy controller")) return "Energy Controller";
  if (has("controller", "ems")) return "Controller";
  if (batteryAccessoryLike) return "Battery Accessory";
  if (has("optimiser", "optimizer")) return "Optimiser";
  if (has("rapid shutdown", "home backup")) return "System Accessory";
  if (has("klip lok", "kliplok")) return "Klip Lok Kit";
  if (has("tile bracket", "roof hook")) return "Tile Kit";
  if (has("tin foot", "tin interface", "tin kit")) return "Tin Kit";
  if (has("rail")) return "Rail";
  if (has("deck tite")) return "Deck Tite";
  if (has("clamp", "mid clamp", "end clamp", "interface", "hanger bolt", "racking", "mounting", "tilt")) return "Mounting";
  if (has("isolator", "isolation switch")) return "Isolator";
  if (has("breaker", "rcbo", "mcb", "circuit breaker")) return "Breaker";
  if (has("cable", "connector", "plug", "conduit", "lug", "gland")) return "Cable";
  if (has("change over switch", "changeover switch", "switch")) return "Miscellaneous";
  return has("accessory", "base", "bracket") ? "System Accessory" : "Unclassified";
}

function isBatteryAccessoryText(text: string) {
  const lower = normalizeSearchText(text);
  const batteryContext = /\b(battery|sbr|sbh|powerwall|hvm|hvs|lvs|sigenstor|sigenergy|byd)\b/.test(lower);
  const accessoryTerm = /\b(connector|branch connector|y connector|plug|harness|cable|combiner box|accessory kit|base|bracket|stand|cover|cabinet|enclosure|gateway|controller|meter|ct|label|mount kit|stacking kit)\b/.test(lower);
  if (batteryContext && accessoryTerm) return true;
  return /battery\s*(base|pedestal|bracket|stand|cover|cable|cabinet|enclosure|connector|plug|harness|comms?|communication|mount|mounting|stack|kit|accessory)|\b(base|pedestal|mounting bracket|floor stand|wall bracket|wall mount kit|mount kit|stack kit|stacking kit|expansion cable|expansion harness|bms cable|cable kit|cabinet only|enclosure only|combiner box|accessory kit|gateway|controller|meter|smart meter|current transformer|backup box|backup gateway|isolator|label|labels|label kit|dolly|front cover|glass door|tub|cover powder coated|battery cover|inverter cover)\b/.test(lower);
}

function isClearlyBatteryStorageText(text: string) {
  const lower = normalizeSearchText(text);
  return (
    /\d+(?:\.\d+)?\s*kwh/.test(lower) ||
    /\bkwh battery\b/.test(lower) ||
    /\bbattery\s*(module|unit)\b/.test(lower) ||
    /\b(powerwall|iq battery|sbr|sbh|hvm|hvs|lvs|lynx|sigenstor bat|triple power|resu|10h)\b/.test(lower)
  );
}

function deriveProductName(description: string, brand = "", rawCategory = "") {
  const text = description.replace(/\s+/g, " ").trim();
  const lower = normalizeSearchText(`${text} ${rawCategory}`);
  const accessoryName =
    isBatteryAccessoryText(lower) || /\b(dolly|front cover|glass door|tub|ct|meter|harness|wall mount kit|mount kit|stacking kit|extension cable)\b/.test(lower);
  const actualBatteryName = /\bbattery\s*(module|unit)\b|\bac battery\b|\bkwh battery\b/.test(lower);
  const cleaned = text
    .replace(/^(new|special|strategic)\s+/i, "")
    .replace(/\s+\$?\d{1,6}(?:,\d{3})*(?:\.\d{2,3})?\s*$/g, "")
    .trim();
  if (accessoryName && !actualBatteryName) return cleaned || text;
  const patterns: Array<[RegExp, string | ((match: RegExpMatchArray) => string)]> = [
    [/tesla\s+powerwall\s*3/i, "Tesla Powerwall 3"],
    [/tesla\s+powerwall/i, "Tesla Powerwall"],
    [/enphase\s+iq\s+battery\s+5p/i, "Enphase IQ Battery 5P"],
    [/sungrow\s+sbh.*?(?:5(?:\.0)?\s*kwh)?/i, () => "Sungrow SBH 5kWh Battery Module"],
    [/sungrow\s+sbr.*?(?:3\.2\s*kwh)?/i, () => "Sungrow SBR 3.2kWh Module"],
    [/byd.*hvm.*?(?:2\.76\s*kwh)?/i, "BYD HVM 2.76kWh Module"],
    [/solaredge.*home battery.*4\.85/i, "SolarEdge Home Battery Module 4.85kWh"]
  ];
  for (const [pattern, replacement] of patterns) {
    const match = text.match(pattern);
    if (match) return typeof replacement === "function" ? replacement(match) : replacement;
  }
  if (!cleaned && brand) return brand;
  if (lower.includes("battery") || lower.includes("powerwall")) return cleaned;
  return cleaned || text;
}

function detectUnitType(text: string): UnitType {
  const lower = text.toLowerCase();
  if (/\b(full\s*)?pallet\b|pallet of|clearance pallet|\b\d+\s*panels?\b|36 panels|37 panels|72 panels/.test(lower)) return "pallet";
  if (/\bcarton\b|box of|crate/.test(lower)) return "carton";
  if (/\bpack\b|\bkit pack\b/.test(lower)) return "pack";
  if (/\bbundle\b|\bbulk\b|\bcontainer\b|\blot\b|\bskid\b/.test(lower)) return "bundle";
  if (/\bfreight\b|\bdelivery\b/.test(lower)) return "unknown";
  return "single";
}

function detectAvailabilityStatus(product: SupplierProduct, text: string): AvailabilityStatus {
  const lower = text.toLowerCase();
  if (/clearance|clearance only|clearance pallet|runout/.test(lower)) return "clearance";
  if (/discontinued|obsolete|deleted|archived|superseded|nla|no longer available/.test(lower)) return "discontinued";
  if (/inactive|old model|damaged|display stock|sample|warranty|spare part|replacement part only|repair|service item|labour|freight|delivery|internal|adjustment|credit|fee|do not use|pending cec approval/.test(lower)) return "inactive";
  if (product.supplier === "Solar Juice" || product.supplier === "One Stop Warehouse" || product.supplier === "Blue Sun Group") return "active";
  return "unknown";
}

const tradezoneUsefulCategories = new Set<NormalizedCategory>([
  "Panel",
  "Battery",
  "Hybrid Inverter",
  "Grid Inverter",
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
  "Deck Tite",
  "Isolator",
  "Breaker",
  "Cable",
  "Label Kit",
  "EV Charger",
  "Miscellaneous"
]);

const tradezoneRejectPattern =
  /\b(discontinued|obsolete|superseded|old model|legacy|archived|inactive|deleted|nla|no longer available|unavailable|clearance only|clearance pallet|runout|end of life|eol|damaged|display stock|sample|demo|warranty|spare part|repair|service item|labou?r|freight|delivery|internal|adjustment|credit|fee|bulk pallet|full pallet|half pallet|pallet|carton|bundle|pack|box of|container|skid|crate|3pl)\b/i;

export function detectTradezoneWebsiteQuotable(product: SupplierProduct, approvedBrands = defaultApprovedTradezoneBrands) {
  if (product.supplier.toLowerCase() !== "tradezone") {
    return { quotable: product.supplier.toLowerCase() !== "solar juice", reason: "" };
  }
  if (product.manualTradezoneWebsiteQuotable !== undefined) {
    return {
      quotable: product.manualTradezoneWebsiteQuotable,
      reason: product.manualTradezoneWebsiteQuotable ? "Manually approved for quoting" : "Manually hidden from quoting"
    };
  }

  const category = getNormalizedCategory(product);
  const price = effectiveProductPrice(product);
  const rejectText = normalizeSearchText(
    `${product.productName ?? ""} ${product.description} ${product.sku} ${product.category} ${product.subCategory} ${product.manufacturer} ${product.brand}`
  );

  if (price <= 0) return { quotable: false, reason: "Missing price" };
  if (["inactive", "discontinued", "clearance"].includes(product.availabilityStatus ?? "")) {
    return { quotable: false, reason: `Availability is ${product.availabilityStatus}` };
  }
  if (tradezoneRejectPattern.test(rejectText)) {
    return { quotable: false, reason: "Old/legacy/internal/bulk keyword detected" };
  }
  if (!tradezoneUsefulCategories.has(category)) return { quotable: false, reason: "Not a useful quoting category" };
  if (!isApprovedTradezoneBrand(product, approvedBrands)) return { quotable: false, reason: "Brand not approved" };
  if (!product.sku && normalizeText(product.description).length < 12) return { quotable: false, reason: "Missing SKU/model and vague description" };

  if (category === "Panel") {
    if (product.unitType !== "single") return { quotable: false, reason: "Bulk/pallet panel item" };
    if (product.showInPanelDropdown !== true) return { quotable: false, reason: "Panel dropdown disabled" };
    if (!product.wattage) return { quotable: false, reason: "Missing panel wattage" };
  }
  if (category === "Battery" && isBatteryAccessoryProduct(product)) {
    return { quotable: false, reason: "Battery accessory, not battery storage" };
  }
  if ((category === "Hybrid Inverter" || category === "Grid Inverter") && !product.sizeKw) {
    return { quotable: false, reason: "Missing inverter size" };
  }
  return { quotable: true, reason: "Website quotable" };
}

function isApprovedTradezoneBrand(product: SupplierProduct, approvedBrands: string[]) {
  const approved = approvedBrands.map(normalizeSearchText).filter(Boolean);
  const brandText = normalizeSearchText(`${product.brand} ${product.manufacturer} ${product.compatibleBrand}`);
  const productText = normalizeSearchText(
    `${product.brand} ${product.manufacturer} ${product.compatibleBrand} ${product.model} ${product.productName ?? ""} ${product.description} ${product.sku} ${product.supplierPartNumber ?? ""} ${product.tradezonePartNumber ?? ""}`
  );
  return approved.some((brand) => brandText.includes(brand) || productText.includes(brand));
}

function detectShowInQuoting(product: SupplierProduct, approvedBrands: string[]) {
  const category = product.normalizedCategory ?? "Other";
  const price = effectiveProductPrice(product);
  const text = supplierProductSearchText(product);
  const usefulCategory = category !== "Other" && category !== "Unclassified";
  const unavailable = product.availabilityStatus === "inactive" || product.availabilityStatus === "discontinued" || product.availabilityStatus === "clearance";
  const vague = !product.sku && normalizeText(product.description).length < 8;
  const brandApproved = approvedBrands.map((brand) => brand.toLowerCase()).includes((product.brand || product.manufacturer || "").toLowerCase());

  if (price <= 0 || price >= 50000 || unavailable || vague || !usefulCategory) return false;
  if (category === "Panel" && (product.unitType !== "single" || product.showInPanelDropdown !== true)) return false;
  if (/freight|delivery|labour|internal|adjustment|credit|fee|sample|warranty|repair|\b3pl\b/.test(text)) return false;
  if (product.supplier === "Tradezone") {
    return detectTradezoneWebsiteQuotable(product, approvedBrands).quotable;
  }
  if (product.supplier === "Solar Juice") return false;
  return true;
}

function isHybridInverter(lower: string) {
  return (
    ["hybrid", "battery ready", "gen24 plus", "sigenstor", "home hub"].some((term) => lower.includes(term)) ||
    /\b(sh\d|et\d|es\d|esa\b|h1[-\s]?\d|h3[-\s]?\d)\b/i.test(lower)
  );
}

function detectInverterType(text: string): SupplierInverterType {
  const category = classifyCategory(text);
  if (category === "Hybrid Inverter") return "Hybrid";
  if (category === "Grid Inverter") return "Grid";
  return "Unknown";
}

function detectPhase(text: string): SupplierPhase {
  const lower = text.toLowerCase();
  if (/(three|3)[ -]?phase|\b3p\b|\bx3\b|\brt\b|\bsh\d+(?:\.\d+)?t\b|\bsg\d+(?:\.\d+)?rt\b|\beta\b/.test(lower)) return "3 Phase";
  if (/(single|one|1)[ -]?phase|\b1p\b|\bx1\b|primo|\bsh\d+(?:\.\d+)?rs\b|\bsg\d+(?:\.\d+)?rs\b|\beha\b/.test(lower)) return "Single Phase";
  return "Unknown";
}

function detectCompatibleBrand(text: string, manufacturer = "") {
  const lower = ` ${text} ${manufacturer} `.toLowerCase();
  const brands: Array<[string, string[]]> = [
    ["Sungrow", ["sungrow"]],
    ["GoodWe", ["goodwe", "good we"]],
    ["Fronius", ["fronius"]],
    ["SolarEdge", ["solaredge", "solar edge"]],
    ["SolaX", ["solax", "sola x"]],
    ["Sigenergy", ["sigenergy", "sigen", "sigenstor"]],
    ["Enphase", ["enphase"]],
    ["Tesla", ["tesla"]],
    ["Jinko", ["jinko"]],
    ["AIKO", ["aiko"]],
    ["REC", [" rec "]],
    ["Trina", ["trina"]],
    ["Longi", ["longi", "longi solar"]],
    ["Tongwei", ["tongwei"]],
    ["Tindo", ["tindo"]],
    ["Canadian Solar", ["canadian solar"]],
    ["JA", [" ja ", "jasolar", "ja solar"]],
    ["TCL", ["tcl"]],
    ["BYD", ["byd"]],
    ["FoxESS", ["foxess", "fox ess"]],
    ["SMA", [" sma "]],
    ["Growatt", ["growatt"]],
    ["Solis", ["solis"]],
    ["Sofar", ["sofar"]],
    ["Clenergy", ["clenergy"]],
    ["Schletter", ["schletter"]],
    ["S-5", ["s-5", "s5"]],
    ["Mibet", ["mibet"]],
    ["Grace", ["grace"]],
    ["PowerWave", ["powerwave", "power wave"]],
    ["Tradezone", ["tradezone"]],
    ["Cabac", ["cabac"]],
    ["NHP", [" nhp "]],
    ["Clipsal", ["clipsal"]],
    ["Hager", ["hager"]],
    ["Schneider", ["schneider"]]
  ];
  return brands.find(([, terms]) => terms.some((term) => lower.includes(term)))?.[0] ?? "Generic";
}

function extractWattage(text: string) {
  const match = text.match(/(\d{3,4})\s*(?:w|watt|watts)\b/i);
  return match ? Number(match[1]) : undefined;
}

function extractSizeKw(text: string) {
  const kw = text.match(/(\d+(?:\.\d+)?)\s*kw(?!h)/i);
  if (kw) return Number(kw[1]);
  const compact = text.match(/\b(?:sh|sg|et|es|x1|x3|h1|h3|symo|primo|gw)(\d{1,3}(?:\.\d+)?)/i);
  return compact ? Number(compact[1]) : undefined;
}

function extractBatteryKwh(text: string) {
  if (/tesla\s+powerwall\s*3/i.test(text)) return 13.5;
  if (/enphase\s+iq\s+battery\s+5p/i.test(text)) return 5;
  if (/solaredge.*home battery module|home battery module.*solaredge/i.test(text)) return 4.85;
  if (/\bsbh\b/i.test(text)) return 5;
  if (/\bsbr\b/i.test(text)) return 3.2;
  if (/\bhvm\b/i.test(text)) return 2.76;
  const kwh = text.match(/(\d+(?:\.\d+)?)\s*kwh/i);
  if (kwh) return Number(kwh[1]);
  const sungrowModule = text.match(/\bSB[RH](\d+(?:\.\d+)?)\b/i);
  if (sungrowModule) {
    const raw = sungrowModule[1];
    if (raw.includes(".")) return Number(raw);
    if (raw.length === 3) return Number(raw) / 10;
  }
  const resu = text.match(/\bRESU(\d+(?:\.\d+)?)\b/i);
  return resu ? Number(resu[1]) : undefined;
}

function extractModel(description: string, brand: string) {
  return description.replace(new RegExp(brand, "i"), "").trim().split(/\s+/).slice(0, 5).join(" ");
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractStockQuantity(value: string) {
  const text = String(value || "").trim();
  if (!text) return undefined;
  const exactZero = text.match(/^(?:0|0\.0+)$/);
  if (exactZero) return 0;
  const available = text.match(/(\d+(?:\.\d+)?)\s*(?:available|in stock|on hand|qty|units?)/i);
  if (available) return Number(available[1]);
  const leading = text.match(/^\s*(\d+(?:\.\d+)?)/);
  if (leading) return Number(leading[1]);
  return undefined;
}

function detectStockStatus(stock?: string, stockQuantity?: number, existingStatus?: StockStatus): StockStatus {
  const text = String(stock || "").toLowerCase();
  if (stockQuantity !== undefined) return stockQuantity > 0 ? "in_stock" : "out_of_stock";
  if (/out of stock|no stock|unavailable|not available|sold out|backorder|back order/.test(text)) return "out_of_stock";
  if (/\bin stock\b|available|on hand/.test(text)) return "in_stock";
  return existingStatus ?? "unknown";
}

interface PdfTextItem {
  page: number;
  x: number;
  y: number;
  text: string;
}

interface ParsedPdfRows {
  rows: string[][];
  skippedRows: string[];
  reviewRows: string[];
  rawText?: string;
  candidateRowsFound: number;
  rowsWithNoPrice: number;
  duplicateRowsIgnored: number;
}

async function parsePdfRows(bytes: Uint8Array, supplier: string) {
  const plainText = new TextDecoder("latin1").decode(bytes);
  const streams = await extractFlateStreams(bytes, plainText);
  const cmap = parseToUnicodeMap(streams);
  const items = extractPdfTextItems(streams, cmap);
  const parsed = supplier === "Solar Juice" ? parseSolarJuicePdfItems(items) : parseGenericPdfItems(items);
  const rawText = parsed.rawText ?? items.map((item) => item.text).join("\n");
  return {
    ...parsed,
    pageCount: new Set(items.map((item) => item.page)).size,
    textItemsExtracted: items.length,
    rawText,
    textPreview: items
      .slice(0, 40)
      .map((item) => item.text)
      .join("\n")
      .slice(0, 1800)
  };
}

async function extractFlateStreams(bytes: Uint8Array, pdfText: string) {
  const chunks: string[] = [];
  for (const match of pdfText.matchAll(/stream\r?\n/g)) {
    const start = match.index! + match[0].length;
    const end = pdfText.indexOf("endstream", start);
    if (end < 0) continue;
    let chunk = bytes.slice(start, end);
    while (chunk.length && (chunk[chunk.length - 1] === 10 || chunk[chunk.length - 1] === 13)) chunk = chunk.slice(0, -1);
    try {
      const streamCtor = (globalThis as typeof globalThis & { DecompressionStream?: new (format: string) => DecompressionStream }).DecompressionStream;
      if (!streamCtor) continue;
      const stream = new Blob([chunk]).stream().pipeThrough(new streamCtor("deflate"));
      const text = await new Response(stream).text();
      chunks.push(text);
    } catch {
      // Non-text/image streams are expected in supplier PDFs.
    }
  }
  return chunks;
}

function parseToUnicodeMap(streams: string[]) {
  const cmap: Record<string, string> = {};
  for (const stream of streams) {
    for (const block of stream.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const match of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        cmap[match[1].toUpperCase()] = String.fromCodePoint(parseInt(match[2], 16));
      }
    }
    for (const block of stream.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const match of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        let from = parseInt(match[1], 16);
        const to = parseInt(match[2], 16);
        let unicode = parseInt(match[3], 16);
        const width = match[1].length;
        for (; from <= to; from += 1, unicode += 1) {
          cmap[from.toString(16).toUpperCase().padStart(width, "0")] = String.fromCodePoint(unicode);
        }
      }
    }
  }
  return cmap;
}

function extractPdfTextItems(streams: string[], cmap: Record<string, string>): PdfTextItem[] {
  const decodeHex = (hex: string) => {
    let output = "";
    for (let index = 0; index < hex.length; index += 4) {
      output += cmap[hex.slice(index, index + 4).toUpperCase()] ?? "";
    }
    return output;
  };
  const decodeArray = (value: string) => {
    let output = "";
    for (const match of value.matchAll(/<([0-9A-Fa-f]+)>|\(([^()]*)\)/g)) {
      output += match[1] ? decodeHex(match[1]) : match[2].replace(/\\([()\\])/g, "$1");
    }
    return output;
  };

  const items: PdfTextItem[] = [];
  let page = 0;
  for (const stream of streams) {
    if (!stream.includes(" TJ") && !stream.includes(" Tj")) continue;
    page += 1;
    let x = 0;
    let y = 0;
    const tokenPattern =
      /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(?:TD|Td)|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm|\[((?:.|\n)*?)\]\s*TJ|<([0-9A-Fa-f]+)>\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = tokenPattern.exec(stream))) {
      if (match[1]) {
        x += Number(match[1]);
        y += Number(match[2]);
      } else if (match[3]) {
        x = Number(match[7]);
        y = Number(match[8]);
      } else if (match[9]) {
        const text = decodeArray(match[9]).replace(/\s+/g, " ").trim();
        if (text) items.push({ page, x, y, text });
      } else if (match[10]) {
        const text = decodeHex(match[10]).replace(/\s+/g, " ").trim();
        if (text) items.push({ page, x, y, text });
      }
    }
  }
  return items;
}

function parseSolarJuicePdfItems(items: PdfTextItem[]): ParsedPdfRows {
  const rows = [["Supplier Part Number", "Product Name", "Description", "Trade Price", "Manufacturer", "Group", "Sub Group", "Page", "Source Info", "Needs Review"]];
  const skippedRows: string[] = [];
  const reviewRows: string[] = [];
  const rawLines: string[] = [];
  const seen = new Set<string>();
  const pages = Array.from(new Set(items.map((item) => item.page)));
  let candidateRowsFound = 0;
  let rowsWithNoPrice = 0;
  let duplicateRowsIgnored = 0;

  for (const page of pages) {
    const pageItems = items
      .filter((item) => item.page === page)
      .filter((item) => !/^\*?$/.test(item.text))
      .filter((item) => item.text !== "New")
      .filter((item) => !/orders@|accounts@|Place orders|Account Enquires|Strategic Pricelist/i.test(item.text))
      .filter((item) => !/^\d+$/.test(item.text))
      .sort((a, b) => a.y - b.y || a.x - b.x);

    const clusters: Array<{ items: PdfTextItem[]; maxY: number }> = [];
    for (const item of pageItems) {
      const last = clusters[clusters.length - 1];
      if (last && Math.abs(item.y - last.maxY) <= 13) {
        last.items.push(item);
        last.maxY = Math.max(last.maxY, item.y);
      } else {
        clusters.push({ items: [item], maxY: item.y });
      }
    }

    let section = "";
    let heading = "";
    let continuation = "";
    for (const cluster of clusters) {
      const text = cluster.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;
      rawLines.push(`[p${page}] ${text}`);
      if (/Part\s*No|Unit Price/i.test(text)) continue;

      if (!hasPriceLike(text)) {
        if (looksLikeSolarJuiceHeading(text)) {
          section = text.trim();
          heading = "";
          continuation = "";
        } else if (/[A-Za-z]/.test(text) && text.length < 90 && !/terms|conditions|pricing|valid|orders@|accounts@/i.test(text)) {
          heading = text.trim();
        } else if (/[A-Za-z]/.test(text) && text.length >= 8) {
          continuation = `${continuation} ${text}`.trim();
          rowsWithNoPrice += 1;
        }
        continue;
      }

      candidateRowsFound += 1;
      const line = `${continuation} ${text}`.trim();
      continuation = "";
      const parsed = parseSolarJuiceProductLine(line);
      if (!parsed) {
        skippedRows.push(line);
        continue;
      }

      const productName = deriveProductName(parsed.description, detectCompatibleBrand(`${parsed.description} ${heading}`), section || heading);
      const category = classifyCategory(`${productName} ${parsed.description} ${section} ${heading}`);
      const needsReview = !parsed.sku || category === "Unclassified";
      const key = parsed.sku
        ? `solar-juice::${parsed.sku.toLowerCase()}`
        : `solar-juice::${normalizeText(productName)}::${parsed.priceExGst.toFixed(2)}::${page}`;
      if (seen.has(key)) {
        duplicateRowsIgnored += 1;
        continue;
      }
      seen.add(key);
      if (needsReview) reviewRows.push(line);
      rows.push([
        parsed.sku,
        productName,
        parsed.description,
        String(parsed.priceExGst),
        detectCompatibleBrand(`${parsed.description} ${heading}`),
        section || "Solar Juice",
        heading || section || "Solar Juice",
        String(page),
        `Solar Juice PDF page ${page}`,
        needsReview ? "true" : "false"
      ]);
    }
  }
  return {
    rows,
    skippedRows: skippedRows.slice(0, 80),
    reviewRows: reviewRows.slice(0, 80),
    rawText: rawLines.join("\n"),
    candidateRowsFound,
    rowsWithNoPrice,
    duplicateRowsIgnored
  };
}

function parseSolarJuiceProductLine(text: string) {
  const pricePattern = /\$?\s*\d{1,6}(?:,\d{3})*(?:\.\d{2,3})\b|\$\s*\d{1,6}(?:,\d{3})*\b/g;
  const prices = Array.from(text.matchAll(pricePattern)).filter((match) => {
    const price = parseMoney(match[0]);
    return price > 0 && price < 50000;
  });
  const lastPrice = prices[prices.length - 1];
  if (!lastPrice) return null;
  const priceExGst = parseMoney(lastPrice[0]);
  if (!priceExGst) return null;
  const beforePrice = text
    .slice(0, lastPrice.index)
    .replace(pricePattern, "")
    .replace(/^New\s+/i, "")
    .trim();
  const skuMatch = beforePrice.match(/^(.*?)([A-Z]{0,5}\d{4,8}[A-Z]?|[A-Z]{2,}[-A-Z0-9]{4,})$/);
  const sku = skuMatch?.[2]?.trim() ?? "";
  const description = (skuMatch?.[1] ?? beforePrice).replace(/\s+/g, " ").trim();
  if (!/[A-Za-z]/.test(description) || description.length < 3) return null;
  return { sku, description, priceExGst };
}

function hasPriceLike(text: string) {
  return /\$\s*\d|\b\d{1,6}(?:,\d{3})*(?:\.\d{2,3})\b/.test(text);
}

function looksLikeSolarJuiceHeading(text: string) {
  const normalized = normalizeSearchText(text);
  return /^(panels?|solar panels?|inverters?|hybrid inverters?|grid inverters?|batteries|battery storage|accessories|mounting|ev chargers?|optimisers?|meters?|sungrow|tesla|enphase|byd|sigenergy|goodwe|solaredge|solax|fronius)\b/.test(normalized);
}

function rowsToCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n");
}

function parseGenericPdfItems(items: PdfTextItem[]): ParsedPdfRows {
  const rows = [["Supplier Part Number", "Description", "Trade Price", "Manufacturer", "Page", "Source Info"]];
  const skippedRows: string[] = [];
  for (const item of items) {
    const text = item.text.replace(/\s+/g, " ").trim();
    const parsed = parseSolarJuiceProductLine(text);
    if (parsed) {
      rows.push([parsed.sku, parsed.description, String(parsed.priceExGst), detectCompatibleBrand(parsed.description), String(item.page), `PDF page ${item.page}`]);
    } else if (/\$\s*\d/.test(text)) {
      skippedRows.push(text);
    }
  }
  return {
    rows,
    skippedRows: skippedRows.slice(0, 40),
    reviewRows: [],
    candidateRowsFound: Math.max(0, rows.length - 1),
    rowsWithNoPrice: skippedRows.length,
    duplicateRowsIgnored: 0
  };
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

interface ZipEntry {
  name: string;
  blob: Blob;
}

async function readZipEntries(bytes: ArrayBuffer): Promise<ZipEntry[]> {
  const view = new DataView(bytes);
  const bytes8 = new Uint8Array(bytes);
  let eocd = -1;
  for (let index = bytes8.length - 22; index >= Math.max(0, bytes8.length - 66000); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("Could not read ZIP file.");
  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let entry = 0; entry < entryCount; entry += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes8.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const blob =
      method === 0
        ? new Blob([compressed])
        : method === 8
          ? await inflateRaw(compressed)
          : new Blob([]);
    entries.push({ name, blob });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes: ArrayBuffer) {
  const streamCtor = (globalThis as typeof globalThis & { DecompressionStream?: new (format: string) => DecompressionStream }).DecompressionStream;
  if (!streamCtor) throw new Error("ZIP decompression is not supported in this browser.");
  const stream = new Blob([bytes]).stream().pipeThrough(new streamCtor("deflate-raw"));
  return await new Response(stream).blob();
}

async function blobToText(blob: Blob) {
  return await blob.text();
}

async function parseXlsxRows(entries: ZipEntry[]) {
  const parser = new DOMParser();
  const sharedEntry = entries.find((entry) => entry.name === "xl/sharedStrings.xml");
  const sheetEntry =
    entries.find((entry) => /xl\/worksheets\/sheet1\.xml$/i.test(entry.name)) ??
    entries.find((entry) => /xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name));
  if (!sheetEntry) return [];
  const sharedXml = sharedEntry ? await blobToText(sharedEntry.blob) : "";
  const sheetXml = await blobToText(sheetEntry.blob);
  const sharedDoc = sharedXml ? parser.parseFromString(sharedXml, "application/xml") : null;
  const sharedStrings = sharedDoc
    ? Array.from(sharedDoc.getElementsByTagName("si")).map((node) =>
        Array.from(node.getElementsByTagName("t"))
          .map((textNode) => textNode.textContent ?? "")
          .join("")
      )
    : [];
  const sheetDoc = parser.parseFromString(sheetXml, "application/xml");
  return Array.from(sheetDoc.getElementsByTagName("row")).map((rowNode) =>
    Array.from(rowNode.getElementsByTagName("c")).map((cell) => {
      const type = cell.getAttribute("t");
      const value = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      if (type === "s") return sharedStrings[Number(value)] ?? "";
      if (type === "inlineStr") return cell.getElementsByTagName("t")[0]?.textContent ?? "";
      return value;
    })
  );
}

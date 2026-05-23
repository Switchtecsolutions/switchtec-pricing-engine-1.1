import defaultPricing from "./config/pricing.json";

export type RoofType = "Tin" | "Tile" | "Klip Lok";
export type Phase = "Single Phase" | "3 Phase";
export type InverterType = keyof typeof defaultPricing.invertersByType;
export type InverterBrand = keyof typeof defaultPricing.invertersByType["Hybrid inverter"]["Single Phase"];
export type InverterSize = keyof typeof defaultPricing.invertersByType["Hybrid inverter"]["Single Phase"]["FoxESS"];
export type PanelName = string;
export type BatteryName = string;
export type MarginMode = "Preset percentage" | "Manual percentage" | "Manual dollar amount";
export type SupplierPhase = "Single Phase" | "3 Phase" | "Unknown";
export type SupplierInverterType = "Grid" | "Hybrid" | "Unknown";
export type NormalizedCategory =
  | "Panel"
  | "Battery"
  | "Battery Accessory"
  | "Hybrid Inverter"
  | "Grid Inverter"
  | "System Accessory"
  | "Mounting"
  | "Rail"
  | "Tin Kit"
  | "Tile Kit"
  | "Klip Lok Kit"
  | "Meter"
  | "Smart Meter"
  | "CT"
  | "Gateway"
  | "Backup Gateway"
  | "Backup Box"
  | "Backup Interface"
  | "Dongle / WiFi / Comms"
  | "Monitoring"
  | "Controller"
  | "Energy Controller"
  | "Battery Base"
  | "Battery Bracket"
  | "Battery Cable"
  | "Optimiser"
  | "Mounting Accessory"
  | "Changeover Switch"
  | "Deck Tite"
  | "Isolator"
  | "Breaker"
  | "Cable"
  | "Label Kit"
  | "EV Charger"
  | "Miscellaneous"
  | "Unclassified"
  | "Other";
export type UnitType = "single" | "pallet" | "pack" | "carton" | "bundle" | "unknown";
export type AvailabilityStatus = "active" | "inactive" | "discontinued" | "clearance" | "unknown";
export type StockStatus = "in_stock" | "out_of_stock" | "unknown";

export type PricingConfig = typeof defaultPricing;

export interface ManualPanelProduct {
  id?: string;
  name: string;
  brand?: string;
  watt: number;
  price: number;
  active?: boolean;
}

export interface ManualBatteryProduct {
  id?: string;
  name: string;
  brand?: string;
  kWh: number;
  price: number;
  active?: boolean;
}

export interface ManualAccessoryProduct {
  id: string;
  name: string;
  brand: string;
  category: NormalizedCategory | string;
  description: string;
  sku: string;
  price: number;
  defaultQuantity: number;
  active?: boolean;
}

export interface ManualInverterProduct {
  id: string;
  type: InverterType;
  phase: Phase;
  brand: string;
  model: string;
  sizeKw: number;
  price: number;
  active?: boolean;
}

export interface SupplierProduct {
  id: string;
  supplier: string;
  tradezonePartNumber?: string;
  supplierPartNumber?: string;
  sku: string;
  brand: string;
  model: string;
  productName?: string;
  manualProductName?: string;
  description: string;
  category: string;
  rawCategory?: string;
  normalizedCategory?: NormalizedCategory;
  manualNormalizedCategory?: NormalizedCategory;
  subCategory: string;
  priceExGst: number;
  priceIncGst: number;
  gstRate: number;
  manufacturer: string;
  wattage?: number;
  sizeKw?: number;
  batteryKwh?: number;
  phase?: SupplierPhase;
  inverterType?: SupplierInverterType;
  compatibleBrand?: string;
  isAccessory?: boolean;
  isBatteryAccessory?: boolean;
  defaultQuantity?: number;
  unitType?: UnitType;
  manualUnitType?: UnitType;
  showInPanelDropdown?: boolean;
  manualShowInPanelDropdown?: boolean;
  availabilityStatus?: AvailabilityStatus;
  manualAvailabilityStatus?: AvailabilityStatus;
  showInQuoting?: boolean;
  manualShowInQuoting?: boolean;
  tradezoneWebsiteQuotable?: boolean;
  manualTradezoneWebsiteQuotable?: boolean;
  notQuotableReason?: string;
  hidden?: boolean;
  manualOverridePriceExGst?: number;
  notes?: string;
  stock?: string;
  stockQuantity?: number;
  stockStatus?: StockStatus;
  needsReview?: boolean;
  sourcePage?: number;
  sourceInfo?: string;
  lastUpdated: string;
}

export interface SelectedAccessory {
  id?: string;
  productId: string;
  quantity: number;
  type?: "System" | "Misc";
  unitPriceOverrideExGst?: number;
  supplier?: string;
  sku?: string;
  name?: string;
  brand?: string;
  qty?: number;
  unitPriceExGst?: number;
  lineTotalExGst?: number;
  stockStatus?: StockStatus;
  category?: string;
}

export interface QuoteInput {
  id: string;
  name: string;
  clientName: string;
  address: string;
  postcode: string;
  solarSizeKw: number;
  panelName: PanelName;
  batteryName: BatteryName;
  batteryModules: number;
  stcPrice: number;
  roofType: RoofType;
  phase: Phase;
  inverterType: InverterType;
  inverterBrand: InverterBrand;
  inverterSize: InverterSize;
  panelProductId: string;
  batteryProductId: string;
  inverterProductId: string;
  selectedAccessories: SelectedAccessory[];
  extraAmountExGst: number;
  extraNote: string;
  notes: string;
  createdAt: string;
}

export interface QuoteCalculations {
  solarPanelCount: number;
  rawPanelCount: number;
  actualSolarKw: number;
  batterySizeKwh: number;
  solarHardwareCost: number;
  batteryHardwareCost: number;
  inverterHardwareCost: number;
  accessoryTotalExGst: number;
  tinKitCount: number;
  tinKitCost: number;
  tileKitCount: number;
  tileKitCost: number;
  railSetCount: number;
  railCount: number;
  railCost: number;
  roofAddonCost: number;
  mountingCost: number;
  hardwareExGst: number;
  hardwareGst: number;
  hardwareIncGst: number;
  totalHardwareExGst: number;
  totalHardwareGst: number;
  totalHardwareCost: number;
  solarZoneRating: number;
  solarDeemingYears: number;
  solarStcPrice: number;
  solarZoneLabel: string;
  solarStcs: number;
  solarRebate: number;
  batteryStcPrice: number;
  batteryStcs: number;
  batteryRebate: number;
  solarInstallExGst: number;
  solarInstallIncGst: number;
  batteryInstallExGst: number;
  batteryInstallIncGst: number;
  totalInstallExGst: number;
  totalInstallIncGst: number;
  installExGst: number;
  installIncGst: number;
  extrasExGst: number;
  extrasIncGst: number;
  marginExGst: number;
  marginIncGst: number;
  businessTotalExGst: number;
  businessGst: number;
  businessTotalIncGst: number;
  totalGst: number;
  priceBeforeRebatesIncGst: number;
  installMargin: number;
  finalSellPrice: number;
  finalCustomerPriceIncGst: number;
  fastWinPrice: number;
  balancedPrice: number;
  highMarginPrice: number;
  quoteValidUntil: string;
}

export interface SavedQuote {
  input: QuoteInput;
  calculations: QuoteCalculations;
}

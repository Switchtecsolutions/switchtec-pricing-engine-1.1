import type { PricingConfig, QuoteCalculations, QuoteInput, SelectedBatteryItem, SupplierProduct } from "../types";
import { addDays } from "./format";
import { effectiveProductPrice } from "./supplierProducts";

export function calculateQuote(input: QuoteInput, config: PricingConfig, supplierProducts: SupplierProduct[] = []): QuoteCalculations {
  const requestedSolarKw = Math.max(0, Number(input.solarSizeKw) || 0);
  const solarStcPrice = Math.max(0, Number(config.solarStc?.price ?? config.stcPrice) || 0);
  const solarZoneRating = Math.max(0, Number(config.solarStc?.zoneRating) || 0);
  const solarDeemingYears = Math.max(0, Number(config.solarStc?.deemingYears) || 0);
  const solarZoneLabel = config.solarStc?.zoneLabel || config.solarStc?.calculationMode || "Zone 3 NSW default";
  const batteryStcPrice = Math.max(0, Number(config.batteryStcPrice ?? config.stcPrice) || 0);
  const gstRate = Math.max(0, Number(config.gstRate) || 0) / 100;
  const gstMultiplier = 1 + gstRate;
  const incGst = (value: number) => value * gstMultiplier;

  const supplierProduct = (id: string) => supplierProducts.find((product) => product.id === id && !product.hidden);
  const selectedPanelProduct = supplierProduct(input.panelProductId);
  const selectedInverterProduct = supplierProduct(input.inverterProductId);
  const matchingManualInverterProduct = supplierProducts.find((product) => {
    if (product.supplier !== "Manual" || product.hidden || product.showInQuoting === false) return false;
    const expectedCategory = input.inverterType === "Hybrid inverter" ? "Hybrid Inverter" : "Grid Inverter";
    const expectedSize = Number(String(input.inverterSize).replace(/kw/i, "")) || 0;
    return (
      product.normalizedCategory === expectedCategory &&
      product.phase === input.phase &&
      product.brand === input.inverterBrand &&
      Number(product.sizeKw) === expectedSize
    );
  });

  const manualPanel = config.panels.find((item) => item.name === input.panelName) ?? config.panels[0];
  const panel = selectedPanelProduct
    ? {
        name: selectedPanelProduct.description,
        watt: selectedPanelProduct.wattage || manualPanel.watt,
        price: effectiveProductPrice(selectedPanelProduct)
      }
    : manualPanel;
  const batteryItems = resolveBatteryItems(input, config, supplierProducts);
  const batterySelected = batteryItems.length > 0;

  const rawPanelCount = panel ? (requestedSolarKw * 1000) / panel.watt : 0;
  const solarPanelCount = panel ? Math.max(1, Math.round(rawPanelCount)) : 0;
  const actualSolarKw = panel ? (solarPanelCount * panel.watt) / 1000 : 0;
  const batterySizeKwh = batteryItems.reduce((total, item) => total + item.lineTotalKwh, 0);

  const inverterTable =
    config.invertersByType[input.inverterType]?.[input.phase] ??
    config.invertersByType["Hybrid inverter"]["Single Phase"];
  const inverterExGst = selectedInverterProduct
    ? effectiveProductPrice(selectedInverterProduct)
    : matchingManualInverterProduct
      ? effectiveProductPrice(matchingManualInverterProduct)
    : inverterTable[input.inverterBrand]?.[input.inverterSize] ?? 0;
  const solarPanelsExGst = panel ? solarPanelCount * panel.price : 0;
  const batteryExGst = batteryItems.reduce((total, item) => total + item.lineTotalExGst, 0);
  const accessoryTotalExGst = input.selectedAccessories.reduce((total, accessory) => {
    const product = supplierProduct(accessory.productId);
    if (!product) return total;
    const unitPrice = Math.max(0, Number(accessory.unitPriceOverrideExGst ?? effectiveProductPrice(product)) || 0);
    return total + unitPrice * Math.max(0, Number(accessory.quantity) || 0);
  }, 0);

  const panelsPerTinKit = Math.max(1, Number(config.mounting.panelsPerTinKit) || 1);
  const panelsPerTileKit = Math.max(1, Number(config.mounting.panelsPerTileKit) || panelsPerTinKit);
  const panelsPerRailSet = Math.max(1, Number(config.mounting.panelsPerRailSet) || 1);
  const isTileRoof = input.roofType === "Tile";
  const tinKitCount = isTileRoof ? 0 : Math.ceil(solarPanelCount / panelsPerTinKit);
  const tileKitCount = isTileRoof ? Math.ceil(solarPanelCount / panelsPerTileKit) : 0;
  const railSetCount = Math.ceil(solarPanelCount / panelsPerRailSet);
  const railCount = railSetCount * 2;
  const tinKitCost = tinKitCount * config.mounting.tinKitPrice;
  const tileKitCost = tileKitCount * config.mounting.tinKitPrice;
  const railCost = railCount * config.mounting.railPrice;
  const roofAddonPerKit =
    input.roofType === "Klip Lok"
      ? config.mounting.klipLokExtraPerKit
      : input.roofType === "Tile"
        ? config.mounting.tileExtraPerKit
        : 0;
  const roofAddonCost = (isTileRoof ? tileKitCount : tinKitCount) * roofAddonPerKit;
  const mountingExGst = tinKitCost + tileKitCost + railCost + roofAddonCost;

  const hardwareExGst = solarPanelsExGst + batteryExGst + inverterExGst + mountingExGst + accessoryTotalExGst;
  const hardwareGst = hardwareExGst * gstRate;
  const hardwareIncGst = hardwareExGst + hardwareGst;

  const solarStcs = Math.floor(actualSolarKw * solarZoneRating * solarDeemingYears);
  const solarRebate = solarStcs * solarStcPrice;

  const tierOneKwh = Math.min(batterySizeKwh, 14);
  const tierTwoKwh = Math.max(Math.min(batterySizeKwh, 28) - 14, 0);
  const tierThreeKwh = Math.max(Math.min(batterySizeKwh, 50) - 28, 0);
  const batteryStcs = batterySelected
    ? Math.floor(
        tierOneKwh * config.batteryStcsPerKwh +
          tierTwoKwh * config.batteryStcsPerKwh * 0.6 +
          tierThreeKwh * config.batteryStcsPerKwh * 0.15
      )
    : 0;
  const batteryRebate = batteryStcs * batteryStcPrice;

  const solarInstallExGst = actualSolarKw * 1000 * config.install.pricePerWatt;
  const batteryIncludedCapacityKwh = Math.max(0, Number(config.install.batteryIncludedCapacityKwh) || 0);
  const batteryExtraStepKwh = Math.max(0.01, Number(config.install.batteryExtraStepKwh) || 0.01);
  const batteryInstallSteps = batterySelected
    ? Math.ceil(Math.max(batterySizeKwh - batteryIncludedCapacityKwh, 0) / batteryExtraStepKwh)
    : 0;
  const batteryInstallExGst = batterySelected
    ? Math.max(0, Number(config.install.batteryBasePrice) || 0) +
      batteryInstallSteps * Math.max(0, Number(config.install.batteryExtraStepPrice) || 0)
    : 0;
  const totalInstallExGst = solarInstallExGst + batteryInstallExGst;
  const solarInstallIncGst = incGst(solarInstallExGst);
  const batteryInstallIncGst = incGst(batteryInstallExGst);
  const totalInstallIncGst = incGst(totalInstallExGst);
  const extrasExGst = Math.max(0, Number(input.extraAmountExGst) || 0);
  const extrasIncGst = incGst(extrasExGst);
  const marginPercent =
    config.margin.mode === "Preset percentage"
      ? config.margin.presetPercent
      : config.margin.manualPercent;
  const marginExGst =
    config.margin.mode === "Manual dollar amount"
      ? Math.max(0, Number(config.margin.manualAmount) || 0)
      : hardwareExGst * (Math.max(0, Number(marginPercent) || 0) / 100);
  const marginIncGst = incGst(marginExGst);
  const businessTotalExGst = totalInstallExGst + extrasExGst + marginExGst;
  const businessGst = businessTotalExGst * gstRate;
  const businessTotalIncGst = businessTotalExGst + businessGst;
  const totalGst = hardwareGst + businessGst;
  const priceBeforeRebatesIncGst = hardwareIncGst + businessTotalIncGst;
  const finalCustomerPriceIncGst = Math.max(
    0,
    priceBeforeRebatesIncGst - solarRebate - batteryRebate
  );

  return {
    solarPanelCount,
    rawPanelCount,
    actualSolarKw,
    batterySizeKwh,
    solarHardwareCost: solarPanelsExGst,
    batteryHardwareCost: batteryExGst,
    inverterHardwareCost: inverterExGst,
    accessoryTotalExGst,
    tinKitCount,
    tinKitCost,
    tileKitCount,
    tileKitCost,
    railSetCount,
    railCount,
    railCost,
    roofAddonCost,
    mountingCost: mountingExGst,
    hardwareExGst,
    hardwareGst,
    hardwareIncGst,
    totalHardwareExGst: hardwareExGst,
    totalHardwareGst: hardwareGst,
    totalHardwareCost: hardwareIncGst,
    solarZoneRating,
    solarDeemingYears,
    solarStcPrice,
    solarZoneLabel,
    solarStcs,
    solarRebate,
    batteryStcPrice,
    batteryStcs,
    batteryRebate,
    solarInstallExGst,
    solarInstallIncGst,
    batteryInstallExGst,
    batteryInstallIncGst,
    totalInstallExGst,
    totalInstallIncGst,
    installExGst: totalInstallExGst,
    installIncGst: totalInstallIncGst,
    extrasExGst,
    extrasIncGst,
    marginExGst,
    marginIncGst,
    businessTotalExGst,
    businessGst,
    businessTotalIncGst,
    totalGst,
    priceBeforeRebatesIncGst,
    installMargin: businessTotalIncGst,
    finalSellPrice: finalCustomerPriceIncGst,
    finalCustomerPriceIncGst,
    fastWinPrice: finalCustomerPriceIncGst * config.fastWinMultiplier,
    balancedPrice: finalCustomerPriceIncGst * config.balancedMultiplier,
    highMarginPrice: finalCustomerPriceIncGst * config.highMarginMultiplier,
    quoteValidUntil: addDays(input.createdAt, config.quoteValidityDays)
  };
}

function resolveBatteryItems(
  input: QuoteInput,
  config: PricingConfig,
  supplierProducts: SupplierProduct[]
): SelectedBatteryItem[] {
  if (Array.isArray(input.selectedBatteryItems) && input.selectedBatteryItems.length) {
    return input.selectedBatteryItems.map(normalizeBatteryLineItem).filter((item) => item.qty > 0);
  }

  const legacyBatterySelected = input.batteryName !== "No Battery" || Boolean(input.batteryProductId);
  const modules = legacyBatterySelected ? Math.max(0, Number(input.batteryModules) || 0) : 0;
  if (!legacyBatterySelected || !modules) return [];

  const supplierProduct = input.batteryProductId
    ? supplierProducts.find((product) => product.id === input.batteryProductId && !product.hidden)
    : undefined;
  const manualBattery = config.batteries.find((item) => item.name === input.batteryName) ?? config.batteries[0];
  const kwhEach = supplierProduct?.batteryKwh || supplierProduct?.sizeKw || manualBattery?.kWh || 0;
  const unitPriceExGst = supplierProduct ? effectiveProductPrice(supplierProduct) : Number(manualBattery?.price) || 0;
  const name = supplierProduct?.productName || supplierProduct?.description || manualBattery?.name || "Battery item";
  const brand = supplierProduct?.brand || manualBattery?.brand || "";

  return [
    normalizeBatteryLineItem({
      id: `legacy-battery-${input.batteryProductId || input.batteryName}`,
      productId: input.batteryProductId || manualBattery?.id || input.batteryName,
      brand,
      name,
      qty: modules,
      kwhEach,
      unitPriceExGst,
      lineTotalKwh: modules * kwhEach,
      lineTotalExGst: modules * unitPriceExGst
    })
  ];
}

function normalizeBatteryLineItem(item: SelectedBatteryItem): SelectedBatteryItem {
  const qty = Math.max(0, Number(item.qty) || 0);
  const kwhEach = Math.max(0, Number(item.kwhEach) || 0);
  const unitPriceExGst = Math.max(0, Number(item.unitPriceExGst) || 0);
  return {
    ...item,
    qty,
    kwhEach,
    unitPriceExGst,
    lineTotalKwh: qty * kwhEach,
    lineTotalExGst: qty * unitPriceExGst
  };
}

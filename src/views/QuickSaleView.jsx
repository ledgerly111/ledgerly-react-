import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppActions, useAppState } from "../context/AppContext.jsx";
import { formatCurrency, getTaxInfo } from "../utils/currency.js";

const STEP_COUNT = 4;
const DISCOUNT_MODE_OPTIONS = [
  {
    key: "global",
    label: "Wholesale Discount",
    helper: "Apply a single discount to the entire order.",
  },
  {
    key: "single",
    label: "Single Product Discount",
    helper: "Target a specific product with a discount.",
  },
  {
    key: "multiple",
    label: "Inline Discounts",
    helper: "Toggle discounts directly on any cart line.",
  },
];

function clampQuantity(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

export default function QuickSaleView() {
  const state = useAppState();
  const actions = useAppActions();
  const {
    quickSale,
    products = [],
    customers = [],
    selectedCountry,
    currentUser,
    accessibleUserIds = [],
    hasFeaturePermission,
    currentBranchId = null,
  } = state;

  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [singleDiscountProductId, setSingleDiscountProductId] = useState(null);
  const [editingQuantityProductId, setEditingQuantityProductId] = useState(null);

  const discountMode = quickSale?.discountMode ?? "none";
  const paymentType = quickSale?.paymentType ?? "Cash";
  const globalDiscountAmount = Number(quickSale?.globalDiscountAmount ?? 0) || 0;
  const discountsByProduct = quickSale?.discountsByProduct ?? {};

  const canUseQuickSale = useMemo(() => {
    if (typeof hasFeaturePermission === "function") {
      return hasFeaturePermission(currentUser?.id, "quickSale.use");
    }
    return true;
  }, [hasFeaturePermission, currentUser?.id]);

  const canViewAllCustomers = useMemo(() => {
    if (typeof hasFeaturePermission === "function") {
      return hasFeaturePermission(currentUser?.id, "team.viewAll");
    }
    return (currentUser?.role ?? "guest") === "admin";
  }, [hasFeaturePermission, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!quickSale?.active) {
      return;
    }
    if (!canUseQuickSale) {
      actions.updateQuickSaleState({ active: false });
      actions.pushNotification({
        type: "warning",
        message: "Quick Sale access removed",
        description: "Ask an administrator to enable Quick Sale for your account.",
      });
    }
  }, [quickSale?.active, canUseQuickSale, actions]);

  const currentStep = quickSale?.currentStep ?? 1;

  useEffect(() => {
    if (!quickSale?.active) {
      setCustomerSearchTerm("");
      setShowDiscountPanel(false);
      setSingleDiscountProductId(null);
      setEditingQuantityProductId(null);
    }
  }, [quickSale?.active]);

  useEffect(() => {
    if (currentStep !== 2 && showDiscountPanel) {
      setShowDiscountPanel(false);
    }
  }, [currentStep, showDiscountPanel]);

  if (!quickSale?.active || !canUseQuickSale) {
    return null;
  }

const {
  selectedProductIds = [],
  productQuantities = {},
  productUnits = {},
  selectedCustomerId,
} = quickSale;

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const selectedProductsById = useMemo(() => {
    const map = new Map();
    selectedProducts.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [selectedProducts]);

  const selectedUnitsByProductId = useMemo(() => {
    const map = new Map();
    selectedProducts.forEach((product) => {
      const units = Array.isArray(product?.sellingUnits) ? product.sellingUnits : [];
      const defaultUnitName = units[0]?.name ?? product?.baseUnit ?? '';
      const selectedName = productUnits[product.id] ?? defaultUnitName;
      const selectedUnit = units.find((unit) => unit && unit.name === selectedName)
        ?? units[0]
        ?? null;
      const conversionValue = Number.parseFloat(selectedUnit?.conversion);
      const priceValue = Number.parseFloat(selectedUnit?.price);
      map.set(product.id, {
        name: selectedUnit?.name ?? selectedName ?? defaultUnitName ?? '',
        conversion: Number.isFinite(conversionValue) && conversionValue > 0 ? conversionValue : 1,
        price: Number.isFinite(priceValue) && priceValue >= 0 ? priceValue : 0,
      });
    });
    return map;
  }, [selectedProducts, productUnits]);

  const accessibleUserIdSet = useMemo(
    () => new Set(
      (accessibleUserIds ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    ),
    [accessibleUserIds],
  );

  useEffect(() => {
    const nextQuantities = { ...productQuantities };
    let quantitiesChanged = false;

    selectedProductIds.forEach((id) => {
      const currentQuantity = nextQuantities[id];
      if (currentQuantity == null) {
        nextQuantities[id] = 1;
        quantitiesChanged = true;
      } else if (currentQuantity !== "" && currentQuantity <= 0) {
        nextQuantities[id] = 1;
        quantitiesChanged = true;
      }
    });

    Object.keys(nextQuantities).forEach((id) => {
      const numericId = Number(id);
      if (!selectedProductIds.includes(numericId)) {
        delete nextQuantities[id];
        quantitiesChanged = true;
      }
    });

    const nextUnits = { ...productUnits };
    let unitsChanged = false;
    selectedProductIds.forEach((id) => {
      const product = selectedProductsById.get(id)
        ?? products.find((item) => item.id === id)
        ?? null;
      const sellingUnits = Array.isArray(product?.sellingUnits) ? product.sellingUnits : [];
      const fallbackUnit = sellingUnits[0]?.name ?? '';
      const currentUnit = nextUnits[id];
      if (!currentUnit) {
        if (fallbackUnit !== '' || sellingUnits.length === 0) {
          nextUnits[id] = fallbackUnit;
          unitsChanged = unitsChanged || fallbackUnit !== currentUnit;
        }
      } else if (sellingUnits.length && !sellingUnits.some((unit) => unit && unit.name === currentUnit)) {
        nextUnits[id] = fallbackUnit;
        unitsChanged = true;
      }
    });

    Object.keys(nextUnits).forEach((id) => {
      const numericId = Number(id);
      if (!selectedProductIds.includes(numericId)) {
        delete nextUnits[id];
        unitsChanged = true;
      }
    });

    selectedProductIds.forEach((id) => {
      const product = selectedProductsById.get(id)
        ?? products.find((item) => item.id === id)
        ?? null;
      const units = Array.isArray(product?.sellingUnits) ? product.sellingUnits : [];
      const selectedUnitName = nextUnits[id] ?? units[0]?.name ?? product?.baseUnit ?? null;
      const selectedUnit = units.find((unit) => unit && unit.name === selectedUnitName)
        ?? units[0]
        ?? null;
      const conversionValue = Number.parseFloat(selectedUnit?.conversion);
      const unitConversion = Number.isFinite(conversionValue) && conversionValue > 0 ? conversionValue : 1;
      const availableUnitsRaw = unitConversion > 0
        ? Math.floor((product?.stock ?? 0) / unitConversion)
        : Number.MAX_SAFE_INTEGER;
      const availableUnits = Number.isFinite(availableUnitsRaw) && availableUnitsRaw >= 0
        ? availableUnitsRaw
        : Number.MAX_SAFE_INTEGER;
      const currentQuantity = nextQuantities[id];
      const numericQuantity = Number(currentQuantity);
      if (
        currentQuantity !== ""
        && Number.isFinite(numericQuantity)
        && numericQuantity > availableUnits
        && availableUnits >= 0
      ) {
        nextQuantities[id] = availableUnits;
        quantitiesChanged = true;
      }
    });

    const nextDiscounts = { ...discountsByProduct };
    let discountsChanged = false;
    Object.keys(nextDiscounts).forEach((id) => {
      const numericId = Number(id);
      if (!selectedProductIds.includes(numericId)) {
        delete nextDiscounts[id];
        discountsChanged = true;
      }
    });

    if (quantitiesChanged || discountsChanged || unitsChanged) {
      const payload = {};
      if (quantitiesChanged) {
        payload.productQuantities = nextQuantities;
      }
      if (unitsChanged) {
        payload.productUnits = nextUnits;
      }
      if (discountsChanged) {
        payload.discountsByProduct = nextDiscounts;
      }
      actions.updateQuickSaleState(payload);
    }
  }, [selectedProductIds, productQuantities, productUnits, discountsByProduct, selectedProductsById, products, actions]);

  const scopedCustomers = useMemo(() => {
    if (canViewAllCustomers) {
      return customers;
    }
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return customers.filter((customer) => {
      const ownerId = Number(customer?.accountOwnerId ?? customer?.ownerId);
      if (!Number.isFinite(ownerId)) {
        return false;
      }
      return accessibleUserIdSet.has(ownerId);
    });
  }, [customers, accessibleUserIdSet, canViewAllCustomers]);

  const selectedCustomer = useMemo(
    () => scopedCustomers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [scopedCustomers, selectedCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    const query = customerSearchTerm.trim().toLowerCase();
    if (!query) {
      return scopedCustomers;
    }
    return scopedCustomers.filter((customer) => {
      const fields = [
        customer.name ?? "",
        customer.email ?? "",
        customer.phone ?? customer.phoneNumber ?? "",
        customer.companyName ?? customer.company ?? customer.businessName ?? "",
      ];
      return fields.filter(Boolean).some((value) => value.toLowerCase().includes(query));
    });
  }, [scopedCustomers, customerSearchTerm]);

  useEffect(() => {
    if (selectedCustomerId == null) {
      return;
    }
    if (!scopedCustomers.some((customer) => customer.id === selectedCustomerId)) {
      actions.updateQuickSaleState({ selectedCustomerId: null });
    }
  }, [selectedCustomerId, scopedCustomers, actions]);

  const taxInfo = useMemo(() => getTaxInfo(selectedCountry), [selectedCountry]);

  const summary = useMemo(() => {
    const items = selectedProducts
      .map((product) => {
        const quantity = productQuantities[product.id] ?? 0;
        const unitSelection = selectedUnitsByProductId.get(product.id) ?? { name: '', conversion: 1, price: 0 };
        const conversion = unitSelection.conversion ?? 1;
        const availableUnitsRaw = conversion > 0
          ? Math.floor((product.stock ?? Number.MAX_SAFE_INTEGER) / conversion)
          : product.stock ?? Number.MAX_SAFE_INTEGER;
        const availableUnits = Number.isFinite(availableUnitsRaw) && availableUnitsRaw >= 0
          ? availableUnitsRaw
          : Number.MAX_SAFE_INTEGER;
        const safeQuantity = clampQuantity(quantity, 0, availableUnits);
        const unitPrice = unitSelection.price ?? 0;
        const unitName = unitSelection.name ?? '';
        const lineTotal = safeQuantity * unitPrice;
        return {
          product,
          quantity: safeQuantity,
          baseQuantity: safeQuantity * conversion,
          unitPrice,
          unitName,
          conversion,
          lineTotal,
          discount: 0,
          netTotal: lineTotal,
        };
      })
      .filter((item) => item.quantity > 0);

    let subtotalBeforeDiscount = 0;
    let perProductDiscountTotal = 0;
    const applicablePerProductDiscounts = (discountMode === "single" || discountMode === "multiple")
      ? discountsByProduct
      : {};

    items.forEach((item) => {
      subtotalBeforeDiscount += item.lineTotal;
      const rawDiscount = Number(applicablePerProductDiscounts[item.product.id] ?? 0);
      const discountAmount = Number.isFinite(rawDiscount) && rawDiscount > 0
        ? Math.min(rawDiscount, item.lineTotal)
        : 0;
      item.discount = discountAmount;
      item.netTotal = item.lineTotal - discountAmount;
      perProductDiscountTotal += discountAmount;
    });

    let subtotalAfterLineDiscounts = Math.max(0, subtotalBeforeDiscount - perProductDiscountTotal);
    let appliedGlobalDiscount = 0;
    if (discountMode === "global") {
      const normalizedGlobal = Math.max(0, Number(globalDiscountAmount) || 0);
      appliedGlobalDiscount = Math.min(normalizedGlobal, subtotalAfterLineDiscounts);
      subtotalAfterLineDiscounts -= appliedGlobalDiscount;
    }

    const taxAmount = subtotalAfterLineDiscounts * (taxInfo.rate ?? 0);
    const total = subtotalAfterLineDiscounts + taxAmount;

    return {
      items,
      subtotalBeforeDiscount,
      subtotal: subtotalAfterLineDiscounts,
      taxAmount,
      total,
      discounts: {
        lineItems: perProductDiscountTotal,
        global: appliedGlobalDiscount,
        total: perProductDiscountTotal + appliedGlobalDiscount,
      },
    };
  }, [
    selectedProducts,
    productQuantities,
    selectedUnitsByProductId,
    taxInfo,
    discountMode,
    discountsByProduct,
    globalDiscountAmount,
  ]);

  const summaryItemsByProductId = useMemo(() => {
    const map = new Map();
    summary.items.forEach((item) => {
      map.set(item.product.id, item);
    });
    return map;
  }, [summary.items]);

  useEffect(() => {
    const totalDiscount = Math.round((summary.discounts.total ?? 0) * 100) / 100;
    if (Math.round((quickSale.discount ?? 0) * 100) / 100 !== totalDiscount) {
      actions.updateQuickSaleState({ discount: totalDiscount });
    }
  }, [summary.discounts.total, quickSale.discount, actions]);

  const hasSelectedProducts = selectedProductIds.length > 0;
  const canFinalize = summary.items.length > 0 && selectedCustomerId != null;

  const formatValue = useCallback(
    (value) => formatCurrency(value, { countryCode: selectedCountry, showSymbol: true }),
    [selectedCountry],
  );
  const progressPercentage = Math.min(STEP_COUNT, Math.max(1, currentStep)) * (100 / STEP_COUNT);
  const selectAllOnFocus = useCallback((event) => {
    requestAnimationFrame(() => event.target.select());
  }, []);

  const handleToggleProduct = useCallback((productId) => {
    const isSelected = selectedProductIds.includes(productId);
    const nextIds = isSelected
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];

    const nextQuantities = { ...productQuantities };
    const nextUnits = { ...productUnits };
    if (isSelected) {
      delete nextQuantities[productId];
      delete nextUnits[productId];
    } else if (nextQuantities[productId] == null || nextQuantities[productId] <= 0) {
      nextQuantities[productId] = 1;
      const product = products.find((item) => item.id === productId);
      const units = Array.isArray(product?.sellingUnits) ? product.sellingUnits : [];
      const defaultUnitName = units[0]?.name ?? '';
      if (defaultUnitName) {
        nextUnits[productId] = defaultUnitName;
      }
    }

    actions.updateQuickSaleState({
      selectedProductIds: nextIds,
      productQuantities: nextQuantities,
      productUnits: nextUnits,
    });
  }, [selectedProductIds, productQuantities, productUnits, products, actions]);

  const handleQuantityChange = useCallback((productId, rawValue) => {
    const product = products.find((item) => item.id === productId);
    const unitSelection = selectedUnitsByProductId.get(productId) ?? { conversion: 1 };
    const unitConversion = unitSelection.conversion ?? 1;
    const availableUnitsRaw = unitConversion > 0
      ? Math.floor((product?.stock ?? 0) / unitConversion)
      : Number.MAX_SAFE_INTEGER;
    const maxUnits = Number.isFinite(availableUnitsRaw) && availableUnitsRaw > 0
      ? availableUnitsRaw
      : 1;

    if (rawValue === "" || rawValue == null) {
      actions.updateQuickSaleState({
        productQuantities: { ...productQuantities, [productId]: "" },
      });
      return;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      actions.updateQuickSaleState({
        productQuantities: { ...productQuantities, [productId]: "" },
      });
      return;
    }

    const numericValue = clampQuantity(parsedValue, 1, maxUnits);
    actions.updateQuickSaleState({
      productQuantities: { ...productQuantities, [productId]: numericValue },
    });
  }, [products, productQuantities, selectedUnitsByProductId, actions]);

  const handleProductUnitChange = useCallback((productId, unitName) => {
    const product = selectedProductsById.get(productId)
      ?? products.find((item) => item.id === productId)
      ?? null;
    const units = Array.isArray(product?.sellingUnits) ? product.sellingUnits : [];
    const selectedUnit = units.find((unit) => unit && unit.name === unitName) ?? null;
    const resolvedName = selectedUnit?.name ?? (unitName ?? '');
    const nextUnits = { ...productUnits };
    if (!resolvedName) {
      delete nextUnits[productId];
    } else {
      nextUnits[productId] = resolvedName;
    }
    actions.updateQuickSaleState({ productUnits: nextUnits });
  }, [actions, productUnits, selectedProductsById, products]);

  const handleQuantityStep = useCallback((productId, delta) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      return;
    }
    const unitSelection = selectedUnitsByProductId.get(productId) ?? { conversion: 1 };
    const unitConversion = unitSelection.conversion ?? 1;
    const availableUnitsRaw = unitConversion > 0
      ? Math.floor((product.stock ?? 0) / unitConversion)
      : Number.MAX_SAFE_INTEGER;
    const maxUnits = Number.isFinite(availableUnitsRaw) && availableUnitsRaw > 0
      ? availableUnitsRaw
      : 1;
    const currentRaw = productQuantities[productId];
    const currentNumeric = Number(currentRaw);
    const normalizedCurrent = Number.isFinite(currentNumeric) && currentNumeric > 0 ? currentNumeric : 0;
    const nextValue = clampQuantity(normalizedCurrent + delta, 1, maxUnits);
    actions.updateQuickSaleState({
      productQuantities: { ...productQuantities, [productId]: nextValue },
    });
    setEditingQuantityProductId(null);
  }, [products, productQuantities, selectedUnitsByProductId, actions, setEditingQuantityProductId]);

  const handleDiscountToggle = useCallback(() => {
    setShowDiscountPanel((previous) => !previous);
  }, []);

  const handleDiscountModeSelect = useCallback((mode) => {
    if (mode === discountMode) {
      return;
    }
    const payload = { discountMode: mode };
    if (mode === "global") {
      payload.discountsByProduct = {};
    } else if (mode === "single") {
      const fallbackId = selectedProductIds.find((id) => selectedProductsById.has(id)) ?? null;
      setSingleDiscountProductId(fallbackId ?? null);
      payload.discountsByProduct = fallbackId && discountsByProduct[fallbackId] != null
        ? { [fallbackId]: discountsByProduct[fallbackId] }
        : {};
    } else if (mode === "multiple") {
      payload.discountsByProduct = { ...discountsByProduct };
    } else {
      payload.discountsByProduct = {};
      setSingleDiscountProductId(null);
    }
    if (mode !== "global") {
      payload.globalDiscountAmount = 0;
    }
    actions.updateQuickSaleState(payload);
  }, [discountMode, actions, selectedProductIds, selectedProductsById, discountsByProduct]);

  const handleGlobalDiscountChange = useCallback((value) => {
    const parsed = Number.parseFloat(value);
    const amount = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
    actions.updateQuickSaleState({
      discountMode: "global",
      globalDiscountAmount: amount,
    });
  }, [actions]);

  const handleSingleDiscountProductChange = useCallback((value) => {
    if (value === "" || value == null) {
      setSingleDiscountProductId(null);
      actions.updateQuickSaleState({
        discountMode: "single",
        discountsByProduct: {},
      });
      return;
    }
    const numericId = Number(value);
    if (Number.isFinite(numericId)) {
      const nextDiscounts = {};
      if (discountsByProduct[numericId] != null) {
        nextDiscounts[numericId] = discountsByProduct[numericId];
      }
      setSingleDiscountProductId(numericId);
      actions.updateQuickSaleState({
        discountMode: "single",
        discountsByProduct: nextDiscounts,
      });
    } else {
      setSingleDiscountProductId(null);
    }
  }, [actions, discountsByProduct]);

  const handleSingleDiscountAmountChange = useCallback((productId, value) => {
    if (!Number.isFinite(productId)) {
      return;
    }
    const parsed = Number.parseFloat(value);
    const amount = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
    const nextDiscounts = { ...discountsByProduct };
    if (amount > 0) {
      nextDiscounts[productId] = amount;
    } else {
      delete nextDiscounts[productId];
    }
    actions.updateQuickSaleState({
      discountMode: "single",
      discountsByProduct: nextDiscounts,
    });
  }, [actions, discountsByProduct]);

  const handleMultiDiscountAmountChange = useCallback((productId, rawValue) => {
    if (!Number.isFinite(productId)) {
      return;
    }
    const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";
    const summaryLine = summaryItemsByProductId.get(productId);
    const maxAllowed = summaryLine ? summaryLine.lineTotal : Number.MAX_SAFE_INTEGER;

    let nextAmount = "";
    if (trimmed !== "") {
      const parsed = Number.parseFloat(trimmed);
      if (Number.isFinite(parsed) && parsed > 0) {
        nextAmount = Math.min(Math.round(parsed * 100) / 100, maxAllowed);
      } else if (Number.isFinite(parsed)) {
        nextAmount = 0;
      }
    }

    const nextDiscounts = { ...discountsByProduct, [productId]: nextAmount };
    actions.updateQuickSaleState({
      discountMode: "multiple",
      discountsByProduct: nextDiscounts,
    });
  }, [actions, discountsByProduct, summaryItemsByProductId]);

  const handleClearDiscounts = useCallback(() => {
    actions.updateQuickSaleState({
      discountMode: "none",
      globalDiscountAmount: 0,
      discountsByProduct: {},
      discount: 0,
    });
    setSingleDiscountProductId(null);
  }, [actions]);

  const handleInlineDiscountToggle = useCallback((productId) => {
    if (!Number.isFinite(productId)) {
      return;
    }
    const next = { ...discountsByProduct };
    if (next[productId] != null) {
      delete next[productId];
    } else {
      next[productId] = 0;
    }
    actions.updateQuickSaleState({
      discountMode: "multiple",
      globalDiscountAmount: 0,
      discountsByProduct: next,
    });
  }, [actions, discountsByProduct]);

  const handlePaymentTypeSelect = useCallback((type) => {
    const normalized = type === "Credit" ? "Credit" : "Cash";
    actions.updateQuickSaleState({ paymentType: normalized });
  }, [actions]);

  const handleSelectCustomer = useCallback((customerId) => {
    actions.updateQuickSaleState({ selectedCustomerId: customerId });
  }, [actions]);

  const handleNavigate = useCallback((direction) => {
    if (!canUseQuickSale) {
      actions.pushNotification({ type: "warning", message: "You do not have permission to use Quick Sale." });
      return;
    }
    const nextStep = currentStep + direction;
    if (direction > 0) {
      if (currentStep === 1 && selectedProductIds.length === 0) {
        actions.pushNotification({ type: "warning", message: "Select at least one product to continue." });
        return;
      }
      if (currentStep === 2) {
        const missingQuantity = selectedProductIds.some((id) => {
          const quantity = productQuantities[id];
          return !quantity || quantity <= 0;
        });
        if (missingQuantity) {
          actions.pushNotification({ type: "warning", message: "Set a quantity for each selected product." });
          return;
        }
      }
      if (currentStep === 3 && !selectedCustomerId) {
        actions.pushNotification({ type: "warning", message: "Choose a customer before finalizing the sale." });
        return;
      }
    }

    const clampedStep = Math.max(1, Math.min(STEP_COUNT, nextStep));
    const updates = { currentStep: clampedStep };
    if (direction > 0 && clampedStep === STEP_COUNT) {
      updates.subtotal = summary.subtotal;
      updates.subtotalBeforeDiscount = summary.subtotalBeforeDiscount;
      updates.taxAmount = summary.taxAmount;
      updates.total = summary.total;
    }
    actions.updateQuickSaleState(updates);
  }, [
    canUseQuickSale,
    actions,
    currentStep,
    selectedProductIds,
    productQuantities,
    selectedCustomerId,
    summary,
  ]);

  const handleFinalize = useCallback(() => {
    if (!canUseQuickSale) {
      actions.pushNotification({ type: "warning", message: "You do not have permission to use Quick Sale." });
      return;
    }
    if (!summary.items.length) {
      actions.pushNotification({ type: "warning", message: "Add at least one product before finalizing." });
      return;
    }
    if (!selectedCustomerId) {
      actions.pushNotification({ type: "warning", message: "Select a customer to complete the sale." });
      return;
    }

    const saleItems = summary.items.map(({
      product,
      quantity,
      unitPrice,
      unitName,
      conversion,
      baseQuantity,
      lineTotal,
      discount,
      netTotal,
    }) => ({
      productId: product.id,
      quantity,
      unitPrice,
      unitName,
      conversion,
      baseQuantity,
      lineTotal,
      discount,
      netTotal,
    }));

    const taxInfoSnapshot = getTaxInfo(selectedCountry);

    const sale = {
      id: Date.now(),
      customerId: selectedCustomerId,
      items: saleItems,
      subtotalBeforeDiscount: summary.subtotalBeforeDiscount,
      subtotal: summary.subtotal,
      taxAmount: summary.taxAmount,
      taxRate: taxInfoSnapshot.rate,
      total: summary.total,
      date: new Date().toISOString().slice(0, 10),
      salesPersonId: currentUser?.id ?? null,
      saleType: quickSale.paymentType ?? "Cash",
      paymentTerms: quickSale.paymentTerms ?? "Due on Receipt",
      notes: quickSale.notes ?? "",
      discount: summary.discounts.total,
      discountBreakdown: summary.discounts,
      branchId: currentBranchId ?? null,
      vanId: currentBranchId ?? null,
    };

    const updatedProducts = products.map((product) => {
      const summaryLine = summaryItemsByProductId.get(product.id);
      if (!summaryLine) {
        return product;
      }
      const quantity = summaryLine.baseQuantity ?? (summaryLine.quantity * summaryLine.conversion);
      if (!quantity || quantity <= 0) {
        return product;
      }
      const nextStock = (product.stock ?? 0) - quantity;
      return { ...product, stock: nextStock < 0 ? 0 : nextStock };
    });

    actions.finalizeQuickSale({ sale, updatedProducts });
    actions.pushNotification({
      type: "success",
      message: `Quick sale recorded for ${formatCurrency(summary.total, { countryCode: selectedCountry })}.`,
    });
  }, [
    canUseQuickSale,
    actions,
    summary,
    selectedCustomerId,
    currentUser,
    products,
    summaryItemsByProductId,
    selectedCountry,
    quickSale.paymentType,
    quickSale.paymentTerms,
    quickSale.notes,
  ]);

  const handleCancel = useCallback(() => {
    actions.setQuickSaleActive(false);
    actions.pushNotification({ type: "info", message: "Quick sale closed." });
  }, [actions]);

  const renderProductCard = useCallback((product) => {
    const isSelected = selectedProductIds.includes(product.id);
    const disabled = (product.stock ?? 0) <= 0;
    const primaryUnit = Array.isArray(product.sellingUnits) ? product.sellingUnits[0] : null;
    const unitPrice = primaryUnit?.price ?? 0;
    const unitName = primaryUnit?.name ?? product.baseUnit ?? "unit";

    return (
      <button
        key={product.id}
        type="button"
        data-action="qs-add-product"
        className={`quick-sale-product-row ${isSelected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
        onClick={() => !disabled && handleToggleProduct(product.id)}
      >
        <div className="quick-sale-product-row__content">
          <p className="quick-sale-product-row__name">{product.name}</p>
          <p className="quick-sale-product-row__meta">
            <span>{formatValue(unitPrice)} / {unitName}</span>
            <span>Stock {product.stock ?? 0} {product.baseUnit ?? "units"}</span>
          </p>
        </div>
        <span className="quick-sale-product-row__status" aria-hidden="true">
          <i className={`fas ${isSelected ? "fa-check-circle" : "fa-plus-circle"}`} />
        </span>
      </button>
    );
  }, [selectedProductIds, formatValue, handleToggleProduct]);

  const renderCustomerCard = useCallback((customer) => {
    const isSelected = selectedCustomerId === customer.id;
    const company = customer.companyName ?? customer.company ?? customer.businessName ?? null;
    const contact = customer.phone ?? customer.phoneNumber ?? null;

    return (
      <button
        key={customer.id}
        type="button"
        data-action="qs-select-customer"
        className={`quick-sale-customer-card ${isSelected ? "is-selected" : ""}`}
        onClick={() => handleSelectCustomer(customer.id)}
      >
        <div className="quick-sale-customer-card__header">
          <span className="quick-sale-customer-card__avatar" aria-hidden="true">
            <i className="fas fa-user-circle" />
          </span>
          <div className="quick-sale-customer-card__identity">
            <span className="quick-sale-customer-card__name">{customer.name}</span>
            {company ? <span className="quick-sale-customer-card__company">{company}</span> : null}
          </div>
          <span className="quick-sale-customer-card__status" aria-hidden="true">
            <i className={`fas ${isSelected ? "fa-check-circle" : "fa-plus-circle"}`} />
          </span>
        </div>
        <div className="quick-sale-customer-card__meta">
          {customer.email ? <span>{customer.email}</span> : null}
          {contact ? <span>{contact}</span> : null}
          {!customer.email && !contact ? <span>No contact details</span> : null}
        </div>
      </button>
    );
  }, [handleSelectCustomer, selectedCustomerId]);
  return (
    <div id="quick-sale-container" className="quick-sale-container">
      <button
        type="button"
        data-action="cancel-quick-sale"
        className="quick-sale-cancel-button"
        onClick={handleCancel}
        title="Close quick sale"
      >
        &times;
      </button>

      <div className="quick-sale-progress-bar">
        <div
          id="quick-sale-progress-fill"
          className="quick-sale-progress-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div id="qs-step-1" className={`quick-sale-step-container ${currentStep === 1 ? "active" : ""}`}>
        <div className="quick-sale-step-content">
          <div className="quick-sale-step-header">
            <div>
              <h2 className="quick-sale-heading">Select Products</h2>
              <p className="quick-sale-subtitle">Choose items to add to the sale.</p>
            </div>
            <div className="quick-sale-step-actions">
              <button
                type="button"
                data-action="qs-next-step"
                className="quick-sale-button quick-sale-button--primary"
                onClick={() => handleNavigate(1)}
                disabled={!hasSelectedProducts}
              >
                Next: Adjust Quantities
                <i className="fas fa-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="quick-sale-selected-summary">
            <div className="quick-sale-selected-summary__header">
              <span>Selected Products</span>
              <span>
                {selectedProducts.length}
                {" "}
                {selectedProducts.length === 1 ? "item" : "items"}
              </span>
            </div>
            {selectedProducts.length ? (
              <ul className="quick-sale-selected-summary__list">
                {selectedProducts.map((product) => (
                  <li key={product.id}>
                    <span className="quick-sale-selected-summary__name">{product.name}</span>
                    <span className="quick-sale-selected-summary__qty">
                      Qty {productQuantities[product.id] ?? 1}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="quick-sale-selected-summary__empty">No products selected yet.</p>
            )}
          </div>

          <div className="quick-sale-product-scroll">
            {products.length ? products.map(renderProductCard) : null}
          </div>
        </div>
      </div>

      <div id="qs-step-2" className={`quick-sale-step-container ${currentStep === 2 ? "active" : ""}`}>
        <div className="quick-sale-step-content">
          <div className="quick-sale-step-header">
            <div>
              <h2 className="quick-sale-heading">Adjust Quantities</h2>
              <p className="quick-sale-subtitle">Use the sliders to set the quantity for each item.</p>
            </div>
            <div className="quick-sale-step-actions">
              <button
                type="button"
                data-action="qs-prev-step"
                className="quick-sale-button quick-sale-button--secondary"
                onClick={() => handleNavigate(-1)}
              >
                <i className="fas fa-arrow-left" aria-hidden="true" />
                Back
              </button>
              <button
                type="button"
                data-action="qs-next-step"
                className="quick-sale-button quick-sale-button--primary"
                onClick={() => handleNavigate(1)}
              >
                Next: Select Customer
                <i className="fas fa-user-friends" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="quick-sale-discount-toggle">
            <button
              type="button"
              className={`quick-sale-button quick-sale-button--outline ${showDiscountPanel ? "is-active" : ""}`}
              onClick={handleDiscountToggle}
              disabled={!hasSelectedProducts && !showDiscountPanel}
            >
              <i className="fas fa-tags" aria-hidden="true" />
              {showDiscountPanel ? "Hide discount tools" : "Discount tools"}
            </button>
            <span className="quick-sale-discount-toggle__summary">
              {summary.discounts.total > 0
                ? `Discounts: ${formatValue(summary.discounts.total)}`
                : hasSelectedProducts
                  ? "No discounts applied"
                  : "Select products to unlock discounts"}
            </span>
          </div>

          {showDiscountPanel ? (
            <div className="quick-sale-discount-panel">
              <div className="quick-sale-discount-options">
                {DISCOUNT_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`quick-sale-discount-option ${discountMode === option.key ? "active" : ""}`}
                    onClick={() => handleDiscountModeSelect(option.key)}
                  >
                    {option.label}
                  </button>
                ))}

                <button
                  type="button"
                  className="quick-sale-discount-clear"
                  onClick={handleClearDiscounts}
                  disabled={
                    discountMode === "none"
                    && globalDiscountAmount === 0
                    && Object.keys(discountsByProduct).length === 0
                  }
                >
                  <i className="fas fa-undo" aria-hidden="true" />
                  Reset
                </button>
              </div>

              <p className="quick-sale-discount-helper">
                {DISCOUNT_MODE_OPTIONS.find((option) => option.key === discountMode)?.helper
                  ?? "Choose how you want to apply discounts to this sale."}
              </p>

              {discountMode === "global" ? (
                <div className="quick-sale-discount-section">
                  <label htmlFor="quick-sale-global-discount">Wholesale discount amount</label>
                  <div className="quick-sale-discount-input">
                    <input
                      id="quick-sale-global-discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={globalDiscountAmount}
                      onChange={(event) => handleGlobalDiscountChange(event.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                      onFocus={selectAllOnFocus}
                    />
                    <span className="quick-sale-discount-input__preview">
                      {formatValue(Math.max(0, globalDiscountAmount))}
                    </span>
                  </div>
                </div>
              ) : null}

              {discountMode === "single" ? (
                <div className="quick-sale-discount-section">
                  {hasSelectedProducts ? (
                    <>
                      <label htmlFor="quick-sale-single-product">Select product</label>
                      <select
                        id="quick-sale-single-product"
                        value={singleDiscountProductId ?? ""}
                        onChange={(event) => handleSingleDiscountProductChange(event.target.value)}
                        className="quick-sale-discount-select"
                      >
                        <option value="">Choose a product...</option>
                        {selectedProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {singleDiscountProductId != null ? (
                        <div className="quick-sale-discount-input">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={discountsByProduct[singleDiscountProductId] ?? 0}
                            onChange={(event) => handleSingleDiscountAmountChange(
                              singleDiscountProductId,
                              event.target.value,
                            )}
                            inputMode="decimal"
                            onFocus={selectAllOnFocus}
                          />
                          <span className="quick-sale-discount-input__preview">
                            Max {formatValue(summaryItemsByProductId.get(singleDiscountProductId)?.lineTotal ?? 0)}
                          </span>
                        </div>
                      ) : (
                        <p className="quick-sale-discount-hint">Select a product to assign a discount.</p>
                      )}
                    </>
                  ) : (
                    <div className="quick-sale-discount-empty">
                      Add products to your sale before applying a single product discount.
                    </div>
                  )}
                </div>
              ) : null}

              {discountMode === "multiple" ? (
                <div className="quick-sale-discount-section">
                  {hasSelectedProducts ? (
                    <div className="quick-sale-discount-empty">
                      Use the tag button on each cart item to configure inline discounts.
                    </div>
                  ) : (
                    <div className="quick-sale-discount-empty">
                      Add products to your sale before applying multiple discounts.
                    </div>
                  )}
                </div>
              ) : null}

              <div className="quick-sale-discount-summary">
                <span>Total discount:</span>
                <strong>{formatValue(summary.discounts.total)}</strong>
              </div>
            </div>
          ) : null}

          <div className="quick-sale-product-scroll">
            {selectedProducts.length ? (
              <div className="quick-sale-product-list">
                {selectedProducts.map((product) => {
                  const storedQuantity = productQuantities[product.id];
                  const hasQuantityValue = storedQuantity !== "" && storedQuantity != null;
                  const numericQuantity = Number(storedQuantity);
                  const unitSelection = selectedUnitsByProductId.get(product.id) ?? { name: '', price: 0, conversion: 1 };
                  const unitOptions = Array.isArray(product.sellingUnits) ? product.sellingUnits : [];
                  const resolvedUnitName = unitSelection.name || unitOptions[0]?.name || product.baseUnit || '';
                  const unitPriceValue = unitSelection.price ?? 0;
                  const unitConversion = unitSelection.conversion ?? 1;
                  const availableSellingUnitsRaw = unitConversion > 0
                    ? Math.floor((product.stock ?? 0) / unitConversion)
                    : Number.MAX_SAFE_INTEGER;
                  const availableSellingUnits = Number.isFinite(availableSellingUnitsRaw) && availableSellingUnitsRaw >= 0
                    ? availableSellingUnitsRaw
                    : Number.MAX_SAFE_INTEGER;
                  const maxUnitsForInput = availableSellingUnits > 0 && Number.isFinite(availableSellingUnits)
                    ? availableSellingUnits
                    : 1;
                  const summaryLine = summaryItemsByProductId.get(product.id);
                  const safeQuantity = summaryLine
                    ? summaryLine.quantity
                    : (hasQuantityValue && Number.isFinite(numericQuantity) && numericQuantity > 0 ? numericQuantity : 0);
                  const quantityInputValue = storedQuantity === "" ? "" : storedQuantity ?? 1;
                  const discountActive = discountsByProduct[product.id] != null;
                  const rawDiscountValue = discountsByProduct[product.id];
                  const currentDiscount = rawDiscountValue === "" ? "" : rawDiscountValue ?? "";
                  const lineTotal = summaryLine
                    ? summaryLine.lineTotal
                    : Math.max(0, safeQuantity * unitPriceValue);
                  const isEditingQuantity = editingQuantityProductId === product.id;
                  const displayQuantity = storedQuantity === ""
                    ? "--"
                    : quantityInputValue;
                  const disableDecrement = storedQuantity === "" || safeQuantity <= 1;
                  const disableIncrement = availableSellingUnits === 0
                    || (storedQuantity !== "" && safeQuantity >= availableSellingUnits);

                  return (
                    <div key={product.id} className="quick-sale-product-item">
                      <div className="quick-sale-product-item__main">
                        <div className="quick-sale-product-item__info">
                          <p className="quick-sale-product-item__name">{product.name}</p>
                          <span className="quick-sale-product-item__unit">
                            {formatValue(unitPriceValue)} per {resolvedUnitName || product.baseUnit || "unit"}
                          </span>
                          <label className="quick-sale-product-item__unit-select">
                            <span>Unit</span>
                            <select
                              value={resolvedUnitName}
                              onChange={(event) => handleProductUnitChange(product.id, event.target.value)}
                              disabled={unitOptions.length === 0}
                            >
                              {unitOptions.length === 0 ? (
                                <option value={resolvedUnitName || ""}>
                                  {resolvedUnitName || product.baseUnit || "N/A"}
                                </option>
                              ) : unitOptions.map((unit) => (
                                <option key={unit.name} value={unit.name}>
                                  {unit.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="quick-sale-quantity-stepper">
                          <button
                            type="button"
                            className="quick-sale-stepper-button"
                            onClick={() => handleQuantityStep(product.id, -1)}
                            disabled={disableDecrement}
                            aria-label="Decrease quantity"
                          >
                            <i className="fas fa-minus" aria-hidden="true" />
                          </button>

                          {isEditingQuantity ? (
                            <input
                              type="number"
                              min="1"
                              max={Math.max(1, maxUnitsForInput)}
                              value={quantityInputValue}
                              className="quick-sale-stepper-input"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(event) => handleQuantityChange(product.id, event.target.value)}
                              onFocus={selectAllOnFocus}
                              autoFocus
                              onBlur={() => setEditingQuantityProductId(null)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === "Escape") {
                                  setEditingQuantityProductId(null);
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="quick-sale-stepper-display"
                              onClick={() => setEditingQuantityProductId(product.id)}
                              aria-label="Edit quantity"
                            >
                              {displayQuantity}
                            </button>
                          )}

                          <button
                            type="button"
                            className="quick-sale-stepper-button"
                            onClick={() => handleQuantityStep(product.id, 1)}
                            disabled={disableIncrement}
                            aria-label="Increase quantity"
                          >
                            <i className="fas fa-plus" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="quick-sale-line-total">
                          <span>Line Total</span>
                          <strong>{formatValue(lineTotal)}</strong>
                          <span className="quick-sale-line-total__unit">
                            {formatValue(unitPriceValue)} / {resolvedUnitName || product.baseUnit || "unit"}
                          </span>
                          {product.baseUnit ? (
                            <span className="quick-sale-line-total__conversion">
                              {unitConversion} {product.baseUnit}{unitConversion === 1 ? "" : "s"} per {resolvedUnitName || product.baseUnit || "unit"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="quick-sale-product-item__footer">
                        <span className="quick-sale-product-item__stock">
                          In stock: {product.stock ?? 0} {product.baseUnit ?? "units"}
                        </span>

                        {discountMode === "multiple" ? (
                          <button
                            type="button"
                            className={`quick-sale-discount-trigger${discountActive ? " is-active" : ""}`}
                            onClick={() => handleInlineDiscountToggle(product.id)}
                          >
                            <i className="fas fa-tag" aria-hidden="true" />
                            {discountActive ? "Discount" : "Add Discount"}
                          </button>
                        ) : null}
                      </div>

                      {discountMode === "multiple" && discountActive ? (
                        <div className="quick-sale-product-item__discount">
                          <div className="quick-sale-product-item__discount-header">
                            <span>Discount</span>
                            <span className="quick-sale-product-item__discount-max">
                              Max {formatValue(lineTotal)}
                            </span>
                          </div>
                          <div className="quick-sale-product-item__discount-body">
                            <input
                              type="number"
                              min="0"
                              max={lineTotal}
                              step="0.01"
                              value={currentDiscount}
                              onChange={(event) => handleMultiDiscountAmountChange(product.id, event.target.value)}
                              inputMode="decimal"
                              onFocus={selectAllOnFocus}
                              placeholder="0.00"
                              className="quick-sale-product-item__discount-input"
                            />
                            <button
                              type="button"
                              className="quick-sale-discount-remove"
                              onClick={() => handleInlineDiscountToggle(product.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="quick-sale-empty-state">
                Add products to configure quantities.
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="qs-step-3" className={`quick-sale-step-container ${currentStep === 3 ? "active" : ""}`}>
        <div className="quick-sale-step-content">
          <div className="quick-sale-step-header">
            <div>
              <h2 className="quick-sale-heading">Select Customer</h2>
              <p className="quick-sale-subtitle">Who is this sale for?</p>
            </div>
            <div className="quick-sale-step-actions">
              <button
                type="button"
                data-action="qs-prev-step"
                className="quick-sale-button quick-sale-button--secondary"
                onClick={() => handleNavigate(-1)}
              >
                <i className="fas fa-arrow-left" aria-hidden="true" />
                Back
              </button>
              <button
                type="button"
                data-action="qs-next-step"
                className="quick-sale-button quick-sale-button--primary"
                onClick={() => handleNavigate(1)}
                disabled={!selectedCustomerId}
              >
                Next: Confirm Sale
                <i className="fas fa-receipt" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="quick-sale-search">
            <i className="fas fa-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search customers by name, email, or company"
              value={customerSearchTerm}
              onChange={(event) => setCustomerSearchTerm(event.target.value)}
            />
            {customerSearchTerm ? (
              <button
                type="button"
                className="quick-sale-search__clear"
                onClick={() => setCustomerSearchTerm("")}
                aria-label="Clear customer search"
              >
                <i className="fas fa-times-circle" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="quick-sale-customer-scroll">
            {scopedCustomers.length === 0 ? (
              <div className="quick-sale-empty-state">
                <i className="fas fa-user-slash" aria-hidden="true" />
                <p>No customers available under your supervision. Add a customer first.</p>
              </div>
            ) : filteredCustomers.length ? (
              filteredCustomers.map(renderCustomerCard)
            ) : (
              <div className="quick-sale-empty-state">
                <i className="fas fa-search-minus" aria-hidden="true" />
                <p>No customers match "{customerSearchTerm}". Adjust your search and try again.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="qs-step-4" className={`quick-sale-step-container ${currentStep === 4 ? "active" : ""}`}>
        <div className="quick-sale-step-content">
          <div className="quick-sale-step-header">
            <div>
              <h2 className="quick-sale-heading">Confirm Sale</h2>
              <p className="quick-sale-subtitle">Review the details and finalize the transaction.</p>
            </div>
            <div className="quick-sale-step-actions">
              <button
                type="button"
                data-action="qs-prev-step"
                className="quick-sale-button quick-sale-button--secondary"
                onClick={() => handleNavigate(-1)}
              >
                <i className="fas fa-arrow-left" aria-hidden="true" />
                Back
              </button>
              <button
                type="button"
                data-action="finalize-quick-sale"
                className="quick-sale-button quick-sale-button--primary"
                onClick={handleFinalize}
                disabled={!canFinalize}
              >
                Finalize &amp; Record Sale
                <i className="fas fa-check" aria-hidden="true" />
              </button>
            </div>
        </div>

          <div className="quick-sale-payment-toggle">
            <span className="quick-sale-payment-label">Payment Type</span>
            <div className="quick-sale-payment-options">
              <button
                type="button"
                className={`quick-sale-payment-button${paymentType === "Cash" ? " is-active" : ""}`}
                onClick={() => handlePaymentTypeSelect("Cash")}
                aria-pressed={paymentType === "Cash"}
              >
                <i className="fas fa-money-bill-wave" aria-hidden="true" />
                Cash
              </button>
              <button
                type="button"
                className={`quick-sale-payment-button${paymentType === "Credit" ? " is-active" : ""}`}
                onClick={() => handlePaymentTypeSelect("Credit")}
                aria-pressed={paymentType === "Credit"}
              >
                <i className="fas fa-file-invoice-dollar" aria-hidden="true" />
                Credit
              </button>
            </div>
          </div>

          <div id="qs-summary" className="w-full max-w-md bg-black bg-opacity-30 p-6 rounded-2xl border border-blue-500">
            {selectedCustomer ? (
              <>
                <p className="text-lg font-bold text-white mb-4">For: {selectedCustomer.name}</p>
                <div className="space-y-3 mb-4 pb-4 border-b border-gray-600">
                  {summary.items.map((item) => (
                    <div key={item.product.id} className="space-y-1">
                      <div className="flex justify-between text-gray-300">
                        <span>
                          {item.quantity} x {item.product.name}
                          {item.unitName ? " (" + item.unitName + ")" : ""}
                        </span>
                        <span>{formatValue(item.netTotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          {item.conversion} {item.product.baseUnit ?? "base units"} per {item.unitName || item.product.baseUnit || "unit"}
                        </span>
                        <span>{formatValue(item.unitPrice)}</span>
                      </div>
                      {item.discount > 0 ? (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Discount</span>
                          <span>-{formatValue(item.discount)}</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {summary.discounts.total > 0 ? (
                    <>
                      <div className="flex justify-between text-gray-300">
                        <span>Subtotal before discount</span>
                        <span>{formatValue(summary.subtotalBeforeDiscount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Discounts</span>
                        <span>-{formatValue(summary.discounts.total)}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Subtotal after discount</span>
                        <span>{formatValue(summary.subtotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal</span>
                      <span>{formatValue(summary.subtotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-300">
                    <span>{taxInfo.name} ({(taxInfo.rate * 100).toFixed(1)}%)</span>
                    <span>{formatValue(summary.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-xl mt-2 pt-2 border-t border-gray-500">
                    <span>Total</span>
                    <span className="quick-sale-accent-text">{formatValue(summary.total)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-300">Select a customer to create the invoice summary.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}








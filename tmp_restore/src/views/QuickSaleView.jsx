import { useCallback, useEffect, useMemo } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency, getTaxInfo } from '../utils/currency.js';

const STEP_COUNT = 4;
const SVG_TRACE_PATH = 'M1-4.5l71,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l71,118.5';

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
    products,
    customers,
    selectedCountry,
    currentUser,
    accessibleUserIds = [],
    hasFeaturePermission,
  } = state;

  const canUseQuickSale = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'quickSale.use');
    }
    return true;
  }, [hasFeaturePermission, currentUser?.id]);

  const canViewAllCustomers = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'team.viewAll');
    }
    return (currentUser?.role ?? 'guest') === 'admin';
  }, [hasFeaturePermission, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!quickSale?.active) {
      return;
    }
    if (!canUseQuickSale) {
      actions.updateQuickSaleState({ active: false });
      actions.pushNotification({
        type: 'warning',
        message: 'Quick Sale access removed',
        description: 'Ask an administrator to enable Quick Sale for your account.',
      });
    }
  }, [quickSale?.active, canUseQuickSale, actions]);

  if (!quickSale?.active || !canUseQuickSale) {
    return null;
  }

  const {
    currentStep = 1,
    selectedProductIds = [],
    productQuantities = {},
    selectedCustomerId,
  } = quickSale;

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const accessibleUserIdSet = useMemo(
    () => new Set(
      (accessibleUserIds ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    ),
    [accessibleUserIds],
  );

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
        const safeQuantity = clampQuantity(quantity, 0, product.stock ?? Number.MAX_SAFE_INTEGER);
        const lineTotal = safeQuantity * (product.price ?? 0);
        return {
          product,
          quantity: safeQuantity,
          lineTotal,
        };
      })
      .filter((item) => item.quantity > 0);

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = subtotal * (taxInfo.rate ?? 0);
    const total = subtotal + taxAmount;

    return { items, subtotal, taxAmount, total };
  }, [selectedProducts, productQuantities, taxInfo]);

  useEffect(() => {
    const nextQuantities = { ...productQuantities };
    let changed = false;

    selectedProductIds.forEach((id) => {
      if (nextQuantities[id] == null || nextQuantities[id] <= 0) {
        nextQuantities[id] = 1;
        changed = true;
      }
    });

    Object.keys(nextQuantities).forEach((id) => {
      const numericId = Number(id);
      if (!selectedProductIds.includes(numericId)) {
        delete nextQuantities[id];
        changed = true;
      }
    });

    if (changed) {
      actions.updateQuickSaleState({ productQuantities: nextQuantities });
    }
  }, [selectedProductIds, productQuantities, actions]);

  const handleCancel = useCallback(() => {
    actions.setQuickSaleActive(false);
    actions.pushNotification({ type: 'info', message: 'Quick sale cancelled.' });
  }, [actions]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel]);

  const handleToggleProduct = useCallback((productId) => {
    const isSelected = selectedProductIds.includes(productId);
    const nextIds = isSelected
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];

    const nextQuantities = { ...productQuantities };
    if (isSelected) {
      delete nextQuantities[productId];
    } else if (nextQuantities[productId] == null || nextQuantities[productId] <= 0) {
      nextQuantities[productId] = 1;
    }

    actions.updateQuickSaleState({
      selectedProductIds: nextIds,
      productQuantities: nextQuantities,
    });
  }, [selectedProductIds, productQuantities, actions]);

  const handleQuantityChange = useCallback((productId, value) => {
    const product = products.find((item) => item.id === productId);
    const maxStock = product?.stock ?? Number.MAX_SAFE_INTEGER;
    const numericValue = clampQuantity(Number(value), 1, maxStock || 1);
    actions.updateQuickSaleState({
      productQuantities: { ...productQuantities, [productId]: numericValue },
    });
  }, [products, productQuantities, actions]);

  const handleSelectCustomer = useCallback((customerId) => {
    actions.updateQuickSaleState({ selectedCustomerId: customerId });
  }, [actions]);

  const handleNavigate = useCallback((direction) => {
    if (!canUseQuickSale) {
      actions.pushNotification({ type: 'warning', message: 'You do not have permission to use Quick Sale.' });
      return;
    }
    const nextStep = currentStep + direction;
    if (direction > 0) {
      if (currentStep === 1 && selectedProductIds.length === 0) {
        actions.pushNotification({ type: 'warning', message: 'Select at least one product to continue.' });
        return;
      }

      if (currentStep === 2) {
        const missingQuantity = selectedProductIds.some((id) => {
          const quantity = productQuantities[id];
          return !quantity || quantity <= 0;
        });
        if (missingQuantity) {
          actions.pushNotification({ type: 'warning', message: 'Set a quantity for each selected product.' });
          return;
        }
      }

      if (currentStep === 3 && !selectedCustomerId) {
        actions.pushNotification({ type: 'warning', message: 'Choose a customer before finalizing the sale.' });
        return;
      }
    }

    const clampedStep = Math.max(1, Math.min(STEP_COUNT, nextStep));
    const updates = { currentStep: clampedStep };
    if (direction > 0 && clampedStep === STEP_COUNT) {
      updates.subtotal = summary.subtotal;
      updates.taxAmount = summary.taxAmount;
      updates.total = summary.total;
    }
    actions.updateQuickSaleState(updates);
  }, [canUseQuickSale, currentStep, selectedProductIds, productQuantities, selectedCustomerId, summary, actions]);

  const handleFinalize = useCallback(() => {
    if (!canUseQuickSale) {
      actions.pushNotification({ type: 'warning', message: 'You do not have permission to use Quick Sale.' });
      return;
    }
    if (!summary.items.length) {
      actions.pushNotification({ type: 'warning', message: 'Add at least one product before finalizing.' });
      return;
    }

    if (!selectedCustomerId) {
      actions.pushNotification({ type: 'warning', message: 'Select a customer to complete the sale.' });
      return;
    }

    const saleItems = summary.items.map(({ product, quantity }) => ({
      productId: product.id,
      quantity,
      unitPrice: product.price ?? 0,
    }));

    const sale = {
      id: Date.now(),
      customerId: selectedCustomerId,
      items: saleItems,
      subtotal: summary.subtotal,
      taxAmount: summary.taxAmount,
      taxRate: taxInfo.rate,
      total: summary.total,
      date: new Date().toISOString().slice(0, 10),
      salesPersonId: currentUser?.id ?? null,
      saleType: quickSale.paymentType ?? 'Cash',
      discount: quickSale.discount ?? 0,
    };

    const updatedProducts = products.map((product) => {
      const quantity = productQuantities[product.id];
      if (!quantity || quantity <= 0) {
        return product;
      }
      const nextStock = (product.stock ?? 0) - quantity;
      return { ...product, stock: nextStock < 0 ? 0 : nextStock };
    });

    actions.finalizeQuickSale({ sale, updatedProducts });
    actions.pushNotification({
      type: 'success',
      message: `Quick sale recorded for ${formatCurrency(summary.total, { countryCode: selectedCountry })}.`,
    });
  }, [canUseQuickSale, actions, summary, selectedCustomerId, taxInfo.rate, currentUser, quickSale.paymentType, quickSale.discount, products, productQuantities, selectedCountry]);

  const progressPercentage = Math.min(STEP_COUNT, Math.max(1, currentStep)) * (100 / STEP_COUNT);
  const formatValue = useCallback((value) => formatCurrency(value, { countryCode: selectedCountry }), [selectedCountry]);

  const renderProductCard = (product) => {
    const isSelected = selectedProductIds.includes(product.id);
    const disabled = (product.stock ?? 0) <= 0;

    return (
      <button
        key={product.id}
        type="button"
        data-action="qs-add-product"
        className={`quick-sale-grid-item ${isSelected ? 'selected' : ''} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        onClick={() => !disabled && handleToggleProduct(product.id)}
      >
        <div className="gradient-tracing-container">
          <svg className="gradient-tracing-svg" width="800" height="120" viewBox="0 0 800 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d={SVG_TRACE_PATH} stroke="rgba(4, 25, 248, 0.2)" strokeWidth="2" />
            <path className="animated-trace-path" d={SVG_TRACE_PATH} strokeWidth="2" />
            <defs>
              <linearGradient id="quick-sale-gradient" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0419f8" stopOpacity="0" />
                <stop stopColor="#0419f8" />
                <stop offset="1" stopColor="#0419f8" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <i className="fas fa-box text-3xl mb-3 text-white" />
        <p className="font-semibold text-white">{product.name}</p>
        <p className="text-sm text-gray-400">{formatValue(product.price ?? 0)}</p>
        <div className={`absolute top-2 right-2 ${isSelected ? '' : 'hidden'}`}>
          <i className="fas fa-check-circle text-green-400" />
        </div>
      </button>
    );
  };

  const renderCustomerCard = (customer) => {
    const isSelected = selectedCustomerId === customer.id;

    return (
      <button
        key={customer.id}
        type="button"
        data-action="qs-select-customer"
        className={`quick-sale-grid-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSelectCustomer(customer.id)}
      >
        <div className="gradient-tracing-container">
          <svg className="gradient-tracing-svg" width="800" height="120" viewBox="0 0 800 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d={SVG_TRACE_PATH} stroke="rgba(4, 25, 248, 0.2)" strokeWidth="2" />
            <path className="animated-trace-path" d={SVG_TRACE_PATH} strokeWidth="2" />
          </svg>
        </div>
        <i className="fas fa-user-circle text-3xl mb-3 text-white" />
        <p className="font-semibold text-white">{customer.name}</p>
        <p className="text-xs text-gray-400">{customer.email}</p>
        <div className={`absolute top-2 right-2 ${isSelected ? '' : 'hidden'}`}>
          <i className="fas fa-check-circle text-green-400" />
        </div>
      </button>
    );
  };

  return (
    <div id="quick-sale-container" className="quick-sale-container">
      <button type="button" data-action="cancel-quick-sale" className="quick-sale-cancel-button" onClick={handleCancel}>
        &times;
      </button>

      <div className="quick-sale-progress-bar">
        <div id="quick-sale-progress-fill" className="quick-sale-progress-fill" style={{ width: `${progressPercentage}%` }} />
      </div>

      <div id="qs-step-1" className={`quick-sale-step-container ${currentStep === 1 ? 'active' : ''}`}>
        <div className="quick-sale-step-content">
          <h2 className="text-3xl font-bold mb-2 quick-sale-gradient-text">Select Products</h2>
          <p className="text-lg text-gray-300 mb-8">Choose items to add to the sale.</p>
          <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(renderProductCard)}
          </div>
        </div>
        <div className="mt-8 text-center">
          <button type="button" data-action="qs-next-step" className="quick-sale-button px-8 py-3" onClick={() => handleNavigate(1)}>
            Next: Adjust Quantities
          </button>
        </div>
      </div>

      <div id="qs-step-2" className={`quick-sale-step-container ${currentStep === 2 ? 'active' : ''}`}>
        <div className="quick-sale-step-content">
          <h2 className="text-3xl font-bold mb-2 quick-sale-gradient-text">Adjust Quantities</h2>
          <p className="text-lg text-gray-300 mb-8">Use the sliders to set the quantity for each item.</p>
          <div id="qs-quantity-list" className="w-full max-w-2xl space-y-6">
            {selectedProducts.length ? (
              selectedProducts.map((product) => {
                const quantity = productQuantities[product.id] ?? 1;
                const maxStock = Math.max(1, product.stock ?? 1);
                return (
                  <div key={product.id} className="perplexity-card p-4">
                    <p className="font-bold text-lg text-white mb-3">{product.name}</p>
                    <div className="quantity-slider-container">
                      <input
                        type="range"
                        min="1"
                        max={maxStock}
                        value={quantity}
                        className="quantity-slider"
                        onChange={(event) => handleQuantityChange(product.id, event.target.value)}
                      />
                      <input
                        type="number"
                        min="1"
                        max={maxStock}
                        value={quantity}
                        className="quantity-input"
                        onChange={(event) => handleQuantityChange(product.id, event.target.value)}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">In stock: {product.stock ?? 0}</p>
                  </div>
                );
              })
            ) : (
              <div className="perplexity-card p-6 text-center text-gray-300">
                Select at least one product to configure quantities.
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 text-center">
          <button type="button" data-action="qs-prev-step" className="bg-gray-600 text-white px-8 py-3 rounded-xl mr-4" onClick={() => handleNavigate(-1)}>
            Back
          </button>
          <button type="button" data-action="qs-next-step" className="quick-sale-button px-8 py-3" onClick={() => handleNavigate(1)}>
            Next: Select Customer
          </button>
        </div>
      </div>

      <div id="qs-step-3" className={`quick-sale-step-container ${currentStep === 3 ? 'active' : ''}`}>
        <div className="quick-sale-step-content">
          <h2 className="text-3xl font-bold mb-2 quick-sale-gradient-text">Select Customer</h2>
          <p className="text-lg text-gray-300 mb-8">Who is this sale for?</p>
          <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
            {scopedCustomers.length ? (
              scopedCustomers.map(renderCustomerCard)
            ) : (
              <div className="perplexity-card p-6 text-center text-gray-300 md:col-span-4">
                No customers available under your supervision. Add a customer first.
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 text-center">
          <button type="button" data-action="qs-prev-step" className="bg-gray-600 text-white px-8 py-3 rounded-xl mr-4" onClick={() => handleNavigate(-1)}>
            Back
          </button>
          <button type="button" data-action="qs-next-step" className="quick-sale-button px-8 py-3" onClick={() => handleNavigate(1)}>
            Next: Confirm Sale
          </button>
        </div>
      </div>

      <div id="qs-step-4" className={`quick-sale-step-container ${currentStep === 4 ? 'active' : ''}`}>
        <div className="quick-sale-step-content">
          <h2 className="text-3xl font-bold mb-2 quick-sale-gradient-text">Confirm Sale</h2>
          <p className="text-lg text-gray-300 mb-8">Review the details and finalize the transaction.</p>
          <div id="qs-summary" className="w-full max-w-md bg-black bg-opacity-30 p-6 rounded-2xl border border-blue-500">
            {selectedCustomer ? (
              <>
                <p className="text-lg font-bold text-white mb-4">For: {selectedCustomer.name}</p>
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-600">
                  {summary.items.map(({ product, quantity, lineTotal }) => (
                    <div key={product.id} className="flex justify-between text-gray-300">
                      <span>{quantity} × {product.name}</span>
                      <span>{formatValue(lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>{formatValue(summary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>{taxInfo.name} ({(taxInfo.rate * 100).toFixed(1)}%)</span>
                    <span>{formatValue(summary.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-xl mt-2 pt-2 border-t border-gray-500">
                    <span>Total</span>
                    <span className="quick-sale-gradient-text">{formatValue(summary.total)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-300">Select a customer to create the invoice summary.</p>
            )}
          </div>
        </div>
        <div className="mt-8 text-center">
          <button type="button" data-action="qs-prev-step" className="bg-gray-600 text-white px-8 py-3 rounded-xl mr-4" onClick={() => handleNavigate(-1)}>
            Back
          </button>
          <button type="button" data-action="finalize-quick-sale" className="bot-button px-8 py-3" onClick={handleFinalize}>
            Finalize &amp; Record Sale
          </button>
        </div>
      </div>
    </div>
  );
}


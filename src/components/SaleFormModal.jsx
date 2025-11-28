import { useEffect, useMemo, useRef, useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);
const createEmptyItem = () => ({
  productId: '',
  unitName: '',
  quantity: '1',
  unitPrice: '0',
});

export default function SaleFormModal({
  title,
  mode = 'create',
  initialValues = null,
  customers = [],
  products = [],
  users = [],
  branches = [],
  currentUserId = null,
  currentBranchId = null,
  onSubmit,
  onCancel,
}) {
  const mountedRef = useRef(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});

  const initialSeed = initialValues ?? {};

  const [formState, setFormState] = useState(() => ({
    customerId: initialSeed.customerId != null ? String(initialSeed.customerId) : '',
    salesPersonId: initialSeed.salesPersonId != null
      ? String(initialSeed.salesPersonId)
      : currentUserId != null
        ? String(currentUserId)
        : '',
    saleType: initialSeed.saleType ?? 'Cash',
    date: initialSeed.date ?? today(),
    discount: initialSeed.discount != null ? String(initialSeed.discount) : '0',
    taxRate: initialSeed.taxRate != null ? String(initialSeed.taxRate) : '5',
    notes: initialSeed.notes ?? '',
    branchId: initialSeed.branchId != null
      ? String(initialSeed.branchId)
      : currentBranchId != null
        ? String(currentBranchId)
        : '',
  }));

  const [items, setItems] = useState(() => {
    if (Array.isArray(initialSeed.items) && initialSeed.items.length) {
      return initialSeed.items.map((item) => ({
        productId: item.productId != null ? String(item.productId) : '',
        unitName: item.unitName ?? '',
        quantity: item.quantity != null ? String(item.quantity) : '1',
        unitPrice: item.unitPrice != null ? String(item.unitPrice) : '0',
      }));
    }
    return [createEmptyItem()];
  });

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    setFormState({
      customerId: initialValues.customerId != null ? String(initialValues.customerId) : '',
      salesPersonId: initialValues.salesPersonId != null
        ? String(initialValues.salesPersonId)
        : currentUserId != null
          ? String(currentUserId)
          : '',
      saleType: initialValues.saleType ?? 'Cash',
      date: initialValues.date ?? today(),
      discount: initialValues.discount != null ? String(initialValues.discount) : '0',
      taxRate: initialValues.taxRate != null ? String(initialValues.taxRate) : '5',
      notes: initialValues.notes ?? '',
      branchId: initialValues.branchId != null
        ? String(initialValues.branchId)
        : currentBranchId != null
          ? String(currentBranchId)
          : '',
    });

    setItems(
      Array.isArray(initialValues.items) && initialValues.items.length
        ? initialValues.items.map((item) => ({
            productId: item.productId != null ? String(item.productId) : '',
            unitName: item.unitName ?? '',
            quantity: item.quantity != null ? String(item.quantity) : '1',
            unitPrice: item.unitPrice != null ? String(item.unitPrice) : '0',
          }))
        : [createEmptyItem()],
    );

    setErrors({});
    setSubmitError('');
  }, [initialValues, currentUserId]);

  const customerOptions = useMemo(() => customers.filter((customer) => customer?.id != null), [customers]);
  const productOptions = useMemo(() => products.filter((product) => product?.id != null), [products]);
  const userOptions = useMemo(() => users.filter((user) => user?.id != null), [users]);

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400/40';
  const errorClass = 'text-xs text-red-400';

  const parsedItems = useMemo(() => {
    return items.map((item) => {
      const product = productOptions.find((option) => String(option.id) === item.productId) ?? null;
      const productId = product?.id ?? (item.productId ? Number(item.productId) : null);
      const quantityValue = Number.parseFloat(item.quantity || '0');
      const unitPriceValue = Number.parseFloat(item.unitPrice || '0');
      const sellingUnits = Array.isArray(product?.sellingUnits) ? product.sellingUnits : [];
      const selectedUnit = sellingUnits.find((unit) => unit && unit.name === item.unitName)
        ?? sellingUnits[0]
        ?? null;

      const conversionValue = Number.parseFloat(selectedUnit?.conversion);
      return {
        productId,
        product,
        quantity: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 0,
        unitPrice: Number.isFinite(unitPriceValue) && unitPriceValue >= 0 ? unitPriceValue : 0,
        unitName: selectedUnit?.name ?? item.unitName ?? '',
        conversion: Number.isFinite(conversionValue) && conversionValue > 0 ? conversionValue : 1,
      };
    });
  }, [items, productOptions]);

  const subtotal = useMemo(
    () => parsedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [parsedItems],
  );

  const discountValue = useMemo(() => {
    const discount = Number.parseFloat(formState.discount || '0');
    if (!Number.isFinite(discount) || discount < 0) {
      return 0;
    }
    return Math.min(discount, subtotal);
  }, [formState.discount, subtotal]);

  const taxableAmount = useMemo(() => subtotal - discountValue, [subtotal, discountValue]);

  const taxAmount = useMemo(() => {
    const taxRate = Number.parseFloat(formState.taxRate || '0');
    if (!Number.isFinite(taxRate) || taxRate < 0) {
      return 0;
    }
    return taxableAmount * (taxRate / 100);
  }, [formState.taxRate, taxableAmount]);

  const grandTotal = useMemo(() => taxableAmount + taxAmount, [taxableAmount, taxAmount]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const nextItem = { ...next[index], [field]: value };

      if (field === 'productId') {
        const product = productOptions.find((option) => String(option.id) === value);
        if (product) {
          const sellingUnits = Array.isArray(product.sellingUnits) ? product.sellingUnits : [];
          const defaultUnit = sellingUnits[0] ?? null;
          nextItem.unitName = defaultUnit?.name ?? '';
          nextItem.unitPrice = String(defaultUnit?.price ?? 0);
          if (!nextItem.quantity || Number.parseFloat(nextItem.quantity) <= 0) {
            nextItem.quantity = '1';
          }
        } else {
          nextItem.unitName = '';
          nextItem.unitPrice = '0';
        }
      }

      next[index] = nextItem;
      return next;
    });
  };

  const handleItemUnitChange = (index, unitName) => {
    setItems((prev) => {
      const next = [...prev];
      const existing = next[index] ?? {};
      const nextItem = { ...existing, unitName };
      const product = productOptions.find((option) => String(option.id) === existing.productId);
      if (product) {
        const sellingUnits = Array.isArray(product.sellingUnits) ? product.sellingUnits : [];
        const selectedUnit = sellingUnits.find((unit) => unit && unit.name === unitName) ?? null;
        if (selectedUnit) {
          nextItem.unitPrice = String(selectedUnit.price ?? 0);
        }
      }
      next[index] = nextItem;
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formState.customerId) {
      nextErrors.customerId = 'Customer is required.';
    }
    if (!formState.salesPersonId) {
      nextErrors.salesPersonId = 'Sales person is required.';
    }
    if (!formState.date) {
      nextErrors.date = 'Date is required.';
    }
    const validItems = parsedItems.filter((item) => item.productId != null && item.quantity > 0);
    if (!validItems.length) {
      nextErrors.items = 'Add at least one product with quantity.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) {
      return;
    }

    const normalizeNumber = (value, fallback = 0) => {
      const parsed = Number.parseFloat(value ?? '');
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const normalizedItems = parsedItems
      .filter((item) => item.productId != null && item.quantity > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitName: item.unitName ?? '',
        conversion: item.conversion ?? 1,
        baseQuantity: item.quantity * (item.conversion ?? 1),
      }));

    const branchId = formState.branchId ? Number(formState.branchId) : null;
    const normalizedSale = {
      ...initialValues,
      customerId: Number(formState.customerId),
      salesPersonId: Number(formState.salesPersonId),
      saleType: formState.saleType,
      date: formState.date,
      items: normalizedItems,
      discount: discountValue,
      taxRate: normalizeNumber(formState.taxRate, 0),
      taxAmount,
      subtotal,
      total: grandTotal,
      notes: formState.notes.trim(),
      branchId,
      vanId: branchId,
    };

    setSubmitting(true);

    try {
      await Promise.resolve(onSubmit?.(normalizedSale));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setSubmitError(error?.message ?? 'Failed to save sale. Please try again.');
      setSubmitting(false);
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">{title ?? (mode === 'edit' ? 'Edit Sale' : 'Add Sale')}</h3>
        <p className="text-gray-400 text-sm">
          {mode === 'edit'
            ? 'Update the transaction so reporting stays accurate.'
            : 'Record a sale manually to keep reporting in sync.'}
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Customer</span>
            <select
              name="customerId"
              value={formState.customerId}
              onChange={handleFormChange}
              className={`${inputClass} ${errors.customerId ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              required
            >
              <option value="" disabled>
                Select customer
              </option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customerId ? <span className={errorClass}>{errors.customerId}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Salesperson</span>
            <select
              name="salesPersonId"
              value={formState.salesPersonId}
              onChange={handleFormChange}
              className={`${inputClass} ${errors.salesPersonId ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              required
            >
              <option value="" disabled>
                Select team member
              </option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.username ?? `User ${user.id}`}
                </option>
              ))}
            </select>
            {errors.salesPersonId ? <span className={errorClass}>{errors.salesPersonId}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Van / Branch</span>
            {branchOptions.length ? (
              <select
                name="branchId"
                value={formState.branchId}
                onChange={handleFormChange}
                className={inputClass}
              >
                <option value="">General Warehouse</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name ?? `Branch ${branch.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 px-3 py-2 text-xs text-gray-400">
                No branches configured. Stock reduction is global.
              </div>
            )}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Sale Type</span>
            <select
              name="saleType"
              value={formState.saleType}
              onChange={handleFormChange}
              className={inputClass}
            >
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Date</span>
            <input
              type="date"
              name="date"
              value={formState.date}
              onChange={handleFormChange}
              className={`${inputClass} ${errors.date ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              required
            />
            {errors.date ? <span className={errorClass}>{errors.date}</span> : null}
          </label>
        </div>

        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Line Items</h4>
            <button
              type="button"
              className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/20"
              onClick={handleAddItem}
            >
              <i className="fas fa-plus mr-1" />Add Item
            </button>
          </header>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-start rounded-lg border border-gray-700/70 bg-gray-900/40 p-3">
                <div>
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Product</span>
                    <select
                      value={item.productId}
                      onChange={(event) => handleItemChange(index, 'productId', event.target.value)}
                      className={`${inputClass} ${errors.items ? 'border-red-500/60 focus:ring-red-500' : ''}`}
                    >
                      <option value="">
                        Choose product
                      </option>
                      {productOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Unit</span>
                    <select
                      value={item.unitName || parsedItems[index].unitName || ''}
                      onChange={(event) => handleItemUnitChange(index, event.target.value)}
                      className={inputClass}
                      disabled={!parsedItems[index].product}
                    >
                      {!parsedItems[index].product ? (
                        <option value="">Select product first</option>
                      ) : null}
                      {Array.isArray(parsedItems[index].product?.sellingUnits)
                        ? parsedItems[index].product.sellingUnits.map((unit) => (
                          <option key={unit.name} value={unit.name}>
                            {unit.name}
                          </option>
                        ))
                        : null}
                    </select>
                  </label>
                </div>

                <div>
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div>
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Unit Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) => handleItemChange(index, 'unitPrice', event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <div className="text-sm font-semibold text-white">
                    {(parsedItems[index].quantity * parsedItems[index].unitPrice).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:text-white"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    title="Remove item"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {errors.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Discount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="discount"
              value={formState.discount}
              onChange={handleFormChange}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">VAT %</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="taxRate"
              value={formState.taxRate}
              onChange={handleFormChange}
              className={inputClass}
            />
          </label>

          <div className="rounded-lg border border-gray-700/70 bg-gray-900/40 p-4 text-sm text-gray-300 md:col-span-2">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="text-white font-medium">{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span>Discount</span>
              <span className="text-white font-medium">- {discountValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span>VAT</span>
              <span className="text-white font-medium">{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mt-3 text-base font-semibold text-white">
              <span>Total</span>
              <span>{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Notes</span>
          <textarea
            name="notes"
            value={formState.notes}
            onChange={handleFormChange}
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Optional internal notes"
          />
        </label>

        {submitError ? (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onCancel?.()}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="perplexity-button px-4 py-2 text-sm font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Sale'}
          </button>
        </div>
      </form>
    </div>
  );
}

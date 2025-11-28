import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppActions } from '../context/AppContext.jsx';

const ORDER_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Ordered', label: 'Ordered' },
  { value: 'Received', label: 'Received' },
];

function createEmptyItem() {
  return {
    productId: '',
    unitName: '',
    conversion: 1,
    quantity: '1',
    cost: '0',
  };
}

export default function PurchaseOrderFormModal({
  title,
  mode = 'create',
  initialValues = null,
  products = [],
  onCancel,
}) {
  const {
    addPurchaseOrder,
    updatePurchaseOrder,
    closeModal,
    pushNotification,
  } = useAppActions();
  const mountedRef = useRef(true);
  const safeInitialValues = useMemo(() => initialValues ?? {}, [initialValues]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formState, setFormState] = useState(() => ({
    supplierName: safeInitialValues.supplierName ?? '',
    orderDate: safeInitialValues.orderDate ?? new Date().toISOString().slice(0, 10),
    expectedDate: safeInitialValues.expectedDate ?? '',
    status: safeInitialValues.status ?? 'Draft',
  }));
  const [items, setItems] = useState(() => {
    if (Array.isArray(safeInitialValues.items) && safeInitialValues.items.length) {
      return safeInitialValues.items.map((item) => ({
        productId: item.productId != null ? String(item.productId) : '',
        unitName: item.unitName ?? '',
        conversion: item.conversion != null ? String(item.conversion) : '1',
        quantity: item.quantity != null ? String(item.quantity) : '1',
        cost: item.cost != null ? String(item.cost) : '0',
      }));
    }
    return [createEmptyItem()];
  });
  const [errors, setErrors] = useState({});

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    setFormState({
      supplierName: safeInitialValues.supplierName ?? '',
      orderDate: safeInitialValues.orderDate ?? new Date().toISOString().slice(0, 10),
      expectedDate: safeInitialValues.expectedDate ?? '',
      status: safeInitialValues.status ?? 'Draft',
    });
    setItems(
      Array.isArray(safeInitialValues.items) && safeInitialValues.items.length
        ? safeInitialValues.items.map((item) => ({
            productId: item.productId != null ? String(item.productId) : '',
            unitName: item.unitName ?? '',
            conversion: item.conversion != null ? String(item.conversion) : '1',
            quantity: item.quantity != null ? String(item.quantity) : '1',
            cost: item.cost != null ? String(item.cost) : '0',
          }))
        : [createEmptyItem()],
    );
    setErrors({});
    setSubmitError('');
  }, [safeInitialValues]);

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/40';
  const errorClass = 'text-xs text-red-400';

  const productOptions = useMemo(() => products.filter((product) => product?.id != null), [products]);

  const parsedItems = useMemo(
    () => items.map((item) => {
      const product = productOptions.find((option) => String(option.id) === item.productId) ?? null;
      const quantity = Number.parseFloat(item.quantity || '0');
      const cost = Number.parseFloat(item.cost || '0');
      const conversion = Number.parseFloat(item.conversion || '1');
      return {
        product,
        productId: product?.id ?? (item.productId ? Number(item.productId) : null),
        unitName: item.unitName,
        conversion: Number.isFinite(conversion) && conversion > 0 ? conversion : 1,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
        cost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      };
    }),
    [items, productOptions],
  );

  const totalCost = useMemo(
    () => parsedItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0),
    [parsedItems],
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((previous) => {
      const next = [...previous];
      const nextItem = { ...next[index], [field]: value };

      if (field === 'productId') {
        const product = productOptions.find((option) => String(option.id) === value);
        if (product) {
          const units = Array.isArray(product.sellingUnits) ? product.sellingUnits : [];
          const defaultUnit = units[0] ?? null;
          nextItem.unitName = defaultUnit?.name ?? product.baseUnit ?? '';
          nextItem.conversion = defaultUnit?.conversion != null ? String(defaultUnit.conversion) : '1';
        } else {
          nextItem.unitName = '';
        }
      }

      next[index] = nextItem;
      return next;
    });
    setErrors((previous) => ({ ...previous, items: undefined }));
  };

  const handleItemUnitChange = (index, unitName) => {
    setItems((previous) => {
      const next = [...previous];
      const existing = next[index] ?? {};
      const product = productOptions.find((option) => String(option.id) === existing.productId);
      if (product) {
        const units = Array.isArray(product.sellingUnits) ? product.sellingUnits : [];
        const selectedUnit = units.find((unit) => unit && unit.name === unitName) ?? null;
        if (selectedUnit) {
          next[index] = {
            ...existing,
            unitName: selectedUnit.name,
            conversion: selectedUnit.conversion != null ? String(selectedUnit.conversion) : '1',
          };
        } else {
          next[index] = { ...existing, unitName, conversion: existing.conversion };
        }
      } else {
        next[index] = { ...existing, unitName };
      }
      return next;
    });
    setErrors((previous) => ({ ...previous, items: undefined }));
  };

  const handleAddItem = () => {
    setItems((previous) => [...previous, createEmptyItem()]);
  };

  const handleRemoveItem = (index) => {
    setItems((previous) => {
      if (previous.length === 1) {
        return previous;
      }
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const validate = () => {
    const nextErrors = {};
    if (!formState.supplierName.trim()) {
      nextErrors.supplierName = 'Supplier name is required.';
    }
    if (!formState.orderDate) {
      nextErrors.orderDate = 'Order date is required.';
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

    const purchaseOrder = {
      id: safeInitialValues.id ?? Date.now(),
      supplierName: formState.supplierName.trim(),
      orderDate: formState.orderDate,
      expectedDate: formState.expectedDate || null,
      status: formState.status,
      paymentStatus: safeInitialValues.paymentStatus ?? 'Unpaid',
      totalCost,
      items: parsedItems
        .filter((item) => item.productId != null && item.quantity > 0)
        .map((item) => ({
          productId: item.productId,
          unitName: item.unitName ?? '',
          conversion: item.conversion ?? 1,
          quantity: item.quantity,
          cost: item.cost,
        })),
      createdAt: safeInitialValues.createdAt ?? new Date().toISOString(),
    };

    setSubmitting(true);

    try {
      if (mode === 'edit') {
        updatePurchaseOrder?.(purchaseOrder);
      } else {
        addPurchaseOrder?.(purchaseOrder);
      }
      const successMessage = mode === 'edit'
        ? 'Purchase order updated successfully.'
        : 'Purchase order created successfully.';
      if (mountedRef.current) {
        setSubmitting(false);
      }
      pushNotification?.({
        type: 'success',
        message: successMessage,
      });
      if (typeof onCancel === 'function') {
        onCancel();
      }
      closeModal?.();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setSubmitting(false);
      setSubmitError(error?.message ?? 'Unable to save purchase order.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">{title ?? (mode === 'edit' ? 'Edit Purchase Order' : 'Create Purchase Order')}</h3>
        <p className="text-gray-400 text-sm">
          {mode === 'edit'
            ? 'Update supplier orders to keep fulfillment on track.'
            : 'Record a new purchase order and manage inbound inventory.'}
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Supplier Name</span>
            <input
              type="text"
              name="supplierName"
              value={formState.supplierName}
              onChange={handleFormChange}
              className={`${inputClass} ${errors.supplierName ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g. Global Supplies Co."
            />
            {errors.supplierName ? <span className={errorClass}>{errors.supplierName}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Status</span>
            <select
              name="status"
              value={formState.status}
              onChange={handleFormChange}
              className={inputClass}
            >
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Order Date</span>
            <input
              type="date"
              name="orderDate"
              value={formState.orderDate}
              onChange={handleFormChange}
              className={`${inputClass} ${errors.orderDate ? 'border-red-500/60 focus:ring-red-500' : ''}`}
            />
            {errors.orderDate ? <span className={errorClass}>{errors.orderDate}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Expected Delivery</span>
            <input
              type="date"
              name="expectedDate"
              value={formState.expectedDate}
              onChange={handleFormChange}
              className={inputClass}
            />
          </label>
        </div>

        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Items</h4>
            <button
              type="button"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
              onClick={handleAddItem}
            >
              <i className="fas fa-plus mr-1" />Add Item
            </button>
          </header>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_auto] items-start rounded-lg border border-gray-700/70 bg-gray-900/40 p-3">
                <label className="flex flex-col gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-300">Product</span>
                  <select
                    value={item.productId}
                    onChange={(event) => handleItemChange(index, 'productId', event.target.value)}
                    className={`${inputClass} ${errors.items ? 'border-red-500/60 focus:ring-red-500' : ''}`}
                  >
                    <option value="">Select product</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-300">Unit</span>
                  <select
                    value={item.unitName}
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

                <label className="flex flex-col gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-300">Cost</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.cost}
                    onChange={(event) => handleItemChange(index, 'cost', event.target.value)}
                    className={inputClass}
                  />
                </label>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-40"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {errors.items ? <div className="text-xs text-red-400">{errors.items}</div> : null}
        </section>

        <div className="rounded-lg border border-gray-700/70 bg-gray-900/40 p-4 text-sm text-gray-300">
          <div className="flex items-center justify-between">
            <span>Items</span>
            <span className="text-white font-medium">{parsedItems.length}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span>Estimated Cost</span>
            <span className="text-white font-semibold">
              {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {submitError ? (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => {
              if (typeof onCancel === 'function') {
                onCancel();
              } else {
                closeModal?.();
              }
            }}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="perplexity-button px-4 py-2 text-sm font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

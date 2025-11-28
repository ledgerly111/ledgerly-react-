import { useMemo, useState } from 'react';

const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/40';
const errorClass = 'text-xs text-red-400 mt-1';

export default function ReceivePurchaseOrderModal({
  purchaseOrder,
  products = [],
  branches = [],
  onCancel,
  onSubmit,
}) {
  const poItems = Array.isArray(purchaseOrder?.items) ? purchaseOrder.items : [];
  const branchOptions = Array.isArray(branches) ? branches : [];
  const [selectedVanId, setSelectedVanId] = useState(() => {
    if (branchOptions.length === 1) return branchOptions[0].id;
    const defaultBranch = branchOptions.find((branch) => branch.isDefault) ?? branchOptions[0];
    return defaultBranch?.id ?? '';
  });
  const [rows, setRows] = useState(() => poItems.map((item) => ({
    expiryDate: '',
    lotNumber: '',
    productId: item?.productId ?? null,
  })));
  const [errors, setErrors] = useState({});
  const hasItems = poItems.length > 0;

  const resolvedItems = useMemo(() => poItems.map((item, index) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const conversion = Number(item?.conversion) || 1;
    const quantity = (Number(item?.quantity) || 0) * conversion;
    return {
      index,
      productId: item.productId,
      productName: product?.name ?? `Product #${item.productId}`,
      quantity,
      unitName: item.unitName || product?.unit || 'unit',
    };
  }), [poItems, products]);

  const handleRowChange = (rowIndex, field, value) => {
    setRows((previous) => {
      const next = previous.slice();
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
    setErrors((previous) => ({
      ...previous,
      [`row-${rowIndex}-${field}`]: undefined,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!hasItems) {
      onCancel?.();
      return;
    }
    const newErrors = {};
    const batches = resolvedItems.map((item, index) => {
      const quantity = item.quantity;
      const expiryDate = rows[index]?.expiryDate;
      const lotNumber = rows[index]?.lotNumber?.trim() || null;
      if (!expiryDate) {
        newErrors[`row-${index}-expiryDate`] = 'Expiry date required';
      }
      return {
        productId: item.productId,
        quantity,
        expiryDate,
        lotNumber,
        vanId: selectedVanId || null,
      };
    }).filter((batch) => batch.productId && batch.quantity > 0);

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    if (!batches.length) {
      setErrors({ form: 'No valid items to receive.' });
      return;
    }

    onSubmit?.({
      purchaseOrderId: purchaseOrder?.id,
      batches,
      vanId: selectedVanId || null,
      receivedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 text-sm text-gray-200">
      <div>
        <h2 className="text-xl font-semibold text-white">Receive Purchase Order</h2>
        <p className="text-gray-400 text-sm">
          Record where this stock is going and capture expiry information so your vans stay compliant.
        </p>
      </div>

      {branchOptions.length > 0 ? (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-gray-400">Assign to Van / Branch</label>
          <select
            className={inputClass}
            value={selectedVanId}
            onChange={(event) => setSelectedVanId(event.target.value)}
          >
            <option value="">Select destination</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name ?? `Van ${branch.id}`}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-amber-400">
          No vans or branches configured yet. Stock will be received without a destination.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {resolvedItems.map((item) => (
            <div
              key={`${item.productId}-${item.index}`}
              className="rounded-2xl border border-gray-700/60 bg-gray-900/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{item.productName}</p>
                  <p className="text-xs text-gray-400">
                    Qty: {item.quantity} {item.unitName}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-400">Expiry Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={rows[item.index]?.expiryDate ?? ''}
                    onChange={(event) => handleRowChange(item.index, 'expiryDate', event.target.value)}
                    required
                  />
                  {errors[`row-${item.index}-expiryDate`] && (
                    <p className={errorClass}>{errors[`row-${item.index}-expiryDate`]}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-400">Lot / Batch Number</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={rows[item.index]?.lotNumber ?? ''}
                    onChange={(event) => handleRowChange(item.index, 'lotNumber', event.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {errors.form && <p className={errorClass}>{errors.form}</p>}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
            disabled={!hasItems}
          >
            Record Receipt
          </button>
        </div>
      </form>
    </div>
  );
}

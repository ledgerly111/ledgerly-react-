import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';

export default function RecordPaymentModal({ purchaseOrder, onCancel, onConfirm, formatValue }) {
  const { chartOfAccounts = [] } = useAppState();

  const assetAccounts = useMemo(
    () => chartOfAccounts.filter((account) => (account.type ?? '').toLowerCase() === 'asset'),
    [chartOfAccounts],
  );

  const derivedTotals = useMemo(() => {
    if (!purchaseOrder) {
      return { totalCost: 0 };
    }
    if (purchaseOrder.totalCost != null) {
      return { totalCost: Number(purchaseOrder.totalCost) || 0 };
    }
    const totalCost = (purchaseOrder.items ?? []).reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0;
      const cost = Number(item?.cost) || 0;
      return sum + quantity * cost;
    }, 0);
    return { totalCost };
  }, [purchaseOrder]);

  const initialDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [paymentDate, setPaymentDate] = useState(initialDate);
  const [paymentAmount, setPaymentAmount] = useState(derivedTotals.totalCost.toString());
  const [paymentAccountCode, setPaymentAccountCode] = useState(assetAccounts[0]?.code ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (assetAccounts.length && !assetAccounts.some((account) => account.code === paymentAccountCode)) {
      setPaymentAccountCode(assetAccounts[0].code);
    }
  }, [assetAccounts, paymentAccountCode]);

  const resolvedFormat = formatValue ?? ((value) => formatCurrency(value, { showSymbol: true }));

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    const parsedAmount = Number(paymentAmount);
    if (!paymentDate) {
      setError('Select a payment date.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (!paymentAccountCode) {
      setError('Select an asset account to pay from.');
      return;
    }
    onConfirm?.({
      paymentDate,
      paymentAmount: parsedAmount,
      paymentAccountCode,
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h3 className="text-xl font-semibold text-white">Record Payment</h3>
        <p className="text-gray-400 text-sm">
          Confirm payment details for <span className="text-white font-semibold">{purchaseOrder?.supplierName ?? 'Supplier'}</span>
          {' '}({purchaseOrder?.id ? `PO #${purchaseOrder.id}` : 'Draft PO'}).
        </p>
      </header>

      <div className="rounded-lg border border-gray-700/70 bg-gray-900/40 p-4 space-y-2 text-sm text-gray-300">
        <div className="flex items-center justify-between">
          <span>Supplier</span>
          <span className="text-white font-medium">{purchaseOrder?.supplierName ?? 'Unknown Supplier'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Purchase Order</span>
          <span className="text-white font-medium">{purchaseOrder?.id ?? 'Not assigned'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Amount Owed</span>
          <span className="text-white font-semibold">{resolvedFormat(derivedTotals.totalCost)}</span>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Payment Date</span>
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/40"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Payment Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/40"
              required
            />
            <span className="text-xs text-gray-500">Recommended: {resolvedFormat(derivedTotals.totalCost)}</span>
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Payment From</span>
          <select
            value={paymentAccountCode}
            onChange={(event) => setPaymentAccountCode(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/40"
          >
            {assetAccounts.length ? assetAccounts.map((account) => (
              <option key={account.code} value={account.code}>
                {account.name} ({account.code})
              </option>
            )) : (
              <option value="" disabled>No asset accounts available</option>
            )}
          </select>
        </label>

        {error ? (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onCancel?.()}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="perplexity-button px-4 py-2 text-sm font-semibold"
          >
            Confirm Payment
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

export default function ExpenseDeleteModal({ expense, formatAmount, onConfirm, onCancel }) {
  const mountedRef = useRef(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await Promise.resolve(onConfirm?.(expense));
    } catch (err) {
      if (!mountedRef.current) {
        return;
      }
      const message = err?.message ?? 'Failed to delete the expense. Please try again.';
      setError(message);
      setDeleting(false);
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    setDeleting(false);
  };

  const amountText = (() => {
    if (expense?.amount == null) {
      return null;
    }
    if (typeof formatAmount === 'function') {
      return formatAmount(expense.amount);
    }
    const amountNumber = Number(expense.amount);
    if (Number.isFinite(amountNumber)) {
      return amountNumber.toLocaleString();
    }
    return String(expense.amount);
  })();

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h3 className="text-xl font-semibold text-white">Delete Expense</h3>
        <p className="text-gray-400 text-sm">
          This action cannot be undone. The record will be removed from the ledger immediately.
        </p>
      </header>

      <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
        <p className="text-sm text-gray-300">
          You are deleting <span className="font-medium text-white">{expense?.description ?? 'this expense'}</span>
          {' '}dated <span className="font-medium text-white">{expense?.date ? new Date(expense.date).toLocaleDateString() : 'Unknown'}</span>
          {amountText ? (
            <>
              {' '}for <span className="font-medium text-white">{amountText}</span>
            </>
          ) : null}.
        </p>
      </div>

      {error ? <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <button
          type="button"
          className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          onClick={() => onCancel?.()}
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete Expense'}
        </button>
      </div>
    </div>
  );
}

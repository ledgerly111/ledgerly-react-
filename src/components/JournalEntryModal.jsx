import { useCallback, useMemo, useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

const emptyLine = () => ({ accountCode: '', debit: '', credit: '' });

export default function JournalEntryModal({
  title = 'New Journal Entry',
  initialValues = null,
  chartOfAccounts = [],
  onSubmit,
  onCancel,
}) {
  const [formState, setFormState] = useState(() => ({
    date: initialValues?.date ?? today(),
    description: initialValues?.description ?? '',
  }));
  const [lines, setLines] = useState(() => {
    if (Array.isArray(initialValues?.entries) && initialValues.entries.length) {
      return initialValues.entries.map((entry) => ({
        accountCode: entry.accountCode ?? '',
        debit: entry.debit != null ? String(entry.debit) : '',
        credit: entry.credit != null ? String(entry.credit) : '',
      }));
    }
    return [emptyLine(), emptyLine()];
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const accountOptions = useMemo(() => {
    return chartOfAccounts.map((account) => ({
      code: account.code,
      label: `${account.code} · ${account.name}`,
    }));
  }, [chartOfAccounts]);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.debit += Number(line.debit) || 0;
        acc.credit += Number(line.credit) || 0;
        return acc;
      },
      { debit: 0, credit: 0 },
    );
  }, [lines]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01 && totals.debit > 0;

  const handleLineChange = useCallback((index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      if (field === 'accountCode') {
        current.accountCode = value;
      } else if (field === 'debit') {
        current.debit = value;
        if (value && Number(value) !== 0) {
          current.credit = '';
        }
      } else if (field === 'credit') {
        current.credit = value;
        if (value && Number(value) !== 0) {
          current.debit = '';
        }
      }
      next[index] = current;
      return next;
    });
  }, []);

  const handleAddLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const handleRemoveLine = useCallback((index) => {
    setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  }, []);

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400/40';
  const errorClass = 'text-xs text-red-400';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const validationErrors = {};
    if (!formState.date) {
      validationErrors.date = 'Date is required.';
    }
    if (!formState.description.trim()) {
      validationErrors.description = 'Description is required.';
    }

    const normalizedEntries = lines
      .map((line) => ({
        accountCode: String(line.accountCode ?? '').trim(),
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      }))
      .filter((line) => line.accountCode && (line.debit > 0 || line.credit > 0));

    if (normalizedEntries.length < 2) {
      validationErrors.entries = 'Add at least two line items with amounts.';
    }

    const hasInvalidLine = normalizedEntries.some((line) => line.debit > 0 && line.credit > 0);
    if (hasInvalidLine) {
      validationErrors.entries = 'Each line can have either a debit or a credit amount, not both.';
    }

    if (Object.keys(validationErrors).length === 0 && !isBalanced) {
      validationErrors.entries = 'Debits must equal credits before posting.';
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload = {
      date: formState.date,
      description: formState.description.trim(),
      entries: normalizedEntries,
      metadata: { source: 'manual' },
    };

    setSubmitting(true);
    try {
      await Promise.resolve(onSubmit?.(payload));
    } catch (error) {
      setSubmitError(error?.message ?? 'Failed to save journal entry. Please try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">Capture debits and credits to keep the ledger balanced.</p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Entry Date</span>
            <input
              type="date"
              value={formState.date}
              onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
              className={`${inputClass} ${errors.date ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              required
            />
            {errors.date ? <span className={errorClass}>{errors.date}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Description</span>
            <input
              type="text"
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              className={`${inputClass} ${errors.description ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g. Rent payment"
              required
            />
            {errors.description ? <span className={errorClass}>{errors.description}</span> : null}
          </label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Line Items</h4>
            <button
              type="button"
              className="perplexity-button px-3 py-1 text-xs font-semibold"
              onClick={handleAddLine}
            >
              <i className="fas fa-plus mr-1" />Add line
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-3 md:grid-cols-[2fr,1fr,1fr,auto]">
                <div>
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <span className="text-sm font-medium text-gray-300">Account</span>
                    <input
                      list="journal-account-options"
                      value={line.accountCode}
                      onChange={(event) => handleLineChange(index, 'accountCode', event.target.value)}
                      className={`${inputClass} ${errors.entries ? 'border-red-500/60 focus:ring-red-500' : ''}`}
                      placeholder="e.g. 6110"
                      required
                    />
                  </label>
                </div>

                <div>
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <span className="text-sm font-medium text-gray-300">Debit</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(event) => handleLineChange(index, 'debit', event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div>
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <span className="text-sm font-medium text-gray-300">Credit</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(event) => handleLineChange(index, 'credit', event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
                    onClick={() => handleRemoveLine(index)}
                    disabled={lines.length <= 2}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <datalist id="journal-account-options">
            {accountOptions.map((option) => (
              <option key={option.code} value={option.code} label={option.label} />
            ))}
          </datalist>

          <div className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span>Total Debit</span>
              <span className="text-white font-semibold">{totals.debit.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>Total Credit</span>
              <span className="text-white font-semibold">{totals.credit.toFixed(2)}</span>
            </div>
            <div className="mt-3 text-xs font-semibold">
              {isBalanced ? (
                <span className="text-green-400"><i className="fas fa-check-circle mr-1" />Balanced</span>
              ) : (
                <span className="text-yellow-300"><i className="fas fa-exclamation-triangle mr-1" />Debits must equal credits</span>
              )}
            </div>
          </div>

          {errors.entries ? <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errors.entries}</div> : null}
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
            onClick={() => onCancel?.()}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ai-button px-4 py-2 text-sm font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Posting...' : 'Post Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}

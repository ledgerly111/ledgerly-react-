import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../context/AppContext.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseFormModal({
  title,
  mode = 'create',
  initialValues = {},
  users = [],
  currentUserId = null,
  onCancel,
  onSubmit,
}) {
  const { chartOfAccounts = [] } = useAppState();

  const expenseAccounts = useMemo(
    () =>
      chartOfAccounts.filter(
        (account) => (account?.type ?? '').toLowerCase() === 'expense',
      ),
    [chartOfAccounts],
  );

  const mountedRef = useRef(true);

  const initialFormState = useMemo(() => {
    const firstExpenseCode =
      expenseAccounts.find((account) => account?.code != null)?.code ?? '';
    const resolvedCategory = initialValues.category ?? firstExpenseCode;
    const resolvedAddedBy =
      initialValues.addedBy ??
      currentUserId ??
      (users.find((user) => user?.id != null)?.id ?? '');

    return {
      description: initialValues.description ?? '',
      amount:
        initialValues.amount != null ? String(initialValues.amount) : '',
      category:
        resolvedCategory !== '' && resolvedCategory != null
          ? String(resolvedCategory)
          : '',
      date: initialValues.date ?? today(),
      addedBy:
        resolvedAddedBy !== '' && resolvedAddedBy != null
          ? String(resolvedAddedBy)
          : '',
      notes: initialValues.notes ?? '',
    };
  }, [initialValues, currentUserId, users, expenseAccounts]);

  const [formState, setFormState] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  useEffect(() => {
    if (!formState.category && expenseAccounts.length) {
      const firstExpenseCode = expenseAccounts.find(
        (account) => account?.code != null,
      )?.code;
      if (firstExpenseCode != null) {
        setFormState((prev) => ({
          ...prev,
          category: String(firstExpenseCode),
        }));
      }
    }
  }, [expenseAccounts, formState.category]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const categoryOptions = useMemo(() => {
    return expenseAccounts
      .map((account) => {
        if (account?.code == null) {
          return null;
        }
        const code = String(account.code);
        const name = account.name ?? code;
        return {
          value: code,
          label: `${name} (${code})`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [expenseAccounts]);

  const userOptions = useMemo(() => {
    return users.map((user) => ({
      id: user.id,
      name: user.name ?? user.username ?? `User ${user.id}`,
    }));
  }, [users]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formState.description.trim()) {
      newErrors.description = 'Description is required.';
    }
    const amountNumber = Number.parseFloat(formState.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      newErrors.amount = 'Amount must be a positive number.';
    }
    if (!formState.category.trim()) {
      newErrors.category = 'Category is required.';
    }
    if (!formState.date) {
      newErrors.date = 'Date is required.';
    }
    if (!formState.addedBy) {
      newErrors.addedBy = 'Please choose who recorded this expense.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) {
      return;
    }

    const normalizedExpense = {
      ...initialValues,
      description: formState.description.trim(),
      amount: Number.parseFloat(formState.amount),
      category: formState.category.trim(),
      date: formState.date,
      addedBy: formState.addedBy ? Number(formState.addedBy) : null,
      notes: formState.notes.trim(),
    };

    setSubmitting(true);

    try {
      await Promise.resolve(onSubmit?.(normalizedExpense));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      const message = error?.message ?? 'Failed to save expense. Please try again.';
      setSubmitError(message);
      setSubmitting(false);
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    setSubmitting(false);
  };

  const inputClass =
    'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40';
  const errorClass = 'text-xs text-red-400';

  const disableCategorySelection = categoryOptions.length === 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">
          {title ?? (mode === 'edit' ? 'Edit Expense' : 'Add Expense')}
        </h3>
        <p className="text-gray-400 text-sm">
          {mode === 'edit'
            ? 'Update the bill details and save to keep the ledger accurate.'
            : 'Capture a new business cost so reports stay current.'}
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Description</span>
            <input
              type="text"
              name="description"
              value={formState.description}
              onChange={handleInputChange}
              className={`${inputClass} ${
                errors.description ? 'border-red-500/60 focus:ring-red-500' : ''
              }`}
              placeholder="e.g. Office Rent"
              required
            />
            {errors.description ? (
              <span className={errorClass}>{errors.description}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Amount</span>
            <input
              type="number"
              name="amount"
              value={formState.amount}
              onChange={handleInputChange}
              className={`${inputClass} ${
                errors.amount ? 'border-red-500/60 focus:ring-red-500' : ''
              }`}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
            {errors.amount ? <span className={errorClass}>{errors.amount}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Category</span>
            <select
              name="category"
              value={formState.category}
              onChange={handleInputChange}
              className={`${inputClass} ${
                errors.category ? 'border-red-500/60 focus:ring-red-500' : ''
              }`}
              required
              disabled={disableCategorySelection}
            >
              {categoryOptions.length ? (
                categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : (
                <option value="">No expense accounts available</option>
              )}
            </select>
            {errors.category ? (
              <span className={errorClass}>{errors.category}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Recorded Date</span>
            <input
              type="date"
              name="date"
              value={formState.date}
              onChange={handleInputChange}
              className={`${inputClass} ${
                errors.date ? 'border-red-500/60 focus:ring-red-500' : ''
              }`}
              required
            />
            {errors.date ? <span className={errorClass}>{errors.date}</span> : null}
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Recorded By</span>
          <select
            name="addedBy"
            value={formState.addedBy}
            onChange={handleInputChange}
            className={`${inputClass} ${
              errors.addedBy ? 'border-red-500/60 focus:ring-red-500' : ''
            }`}
            required
          >
            <option value="">Select a team member</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {errors.addedBy ? <span className={errorClass}>{errors.addedBy}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Notes</span>
          <textarea
            name="notes"
            value={formState.notes}
            onChange={handleInputChange}
            className={`${inputClass} resize-none`}
            rows={4}
            placeholder="Optional context for this expense"
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
            className="expenses-button px-4 py-2 text-sm font-semibold"
            disabled={submitting || disableCategorySelection}
          >
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAppActions } from '../context/AppContext.jsx';

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'COGS'];
const NORMAL_BALANCES = ['Debit', 'Credit'];

function sanitizeAccount({ code, name, type, normalBalance }) {
  return {
    code: String(code ?? '').trim(),
    name: String(name ?? '').trim(),
    type: String(type ?? 'Asset').trim() || 'Asset',
    normalBalance: String(normalBalance ?? 'Debit').trim() || 'Debit',
  };
}

export default function AccountFormModal({ mode = 'create', initialValues = null, onCancel }) {
  const { addAccount, updateAccount, closeModal, pushNotification } = useAppActions();
  const initialState = useMemo(
    () => sanitizeAccount({
      code: initialValues?.code ?? '',
      name: initialValues?.name ?? '',
      type: initialValues?.type ?? ACCOUNT_TYPES[0],
      normalBalance: initialValues?.normalBalance ?? NORMAL_BALANCES[0],
    }),
    [initialValues],
  );

  const [formState, setFormState] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const availableAccountTypes = useMemo(() => {
    if (!initialValues?.type) {
      return ACCOUNT_TYPES;
    }
    if (ACCOUNT_TYPES.includes(initialValues.type)) {
      return ACCOUNT_TYPES;
    }
    return [...ACCOUNT_TYPES, initialValues.type];
  }, [initialValues?.type]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const nextErrors = {};
    if (!formState.code.trim()) {
      nextErrors.code = 'Account code is required.';
    }
    if (!formState.name.trim()) {
      nextErrors.name = 'Account name is required.';
    }
    if (!formState.type.trim()) {
      nextErrors.type = 'Select an account type.';
    }
    if (!formState.normalBalance.trim()) {
      nextErrors.normalBalance = 'Select a normal balance.';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const account = sanitizeAccount(formState);
    setSubmitting(true);
    try {
      if (mode === 'edit') {
        updateAccount(account);
        pushNotification?.({
          type: 'success',
          message: `Account ${account.code} updated.`,
        });
      } else {
        addAccount(account);
        pushNotification?.({
          type: 'success',
          message: `Account ${account.code} added.`,
        });
      }
      const close = onCancel ?? closeModal;
      close?.();
    } finally {
      setSubmitting(false);
    }
  };

  const readOnlyCode = mode === 'edit';

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-white">
          {mode === 'edit' ? 'Edit Account' : 'Add Account'}
        </h2>
        <p className="text-sm text-gray-400">
          Configure the account code, name, and classification for your chart.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-gray-200">
          <span>Account Code</span>
          <input
            type="text"
            name="code"
            value={formState.code}
            onChange={handleChange}
            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${errors.code ? 'border-red-500/60 focus:ring-red-500' : ''}`}
            placeholder="e.g., 6161"
            readOnly={readOnlyCode}
          />
          {errors.code ? <span className="text-xs text-red-400">{errors.code}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-gray-200">
          <span>Account Name</span>
          <input
            type="text"
            name="name"
            value={formState.name}
            onChange={handleChange}
            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${errors.name ? 'border-red-500/60 focus:ring-red-500' : ''}`}
            placeholder="e.g., Vehicle Fuel"
          />
          {errors.name ? <span className="text-xs text-red-400">{errors.name}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-gray-200">
          <span>Account Type</span>
          <select
            name="type"
            value={formState.type}
            onChange={handleChange}
            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${errors.type ? 'border-red-500/60 focus:ring-red-500' : ''}`}
          >
            {availableAccountTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.type ? <span className="text-xs text-red-400">{errors.type}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-gray-200">
          <span>Normal Balance</span>
          <select
            name="normalBalance"
            value={formState.normalBalance}
            onChange={handleChange}
            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${errors.normalBalance ? 'border-red-500/60 focus:ring-red-500' : ''}`}
          >
            {NORMAL_BALANCES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.normalBalance ? <span className="text-xs text-red-400">{errors.normalBalance}</span> : null}
        </label>
      </div>

      <footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          onClick={() => (onCancel ? onCancel() : closeModal?.())}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="perplexity-button px-4 py-2 text-sm font-semibold disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Account'}
        </button>
      </footer>
    </form>
  );
}

AccountFormModal.propTypes = {
  mode: PropTypes.oneOf(['create', 'edit']),
  initialValues: PropTypes.shape({
    code: PropTypes.string,
    name: PropTypes.string,
    type: PropTypes.string,
    normalBalance: PropTypes.string,
  }),
  onCancel: PropTypes.func,
};

AccountFormModal.defaultProps = {
  mode: 'create',
  initialValues: null,
  onCancel: undefined,
};

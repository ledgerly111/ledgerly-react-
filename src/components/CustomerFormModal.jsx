import { useEffect, useRef, useState } from 'react';

const CUSTOMER_TYPES = [
  { value: 'Business', label: 'Business' },
  { value: 'Individual', label: 'Individual' },
];

export default function CustomerFormModal({
  title,
  mode = 'create',
  initialValues = null,
  onSubmit,
  onCancel,
  ownerOptions = [],
  defaultOwnerId = null,
  canSelectOwner = false,
}) {
  const mountedRef = useRef(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const emptyInitialRef = useRef({});
  const resolvedInitialValues = initialValues ?? emptyInitialRef.current;
  const [formState, setFormState] = useState(() => ({
    name: resolvedInitialValues.name ?? '',
    type: resolvedInitialValues.type ?? 'Business',
    email: resolvedInitialValues.email ?? '',
    phone: resolvedInitialValues.phone ?? '',
    address: resolvedInitialValues.address ?? '',
    taxId: resolvedInitialValues.taxId ?? '',
    creditLimit: resolvedInitialValues.creditLimit != null ? String(resolvedInitialValues.creditLimit) : '',
    balance: resolvedInitialValues.balance != null ? String(resolvedInitialValues.balance) : '',
    notes: resolvedInitialValues.notes ?? '',
    accountOwnerId: resolvedInitialValues.accountOwnerId != null
      ? String(resolvedInitialValues.accountOwnerId)
      : defaultOwnerId != null
        ? String(defaultOwnerId)
        : '',
  }));

  useEffect(() => {
    setFormState({
      name: resolvedInitialValues.name ?? '',
      type: resolvedInitialValues.type ?? 'Business',
      email: resolvedInitialValues.email ?? '',
      phone: resolvedInitialValues.phone ?? '',
      address: resolvedInitialValues.address ?? '',
      taxId: resolvedInitialValues.taxId ?? '',
      creditLimit: resolvedInitialValues.creditLimit != null ? String(resolvedInitialValues.creditLimit) : '',
      balance: resolvedInitialValues.balance != null ? String(resolvedInitialValues.balance) : '',
      notes: resolvedInitialValues.notes ?? '',
      accountOwnerId: resolvedInitialValues.accountOwnerId != null
        ? String(resolvedInitialValues.accountOwnerId)
        : defaultOwnerId != null
          ? String(defaultOwnerId)
          : '',
  });
  setErrors({});
  setSubmitError('');
  }, [resolvedInitialValues, defaultOwnerId]);

  useEffect(() => {
    if (!ownerOptions.length) {
      return;
    }
    setFormState((prev) => {
      if (prev.accountOwnerId) {
        return prev;
      }
      const fallback = defaultOwnerId ?? ownerOptions[0]?.id ?? '';
      return {
        ...prev,
        accountOwnerId: fallback != null ? String(fallback) : '',
      };
    });
  }, [ownerOptions, defaultOwnerId]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400/40';
  const errorClass = 'text-xs text-red-400';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formState.name.trim()) {
      nextErrors.name = 'Customer name is required.';
    }
    if (!formState.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!formState.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    }
    if (ownerOptions.length > 0) {
      const ownerValue = formState.accountOwnerId
        || (defaultOwnerId != null ? String(defaultOwnerId) : '');
      if (!ownerValue) {
        nextErrors.accountOwnerId = 'Select an account owner.';
      }
    }
    const creditLimit = Number.parseFloat(formState.creditLimit || '0');
    if (!Number.isNaN(creditLimit) && creditLimit < 0) {
      nextErrors.creditLimit = 'Credit limit cannot be negative.';
    }
    const balance = Number.parseFloat(formState.balance || '0');
    if (!Number.isNaN(balance) && balance < 0) {
      nextErrors.balance = 'Balance cannot be negative.';
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

    const normalized = {
      ...resolvedInitialValues,
      name: formState.name.trim(),
      type: formState.type,
      email: formState.email.trim(),
      phone: formState.phone.trim(),
      address: formState.address.trim(),
      taxId: formState.taxId.trim(),
      creditLimit: Number.parseFloat(formState.creditLimit || '0'),
      balance: Number.parseFloat(formState.balance || '0'),
      notes: formState.notes.trim(),
      accountOwnerId: Number.isFinite(Number(formState.accountOwnerId))
        ? Number(formState.accountOwnerId)
        : Number.isFinite(Number(defaultOwnerId ?? initialValues.accountOwnerId))
          ? Number(defaultOwnerId ?? initialValues.accountOwnerId)
          : null,
    };

    setSubmitting(true);

    try {
      await Promise.resolve(onSubmit?.(normalized));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setSubmitError(error?.message ?? 'Failed to save customer. Please try again.');
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
        <h3 className="text-xl font-semibold text-white">{title ?? (mode === 'edit' ? 'Edit Customer' : 'Add Customer')}</h3>
        <p className="text-gray-400 text-sm">
          {mode === 'edit'
            ? 'Update contact details and limits for this customer.'
            : 'Create a new customer so sales can track activity.'}
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          {ownerOptions.length > 0 ? (
            <label className="flex flex-col gap-2 text-sm text-gray-300 md:col-span-2">
              <span className="text-sm font-medium text-gray-200">Account Owner</span>
              <select
                name="accountOwnerId"
                value={formState.accountOwnerId}
                onChange={handleChange}
                className={`${inputClass} ${errors.accountOwnerId ? 'border-red-500/60 focus:ring-red-500' : ''}`}
                disabled={!canSelectOwner}
              >
                <option value="">Select owner</option>
                {ownerOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name ?? user.username ?? `User ${user.id}`}
                  </option>
                ))}
              </select>
              {errors.accountOwnerId ? <span className={errorClass}>{errors.accountOwnerId}</span> : null}
            </label>
          ) : null}
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Name</span>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
              className={`${inputClass} ${errors.name ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g. Emirates Tech Solutions"
              required
            />
            {errors.name ? <span className={errorClass}>{errors.name}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Type</span>
            <select
              name="type"
              value={formState.type}
              onChange={handleChange}
              className={inputClass}
            >
              {CUSTOMER_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Email</span>
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
            className={`${inputClass} ${errors.email ? 'border-red-500/60 focus:ring-red-500' : ''}`}
            placeholder="name@company.com"
            required
            />
            {errors.email ? <span className={errorClass}>{errors.email}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Phone</span>
            <input
              type="tel"
              name="phone"
              value={formState.phone}
              onChange={handleChange}
              className={`${inputClass} ${errors.phone ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="+971501234567"
              required
            />
            {errors.phone ? <span className={errorClass}>{errors.phone}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300 md:col-span-2">
            <span className="text-sm font-medium text-gray-200">Address</span>
            <textarea
              name="address"
              value={formState.address}
              onChange={handleChange}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Office location or billing address"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Tax Registration Number</span>
            <input
              type="text"
              name="taxId"
              value={formState.taxId}
              onChange={handleChange}
              className={inputClass}
              placeholder="Optional TRN"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Credit Limit</span>
            <input
              type="number"
              name="creditLimit"
              value={formState.creditLimit}
              onChange={handleChange}
              className={`${inputClass} ${errors.creditLimit ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            {errors.creditLimit ? <span className={errorClass}>{errors.creditLimit}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Current Balance</span>
            <input
              type="number"
              name="balance"
              value={formState.balance}
              onChange={handleChange}
              className={`${inputClass} ${errors.balance ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            {errors.balance ? <span className={errorClass}>{errors.balance}</span> : null}
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Notes</span>
          <textarea
            name="notes"
            value={formState.notes}
            onChange={handleChange}
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Optional relationship context"
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
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}

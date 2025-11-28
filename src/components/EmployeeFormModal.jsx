import { useEffect, useRef, useState } from 'react';

const ROLE_OPTIONS = [
  { value: 'worker', label: 'Worker' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

export default function EmployeeFormModal({
  title,
  mode = 'create',
  initialValues = {},
  onSubmit,
  onCancel,
}) {
  const mountedRef = useRef(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [formState, setFormState] = useState(() => ({
    name: initialValues.name ?? '',
    username: initialValues.username ?? '',
    role: initialValues.role ?? 'worker',
    email: initialValues.email ?? '',
    phone: initialValues.phone ?? '',
    address: initialValues.address ?? '',
    hireDate: initialValues.hireDate ?? '',
    salary: initialValues.salary != null ? String(initialValues.salary) : '',
    commission: initialValues.commission != null ? String(initialValues.commission) : '',
  }));

  useEffect(() => {
    setFormState({
      name: initialValues.name ?? '',
      username: initialValues.username ?? '',
      role: initialValues.role ?? 'worker',
      email: initialValues.email ?? '',
      phone: initialValues.phone ?? '',
      address: initialValues.address ?? '',
      hireDate: initialValues.hireDate ?? '',
      salary: initialValues.salary != null ? String(initialValues.salary) : '',
      commission: initialValues.commission != null ? String(initialValues.commission) : '',
    });
    setErrors({});
    setSubmitError('');
  }, [initialValues]);

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
      nextErrors.name = 'Employee name is required.';
    }
    if (!formState.username.trim()) {
      nextErrors.username = 'Username is required.';
    }
    if (!formState.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!formState.hireDate) {
      nextErrors.hireDate = 'Hire date is required.';
    }
    const salary = Number.parseFloat(formState.salary || '0');
    if (Number.isNaN(salary) || salary < 0) {
      nextErrors.salary = 'Salary must be zero or higher.';
    }
    const commission = formState.commission.trim() === ''
      ? 0
      : Number.parseFloat(formState.commission);
    if (formState.commission.trim() !== '' && (Number.isNaN(commission) || commission < 0)) {
      nextErrors.commission = 'Commission cannot be negative.';
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
      ...initialValues,
      name: formState.name.trim(),
      username: formState.username.trim(),
      role: formState.role,
      email: formState.email.trim(),
      phone: formState.phone.trim(),
      address: formState.address.trim(),
      hireDate: formState.hireDate,
      salary: Number.parseFloat(formState.salary || '0'),
      commission: formState.commission.trim() === ''
        ? initialValues.commission ?? 0
        : Number.parseFloat(formState.commission),
    };

    setSubmitting(true);

    try {
      await Promise.resolve(onSubmit?.(normalized));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setSubmitError(error?.message ?? 'Failed to save employee. Please try again.');
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
        <h3 className="text-xl font-semibold text-white">{title ?? (mode === 'edit' ? 'Edit Employee' : 'Add Employee')}</h3>
        <p className="text-gray-400 text-sm">
          {mode === 'edit'
            ? 'Update access and contact details for this team member.'
            : 'Create a new employee profile so they can access Ledgerly.'}
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Full Name</span>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
              className={`${inputClass} ${errors.name ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g. Sarah Manager"
              required
            />
            {errors.name ? <span className={errorClass}>{errors.name}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Username</span>
            <input
              type="text"
              name="username"
              value={formState.username}
              onChange={handleChange}
              className={`${inputClass} ${errors.username ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="Unique login name"
              required
            />
            {errors.username ? <span className={errorClass}>{errors.username}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Role</span>
            <select
              name="role"
              value={formState.role}
              onChange={handleChange}
              className={inputClass}
            >
              {ROLE_OPTIONS.map((option) => (
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
              className={inputClass}
              placeholder="+971501234567"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Hire Date</span>
            <input
              type="date"
              name="hireDate"
              value={formState.hireDate}
              onChange={handleChange}
              className={`${inputClass} ${errors.hireDate ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              required
            />
            {errors.hireDate ? <span className={errorClass}>{errors.hireDate}</span> : null}
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Address</span>
          <input
            type="text"
            name="address"
            value={formState.address}
            onChange={handleChange}
            className={inputClass}
            placeholder="Business Bay, Dubai"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Annual Salary</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="salary"
              value={formState.salary}
              onChange={handleChange}
              className={`${inputClass} ${errors.salary ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="75000"
              required
            />
            {errors.salary ? <span className={errorClass}>{errors.salary}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Commission (optional)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="commission"
              value={formState.commission}
              onChange={handleChange}
              className={`${inputClass} ${errors.commission ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="0"
            />
            {errors.commission ? <span className={errorClass}>{errors.commission}</span> : null}
          </label>
        </div>

        {submitError ? (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}

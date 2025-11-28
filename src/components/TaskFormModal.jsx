import { useEffect, useMemo, useState } from 'react';

const goalTypeOptions = [
  { value: 'sales', label: 'Revenue (AED)' },
  { value: 'profit', label: 'Profit (AED)' },
  { value: 'count', label: 'Number of Sales' },
];

const reportFrequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'end_of_task', label: 'End of Task' },
];

const defaultForm = {
  title: '',
  description: '',
  dueDate: new Date().toISOString().slice(0, 10),
  goalType: 'sales',
  goalTarget: '0',
  participantLimit: '1',
  accuraBotEnabled: false,
  accuraBotReportFrequency: 'weekly',
};

export default function TaskFormModal({
  title = 'Create Task',
  mode = 'create',
  initialValues = null,
  onSubmit,
  onCancel,
}) {
  const [formState, setFormState] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!initialValues) {
      return;
    }
    setFormState({
      title: initialValues.title ?? defaultForm.title,
      description: initialValues.description ?? defaultForm.description,
      dueDate: initialValues.dueDate ?? defaultForm.dueDate,
      goalType: initialValues.goalType ?? defaultForm.goalType,
      goalTarget: initialValues.goalTarget != null ? String(initialValues.goalTarget) : defaultForm.goalTarget,
      participantLimit: initialValues.participantLimit != null
        ? String(initialValues.participantLimit)
        : defaultForm.participantLimit,
      accuraBotEnabled: Boolean(initialValues.accuraBotEnabled),
      accuraBotReportFrequency: initialValues.accuraBotReportFrequency ?? defaultForm.accuraBotReportFrequency,
    });
    setErrors({});
    setSubmitError('');
  }, [initialValues]);

  const accuraBotEnabled = formState.accuraBotEnabled;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formState.title.trim()) {
      nextErrors.title = 'Task name is required.';
    }
    if (!formState.dueDate) {
      nextErrors.dueDate = 'Due date is required.';
    }
    const parsedGoal = Number.parseFloat(formState.goalTarget ?? '0');
    if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
      nextErrors.goalTarget = 'Goal must be greater than zero.';
    }
    const parsedLimit = Number.parseInt(formState.participantLimit ?? '0', 10);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      nextErrors.participantLimit = 'Participant limit must be at least 1.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const normalizedGoalTypeLabel = useMemo(() => {
    const match = goalTypeOptions.find((option) => option.value === formState.goalType);
    return match?.label ?? goalTypeOptions[0].label;
  }, [formState.goalType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) {
      return;
    }

    const goalTarget = Number.parseFloat(formState.goalTarget ?? '0');
    const participantLimit = Number.parseInt(formState.participantLimit ?? '1', 10);

    const payload = {
      ...(initialValues ?? {}),
      title: formState.title.trim(),
      description: formState.description.trim(),
      dueDate: formState.dueDate,
      goalType: formState.goalType,
      goalTarget: Number.isFinite(goalTarget) ? goalTarget : 0,
      participantLimit: Number.isFinite(participantLimit) && participantLimit > 0 ? participantLimit : 1,
      accuraBotEnabled,
      accuraBotReportFrequency: accuraBotEnabled ? formState.accuraBotReportFrequency : null,
    };

    setSubmitting(true);
    try {
      await Promise.resolve(onSubmit?.(payload));
    } catch (error) {
      setSubmitError(error?.message ?? 'Failed to save task. Please try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400/40';
  const labelClass = 'flex flex-col gap-2 text-sm text-gray-300';
  const errorClass = 'text-xs text-red-400';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-gray-400 text-sm">
          {mode === 'edit'
            ? 'Tidy up the task so the team stays aligned.'
            : 'Create a new collaborative goal for your team.'}
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span className="text-sm font-medium text-gray-200">Task Name</span>
            <input
              type="text"
              name="title"
              value={formState.title}
              onChange={handleChange}
              className={`${inputClass} ${errors.title ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g., Q2 Revenue Sprint"
              required
            />
            {errors.title ? <span className={errorClass}>{errors.title}</span> : null}
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium text-gray-200">Due Date</span>
            <input
              type="date"
              name="dueDate"
              value={formState.dueDate}
              onChange={handleChange}
              className={`${inputClass} ${errors.dueDate ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              required
            />
            {errors.dueDate ? <span className={errorClass}>{errors.dueDate}</span> : null}
          </label>
        </section>

        <label className={labelClass}>
          <span className="text-sm font-medium text-gray-200">Description</span>
          <textarea
            name="description"
            value={formState.description}
            onChange={handleChange}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Give teammates a quick mission brief."
          />
        </label>

        <section className="grid gap-4 md:grid-cols-3">
          <label className={labelClass}>
            <span className="text-sm font-medium text-gray-200">Goal Type</span>
            <select name="goalType" value={formState.goalType} onChange={handleChange} className={inputClass}>
              {goalTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium text-gray-200">Goal Target</span>
            <input
              type="number"
              min="0"
              step="any"
              name="goalTarget"
              value={formState.goalTarget}
              onChange={handleChange}
              className={`${inputClass} ${errors.goalTarget ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder={normalizedGoalTypeLabel}
            />
            {errors.goalTarget ? <span className={errorClass}>{errors.goalTarget}</span> : null}
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium text-gray-200">Participant Limit</span>
            <input
              type="number"
              min="1"
              step="1"
              name="participantLimit"
              value={formState.participantLimit}
              onChange={handleChange}
              className={`${inputClass} ${errors.participantLimit ? 'border-red-500/60 focus:ring-red-500' : ''}`}
            />
            {errors.participantLimit ? <span className={errorClass}>{errors.participantLimit}</span> : null}
          </label>
        </section>

        <section className="rounded-lg border border-gray-700/70 bg-gray-900/40 p-4 space-y-4">
          <label className="flex items-center gap-3 text-sm text-gray-200">
            <input
              type="checkbox"
              name="accuraBotEnabled"
              checked={accuraBotEnabled}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-teal-500 focus:ring-teal-500"
            />
            Enable AccuraBot updates
          </label>

          {accuraBotEnabled ? (
            <label className={labelClass}>
              <span className="text-sm font-medium text-gray-200">Report Frequency</span>
              <select
                name="accuraBotReportFrequency"
                value={formState.accuraBotReportFrequency}
                onChange={handleChange}
                className={inputClass}
              >
                {reportFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>

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
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

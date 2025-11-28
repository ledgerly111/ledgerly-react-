import { useEffect, useMemo, useState } from "react";

function sanitizeInitialValues(source) {
  return {
    to: source?.to != null ? String(source.to) : "",
    subject: source?.subject ?? "",
    content: source?.content ?? "",
  };
}

export default function ComposeMessageModal({
  title = "Compose Message",
  users = [],
  currentUserId = null,
  initialValues = {},
  onSubmit,
  onCancel,
}) {
  const [formState, setFormState] = useState(() => sanitizeInitialValues(initialValues));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormState((prev) => {
      const next = sanitizeInitialValues(initialValues);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [initialValues]);

  const userOptions = useMemo(
    () => users.filter((user) => user.id !== currentUserId),
    [users, currentUserId],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const validationErrors = {};
    if (!formState.to) {
      validationErrors.to = "Select a recipient.";
    }
    if (!formState.subject.trim()) {
      validationErrors.subject = "Subject is required.";
    }
    if (!formState.content.trim()) {
      validationErrors.content = "Message body is required.";
    }
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) {
      return;
    }
    setSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit?.({
          to: Number(formState.to),
          subject: formState.subject.trim(),
          content: formState.content.trim(),
        }),
      );
    } catch (error) {
      setSubmitError(error?.message ?? "Failed to send message. Please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  const inputClass = "w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/40";
  const errorClass = "text-xs text-red-400";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">Reach out to teammates directly from your inbox.</p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">To</span>
          <select
            name="to"
            value={formState.to}
            onChange={handleChange}
            className={`${inputClass} ${errors.to ? 'border-red-500/60 focus:ring-red-500' : ''}`}
          >
            <option value="">Select recipient</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.username ?? `User ${user.id}`}
              </option>
            ))}
          </select>
          {errors.to ? <span className={errorClass}>{errors.to}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Subject</span>
          <input
            type="text"
            name="subject"
            value={formState.subject}
            onChange={handleChange}
            className={`${inputClass} ${errors.subject ? 'border-red-500/60 focus:ring-red-500' : ''}`}
            placeholder="Subject of your message"
          />
          {errors.subject ? <span className={errorClass}>{errors.subject}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Message</span>
          <textarea
            name="content"
            rows={5}
            value={formState.content}
            onChange={handleChange}
            className={`${inputClass} ${errors.content ? 'border-red-500/60 focus:ring-red-500' : ''}`}
            placeholder="Write your message here"
          />
          {errors.content ? <span className={errorClass}>{errors.content}</span> : null}
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
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
}



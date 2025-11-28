import { useEffect, useMemo, useState } from 'react';

export default function TeamFormModal({
  title = 'Create Team',
  users = [],
  currentUserId = null,
  onSubmit,
  onCancel,
}) {
  const [name, setName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState(() => {
    return currentUserId != null ? [String(currentUserId)] : [];
  });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUserId != null) {
      setSelectedMemberIds((prev) => {
        if (prev.includes(String(currentUserId))) {
          return prev;
        }
        return [...prev, String(currentUserId)];
      });
    }
  }, [currentUserId]);

  const userOptions = useMemo(() => {
    return users.map((user) => ({
      id: String(user.id),
      name: user.name ?? user.username ?? `User ${user.id}`,
      role: user.role ?? 'user',
    }));
  }, [users]);

  const toggleMember = (userId) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('Team name is required.');
      return;
    }
    if (!selectedMemberIds.length) {
      setSubmitError('Select at least one team member.');
      return;
    }

    setSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit?.({
          name: trimmedName,
          memberIds: selectedMemberIds.map((value) => Number(value)).filter((value) => Number.isFinite(value)),
        }),
      );
    } catch (error) {
      setSubmitError(error?.message ?? 'Could not create team. Please try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400/40';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">Group teammates under a team to coordinate stock requests and chat.</p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Team Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder="e.g. Downtown Stock Squad"
            required
          />
        </label>

        <div className="space-y-3">
          <span className="block text-sm font-medium text-gray-200">Members</span>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {userOptions.map((user) => {
              const checked = selectedMemberIds.includes(user.id);
              return (
                <label key={user.id} className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/40 px-3 py-2 text-sm text-gray-200">
                  <div>
                    <div className="font-medium text-white">{user.name}</div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">{user.role}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(user.id)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                  />
                </label>
              );
            })}
          </div>
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
            className="perplexity-button px-4 py-2 text-sm font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
}


import { useEffect, useMemo, useState } from 'react';

export default function TeamMembersModal({
  team,
  users = [],
  onSubmit,
  onCancel,
}) {
  const teamName = team?.name ?? 'Team';
  const initialMembers = useMemo(() => {
    const source = Array.isArray(team?.members) ? team.members : [];
    return source.map((value) => String(value));
  }, [team?.members]);

  const [selectedMemberIds, setSelectedMemberIds] = useState(initialMembers);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedMemberIds(initialMembers);
  }, [initialMembers]);

  const userOptions = useMemo(() => {
    return users.map((user) => ({
      id: String(user.id),
      name: user.name ?? user.username ?? `User ${user.id}`,
      role: user.role ?? 'member',
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

    if (!selectedMemberIds.length) {
      setSubmitError('Select at least one team member.');
      return;
    }

    setSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit?.({
          memberIds: selectedMemberIds
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value)),
        }),
      );
    } catch (error) {
      setSubmitError(error?.message ?? 'Unable to update team members.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">Add Members to {teamName}</h3>
        <p className="text-sm text-gray-400">Select the teammates who should be part of this team.</p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <span className="block text-sm font-medium text-gray-200">Available Members</span>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {userOptions.map((user) => {
              const checked = selectedMemberIds.includes(user.id);
              return (
                <label
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/40 px-3 py-2 text-sm text-gray-200"
                >
                  <div>
                    <div className="font-medium text-white">{user.name}</div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">{user.role}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(user.id)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-sky-500 focus:ring-sky-500"
                  />
                </label>
              );
            })}
            {!userOptions.length ? (
              <div className="rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 p-4 text-center text-sm text-gray-400">
                No users available to invite right now.
              </div>
            ) : null}
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
            disabled={submitting || !userOptions.length}
          >
            {submitting ? 'Saving...' : 'Save Members'}
          </button>
        </div>
      </form>
    </div>
  );
}


import { useMemo, useState } from 'react';

export default function TaskAssignModal({
  task,
  branches = [],
  currentUserId = null,
  onAssign,
  onCancel,
}) {
  const manageableBranches = useMemo(() => {
    if (!Number.isFinite(currentUserId)) {
      return [];
    }
    return branches.filter((branch) => Array.isArray(branch.members) && branch.members.includes(currentUserId));
  }, [branches, currentUserId]);

  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (!task?.branchId) {
      return '';
    }
    return String(task.branchId);
  });
  const [error, setError] = useState('');

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400/40';

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedBranchId) {
      setError('Please select a branch to continue.');
      return;
    }
    setError('');
    onAssign?.(Number(selectedBranchId));
  };

  if (!manageableBranches.length) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h3 className="text-xl font-semibold text-white">Assign Task to a Branch</h3>
          <p className="text-gray-400 text-sm">You need branch access before routing this task.</p>
        </header>

        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
          <p className="font-semibold">No eligible branches</p>
          <p className="mt-1 text-yellow-100/80">
            Join or create a branch first, then try assigning "{task?.title}" again.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onCancel?.()}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">Assign Task to a Branch</h3>
        <p className="text-gray-400 text-sm">
          Route <span className="text-white font-semibold">{task?.title}</span> to one of your managed branches.
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Branch</span>
          <select
            value={selectedBranchId}
            onChange={(event) => setSelectedBranchId(event.target.value)}
            className={inputClass}
            required
          >
            <option value="">Select branch...</option>
            {manageableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {error ? <span className="text-xs text-red-400">{error}</span> : null}
        </label>

        <div className="rounded-lg border border-gray-700/60 bg-gray-900/40 p-4 text-sm text-gray-300">
          <p className="font-semibold text-white">Reminder</p>
          <p className="mt-1 text-gray-400">
            Once assigned, branch teammates can see this task and join it from their dashboard.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onCancel?.()}
          >
            Cancel
          </button>
          <button type="submit" className="perplexity-button px-4 py-2 text-sm font-semibold">
            Assign Task
          </button>
        </div>
      </form>
    </div>
  );
}

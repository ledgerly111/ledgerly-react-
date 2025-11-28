export default function TaskDeleteModal({ task, onConfirm, onCancel }) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">Delete Task</h3>
        <p className="text-gray-400 text-sm">
          This permanently removes <span className="text-white font-semibold">{task?.title}</span> and its personal goals.
        </p>
      </header>

      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-200">
        <p className="font-semibold">Heads up</p>
        <p className="mt-1 text-red-100/80">
          Participants will lose progress tracking for this objective. This action cannot be undone.
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
        <button
          type="button"
          className="rounded-lg border border-red-500 bg-red-600/80 px-4 py-2 text-sm font-semibold text-red-50 transition-colors hover:bg-red-600"
          onClick={() => onConfirm?.()}
        >
          Delete Task
        </button>
      </div>
    </div>
  );
}

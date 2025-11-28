import { useEffect, useRef, useState } from 'react';

export default function EmployeeDeleteModal({ employee, onConfirm, onCancel }) {
  const mountedRef = useRef(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await Promise.resolve(onConfirm?.(employee));
    } catch (err) {
      if (!mountedRef.current) {
        return;
      }
      setError(err?.message ?? 'Failed to delete the employee. Please try again.');
      setDeleting(false);
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    setDeleting(false);
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h3 className="text-xl font-semibold text-white">Delete Employee</h3>
        <p className="text-gray-400 text-sm">
          This team member will lose access to Ledgerly and any branch assignments will be removed.
        </p>
      </header>

      <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-gray-300">
        Remove <span className="font-medium text-white">{employee?.name ?? 'this employee'}</span>
        {employee?.email ? (
          <>
            {' '}({employee.email})
          </>
        ) : null}?
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <button
          type="button"
          className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          onClick={() => onCancel?.()}
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete Employee'}
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';

export default function SupervisionRequestModal({ managerId }) {
  const { users = [], supervisionLinks = [], currentUser } = useAppState();
  const { closeModal, createSupervisionRequest, pushNotification } = useAppActions();

  const managerRecord = useMemo(() => users.find((user) => String(user?.id) === String(managerId)), [users, managerId]);
  const managerRole = managerRecord?.role ?? currentUser?.role ?? 'manager';

  const disallowedIds = useMemo(() => {
    const blocked = new Set([Number(managerId)]);
    supervisionLinks.forEach((link) => {
      if (
        String(link?.managerId) === String(managerId)
        && ['pending', 'active'].includes(link?.status)
      ) {
        blocked.add(Number(link.employeeId));
      }
    });
    return blocked;
  }, [supervisionLinks, managerId]);

  const eligibleEmployees = useMemo(
    () => users.filter((user) => {
      if (user?.id == null) {
        return false;
      }
      if (disallowedIds.has(Number(user.id))) {
        return false;
      }
      if (managerRole !== 'admin' && user.role !== 'worker') {
        return false;
      }
      return true;
    }),
    [users, disallowedIds, managerRole],
  );

  const [employeeId, setEmployeeId] = useState(eligibleEmployees[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!employeeId) {
      setLocalError('Select an employee to supervise.');
      return;
    }
    createSupervisionRequest({
      managerId,
      employeeId: Number(employeeId),
      notes: note.trim(),
      createdBy: currentUser?.id ?? managerId,
    });
    const selectedEmployee = eligibleEmployees.find((candidate) => String(candidate.id) === String(employeeId));
    pushNotification({
      type: 'success',
      message: selectedEmployee
        ? `Supervision invitation sent to ${selectedEmployee.name}.`
        : 'Supervision invitation created.',
    });
    closeModal();
  };

  const emptyState = eligibleEmployees.length === 0;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <h3 className="text-xl font-semibold text-white mb-1">Add Employee to Supervision</h3>
        <p className="text-sm text-gray-400">
          Select an employee to invite into {managerRole === 'admin' ? 'administrator' : 'manager'} supervision. The employee must accept before you can view their detailed activity.
        </p>
      </div>

      {emptyState ? (
        <div className="rounded-xl border border-gray-700/80 bg-gray-900/70 p-6 text-center text-gray-400">
          Everyone eligible for this manager is already in supervision or has a pending invite.
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm text-gray-300">
            Employee
            <select
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setLocalError('');
              }}
            >
              {eligibleEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} · {employee.role}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-gray-300">
            Message to employee (optional)
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              rows="4"
              placeholder="Share why you are requesting supervision access…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            ></textarea>
          </label>

          {localError ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {localError}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
          onClick={() => closeModal()}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="perplexity-button px-4 py-2 rounded-xl font-medium disabled:opacity-60"
          disabled={emptyState}
        >
          <i className="fas fa-paper-plane mr-2" />
          Send supervision invite
        </button>
      </div>
    </form>
  );
}

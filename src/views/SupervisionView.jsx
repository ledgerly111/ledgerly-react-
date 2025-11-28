import { useCallback, useEffect, useMemo, useState } from 'react';
import SupervisionRequestModal from '../components/SupervisionRequestModal.jsx';
import { FEATURE_PERMISSION_LOOKUP, computeEffectivePermissions } from '../constants/featurePermissions.js';
import { useAppActions, useAppState } from '../context/AppContext.jsx';

const STATUS_BADGES = {
  active: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  declined: 'bg-red-500/15 text-red-300 border border-red-500/30',
  revoked: 'bg-gray-600/20 text-gray-300 border border-gray-600/40',
};

function buildUserLookup(users) {
  const map = new Map();
  users.forEach((user) => {
    if (user && user.id != null) {
      map.set(Number(user.id), user);
    }
  });
  return map;
}

function getStatusLabel(status) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'pending':
      return 'Pending Acceptance';
    case 'declined':
      return 'Declined';
    case 'revoked':
      return 'Ended';
    default:
      return status ?? 'Unknown';
  }
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString();
  } catch (error) {
    console.error('Failed to format date', error);
    return '-';
  }
}

function renderPermissionBadges(permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return <span className="text-xs text-gray-400 italic">No extra access</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {permissions.map((permissionKey) => (
        <span
          key={permissionKey}
          className="rounded-full bg-sky-500/15 border border-sky-500/40 px-3 py-1 text-xs font-semibold text-sky-200"
        >
          {FEATURE_PERMISSION_LOOKUP[permissionKey]?.label ?? permissionKey}
        </span>
      ))}
    </div>
  );
}

export default function SupervisionView() {
  const {
    currentUser,
    users,
    supervisionLinks = [],
    featureGrantMatrix = {},
    hasFeaturePermission,
  } = useAppState();
  const {
    openModal,
    pushNotification,
    setSupervisionStatus,
  } = useAppActions();

  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const currentUserId = currentUser?.id ?? null;
  const canManageSupervision = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'supervision.manage');
    }
    const role = currentUser?.role ?? 'guest';
    return role === 'admin' || role === 'manager';
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const canViewAllManagers = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'team.viewAll');
    }
    return (currentUser?.role ?? 'guest') === 'admin';
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const isWorker = Boolean(currentUser) && !canManageSupervision && (currentUser?.role ?? 'guest') === 'worker';

  const userLookup = useMemo(() => buildUserLookup(users), [users]);

  const workerActiveLinks = useMemo(
    () => supervisionLinks.filter((link) => String(link.employeeId) === String(currentUserId) && link.status === 'active'),
    [supervisionLinks, currentUserId],
  );
  const workerPendingLinks = useMemo(
    () => supervisionLinks.filter((link) => String(link.employeeId) === String(currentUserId) && link.status === 'pending'),
    [supervisionLinks, currentUserId],
  );

  const currentUserOverrides = featureGrantMatrix?.[String(currentUserId ?? '')] ?? null;
  const currentUserPermissions = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return Array.from(computeEffectivePermissions(currentUser.role, currentUserOverrides));
  }, [currentUser, currentUserOverrides]);

  const managerOptions = useMemo(() => {
    if (!currentUser || !canManageSupervision) {
      return [];
    }
    if (canViewAllManagers) {
      const roster = new Map();
      if (currentUser.role) {
        roster.set(Number(currentUser.id), currentUser);
      }
      users
        .filter((user) => user && user.role === 'manager')
        .forEach((manager) => {
          roster.set(Number(manager.id), manager);
        });
      return Array.from(roster.values());
    }
    if ((currentUser.role ?? '').toLowerCase() === 'manager') {
      return [currentUser];
    }
    return [];
  }, [currentUser, users, canManageSupervision, canViewAllManagers]);

  useEffect(() => {
    if (managerOptions.length === 0) {
      setSelectedManagerId(null);
      return;
    }
    if (!selectedManagerId || !managerOptions.some((manager) => String(manager.id) === String(selectedManagerId))) {
      setSelectedManagerId(managerOptions[0]?.id ?? null);
    }
  }, [managerOptions, selectedManagerId]);

  const effectiveManagerId = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    if (!canManageSupervision || !canViewAllManagers) {
      return currentUser.id;
    }
    return selectedManagerId ?? currentUser.id;
  }, [currentUser, selectedManagerId, canManageSupervision, canViewAllManagers]);

  const managerRecord = effectiveManagerId != null ? userLookup.get(Number(effectiveManagerId)) : null;

  const scopedLinks = useMemo(() => {
    if (!effectiveManagerId) {
      return [];
    }
    return supervisionLinks.filter((link) => String(link.managerId) === String(effectiveManagerId));
  }, [effectiveManagerId, supervisionLinks]);

  const activeLinks = useMemo(
    () => scopedLinks.filter((link) => link.status === 'active'),
    [scopedLinks],
  );
  const pendingLinks = useMemo(
    () => scopedLinks.filter((link) => link.status === 'pending'),
    [scopedLinks],
  );
  const declinedLinks = useMemo(
    () => scopedLinks.filter((link) => link.status === 'declined'),
    [scopedLinks],
  );

  const totalUnderSupervision = activeLinks.length;
  const totalAwaiting = pendingLinks.length;
  const totalEnded = scopedLinks.filter((link) => link.status === 'revoked').length;

  const handleOpenRequestModal = useCallback(() => {
    if (!canManageSupervision) {
      pushNotification({
        type: 'warning',
        message: 'You do not have permission to manage supervision.',
      });
      return;
    }
    if (!effectiveManagerId) {
      pushNotification({
        type: 'warning',
        message: 'Select a manager to create a supervision request.',
      });
      return;
    }
    openModal(SupervisionRequestModal, {
      managerId: effectiveManagerId,
    });
  }, [canManageSupervision, effectiveManagerId, openModal, pushNotification]);

  const handleEndSupervision = useCallback((link) => {
    if (!link || !canManageSupervision) {
      if (!canManageSupervision) {
        pushNotification({
          type: 'warning',
          message: 'You do not have permission to manage supervision.',
        });
      }
      return;
    }
    setSupervisionStatus({
      linkId: link.id,
      status: 'revoked',
      responderId: currentUser?.id,
    });
    const employee = userLookup.get(Number(link.employeeId));
    pushNotification({
      type: 'info',
      message: employee
        ? `${employee.name} is no longer under supervision.`
        : 'Supervision relationship ended.',
    });
  }, [canManageSupervision, currentUser?.id, pushNotification, setSupervisionStatus, userLookup]);

  const handleRescindRequest = useCallback((link) => {
    if (!link || !canManageSupervision) {
      if (!canManageSupervision) {
        pushNotification({
          type: 'warning',
          message: 'You do not have permission to manage supervision.',
        });
      }
      return;
    }
    setSupervisionStatus({
      linkId: link.id,
      status: 'revoked',
      responderId: currentUser?.id,
    });
    const employee = userLookup.get(Number(link.employeeId));
    pushNotification({
      type: 'info',
      message: employee
        ? `Invitation withdrawn for ${employee.name}.`
        : 'Supervision request withdrawn.',
    });
  }, [canManageSupervision, currentUser?.id, pushNotification, setSupervisionStatus, userLookup]);

  if (!currentUser) {
    return (
      <div className="perplexity-card p-8 text-center text-gray-400 fade-in">
        Please sign in to use Supervision.
      </div>
    );
  }

  if (isWorker) {
    const hasActiveSupervisors = workerActiveLinks.length > 0;
    return (
      <div className="space-y-6 fade-in">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Supervision</h2>
          <p className="text-gray-400">
            View the supervisors who can assist with your work. Respond to invitations from your Inbox to grant access.
          </p>
        </header>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Active supervisors</h3>
          {hasActiveSupervisors ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {workerActiveLinks.map((link) => {
                const supervisor = userLookup.get(Number(link.managerId));
                return (
                  <div key={link.id} className="perplexity-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-white">{supervisor?.name ?? 'Supervisor'}</div>
                        <div className="text-sm text-gray-400">{supervisor?.email ?? 'No email on file'}</div>
                        {supervisor?.phone ? (
                          <div className="text-sm text-gray-500">{supervisor.phone}</div>
                        ) : null}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_BADGES.active}`}>
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Since {formatDate(link.acceptedAt)}
                    </div>
                    {link.notes ? (
                      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100/90">
                        <strong className="block text-white">Focus</strong>
                        <span>{link.notes}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="perplexity-card p-6 text-center text-gray-400">
              You do not have any supervisors yet. Accept an invitation from your Inbox to get started.
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Additional Access</h3>
          <div className="perplexity-card p-5">
            {renderPermissionBadges(currentUserPermissions)}
          </div>
        </section>

        {workerPendingLinks.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Pending invitations</h3>
            <div className="perplexity-card border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
              <p className="text-sm">
                You have {workerPendingLinks.length} pending supervision {workerPendingLinks.length === 1 ? 'invitation' : 'invitations'}.
                Open your Inbox to accept or decline.
              </p>
              <ul className="mt-3 space-y-2 text-xs text-amber-200/80">
                {workerPendingLinks.map((link) => {
                  const supervisor = userLookup.get(Number(link.managerId));
                  return (
                    <li key={link.id} className="flex flex-col">
                      <span className="font-medium text-amber-100">{supervisor?.name ?? 'Supervisor'}</span>
                      <span>Requested {formatDate(link.requestedAt)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (!canManageSupervision) {
    return (
      <div className="perplexity-card p-8 text-center text-gray-400 fade-in">
        Your account does not have permission to manage supervision.
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Supervision</h2>
          <p className="text-gray-400">
            Assign oversight, follow employee progress, and manage supervisory invitations.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canViewAllManagers ? (
            <label className="flex flex-col text-sm text-gray-400">
              <span className="mb-1">Viewing as</span>
              <select
                className="min-w-[220px] rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                value={selectedManagerId ?? ''}
                onChange={(event) => setSelectedManagerId(event.target.value ? Number(event.target.value) : null)}
              >
                {managerOptions.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} - {manager.role === 'admin' ? 'Administrator' : 'Manager'}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className="perplexity-button px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2"
            onClick={handleOpenRequestModal}
          >
            <i className="fas fa-user-plus" />
            Add Employee to Supervision
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="perplexity-card p-5">
          <p className="text-sm text-gray-400 mb-1">Supervised Employees</p>
          <p className="text-3xl font-semibold text-white">{totalUnderSupervision}</p>
        </div>
        <div className="perplexity-card p-5">
          <p className="text-sm text-gray-400 mb-1">Awaiting Acceptance</p>
          <p className="text-3xl font-semibold text-white">{totalAwaiting}</p>
        </div>
        <div className="perplexity-card p-5">
          <p className="text-sm text-gray-400 mb-1">Ended Relationships</p>
          <p className="text-3xl font-semibold text-white">{totalEnded}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Active Supervision</h3>
          {managerRecord ? (
            <span className="text-sm text-gray-400">
              Manager: <span className="text-white font-medium">{managerRecord.name}</span>
            </span>
          ) : null}
        </div>
        <div className="perplexity-card overflow-hidden">
          {activeLinks.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {pendingLinks.length > 0
                ? 'You have invitations pending employee acceptance.'
                : 'No employees are currently under active supervision.'}
            </div>
          ) : (
            <div className="responsive-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/70 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Accepted</th>
                    <th className="px-6 py-4">Additional Access</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {activeLinks.map((link, index) => {
                    const employee = userLookup.get(Number(link.employeeId));
                    const grantEntry = featureGrantMatrix[String(link.employeeId)] ?? {};
                    const effectivePermissions = employee
                      ? Array.from(computeEffectivePermissions(employee.role, grantEntry))
                      : [];
                    return (
                      <tr
                        key={link.id}
                        className={`hover:bg-gray-800/40 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{employee?.name ?? 'Unknown user'}</div>
                          <div className="text-sm text-gray-400">{employee?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
                            {employee?.role ?? 'â€”'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{formatDate(link.acceptedAt)}</td>
                        <td className="px-6 py-4">
                          {renderPermissionBadges(effectivePermissions)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{link.notes || 'â€”'}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="text-sm text-red-300 hover:text-red-200 font-medium"
                            onClick={() => handleEndSupervision(link)}
                          >
                            End supervision
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Pending Invitations</h3>
          <span className="text-sm text-gray-400">Employees must accept to activate supervision.</span>
        </div>
        <div className="perplexity-card overflow-hidden">
          {pendingLinks.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No pending supervision invitations.
            </div>
          ) : (
            <div className="responsive-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/70 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Requested</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Message</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {pendingLinks.map((link, index) => {
                    const employee = userLookup.get(Number(link.employeeId));
                    const badgeClass = STATUS_BADGES[link.status] ?? STATUS_BADGES.pending;
                    return (
                      <tr
                        key={link.id}
                        className={`hover:bg-gray-800/40 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{employee?.name ?? 'Unknown user'}</div>
                          <div className="text-sm text-gray-400">{employee?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{formatDate(link.requestedAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
                            {getStatusLabel(link.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{link.notes || 'â€”'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-2 text-sm">
                            <span className="text-gray-400 italic">Awaiting employee response</span>
                            <button
                              type="button"
                              className="text-orange-300 hover:text-orange-200 font-medium"
                              onClick={() => handleRescindRequest(link)}
                            >
                              Withdraw invitation
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {declinedLinks.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Recently Declined</h3>
          <div className="perplexity-card overflow-hidden">
            <div className="responsive-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/70 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Declined</th>
                    <th className="px-6 py-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {declinedLinks.map((link, index) => {
                    const employee = userLookup.get(Number(link.employeeId));
                    return (
                      <tr
                        key={link.id}
                        className={`hover:bg-gray-800/40 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{employee?.name ?? 'Unknown user'}</div>
                          <div className="text-sm text-gray-400">{employee?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{formatDate(link.declinedAt)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{link.responseNote || link.notes || 'â€”'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

import { useCallback, useMemo } from 'react';
import EmployeeDeleteModal from '../components/EmployeeDeleteModal.jsx';
import EmployeeFormModal from '../components/EmployeeFormModal.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { AccuraBot } from '../utils/ai.js';

const ROLE_BADGES = {
  admin: 'bg-red-500/20 text-red-400',
  manager: 'bg-blue-500/20 text-blue-400',
  worker: 'bg-emerald-500/20 text-emerald-400',
};

const DEFAULT_HIRE_DATE = () => new Date().toISOString().slice(0, 10);

function formatRole(role) {
  if (!role) {
    return 'Unknown';
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function EmployeesView() {
  const state = useAppState();
  const {
    addEmployee,
    updateEmployee,
    deleteEmployee,
    setBotAnalysis,
    pushNotification,
    openModal,
    closeModal,
  } = useAppActions();
  const {
    users = [],
    currentUser,
    supervisionDirectory,
    hasFeaturePermission,
  } = state;

  const canManageEmployees = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'team.manageMembers');
    }
    return ['admin', 'manager'].includes(currentUser?.role ?? 'guest');
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const canViewAllEmployees = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'team.viewAll');
    }
    return (currentUser?.role ?? 'guest') === 'admin';
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const visibleEmployees = useMemo(() => {
    if (!Array.isArray(users) || !currentUser || !canManageEmployees) {
      return [];
    }
    if (canViewAllEmployees) {
      return users;
    }
    const byManager = supervisionDirectory?.byManager ?? {};
    const links = Array.isArray(byManager?.[String(currentUser.id)]) ? byManager[String(currentUser.id)] : [];
    if (links.length === 0) {
      return [];
    }
    const allowedIds = new Set(
      links
        .filter((link) => link && link.status === 'active')
        .map((link) => Number(link.employeeId))
        .filter((id) => Number.isFinite(id)),
    );
    if (allowedIds.size === 0) {
      return [];
    }
    return users.filter((user) => allowedIds.has(Number(user.id)));
  }, [users, currentUser, supervisionDirectory, canManageEmployees, canViewAllEmployees]);

  const sortedEmployees = useMemo(() => {
    return [...visibleEmployees].sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleEmployees]);

  const isScopedView = canManageEmployees && !canViewAllEmployees;

  const applyBotAnalysis = useCallback((updatedUsers) => {
    const currentId = state.currentUser?.id;
    const nextState = {
      ...state,
      users: updatedUsers,
      currentUser: currentId != null
        ? updatedUsers.find((candidate) => String(candidate?.id) === String(currentId)) ?? null
        : state.currentUser,
    };
    setBotAnalysis(AccuraBot.analyzeApp(nextState));
  }, [setBotAnalysis, state]);

  const ensureManagerAccess = useCallback(() => {
    if (canManageEmployees) {
      return true;
    }
    pushNotification({
      type: 'warning',
      message: 'You do not have permission to manage employees.',
    });
    return false;
  }, [canManageEmployees, pushNotification]);

  const handleAddEmployee = useCallback(() => {
    if (!ensureManagerAccess()) {
      return;
    }
    openModal(EmployeeFormModal, {
      mode: 'create',
      title: 'Add New Employee',
      initialValues: {
        role: 'worker',
        hireDate: DEFAULT_HIRE_DATE(),
        commission: 0,
      },
      onSubmit: (values) => {
        const numericIds = users
          .map((employee) => Number(employee?.id))
          .filter((id) => Number.isFinite(id));
        const nextId = numericIds.length ? Math.max(...numericIds) + 1 : Date.now();
        const employee = {
          ...values,
          id: nextId,
          commission: Number.isFinite(values.commission) ? values.commission : 0,
        };
        addEmployee(employee);
        const nextUsers = [...users, employee];
        applyBotAnalysis(nextUsers);
        pushNotification({
          type: 'success',
          message: `${employee.name} added to the team.`,
        });
        closeModal();
      },
      onCancel: () => closeModal(),
    });
  }, [ensureManagerAccess, openModal, users, addEmployee, applyBotAnalysis, pushNotification, closeModal]);

  const handleEditEmployee = useCallback((employee) => {
    if (!ensureManagerAccess()) {
      return;
    }
    openModal(EmployeeFormModal, {
      mode: 'edit',
      title: 'Edit Employee',
      initialValues: employee,
      onSubmit: (values) => {
        const updatedEmployee = {
          ...employee,
          ...values,
          commission: Number.isFinite(values.commission)
            ? values.commission
            : employee.commission ?? 0,
        };
        updateEmployee(updatedEmployee);
        const nextUsers = users.map((candidate) => (
          String(candidate?.id) === String(employee.id)
            ? updatedEmployee
            : candidate
        ));
        applyBotAnalysis(nextUsers);
        pushNotification({
          type: 'success',
          message: `${updatedEmployee.name} updated successfully.`,
        });
        closeModal();
      },
      onCancel: () => closeModal(),
    });
  }, [ensureManagerAccess, openModal, updateEmployee, users, applyBotAnalysis, pushNotification, closeModal]);

  const handleDeleteEmployee = useCallback((employee) => {
    if (!ensureManagerAccess()) {
      return;
    }
    openModal(EmployeeDeleteModal, {
      employee,
      onCancel: () => closeModal(),
      onConfirm: () => {
        deleteEmployee(employee.id);
        const nextUsers = users.filter((candidate) => String(candidate?.id) !== String(employee.id));
        applyBotAnalysis(nextUsers);
        pushNotification({
          type: 'success',
          message: `${employee.name} removed from the directory.`,
        });
        closeModal();
      },
    });
  }, [ensureManagerAccess, openModal, deleteEmployee, users, applyBotAnalysis, pushNotification, closeModal]);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Employee Management</h2>
          <p className="text-gray-400">Manage your team roster, permissions, and contact details.</p>
        </div>
        {canManageEmployees ? (
          <button
            type="button"
            className="perplexity-button px-4 py-2 rounded-xl font-medium"
            onClick={handleAddEmployee}
          >
            <i className="fas fa-plus mr-2" />Add Employee
          </button>
        ) : null}
      </div>

      <div className="perplexity-card overflow-hidden">
        {sortedEmployees.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {isScopedView
              ? 'No supervised employees yet. Send an invitation from Supervision to get started.'
              : canManageEmployees
                ? 'No team members yet. Add your first employee to get started.'
                : 'An administrator can add team members from this screen.'}
          </div>
        ) : (
          <div className="responsive-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/70 text-left text-xs font-semibold uppercase tracking-wider text-gray-300">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {sortedEmployees.map((employee, index) => {
                  const badgeClass = ROLE_BADGES[employee.role] ?? 'bg-gray-500/20 text-gray-300';
                  const highlightSelf = String(currentUser?.id ?? '') === String(employee.id);
                  return (
                    <tr
                      key={employee.id}
                      className={`hover:bg-gray-800/40 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">
                          {employee.name}
                          {highlightSelf ? (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">You</span>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-500">@{employee.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
                          {formatRole(employee.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {employee.email || '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {employee.phone || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-4 text-sm">
                          <button
                            type="button"
                            className="text-blue-400 transition-colors hover:text-blue-300"
                            onClick={() => handleEditEmployee(employee)}
                            disabled={!canManageEmployees}
                            title="Edit employee"
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            type="button"
                            className="text-red-400 transition-colors hover:text-red-300"
                            onClick={() => handleDeleteEmployee(employee)}
                            disabled={!canManageEmployees}
                            title="Delete employee"
                          >
                            <i className="fas fa-trash" />
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
    </div>
  );
}


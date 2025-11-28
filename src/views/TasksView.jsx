import { useCallback, useMemo } from 'react';
import TaskFormModal from '../components/TaskFormModal.jsx';
import TaskAssignModal from '../components/TaskAssignModal.jsx';
import TaskReportModal from '../components/TaskReportModal.jsx';
import TaskDeleteModal from '../components/TaskDeleteModal.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { downloadTaskReportPdf, downloadTaskReportTxt } from '../utils/taskReports.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
];

function formatTaskMetric(value, goalType, currencyCode) {
  if (goalType === 'count') {
    return `${Number(value || 0).toLocaleString()} sales`;
  }
  return formatCurrency(value ?? 0, { countryCode: currencyCode, showSymbol: true });
}

function formatDate(value) {
  if (!value) {
    return 'No due date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function ProgressBar({ percent }) {
  const safePercent = Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800/80">
      <div
        className="h-full bg-gradient-to-r from-teal-400 to-emerald-500"
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}

function WorkerSubTaskCard({ task, parentTask, currencyCode }) {
  const personalPercent = task.goalTarget > 0 ? Math.min((task.progress / task.goalTarget) * 100, 100) : 0;
  const teamPercent = parentTask && parentTask.goalTarget > 0
    ? Math.min((parentTask.progress / parentTask.goalTarget) * 100, 100)
    : 0;

  return (
    <article className="task-card flex flex-col border-l-4 border-yellow-500 bg-gray-950/40">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{task.title}</h3>
          {task.status === 'completed' ? (
            <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-300">Completed</span>
          ) : null}
        </div>
        <p className="text-sm text-gray-400">{task.description || 'Personal goal linked to the team initiative.'}</p>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-yellow-400">
            <span>My Progress</span>
            <span>
              {formatTaskMetric(task.progress, task.goalType, currencyCode)} /{' '}
              {formatTaskMetric(task.goalTarget, task.goalType, currencyCode)}
            </span>
          </div>
          <ProgressBar percent={personalPercent} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-teal-400">
            <span>Team Progress</span>
            <span>
              {formatTaskMetric(parentTask?.progress ?? 0, task.goalType, currencyCode)} /{' '}
              {formatTaskMetric(parentTask?.goalTarget ?? 0, task.goalType, currencyCode)}
            </span>
          </div>
          <ProgressBar percent={teamPercent} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-800/80 pt-3 text-xs text-gray-400">
        <span><i className="fas fa-clock mr-1" />Due {formatDate(task.dueDate)}</span>
        {parentTask?.accuraBotEnabled ? (
          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[0.65rem] font-semibold text-blue-300">
            AccuraBot enabled
          </span>
        ) : null}
      </div>
    </article>
  );
}

function WorkerAvailableTaskCard({ task, branch, currencyCode, onJoin, joinDisabled, joinReason }) {
  const goalLabel = formatTaskMetric(task.goalTarget, task.goalType, currencyCode);
  return (
    <article className="task-card flex flex-col border-l-4 border-blue-500 bg-gray-950/40">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{task.title}</h3>
          {task.accuraBotEnabled ? (
            <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[0.65rem] font-semibold text-blue-300">
              AccuraBot
            </span>
          ) : null}
        </div>
        <p className="text-sm text-gray-400">{task.description || 'Join this task to contribute toward the branch goal.'}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-300">
        <div>
          <dt className="text-gray-500">Branch</dt>
          <dd className="text-white font-semibold">{branch?.name ?? 'Unassigned'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Goal</dt>
          <dd className="text-white font-semibold">{goalLabel}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Participants</dt>
          <dd className="text-white font-semibold">
            <i className="fas fa-users mr-1" />{task.participants?.length ?? 0} / {task.participantLimit ?? '-'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Due</dt>
          <dd className="text-white font-semibold">{formatDate(task.dueDate)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <button
          type="button"
          className="bot-button w-full rounded-lg px-4 py-2 text-sm font-semibold"
          onClick={() => onJoin(task)}
          disabled={joinDisabled}
        >
          <i className="fas fa-sign-in-alt mr-2" />Join Task
        </button>
        {joinDisabled && joinReason ? (
          <p className="text-xs text-yellow-300">{joinReason}</p>
        ) : null}
      </div>
    </article>
  );
}

function ManagerTaskCard({
  task,
  branch,
  currencyCode,
  onAssign,
  onReport,
  onEdit,
  onDelete,
}) {
  const progressPercent = task.goalTarget > 0 ? Math.min((task.progress / task.goalTarget) * 100, 100) : 0;
  const participantSummary = `${task.participants?.length ?? 0} / ${task.participantLimit ?? '-'}`;
  return (
    <article className="task-card flex flex-col border-l-4 border-teal-500 bg-gray-950/40">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-white">{task.title}</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${task.status === 'completed'
              ? 'bg-green-500/20 text-green-300'
              : 'bg-blue-500/20 text-blue-300'}`}
          >
            {task.status === 'completed' ? 'Completed' : 'Live'}
          </span>
          {task.accuraBotEnabled ? (
            <span className="rounded-full bg-purple-500/10 px-2 py-1 text-[0.65rem] font-semibold text-purple-300">
              AccuraBot
            </span>
          ) : null}
        </div>
        <p className="text-sm text-gray-400">{task.description || 'No description provided yet.'}</p>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-teal-400">
            <span>Overall Progress</span>
            <span>
              {formatTaskMetric(task.progress, task.goalType, currencyCode)} /{' '}
              {formatTaskMetric(task.goalTarget, task.goalType, currencyCode)}
            </span>
          </div>
          <ProgressBar percent={progressPercent} />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs text-gray-300">
          <div>
            <dt className="text-gray-500">Branch</dt>
            <dd className="text-white font-semibold">{branch?.name ?? 'Not assigned'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Participants</dt>
            <dd className="text-white font-semibold">
              <i className="fas fa-users mr-1" />{participantSummary}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Due</dt>
            <dd className="text-white font-semibold">{formatDate(task.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Creator</dt>
            <dd className="text-white font-semibold">{task.createdByName ?? 'You'}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-800/80 pt-4">
        <button type="button" className="perplexity-button flex-1 px-4 py-2 text-sm font-semibold" onClick={() => onAssign(task)}>
          <i className="fas fa-paper-plane mr-2" />Assign
        </button>
        <button type="button" className="bot-button flex-1 px-4 py-2 text-sm font-semibold" onClick={() => onReport(task)}>
          <i className="fas fa-chart-bar mr-2" />Report
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-700 bg-gray-800/80 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700"
          onClick={() => onEdit(task)}
        >
          <i className="fas fa-edit mr-2" />Edit
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-500 bg-red-600/80 px-4 py-2 text-sm font-semibold text-red-50 transition-colors hover:bg-red-600"
          onClick={() => onDelete(task)}
        >
          <i className="fas fa-trash mr-2" />Delete
        </button>
      </div>
    </article>
  );
}

export default function TasksView() {
  const {
    currentUser,
    tasks,
    taskFilter,
    branches,
    users,
    selectedCountry,
  } = useAppState();
  const {
    setTaskFilter,
    createTask,
    updateTask,
    deleteTask,
    joinTask,
    assignTaskToBranch,
    openModal,
    closeModal,
    pushNotification,
  } = useAppActions();

  const role = currentUser?.role ?? 'guest';
  const canManageTasks = role === 'admin' || role === 'manager';
  const isWorker = role === 'worker';

  const tasksById = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      map.set(task.id, task);
    });
    return map;
  }, [tasks]);

  const branchMembership = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return branches
      .filter((branch) => Array.isArray(branch.members) && branch.members.includes(currentUser.id))
      .map((branch) => branch.id);
  }, [branches, currentUser]);

  const joinedSubTasks = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return tasks.filter((task) => task.isSubTask && task.participants?.includes(currentUser.id));
  }, [tasks, currentUser]);

  const availableBranchTasks = useMemo(() => {
    if (!currentUser || !branchMembership.length) {
      return [];
    }
    return tasks.filter((task) =>
      !task.isSubTask
      && task.branchId != null
      && branchMembership.includes(task.branchId)
      && !(task.participants ?? []).includes(currentUser.id));
  }, [tasks, branchMembership, currentUser]);

  const ownedMainTasks = useMemo(() => {
    if (!currentUser || !canManageTasks) {
      return [];
    }
    return tasks.filter((task) => !task.isSubTask && task.createdBy === currentUser.id);
  }, [tasks, currentUser, canManageTasks]);

  const visibleTasks = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (isWorker) {
      return [...availableBranchTasks, ...joinedSubTasks];
    }
    return ownedMainTasks;
  }, [currentUser, isWorker, availableBranchTasks, joinedSubTasks, ownedMainTasks]);

  const filteredTasks = useMemo(() => {
    const normalizedFilter = taskFilter ?? 'all';
    const filtered = visibleTasks.filter((task) => {
      const status = (task.status ?? 'active').toLowerCase();
      if (normalizedFilter === 'live') {
        return status === 'active';
      }
      if (normalizedFilter === 'completed') {
        return status === 'completed';
      }
      return true;
    });
    return filtered.sort((a, b) => {
      if (a.isSubTask === b.isSubTask) {
        const aTime = new Date(a.dueDate ?? 0).getTime();
        const bTime = new Date(b.dueDate ?? 0).getTime();
        return aTime - bTime;
      }
      return a.isSubTask ? 1 : -1;
    });
  }, [visibleTasks, taskFilter]);

  const ensureCanManageTasks = useCallback(() => {
    if (canManageTasks) {
      return true;
    }
    pushNotification({
      type: 'warning',
      message: 'Manager access required',
      description: 'Only managers and admins can manage tasks.',
    });
    return false;
  }, [canManageTasks, pushNotification]);

  const handleFilterChange = useCallback((filter) => {
    setTaskFilter(filter);
  }, [setTaskFilter]);

  const openCreateTaskModal = useCallback(() => {
    if (!currentUser || !ensureCanManageTasks()) {
      return;
    }
    openModal(TaskFormModal, {
      title: 'Create Task',
      mode: 'create',
      initialValues: {
        title: '',
        description: '',
        dueDate: new Date().toISOString().slice(0, 10),
        goalType: 'sales',
        goalTarget: 0,
        participantLimit: 1,
        accuraBotEnabled: true,
        accuraBotReportFrequency: 'weekly',
      },
      onCancel: closeModal,
      onSubmit: (formValue) => {
        createTask({ task: formValue, creatorId: currentUser.id });
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Task created',
          description: `${formValue.title} is ready for the team.`,
        });
      },
    });
  }, [currentUser, ensureCanManageTasks, openModal, closeModal, createTask, pushNotification]);

  const openEditTaskModal = useCallback((task) => {
    if (!currentUser || !ensureCanManageTasks()) {
      return;
    }
    openModal(TaskFormModal, {
      title: 'Edit Task',
      mode: 'edit',
      initialValues: task,
      onCancel: closeModal,
      onSubmit: (formValue) => {
        updateTask({ ...task, ...formValue });
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Task updated',
          description: `${formValue.title} was updated successfully.`,
        });
      },
    });
  }, [currentUser, ensureCanManageTasks, openModal, closeModal, updateTask, pushNotification]);

  const openDeleteTaskModal = useCallback((task) => {
    if (!ensureCanManageTasks()) {
      return;
    }
    openModal(TaskDeleteModal, {
      task,
      onCancel: closeModal,
      onConfirm: () => {
        deleteTask(task.id);
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Task deleted',
          description: `${task.title} has been removed.`,
        });
      },
    });
  }, [ensureCanManageTasks, openModal, closeModal, deleteTask, pushNotification]);

  const openAssignTaskModal = useCallback((task) => {
    if (!ensureCanManageTasks()) {
      return;
    }
    openModal(TaskAssignModal, {
      task,
      branches,
      currentUserId: currentUser?.id ?? null,
      onCancel: closeModal,
      onAssign: (branchId) => {
        assignTaskToBranch({ taskId: task.id, branchId });
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Task assigned',
          description: `${task.title} is now available to that branch.`,
        });
      },
    });
  }, [ensureCanManageTasks, openModal, closeModal, assignTaskToBranch, branches, currentUser, pushNotification]);

  const openReportModal = useCallback((task) => {
    const childTasks = tasks.filter((candidate) => candidate.parentTaskId === task.id);
    openModal(TaskReportModal, {
      task,
      subTasks: childTasks,
      users,
      currencyCode: selectedCountry,
      onClose: closeModal,
      onDownloadTxt: (report) => downloadTaskReportTxt(report),
      onDownloadPdf: (report) => downloadTaskReportPdf(report),
    });
  }, [tasks, users, selectedCountry, openModal, closeModal]);

  const handleJoinTask = useCallback((task) => {
    if (!currentUser || currentUser.role !== 'worker') {
      pushNotification({
        type: 'info',
        message: 'Task only for workers',
        description: 'Only worker accounts can join branch tasks from here.',
      });
      return;
    }
    if (task.participants?.includes(currentUser.id)) {
      pushNotification({
        type: 'info',
        message: 'Already joined',
        description: 'You are already participating in this task.',
      });
      return;
    }
    if ((task.participants?.length ?? 0) >= (task.participantLimit ?? Number.MAX_SAFE_INTEGER)) {
      pushNotification({
        type: 'warning',
        message: 'Participant limit reached',
        description: 'This task is currently full.',
      });
      return;
    }
    joinTask({ taskId: task.id, userId: currentUser.id });
    pushNotification({
      type: 'success',
      message: 'Joined task',
      description: `You are now part of ${task.title}.`,
    });
  }, [currentUser, joinTask, pushNotification]);

  const emptyState = isWorker
    ? 'No branch opportunities at the moment. Check back soon!'
    : 'Create a task to get your team moving.';

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isWorker ? 'My Tasks & Goals' : 'Task Dashboard'}
          </h2>
          <p className="text-gray-400">
            {isWorker
              ? 'Track your goals and join new team tasks.'
              : 'Create and manage collaborative goals for your branches.'}
          </p>
        </div>
        {canManageTasks ? (
          <button type="button" className="ai-button px-4 py-2 rounded-xl font-medium" onClick={openCreateTaskModal}>
            <i className="fas fa-plus mr-2" />Create New Task
          </button>
        ) : null}
      </header>

      <div className="flex space-x-1 overflow-hidden rounded-xl bg-gray-800/50 p-1">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${taskFilter === filter.value
              ? 'inbox-tab-active'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
            onClick={() => handleFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="perplexity-card p-6">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-gray-400">
            <i className="fas fa-tasks text-4xl text-gray-600" />
            <h3 className="text-lg font-semibold text-white">All clear</h3>
            <p className="text-sm text-gray-400">{emptyState}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((task) => {
            if (isWorker && task.isSubTask) {
              const parentTask = tasksById.get(task.parentTaskId) ?? null;
              return (
                <WorkerSubTaskCard
                  key={task.id}
                  task={task}
                  parentTask={parentTask}
                  currencyCode={selectedCountry}
                />
              );
            }
            if (isWorker) {
              const branch = branches.find((candidate) => candidate.id === task.branchId);
              const joinDisabled = (task.participants?.length ?? 0) >= (task.participantLimit ?? Number.MAX_SAFE_INTEGER);
              const joinReason = joinDisabled ? 'Participant limit reached for this task.' : '';
              return (
                <WorkerAvailableTaskCard
                  key={task.id}
                  task={task}
                  branch={branch}
                  currencyCode={selectedCountry}
                  onJoin={handleJoinTask}
                  joinDisabled={joinDisabled}
                  joinReason={joinReason}
                />
              );
            }
            const branch = branches.find((candidate) => candidate.id === task.branchId);
            const creator = users.find((user) => user.id === task.createdBy);
            const enrichedTask = creator ? { ...task, createdByName: creator.name } : task;
            return (
              <ManagerTaskCard
                key={task.id}
                task={enrichedTask}
                branch={branch}
                currencyCode={selectedCountry}
                onAssign={openAssignTaskModal}
                onReport={openReportModal}
                onEdit={openEditTaskModal}
                onDelete={openDeleteTaskModal}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { formatCurrency } from '../utils/currency.js';

const progressBarBase = 'h-2 w-full overflow-hidden rounded-full bg-gray-800/80';

function formatContribution(value, goalType, currencyCode) {
  if (goalType === 'count') {
    return `${Number(value || 0).toLocaleString()} sales`;
  }
  return formatCurrency(value || 0, { countryCode: currencyCode, showSymbol: true });
}

export default function TaskReportModal({
  task,
  subTasks = [],
  users = [],
  currencyCode = 'AED',
  onDownloadPdf,
  onDownloadTxt,
  onClose,
}) {
  const participantRows = useMemo(() => {
    if (!task) {
      return [];
    }
    const rows = subTasks.map((subTask) => {
      const memberId = Array.isArray(subTask.participants) ? subTask.participants[0] : null;
      const user = users.find((candidate) => candidate.id === memberId) ?? null;
      const name = user?.name ?? 'Unassigned';
      return {
        id: subTask.id,
        userId: memberId,
        name,
        progress: subTask.progress ?? 0,
        goalTarget: subTask.goalTarget ?? 0,
        status: subTask.status ?? 'active',
      };
    });

    // Ensure every listed participant appears even if a personal task is missing.
    task.participants?.forEach((participantId) => {
      if (!rows.some((row) => row.userId === participantId)) {
        const user = users.find((candidate) => candidate.id === participantId) ?? null;
        rows.push({
          id: `${task.id}-${participantId}`,
          userId: participantId,
          name: user?.name ?? 'Unassigned',
          progress: 0,
          goalTarget: task.goalTarget > 0 && task.participantLimit > 0
            ? task.goalTarget / task.participantLimit
            : 0,
          status: 'active',
        });
      }
    });
    return rows;
  }, [task, subTasks, users]);

  const reportData = useMemo(() => {
    if (!task) {
      return null;
    }
    const goalTarget = Number(task.goalTarget) || 0;
    const progress = Number(task.progress) || 0;
    const progressPercent = goalTarget > 0 ? Math.min((progress / goalTarget) * 100, 100) : 0;
    return {
      task,
      goalTarget,
      progress,
      progressPercent,
      participants: participantRows,
      goalType: task.goalType,
      currencyCode,
    };
  }, [task, participantRows, currencyCode]);

  if (!task || !reportData) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h3 className="text-xl font-semibold text-white">Task report unavailable</h3>
          <p className="text-gray-400 text-sm">We couldn't load the latest data for this task.</p>
        </header>
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onClose?.()}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const headerStats = [
    {
      label: 'Progress',
      value: `${reportData.progressPercent.toFixed(1)}%`,
    },
    {
      label: 'Total Goal',
      value: formatContribution(reportData.goalTarget, task.goalType, currencyCode),
    },
    {
      label: 'Current Output',
      value: formatContribution(reportData.progress, task.goalType, currencyCode),
    },
    {
      label: 'Participants',
      value: `${Array.isArray(task.participants) ? task.participants.length : 0} / ${task.participantLimit ?? '-'}`,
    },
  ];

  const handleDownloadTxt = () => {
    if (!onDownloadTxt) {
      return;
    }
    onDownloadTxt(reportData);
  };

  const handleDownloadPdf = () => {
    if (!onDownloadPdf) {
      return;
    }
    onDownloadPdf(reportData);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">Task Performance Report</h3>
        <p className="text-gray-400 text-sm">Generated summary for "{task.title}".</p>
      </header>

      <section className="grid gap-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4 md:grid-cols-2 lg:grid-cols-4">
        {headerStats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Team Progress</p>
            <p className="text-xs text-gray-400">{new Date(task.dueDate).toLocaleDateString()} deadline</p>
          </div>
          <span className="text-sm font-semibold text-white">{reportData.progressPercent.toFixed(1)}%</span>
        </div>
        <div className={progressBarBase}>
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500"
            style={{ width: `${reportData.progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-400">{task.description || 'No description provided for this task.'}</p>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-white">Participant Leaderboard</h4>
        <div className="overflow-hidden rounded-xl border border-gray-700/60">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/60 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Contribution</th>
                <th className="px-4 py-3">Goal</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {participantRows.map((row) => {
                const contribution = formatContribution(row.progress, task.goalType, currencyCode);
                const goal = formatContribution(row.goalTarget, task.goalType, currencyCode);
                const completed = row.status === 'completed' || row.progress >= row.goalTarget;
                return (
                  <tr key={row.id} className="bg-gray-950/40">
                    <td className="px-4 py-3 text-white">{row.name}</td>
                    <td className="px-4 py-3 text-gray-200">{contribution}</td>
                    <td className="px-4 py-3 text-gray-300">{goal}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${completed
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-blue-500/20 text-blue-300'}`}
                      >
                        {completed ? 'Complete' : 'In progress'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div className="text-xs text-gray-500">
          Generated on {new Date().toLocaleString()}
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={handleDownloadTxt}
            disabled={!onDownloadTxt}
          >
            <i className="fas fa-file-alt mr-2" />Download TXT
          </button>
          <button
            type="button"
            className="bot-button px-4 py-2 text-sm font-semibold"
            onClick={handleDownloadPdf}
            disabled={!onDownloadPdf}
          >
            <i className="fas fa-file-pdf mr-2" />Download PDF
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onClose?.()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

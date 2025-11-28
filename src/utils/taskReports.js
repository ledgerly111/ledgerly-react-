import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import TaskReportDocument from '../pdf/TaskReportDocument.jsx';
import { formatCurrency } from './currency.js';

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}

function formatMetric(value, goalType, currencyCode) {
  if (goalType === 'count') {
    return `${Number(value || 0).toLocaleString()} sales`;
  }
  return formatCurrency(value || 0, { countryCode: currencyCode, showSymbol: true });
}

export function downloadTaskReportTxt(report) {
  if (!report?.task) {
    return;
  }
  const { task, goalType, currencyCode, participants, progress, goalTarget, progressPercent } = report;
  const lines = [
    `Task Report: ${task.title}`,
    `Status: ${task.status === 'completed' ? 'Completed' : 'Live'}`,
    `Due Date: ${task.dueDate ?? 'Not set'}`,
    '',
    `Goal Target: ${formatMetric(goalTarget, goalType, currencyCode)}`,
    `Current Output: ${formatMetric(progress, goalType, currencyCode)}`,
    `Progress: ${progressPercent.toFixed(1)}%`,
    '',
    'Participants:',
  ];

  participants.forEach((participant, index) => {
    const contribution = formatMetric(participant.progress, goalType, currencyCode);
    const goal = formatMetric(participant.goalTarget, goalType, currencyCode);
    const status = participant.status === 'completed' || participant.progress >= participant.goalTarget
      ? 'Completed'
      : 'In progress';
    lines.push(`${index + 1}. ${participant.name} - ${contribution} of ${goal} - ${status}`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const safeTitle = task.title.replace(/[^a-z0-9-_]+/gi, '_');
  triggerFileDownload(blob, `Task_Report_${safeTitle}.txt`);
}

export async function downloadTaskReportPdf(report) {
  if (!report?.task) {
    return;
  }
  const element = createElement(TaskReportDocument, { report });
  const blob = await pdf(element).toBlob();
  const safeTitle = report.task.title.replace(/[^a-z0-9-_]+/gi, '_');
  triggerFileDownload(blob, `Task_Report_${safeTitle}.pdf`);
}

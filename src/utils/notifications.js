const ICON_MAP = {
  success: 'fas fa-check-circle',
  error: 'fas fa-exclamation-circle',
  warning: 'fas fa-exclamation-triangle',
  info: 'fas fa-info-circle',
};

const COLOR_MAP = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

export function createNotification({ id, message, description, type = 'info', duration = 4000 } = {}) {
  const safeType = ICON_MAP[type] ? type : 'info';
  return {
    id,
    type: safeType,
    message,
    description,
    duration,
    iconClass: ICON_MAP[safeType],
    colorClass: COLOR_MAP[safeType],
  };
}

export const NotificationIcons = ICON_MAP;
export const NotificationColors = COLOR_MAP;

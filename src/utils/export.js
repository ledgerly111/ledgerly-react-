const DEFAULT_EXPORT_KEYS = [
  'companyName',
  'selectedCountry',
  'users',
  'products',
  'customers',
  'sales',
  'expenses',
  'invoices',
  'teams',
  'announcements',
  'messages',
  'stockRequests',
  'journal',
  'chartOfAccounts',
  'categories',
  'expenseCategories',
  'lowStockThreshold',
  'quickSale',
  'aiSettings',
  'aiChatHistory',
  'aiInsights',
  'botAnalysis',
  'serverUrl',
  'currentUser',
  'currentView',
  'currentTeamId',
];

function sanitizeFileName(value) {
  if (!value || typeof value !== 'string') {
    return 'ledgerly';
  }
  const trimmed = value.trim().toLowerCase();
  const replaced = trimmed.replace(/[^a-z0-9]+/gi, '-');
  const cleaned = replaced.replace(/^-+|-+$/g, '');
  return cleaned || 'ledgerly';
}

function buildBusinessSnapshot(state, keys = DEFAULT_EXPORT_KEYS) {
  const snapshot = {};
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(state, key)) {
      snapshot[key] = state[key];
    }
  });
  return {
    exportedAt: new Date().toISOString(),
    companyName: state.companyName ?? 'Ledgerly',
    data: snapshot,
  };
}

function triggerJsonDownload(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportBusinessData(state, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { success: false, error: new Error('Export is only available in the browser context.') };
  }
  try {
    const { keys = DEFAULT_EXPORT_KEYS, filenamePrefix = 'business-data' } = options;
    const payload = buildBusinessSnapshot(state, keys);
    const prefix = sanitizeFileName(state?.companyName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}-${filenamePrefix}-${timestamp}.json`;
    triggerJsonDownload(payload, filename);
    return { success: true, filename, payload };
  } catch (error) {
    console.error('Failed to export business data', error);
    return { success: false, error };
  }
}

export function exportJson(data, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { success: false, error: new Error('Export is only available in the browser context.') };
  }
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to export JSON', error);
    return { success: false, error };
  }
}

export { buildBusinessSnapshot };


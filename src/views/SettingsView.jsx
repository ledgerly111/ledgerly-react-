import { useEffect, useMemo, useState } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';

const THEME_OPTIONS = [
  {
    id: 'default',
    title: 'Default Dark',
    description: 'Balanced contrast for daily operations.',
    cardStyle: { backgroundColor: '#0f1419' },
    previewStyle: { background: 'linear-gradient(135deg, #0f1419, #1a1f2e)' },
    previewClassName: 'text-white font-bold',
    titleClassName: 'text-white',
    descriptionClassName: 'text-gray-400',
  },
  {
    id: 'theme-light',
    title: 'Clear White',
    description: 'Bright, high clarity visuals for offices.',
    cardStyle: { backgroundColor: '#ffffff' },
    previewStyle: { background: '#f8f9fa' },
    previewClassName: 'text-gray-900 font-bold',
    titleClassName: 'text-gray-900',
    descriptionClassName: 'text-gray-600',
  },
  {
    id: 'theme-black',
    title: 'Pitch Black',
    description: 'Deep blacks for command centres and late nights.',
    cardStyle: { backgroundColor: '#000000' },
    previewStyle: { background: 'linear-gradient(135deg, #000000, #0c0c0c)' },
    previewClassName: 'text-white font-bold',
    titleClassName: 'text-white',
    descriptionClassName: 'text-gray-500',
  },
];

const LANGUAGE_OPTIONS = [
  { id: 'English', label: 'English' },
  { id: 'Arabic', label: 'Arabic' },
];

export default function SettingsView() {
  const state = useAppState();
  const actions = useAppActions();
  const {
    theme,
    aiSettings = {},
    currentUser,
    companyName,
    lowStockThreshold,
    hasFeaturePermission,
  } = state;

  const normalizedTheme = theme && theme !== 'dark-theme' ? theme : 'default';
  const currentRole = currentUser?.role ?? 'guest';
  const canManageCompany = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'settings.manage');
    }
    return ['admin', 'manager'].includes(currentRole);
  }, [hasFeaturePermission, currentUser?.id, currentRole]);
  const canAccessAdvancedSettings = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'settings.advanced');
    }
    return currentRole === 'admin';
  }, [hasFeaturePermission, currentUser?.id, currentRole]);

  const {
    language = 'English',
    highlightKeywords = false,
    highlightNumbers = false,
  } = aiSettings;

  const [companyNameValue, setCompanyNameValue] = useState(companyName ?? '');
  const [lowStockValue, setLowStockValue] = useState(String(lowStockThreshold ?? 0));

  useEffect(() => {
    setCompanyNameValue(companyName ?? '');
  }, [companyName]);

  useEffect(() => {
    setLowStockValue(String(lowStockThreshold ?? 0));
  }, [lowStockThreshold]);

  const handleThemeSelect = (value) => {
    actions.setTheme(value);
    actions.pushNotification({
      type: 'success',
      message: 'Theme updated',
      description: `Switched to the ${THEME_OPTIONS.find((option) => option.id === value)?.title ?? 'selected'} theme.`,
    });
  };

  const handleLanguageChange = (value) => {
    if (language === value) return;
    actions.setAiSettings({
      ...aiSettings,
      language: value,
    });
  };

  const handleAiToggle = (key) => {
    actions.setAiSettings({
      ...aiSettings,
      [key]: !aiSettings[key],
    });
  };

  const handleCompanySubmit = (event) => {
    event.preventDefault();
    if (!canManageCompany) {
      actions.pushNotification({
        type: 'warning',
        message: 'You do not have permission to update company settings.',
      });
      return;
    }
    const trimmedName = companyNameValue.trim() || 'Your Company';
    const parsedThreshold = Number.parseInt(lowStockValue, 10);
    const normalizedThreshold = Number.isNaN(parsedThreshold) || parsedThreshold < 0 ? 0 : parsedThreshold;

    actions.setCompanyName(trimmedName);
    actions.setLowStockThreshold(normalizedThreshold);
    actions.pushNotification({
      type: 'success',
      message: 'Company settings saved',
      description: 'Branding details and alerts updated.',
    });
  };

  const handleExportData = () => {
    if (!canAccessAdvancedSettings) {
      actions.pushNotification({
        type: 'warning',
        message: 'You do not have permission to export business data.',
      });
      return;
    }
    actions.pushNotification({
      type: 'info',
      message: 'Export queued',
      description: 'Full data export workflow will arrive in a future release.',
    });
  };

  const handleResetData = () => {
    if (!canAccessAdvancedSettings) {
      actions.pushNotification({
        type: 'warning',
        message: 'You do not have permission to reset the application.',
      });
      return;
    }
    actions.pushNotification({
      type: 'warning',
      message: 'Reset unavailable',
      description: 'Contact an administrator to run a secure reset.',
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-gray-400">Configure your workspace experience and preferences.</p>
      </div>

      <section className="perplexity-card p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <i className="fas fa-paint-brush text-teal-400 mr-2" />
          Appearance
        </h3>
        <p className="text-gray-400 mb-4">Choose a theme that suits your style.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {THEME_OPTIONS.map((option) => {
            const isSelected = normalizedTheme === option.id;
            const borderClass = isSelected ? 'border-accent-primary shadow-lg' : 'border-gray-700 hover:border-accent-primary';
            return (
              <button
                key={option.id}
                type="button"
                className={`p-4 rounded-xl border-2 transition-all text-left md:text-center focus:outline-none focus:ring-2 focus:ring-accent-primary ${borderClass}`}
                onClick={() => handleThemeSelect(option.id)}
                style={option.cardStyle}
                aria-pressed={isSelected}
              >
                <div
                  className="w-full h-16 rounded-lg mb-3 flex items-center justify-center"
                  style={option.previewStyle}
                >
                  <span className={option.previewClassName}>Aa</span>
                </div>
                <h4 className={`font-semibold ${option.titleClassName}`}>{option.title}</h4>
                <p className={`text-sm mt-2 ${option.descriptionClassName}`}>{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="perplexity-card p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <i className="fas fa-robot text-purple-400 mr-2" />
          AI Preferences
        </h3>
        <p className="text-gray-400 mb-4">Tune how Benka AI responds and formats information.</p>
        <div className="ai-settings-panel">
          <div className="ai-settings-panel-content">
            <div className="ai-settings-section">
              <div className="ai-settings-section-header">
                <div className="ai-settings-section-icon">
                  <i className="fas fa-language" />
                </div>
                <div>
                  <h4>Language</h4>
                  <p>Select the language Benka AI should respond with.</p>
                </div>
              </div>
              <div className="ai-settings-chip-group">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`ai-settings-chip ${language === option.id ? 'active' : ''}`}
                    aria-pressed={language === option.id}
                    onClick={() => handleLanguageChange(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-settings-section">
              <div className="ai-settings-section-header">
                <div className="ai-settings-section-icon">
                  <i className="fas fa-highlighter" />
                </div>
                <div>
                  <h4>Answer Styling</h4>
                  <p>Control how insights are highlighted inside responses.</p>
                </div>
              </div>
              <div className="ai-settings-toggle-group">
                <button
                  type="button"
                  className={`ai-settings-toggle ${highlightKeywords ? 'active' : ''}`}
                  aria-pressed={highlightKeywords}
                  onClick={() => handleAiToggle('highlightKeywords')}
                >
                  <div className="ai-toggle-label">
                    <span>Highlight Keywords</span>
                    <small>Emphasize important terms and concepts.</small>
                  </div>
                  <div className="ai-toggle-switch"><span /></div>
                  <span className="ai-toggle-status">{highlightKeywords ? 'On' : 'Off'}</span>
                </button>
                <button
                  type="button"
                  className={`ai-settings-toggle ${highlightNumbers ? 'active' : ''}`}
                  aria-pressed={highlightNumbers}
                  onClick={() => handleAiToggle('highlightNumbers')}
                >
                  <div className="ai-toggle-label">
                    <span>Highlight Numbers</span>
                    <small>Spot KPIs and financial metrics quickly.</small>
                  </div>
                  <div className="ai-toggle-switch"><span /></div>
                  <span className="ai-toggle-status">{highlightNumbers ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {canManageCompany ? (
        <section className="perplexity-card p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <i className="fas fa-building text-blue-400 mr-2" />
            Company Information
          </h3>
          <form className="space-y-4" onSubmit={handleCompanySubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-300 mb-2">Company Name</span>
                <input
                  type="text"
                  className="form-input w-full"
                  value={companyNameValue}
                  onChange={(event) => setCompanyNameValue(event.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-300 mb-2">Low Stock Threshold</span>
                <input
                  type="number"
                  min="0"
                  className="form-input w-full"
                  value={lowStockValue}
                  onChange={(event) => setLowStockValue(event.target.value)}
                  required
                />
              </label>
            </div>
            <div className="flex justify-start pt-4">
              <button type="submit" className="perplexity-button">
                Save Changes
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {canAccessAdvancedSettings ? (
        <section className="perplexity-card p-6 border-l-4 border-red-500">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <i className="fas fa-shield-alt text-red-400 mr-2" />
            Advanced Settings
          </h3>
          <div className="space-y-4">
            <p className="text-gray-400">Manage security and critical data. Changes here are permanent.</p>
            <button
              type="button"
              onClick={handleExportData}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-xl w-full text-left"
            >
              <i className="fas fa-download mr-2" />
              Export All Business Data
            </button>
            <button
              type="button"
              onClick={handleResetData}
              className="bg-red-800 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl w-full text-left"
            >
              <i className="fas fa-trash mr-2" />
              Clear All Data (Reset Application)
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

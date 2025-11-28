import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { GCC_COUNTRIES } from '../constants/gccCountries.js';
import BubbleNewIcon from './icons/BubbleNewIcon.jsx';

function buildMenu(aiMode) {
  return [
    {
      key: 'company-pulse',
      title: 'Company Pulse',
      items: [
        { key: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard', roles: ['admin', 'manager', 'worker'] },
        {
          key: 'navigate-to-ai-or-bot',
          icon: aiMode === 'ai' ? 'fas fa-crosshairs' : 'fas fa-robot',
          label: aiMode === 'ai' ? 'Benka AI' : 'AccuraBot',
          roles: ['admin', 'manager', 'worker'],
        },
        { key: 'inbox', icon: 'fas fa-envelope', label: 'Inbox', roles: ['admin', 'manager', 'worker'] },
      ],
    },
    {
      key: 'operations',
      title: 'Operations',
      items: [
        { key: 'stock-requests', icon: 'fas fa-boxes-stacked', label: 'Tasks', roles: ['admin', 'manager', 'worker'] },
        { key: 'products', icon: 'fas fa-box', label: 'Products', roles: ['admin', 'manager', 'worker'] },
        { key: 'customers', icon: 'fas fa-users', label: 'Customers', roles: ['admin', 'manager', 'worker'] },
        { key: 'sales', icon: 'fas fa-shopping-cart', label: 'Sales', roles: ['admin', 'manager', 'worker'] },
        { key: 'expenses', icon: 'fas fa-receipt', label: 'Expenses', roles: ['admin', 'manager', 'worker'] },
        { key: 'invoices', icon: 'fas fa-file-invoice', label: 'Invoices', roles: ['admin', 'manager', 'worker'] },
        {
          key: 'purchasing',
          icon: 'fas fa-truck-loading',
          label: 'Purchasing',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'purchasing.manage',
        },
      ],
    },
    {
      key: 'finance',
      title: 'Finance Workspace',
      items: [
        {
          key: 'journal',
          icon: 'fas fa-book fa-fw',
          label: 'General Journal',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'accounting.view',
        },
        {
          key: 'ledger',
          icon: 'fas fa-book-open fa-fw',
          label: 'Ledger',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'accounting.view',
        },
        {
          key: 'trial-balance',
          icon: 'fas fa-balance-scale fa-fw',
          label: 'Trial Balance',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'accounting.view',
        },
        {
          key: 'chart-of-accounts',
          icon: 'fas fa-list-ol fa-fw',
          label: 'Chart of Accounts',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'accounting.view',
        },
      ],
    },
    {
      key: 'insights',
      title: 'Insights & Reports',
      items: [
        {
          key: 'pnl',
          icon: 'fas fa-chart-line fa-fw',
          label: 'Profit & Loss',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'reports.view',
        },
        {
          key: 'balance-sheet',
          icon: 'fas fa-file-alt fa-fw',
          label: 'Balance Sheet',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'reports.view',
        },
        {
          key: 'reports',
          icon: 'fas fa-chart-bar',
          label: 'Reports Hub',
          roles: ['admin', 'manager', 'worker'],
          featureGate: 'reports.view',
        },
      ],
    },
    {
      key: 'people',
      title: 'People & Supervision',
      items: [
        {
          key: 'supervision',
          icon: 'fas fa-user-shield',
          label: 'Supervision',
          roles: ['admin', 'manager', 'worker'],
          requiresSupervisionAccess: true,
        },
        { key: 'employees', icon: 'fas fa-user-tie', label: 'Employees', roles: ['admin', 'manager'] },
      ],
    },
    {
      key: 'studio',
      title: 'Studios & Culture',
      items: [
        { key: 'owl-studios', icon: 'fas fa-feather-alt', label: 'Owl Studios', roles: ['admin', 'manager'] },
      ],
    },
    {
      key: 'system',
      title: 'System',
      items: [
        { key: 'owl-logs', icon: 'fas fa-scroll', label: 'Owl Logs', roles: ['admin', 'manager'] },
        { key: 'settings', icon: 'fas fa-cog', label: 'Settings', roles: ['admin', 'manager', 'worker'] },
      ],
    },
  ];
}

export default function Sidebar() {
  const state = useAppState();
  const actions = useAppActions();

  const aiMode = state.aiMode ?? 'ai';
  const menuSections = useMemo(() => buildMenu(aiMode), [aiMode]);
  const currentRole = state.currentUser?.role ?? 'guest';
  const currentUserId = state.currentUser?.id ?? null;
  const hasFeaturePermission = state.hasFeaturePermission;
  const sidebarCompany = state.companyName ?? 'Your Company';
  const countryInfo = GCC_COUNTRIES[state.selectedCountry] ?? GCC_COUNTRIES.AE;
  const workerHasActiveSupervision = useMemo(() => {
    if (currentRole !== 'worker' || currentUserId == null) {
      return false;
    }
    const byEmployee = state.supervisionDirectory?.byEmployee ?? {};
    const links = byEmployee[String(currentUserId)] ?? [];
    return Array.isArray(links) && links.some((link) => link?.status === 'active');
  }, [state.supervisionDirectory, currentRole, currentUserId]);

  const canViewItem = useCallback((item) => {
    if (!item.roles.includes(currentRole)) {
      return false;
    }
    if (item.key === 'supervision' && item.requiresSupervisionAccess) {
      if (currentRole === 'worker') {
        return workerHasActiveSupervision;
      }
    }
    if (item.featureGate) {
      if (currentRole === 'admin' || currentRole === 'manager') {
        return true;
      }
      if (currentRole === 'worker') {
        if (typeof hasFeaturePermission === 'function' && currentUserId != null) {
          return hasFeaturePermission(currentUserId, item.featureGate);
        }
        return false;
      }
    }
    return true;
  }, [currentRole, currentUserId, workerHasActiveSupervision, hasFeaturePermission]);

  const visibleSections = useMemo(
    () => menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canViewItem(item)),
      }))
      .filter((section) => section.items.length > 0),
    [menuSections, canViewItem],
  );

  const unreadCount = useMemo(() => (
    Array.isArray(state.messages)
      ? state.messages.filter((message) => !message.read).length
      : 0
  ), [state.messages]);
  const [expandedSections, setExpandedSections] = useState(() => {
    if (typeof window === 'undefined') {
      return {};
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem('ledgerly.sidebar.expanded') ?? '{}');
      const next = {};
      visibleSections.forEach((section) => {
        const storedValue = stored?.[section.key];
        next[section.key] = typeof storedValue === 'boolean' ? storedValue : true;
      });
      return next;
    } catch (error) {
      console.warn('Failed to restore sidebar state', error);
      const fallback = {};
      visibleSections.forEach((section) => {
        fallback[section.key] = true;
      });
      return fallback;
    }
  });

  useEffect(() => {
    setExpandedSections((previous) => {
      const next = {};
      visibleSections.forEach((section) => {
        if (typeof previous[section.key] === 'boolean') {
          next[section.key] = previous[section.key];
        } else {
          next[section.key] = true;
        }
      });
      const keys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      const sameLength = keys.length === nextKeys.length;
      const sameValues = sameLength && nextKeys.every((key) => previous[key] === next[key]);
      return sameValues ? previous : next;
    });
  }, [visibleSections]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem('ledgerly.sidebar.expanded', JSON.stringify(expandedSections));
    } catch (error) {
      console.warn('Failed to persist sidebar state', error);
    }
  }, [expandedSections]);

  const toggleSection = useCallback((sectionKey) => {
    setExpandedSections((previous) => ({
      ...previous,
      [sectionKey]: !(previous[sectionKey] ?? true),
    }));
  }, []);

  const handleNavigation = useCallback((itemKey) => {
    if (itemKey === 'navigate-to-ai-or-bot') {
      const isBot = aiMode === 'bot';
      const targetView = isBot ? 'bot' : 'accura-ai';
      if (!isBot) {
        actions.showAiCategories();
      }
      actions.setView(targetView);
      actions.setMobileMenu(false);
      return;
    }

    actions.setView(itemKey);
    actions.setMobileMenu(false);
  }, [actions, aiMode]);

  const renderMenuSections = () => (
    <div className="space-y-5">
      {visibleSections.map((section) => {
        const isExpanded = expandedSections[section.key] ?? true;
        return (
          <div key={section.key} className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 transition-colors hover:border-sky-500/50 hover:text-sky-200"
              onClick={() => toggleSection(section.key)}
              aria-expanded={isExpanded}
            >
              <span>{section.title}</span>
              <i
                className={`fas fa-chevron-down text-[10px] transition-transform duration-150 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
            {isExpanded ? (
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isAiBotLink = item.key === 'navigate-to-ai-or-bot';
                  const isActive = isAiBotLink
                    ? ['accura-ai', 'bot'].includes(state.currentView)
                    : state.currentView === item.key;
                  const shineClass = isAiBotLink
                    ? aiMode === 'ai'
                      ? 'ai-icon-shine'
                      : 'bot-icon-shine'
                    : '';

                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        data-action={item.key}
                        className={`menu-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleNavigation(item.key)}
                      >
                        {isAiBotLink ? (
                          <span className={`sidebar__ai-icon ${shineClass}`}>
                            <BubbleNewIcon size={24} />
                          </span>
                        ) : (
                          <i className={`${item.icon} fa-fw ${shineClass}`}></i>
                        )}
                        <span className="font-medium">{item.label}</span>
                        {item.key === 'inbox' && unreadCount > 0 ? (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  const sidebarInner = (
    <div className="p-6">
      <div className="flex items-center mb-8 gap-3">
        <div id="sidebar-logo-container" className="animated-header-container flex items-center gap-3">
          <span className="material-symbols-outlined owl-logo-icon text-4xl md:text-5xl">owl</span>
          <span className="text-2xl font-bold text-white tracking-wide">Owlio</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Workspace</h3>
      {renderMenuSections()}

      <div className="mt-8 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/50">
        <div className="text-center">
          <h4 className="text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent mb-1">
            {sidebarCompany}
          </h4>
          <p className="text-gray-400 text-xs">Powered by Benka AI</p>
          <div className="mt-2 text-xs text-gray-500">
            {countryInfo.currency} - {countryInfo.name.split(' ')[0]}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div id="mobile-sidebar" className={`mobile-sidebar ${state.mobileMenuOpen ? 'open' : ''}`}>
        {sidebarInner}
      </div>

      <div className="desktop-sidebar">{sidebarInner}</div>
    </>
  );
}






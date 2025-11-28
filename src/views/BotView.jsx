import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { AccuraBot } from '../utils/ai.js';
import { formatCurrency } from '../utils/currency.js';
function areAnalysesEqual(a, b) {
  try {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  } catch (error) {
    console.error('Failed to compare bot analyses', error);
    return false;
  }
}



const INITIAL_CHAT = [
  {
    id: 'bot-welcome',
    sender: 'bot',
    html: true,
    content:
      "Hello! I'm your AccuraBot Chat Helper. Type a command to get instant insights. Try: <span class=\"font-bold\">#credit</span>, <span class=\"font-bold\">#sales</span>, or <span class=\"font-bold\">#lowstock</span>.",
  },
];

const QUICK_ACTION_VIEWS = {
  'add-employee': 'employees',
  'view-reports': 'reports',
  settings: 'settings',
  'add-product': 'products',
  'view-employees': 'employees',
  'add-sale': 'sales',
  'add-expense': 'expenses',
  'add-customer': 'customers',
  'view-products': 'products',
};

function getHealthStatus(score) {
  if (score >= 85) return { label: 'Excellent', color: 'text-emerald-400' };
  if (score >= 70) return { label: 'Healthy', color: 'text-green-300' };
  if (score >= 50) return { label: 'Stable', color: 'text-yellow-300' };
  return { label: 'At Risk', color: 'text-red-300' };
}

export default function BotView() {
  const state = useAppState();
  const {
    setAiMode,
    setBotAnalysis,
    setView,
    pushNotification,
  } = useAppActions();
  const { aiMode, selectedCountry, botAnalysis } = state;

  const computedAnalysis = useMemo(() => AccuraBot.analyzeApp(state), [state]);
  const [analysis, setAnalysis] = useState(computedAnalysis);
  const [chatMessages, setChatMessages] = useState(() => INITIAL_CHAT);
  const [command, setCommand] = useState('');
  const chatBoxRef = useRef(null);

  useEffect(() => {
    setAnalysis(computedAnalysis);
    if (!areAnalysesEqual(botAnalysis, computedAnalysis)) {
      setBotAnalysis(computedAnalysis);
    }
  }, [botAnalysis, computedAnalysis, setBotAnalysis]);

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages]);

  const handleToggleMode = useCallback(() => {
    const nextMode = aiMode === 'bot' ? 'ai' : 'bot';
    setAiMode(nextMode);
    pushNotification({
      type: 'info',
      message: nextMode === 'bot' ? 'AccuraBot automation engaged.' : 'Switched back to Benka AI.',
    });
  }, [aiMode, setAiMode, pushNotification]);

  const handleRefresh = useCallback(() => {
    const refreshed = AccuraBot.analyzeApp(state);
    setAnalysis(refreshed);
    setBotAnalysis(refreshed);
    pushNotification({ type: 'success', message: 'AccuraBot insights refreshed.' });
  }, [state, setBotAnalysis, pushNotification]);

  const handleQuickAction = useCallback((action) => {
    const nextView = QUICK_ACTION_VIEWS[action.id];
    if (nextView) {
      setView(nextView);
      pushNotification({ type: 'info', message: `Navigating to ${action.label}.` });
    } else {
      pushNotification({ type: 'warning', message: 'Action will be available soon.' });
    }
  }, [setView, pushNotification]);

  const handleCommandSubmit = useCallback(() => {
    const trimmed = command.trim();
    if (!trimmed) {
      return;
    }
    const timestamp = Date.now();
    const userMessage = {
      id: `user-${timestamp}`,
      sender: 'user',
      html: false,
      content: trimmed,
    };
    const responseHtml = AccuraBot.processCommand(trimmed, state, (value, options = {}) =>
      formatCurrency(value, {
        countryCode: options.countryCode ?? selectedCountry,
        showSymbol: true,
      }),
    );
    const botReply = {
      id: `bot-${timestamp + 1}`,
      sender: 'bot',
      html: true,
      content: responseHtml,
    };
    setChatMessages((prev) => [...prev, userMessage, botReply]);
    setCommand('');
  }, [command, state, selectedCountry]);

  const overview = analysis.overview ?? {};
  const health = getHealthStatus(overview.healthScore ?? 0);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="bot-pulse flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500">
            <i className="fas fa-robot fa-fw text-2xl text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bot-gradient-text">AccuraBot</h2>
            <p className="text-gray-400">Real-time monitoring, alerts, and guided actions.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>AI</span>
            <button
              type="button"
              className={`toggle-switch ${aiMode === 'bot' ? 'active' : ''}`}
              onClick={handleToggleMode}
            >
              <span className="toggle-knob" />
            </button>
            <span>Bot</span>
          </div>
          <button
            type="button"
            className="bot-button px-4 py-2 rounded-xl"
            onClick={handleRefresh}
          >
            <i className="fas fa-sync-alt mr-2" />Refresh
          </button>
        </div>
      </div>

      <div className="bot-card p-6 slide-up">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-3">
            <h3 className="text-xl font-bold text-white">AccuraBot Monitoring Active</h3>
            <p className="text-gray-300 leading-relaxed">
              AccuraBot is monitoring sales momentum, cash flow, inventory thresholds, and inbox activity so you can react faster.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['Currency Monitor', 'Inventory', 'Smart Alerts', 'Live Analysis'].map((label) => (
                <div key={label} className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center text-sm font-semibold text-green-300">
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-6 text-center lg:w-64">
            <div className="text-sm font-semibold uppercase tracking-wide text-gray-400">Health Score</div>
            <div className={`text-4xl font-bold ${health.color}`}>{overview.healthScore ?? 0}</div>
            <div className="text-sm font-medium text-white">{health.label}</div>
            <div className="text-xs text-gray-400">
              Net profit {formatCurrency(overview.netProfit ?? 0, { countryCode: selectedCountry, showSymbol: true })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bot-card p-6 slide-up space-y-4">
          <h3 className="text-xl font-bold text-white">Performance Highlights</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-xs uppercase tracking-wide text-emerald-300">Revenue</div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(overview.revenue ?? 0, { countryCode: selectedCountry, showSymbol: true })}
              </div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="text-xs uppercase tracking-wide text-red-300">Expenses</div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(overview.expenses ?? 0, { countryCode: selectedCountry, showSymbol: true })}
              </div>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="text-xs uppercase tracking-wide text-blue-300">Customers</div>
              <div className="text-lg font-bold text-white">{overview.customers ?? 0}</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="text-xs uppercase tracking-wide text-purple-300">Employees</div>
              <div className="text-lg font-bold text-white">{overview.employees ?? 0}</div>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-white">Operational Alerts</div>
              <div>Low stock items: <span className="font-semibold text-yellow-300">{overview.lowStock ?? 0}</span></div>
            </div>
            <div>
              <div className="font-semibold text-white">Unread Messages</div>
              <div><span className="font-semibold text-sky-300">{overview.unreadMessages ?? 0}</span> waiting in inbox</div>
            </div>
          </div>
        </div>

        <div className="bot-card p-6 slide-up space-y-4">
          <h3 className="text-xl font-bold text-white">AccuraBot Alerts</h3>
          {analysis.alerts?.length ? (
            <div className="space-y-3">
              {analysis.alerts.map((alert) => (
                <button
                  key={alert.title}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-xl border border-${alert.type === 'urgent' ? 'red' : 'blue'}-500/30 bg-${alert.type === 'urgent' ? 'red' : 'blue'}-500/10 p-4 text-left transition hover:border-${alert.type === 'urgent' ? 'red' : 'blue'}-500/50`}
                  onClick={() => {
                    if (alert.action) {
                      setView(alert.action);
                    }
                  }}
                >
                  <i className={`${alert.icon} mt-1 text-lg ${alert.type === 'urgent' ? 'text-red-300' : 'text-blue-300'}`} />
                  <div>
                    <div className="font-semibold text-white">{alert.title}</div>
                    <div className="text-sm text-gray-300">{alert.message}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-4 text-sm text-gray-400">
              All clear. No active alerts from AccuraBot right now.
            </div>
          )}
        </div>
      </div>

      <div className="bot-card p-6 slide-up space-y-4">
        <h3 className="text-xl font-bold text-white">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {analysis.quickActions?.map((action) => (
            <button
              key={action.id}
              type="button"
              className={
                `group rounded-xl border border-${action.color}-500/30 bg-${action.color}-500/10 p-4 text-center transition hover:border-${action.color}-500/50`
              }
              onClick={() => handleQuickAction(action)}
            >
              <i className={`${action.icon} mb-3 text-2xl text-${action.color}-400 transition-transform group-hover:scale-110`} />
              <div className="text-sm font-medium text-white">{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      {analysis.recommendations?.length ? (
        <div className="perplexity-card p-6 slide-up space-y-4">
          <h3 className="text-xl font-bold text-white">
            <i className="fas fa-lightbulb text-green-400 mr-2" />Bot Intelligence Recommendations
          </h3>
          <div className="space-y-4">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={`${recommendation.title}-${index}`} className="rounded-xl border border-green-500/30 bg-gradient-to-r from-green-500/15 to-emerald-500/15 p-4">
                <div className="flex items-start gap-4">
                  <div className="text-2xl text-green-300">
                    <i className={recommendation.icon} />
                  </div>
                  <div className="space-y-2 text-sm text-gray-200">
                    <div className="text-lg font-bold text-white">{recommendation.title}</div>
                    <p className="text-gray-300 leading-relaxed">{recommendation.message}</p>
                    <div className="rounded-lg border-l-4 border-green-500 bg-green-500/10 px-4 py-2 font-medium text-green-300">
                      {recommendation.tip}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="perplexity-card p-6 slide-up">
        <h3 className="mb-4 flex items-center text-xl font-bold text-white">
          <i className="fas fa-comments text-green-400 mr-2" />AccuraBot Chat Helper
        </h3>
        <div ref={chatBoxRef} className="bot-chat-box mb-4 space-y-3">
          {chatMessages.map((message) => (
            <div key={message.id} className={`bot-chat-message ${message.sender}`}>
              <div className={`message-avatar ${message.sender}`}>
                {message.sender === 'bot' ? 'Bot' : 'You'}
              </div>
              <div className={`message-bubble ${message.sender}`}>
                {message.html ? (
                  <span dangerouslySetInnerHTML={{ __html: message.content }} />
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="form-input flex-1"
            placeholder="Type your command (e.g., #sales)"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCommandSubmit();
              }
            }}
          />
          <button type="button" className="bot-button px-4 py-2" onClick={handleCommandSubmit}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}


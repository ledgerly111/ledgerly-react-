import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { AI_CATEGORIES, BubbleAI } from '../utils/ai.js';
import { formatCurrency } from '../utils/currency.js';
import { GCC_COUNTRIES } from '../constants/gccCountries.js';

const GENERIC_ERROR_HTML = '<div class="ai-response-error"><h4><i class="fas fa-exclamation-triangle"></i>Connection Error</h4><p>I\'m sorry, I couldn\'t connect to the AI service. Please check your connection and try again.</p></div>';

const GENERIC_FOLLOW_UPS = [
  'Summarize today\'s performance highlights.',
  'What should I watch out for this week?',
  'Recommend next steps for the team.',
];

const FOLLOW_UP_SUGGESTIONS = {
  financial: [
    'Break down revenue versus expenses for this month.',
    'Identify any unusual spending patterns.',
    'Forecast next month\'s profit based on current momentum.',
  ],
  inventory: [
    'List products that are low on stock.',
    'Highlight items with the highest carrying cost.',
    'Suggest reorder quantities for top sellers.',
  ],
  employee: [
    'Which team members need coaching based on performance?',
    'Show commission earned by the sales team.',
    'Summarize open tasks by owner.',
  ],
  general: GENERIC_FOLLOW_UPS,
  'sales-team': [
    'Compare each salesperson\'s progress against targets.',
    'Identify deals that need immediate attention.',
    'Show the latest wins worth celebrating.',
  ],
  'expense-control': [
    'Point out expenses that spiked this month.',
    'Recommend ways to tighten spending.',
    'Compare planned budget versus actual spend.',
  ],
  'customer-relations': [
    'List VIP customers with pending balances.',
    'Suggest cross-sell opportunities for loyal clients.',
    'Show recent customer feedback trends.',
  ],
  'task-management': [
    'Summarize overdue tasks by branch.',
    'Highlight blockers slowing the team.',
    'Recommend next priority actions.',
  ],
  'my-performance': [
    'How close am I to my sales goal?',
    'What can I do to boost my commission?',
    'Who should I follow up with today?',
  ],
  'product-info': [
    'Which products are trending with customers?',
    'Provide quick talking points for our top item.',
    'Alert me to any returns or complaints.',
  ],
  'customer-support': [
    'Show clients awaiting responses.',
    'Summarize support SLAs this week.',
    'Suggest helpful responses for common questions.',
  ],
  'daily-tasks': [
    'List today\'s top three priorities.',
    'Which approvals are waiting on me?',
    'Remind me of pending follow-ups.',
  ],
};

function sanitizeHtmlResponse(html = '') {
  return html
    .trim()
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function ensureMessageIds(history) {
  if (!Array.isArray(history)) {
    return [];
  }
  return history.map((message, index) => {
    if (message?.id) {
      return message;
    }
    const suffix = message?.sender ?? 'entry';
    return { ...message, id: `ai-msg-${index}-${suffix}` };
  });
}

function extractPlainTextFromHtml(html = '') {
  if (typeof document === 'undefined' || !html) {
    return '';
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('script, style, noscript, iframe, canvas').forEach((element) => element.remove());
  return (container.textContent || container.innerText || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(text = '') {
  if (!text) {
    return [];
  }
  return text.match(/[^.!?]+[.!?]*|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

function createAudioUrlFromBase64(base64 = '') {
  if (!base64) {
    return null;
  }
  try {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      buffer[index] = binary.charCodeAt(index);
    }
    const blob = new Blob([buffer.buffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to create audio blob', error);
    return null;
  }
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function generateAiAnswer(question, context, categoryText) {
  const safeContext = context ?? {};
  const sentiment = BubbleAI.analyzeSentiment(question);
  const intro = sentiment === 'positive'
    ? 'Great news! I can see strong momentum in your figures.'
    : sentiment === 'negative'
      ? 'I noticed some pressure points we should address right away.'
      : 'Here is a grounded look at the data you asked about.';

  const insights = BubbleAI
    .generateBusinessInsights(safeContext.sales, safeContext.products, safeContext.customers, safeContext.expenses)
    .slice(0, 3)
    .map((insight) => `<li><strong>${insight.title}</strong>: ${insight.message}</li>`)
    .join('');

  const sales = Array.isArray(safeContext.sales) ? safeContext.sales : [];
  const expenses = Array.isArray(safeContext.expenses) ? safeContext.expenses : [];
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale?.total ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense?.amount ?? 0), 0);
  const net = totalRevenue - totalExpenses;
  const netClass = net >= 0 ? 'positive-amount' : 'negative-amount';
  const categoryHint = categoryText
    ? `Focusing on <strong>${categoryText}</strong>, here is what stands out right now.`
    : 'Here is what I am seeing across the business.';
  const currencyCountry = safeContext.selectedCountry ?? 'AE';

  const parts = [
    `<p>${intro}</p>`,
    `<p>${categoryHint}</p>`,
  ];

  if (insights) {
    parts.push(`<ul class="ai-insight-list">${insights}</ul>`);
  }

  parts.push(
    `<p class="text-gray-300">Current net impact sits at <span class="${netClass}">${formatCurrency(net, { countryCode: currencyCountry, showSymbol: true })}</span>. Let me know if you would like projections or deeper drill-downs.</p>`,
  );

  return parts.join('\n');
}

function buildFallbackResponse(question, context, categoryKey, categoryText) {
  const html = generateAiAnswer(question, context, categoryText);
  const followUps = (FOLLOW_UP_SUGGESTIONS[categoryKey] ?? GENERIC_FOLLOW_UPS).slice(0, 3);
  return { html, followUps };
}
function AnimatedHtml({ html, animate, onComplete, textSpeed = 18, ...rest }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    if (!animate) {
      element.innerHTML = html;
      element.removeAttribute('data-typing');
      return undefined;
    }

    let cancelled = false;
    const timeoutIds = new Set();
    element.innerHTML = '';
    element.setAttribute('data-typing', 'true');

    const temp = document.createElement('div');
    temp.innerHTML = html;

    const chunkSizeForLength = (length) => {
      if (length > 800) return 6;
      if (length > 400) return 4;
      if (length > 200) return 3;
      return 2;
    };

    const animateText = (text, parent) => new Promise((resolve) => {
      if (!text) {
        resolve();
        return;
      }

      const node = document.createTextNode('');
      parent.appendChild(node);

      const chunkSize = chunkSizeForLength(text.length);
      let index = 0;

      const step = () => {
        if (cancelled) {
          node.textContent = text;
          resolve();
          return;
        }

        node.textContent += text.slice(index, index + chunkSize);
        index += chunkSize;

        if (index < text.length) {
          const id = setTimeout(step, textSpeed);
          timeoutIds.add(id);
        } else {
          resolve();
        }
      };

      step();
    });

    const processNodes = async (nodes, parent) => {
      for (const node of nodes) {
        if (cancelled) {
          parent.appendChild(node.cloneNode(true));
          continue;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          await animateText(node.textContent ?? '', parent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const clone = node.cloneNode(false);
          parent.appendChild(clone);
          await processNodes(Array.from(node.childNodes), clone);
        } else {
          parent.appendChild(node.cloneNode(true));
        }
      }
    };

    const wrapper = element.closest('.ai-answer-wrapper');
    const header = wrapper?.previousElementSibling;
    if (header?.scrollIntoView) {
      header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    processNodes(Array.from(temp.childNodes), element).then(() => {
      if (cancelled) {
        return;
      }
      element.removeAttribute('data-typing');
      onComplete?.();
    });

    return () => {
      cancelled = true;
      element.removeAttribute('data-typing');
      timeoutIds.forEach((id) => clearTimeout(id));
      timeoutIds.clear();
      element.innerHTML = html;
    };
  }, [animate, html, onComplete, textSpeed]);

  return <div ref={containerRef} {...rest} />;
}

function ChatMessage({
  message,
  settings,
  reaction,
  onCopy,
  onShare,
  onNarrate,
  onReaction,
  onFollowUp,
  onAnimationComplete,
  ttsStatus,
}) {
  if (!message) {
    return null;
  }

  if (message.sender === 'user') {
    return <div className="user-question-bubble">{message.content}</div>;
  }

  if (message.sender === 'thinking') {
    return (
      <div className="ai-answer-header fade-in">
        <div className="accura-icon loading">
          <span className="material-symbols-outlined">bubble_chart</span>
        </div>
        <div className="clean-thinking-container">
          <p className="thinking-text">Thinking</p>
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  if (message.sender === 'welcome') {
    return <div className="ai-answer-body" dangerouslySetInnerHTML={{ __html: message.content }} />;
  }

  if (message.sender !== 'ai') {
    return null;
  }

  const highlightProps = {
    'data-highlight-keywords': settings?.highlightKeywords ? 'true' : 'false',
    'data-highlight-numbers': settings?.highlightNumbers ? 'true' : 'false',
  };

  const followUps = Array.isArray(message.followUps) ? message.followUps.filter(Boolean) : [];
  const showFollowUps = followUps.length > 0 && !message.animate;
  const status = ttsStatus ?? 'idle';
  const isLoadingNarration = status === 'loading';
  const isPlayingNarration = status === 'playing';
  const narrationIconClass = isLoadingNarration
    ? 'fas fa-spinner fa-spin'
    : isPlayingNarration
      ? 'fas fa-stop'
      : 'fas fa-volume-up';
  const narrationTitle = isLoadingNarration
    ? 'Generating narration...'
    : isPlayingNarration
      ? 'Stop narration'
      : 'Listen to this answer';

  const direction = message.language === 'Arabic' ? 'rtl' : 'ltr';
  const showVisualizer = isLoadingNarration || isPlayingNarration;
  const containerClasses = [
    showVisualizer ? 'tts-active' : '',
    isPlayingNarration ? 'tts-playing' : '',
    isLoadingNarration ? 'tts-loading' : '',
  ].filter(Boolean).join(' ');

  return (
    <div {...highlightProps} className={containerClasses || undefined}>
      <div className="ai-answer-header fade-in">
        <div className="accura-icon">
          <span className="material-symbols-outlined">bubble_chart</span>
        </div>
        {showVisualizer ? (
          <div
            className={[
              'audio-visualizer',
              isPlayingNarration ? 'active' : '',
              isLoadingNarration ? 'loading' : '',
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : null}
        <div>
          <div className="text-sm font-semibold text-white">Bubble AI</div>
          <div className="text-xs text-gray-400">
            Responding in {message.language ?? settings?.language ?? 'English'}
          </div>
        </div>
      </div>
      <div className="ai-answer-wrapper" data-message-id={message.id}>
        <AnimatedHtml
          className="ai-answer-body"
          dir={direction}
          html={message.content}
          animate={Boolean(message.animate)}
          onComplete={() => onAnimationComplete?.(message.id)}
        />
        <div className="ai-answer-footer">
          <button
            type="button"
            className="ai-action-btn"
            onClick={() => onShare(message)}
            title="Share response"
          >
            <i className="fas fa-share-alt"></i>
          </button>
          <button
            type="button"
            className="ai-action-btn"
            onClick={() => onCopy(message)}
            title="Copy response"
          >
            <i className="fas fa-copy"></i>
          </button>
          <button
            type="button"
            className={`ai-action-btn ${reaction === 'like' ? 'active' : ''}`}
            onClick={() => onReaction(message, reaction === 'like' ? null : 'like')}
            title="Like response"
          >
            <i className="fas fa-thumbs-up"></i>
          </button>
          <button
            type="button"
            className={`ai-action-btn ${reaction === 'dislike' ? 'active' : ''}`}
            onClick={() => onReaction(message, reaction === 'dislike' ? null : 'dislike')}
            title="Dislike response"
          >
            <i className="fas fa-thumbs-down"></i>
          </button>
          <button
            type="button"
            className="ai-action-btn ai-tts-btn"
            onClick={() => onNarrate(message)}
            title={narrationTitle}
          >
            <i className={narrationIconClass}></i>
          </button>
        </div>
      </div>
      {showFollowUps ? (
        <div className="ai-followup-section">
          <h3>Suggested follow-ups</h3>
          <div className="ai-followup-bubbles">
            {followUps.map((followUp, index) => (
              <button
                key={`${message.id}-followup-${index}`}
                type="button"
                className="ai-followup-button"
                onClick={() => onFollowUp(followUp)}
              >
                <i className="fas fa-magic"></i>
                <span>{followUp}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
export default function AccuraAIView() {
  const state = useAppState();
  const actions = useAppActions();

  const {
    aiViewPhase,
    currentAICategory,
    currentAICategoryText,
    aiChatHistory,
    aiSettings,
    aiMode,
    sales,
    expenses,
    products,
    customers,
    users,
    selectedCountry,
    serverUrl,
    currentUser,
  } = state;

  const {
    startAiChatSession,
    showAiCategories,
    setAiChatHistory,
    setAiSettings,
    pushNotification,
  } = actions;

  const [draft, setDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reactions, setReactions] = useState(() => new Map());
  const [ttsStatusMap, setTtsStatusMap] = useState(() => new Map());

  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const settingsRef = useRef(null);
  const settingsTriggerRef = useRef(null);
  const historyRef = useRef(aiChatHistory);
  const ttsPlayersRef = useRef(new Map());
  const pendingRequestsRef = useRef(new Map());

  const updateTtsStatus = useCallback((messageId, status) => {
    setTtsStatusMap((prev) => {
      const next = new Map(prev);
      if (!status || status === 'idle') {
        next.delete(messageId);
      } else {
        next.set(messageId, status);
      }
      return next;
    });
  }, []);

  const cleanupTtsEntry = useCallback((entry) => {
    if (!entry) {
      return;
    }
    entry.controller?.abort();
    entry.audios?.forEach((audio) => {
      if (!audio) {
        return;
      }
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // ignore seek errors
      }
    });
    entry.objectUrls?.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore revoke failures
      }
    });
  }, []);

  const stopNarration = useCallback((messageId) => {
    const entry = ttsPlayersRef.current.get(messageId);
    if (entry) {
      cleanupTtsEntry(entry);
      ttsPlayersRef.current.delete(messageId);
    }
    updateTtsStatus(messageId, 'idle');
  }, [cleanupTtsEntry, updateTtsStatus]);

  const stopAllNarration = useCallback(() => {
    ttsPlayersRef.current.forEach((entry) => cleanupTtsEntry(entry));
    ttsPlayersRef.current.clear();
    setTtsStatusMap(new Map());
  }, [cleanupTtsEntry]);

  const abortAllPending = useCallback(() => {
    pendingRequestsRef.current.forEach((controller) => controller.abort());
    pendingRequestsRef.current.clear();
  }, []);

  const availableCategories = useMemo(() => {
    const role = currentUser?.role ?? 'worker';
    return AI_CATEGORIES[role] ?? AI_CATEGORIES.worker;
  }, [currentUser]);

  const dataContext = useMemo(() => ({
    sales,
    expenses,
    products,
    customers,
    selectedCountry,
  }), [sales, expenses, products, customers, selectedCountry]);
  useEffect(() => {
    const normalized = ensureMessageIds(aiChatHistory);
    const changed = normalized.some((message, index) => message !== aiChatHistory?.[index]);
    if (changed) {
      historyRef.current = normalized;
      setAiChatHistory(normalized);
    } else {
      historyRef.current = aiChatHistory;
    }
  }, [aiChatHistory, setAiChatHistory]);

  useEffect(() => {
    if (aiViewPhase === 'chat') {
      inputRef.current?.focus();
    } else {
      setDraft('');
      setSettingsOpen(false);
    }
  }, [aiViewPhase, currentAICategoryText]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [aiChatHistory]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) {
      return;
    }
    const entries = Array.from(ttsStatusMap.entries());
    const activeEntry = entries.find(([, status]) => status === 'playing' || status === 'loading');
    if (!activeEntry) {
      return;
    }
    const [messageId] = activeEntry;
    const target = container.querySelector('.ai-answer-wrapper[data-message-id="' + messageId + '"]');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [ttsStatusMap]);

  useEffect(() => {
    if ((aiChatHistory ?? []).length === 0) {
      setReactions(new Map());
      stopAllNarration();
    }
  }, [aiChatHistory, stopAllNarration]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    const handleClick = (event) => {
      if (settingsRef.current?.contains(event.target)) {
        return;
      }
      if (settingsTriggerRef.current?.contains(event.target)) {
        return;
      }
      setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [settingsOpen]);

  useEffect(() => () => {
    abortAllPending();
    stopAllNarration();
  }, [abortAllPending, stopAllNarration]);

  const handleCategorySelect = useCallback((category) => {
    abortAllPending();
    stopAllNarration();
    setDraft('');
    setSettingsOpen(false);
    setReactions(new Map());
    startAiChatSession(category.key, category.text);
  }, [abortAllPending, startAiChatSession, stopAllNarration]);

  const handleBackToCategories = useCallback(() => {
    abortAllPending();
    stopAllNarration();
    setDraft('');
    setSettingsOpen(false);
    setReactions(new Map());
    showAiCategories();
  }, [abortAllPending, showAiCategories, stopAllNarration]);
  const handleAsk = useCallback(async (rawQuestion, options = {}) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed) {
      return;
    }

    const idBase = `ai-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const userEntry = {
      id: `${idBase}-user`,
      sender: 'user',
      content: trimmed,
      timestamp: Date.now(),
      viaFollowUp: options.viaFollowUp ?? false,
    };
    const thinkingEntry = {
      id: `${idBase}-ai`,
      sender: 'thinking',
      timestamp: Date.now(),
    };

    const nextHistory = [...(historyRef.current ?? []), userEntry, thinkingEntry];
    historyRef.current = nextHistory;
    setAiChatHistory(nextHistory);

    setDraft('');
    setSettingsOpen(false);

    const controller = new AbortController();
    pendingRequestsRef.current.set(thinkingEntry.id, controller);

    let html = '';
    let followUps;
    let language = aiSettings.language;

    try {
      if (serverUrl) {
        const payload = {
          userQuestion: trimmed,
          contextData: {
            sales,
            expenses,
            products,
            customers,
            users,
            currency: GCC_COUNTRIES[selectedCountry]?.currency ?? 'AED',
            currentUser: currentUser ? {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            } : null,
          },
          targetLanguage: aiSettings.language,
          chatHistory: nextHistory
            .filter((entry) => entry.id !== thinkingEntry.id)
            .map((entry) => ({
              sender: entry.sender,
              content: entry.content,
            })),
        };

        const response = await fetch(`${serverUrl}/api/ask-ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          const sanitized = sanitizeHtmlResponse(data.htmlResponse ?? '');
          if (sanitized) {
            html = sanitized;
            language = data.language ?? aiSettings.language;
            const serverFollowUps = data.followUpQuestions ?? data.followUps;
            if (Array.isArray(serverFollowUps) && serverFollowUps.length) {
              followUps = serverFollowUps.filter(Boolean).slice(0, 3);
            }
          }
        } else {
          throw new Error(`AI server error: ${response.status}`);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('AI request failed', error);
      }
    } finally {
      pendingRequestsRef.current.delete(thinkingEntry.id);
    }

    if (controller.signal.aborted) {
      return;
    }

    if (!html) {
      const fallback = buildFallbackResponse(trimmed, dataContext, currentAICategory ?? 'general', currentAICategoryText);
      html = fallback.html || GENERIC_ERROR_HTML;
      followUps = fallback.followUps;
    }

    const aiEntry = {
      id: thinkingEntry.id,
      sender: 'ai',
      content: html || GENERIC_ERROR_HTML,
      language,
      animate: true,
      followUps,
      timestamp: Date.now(),
    };

    const latestHistory = historyRef.current ?? [];
    const updatedHistory = latestHistory.map((entry) => (entry.id === thinkingEntry.id ? aiEntry : entry));
    historyRef.current = updatedHistory;
    setAiChatHistory(updatedHistory);
  }, [
    aiSettings.language,
    currentAICategory,
    currentAICategoryText,
    currentUser,
    customers,
    dataContext,
    expenses,
    products,
    sales,
    selectedCountry,
    serverUrl,
    setAiChatHistory,
    users,
  ]);
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    handleAsk(draft);
  }, [draft, handleAsk]);

  const handleFollowUp = useCallback((question) => {
    handleAsk(question, { viaFollowUp: true });
  }, [handleAsk]);

  const handleAnimationComplete = useCallback((messageId) => {
    let changed = false;
    const updated = (historyRef.current ?? []).map((entry) => {
      if (entry.id === messageId && entry.animate) {
        changed = true;
        return { ...entry, animate: false };
      }
      return entry;
    });
    if (changed) {
      historyRef.current = updated;
      setAiChatHistory(updated);
    }
  }, [setAiChatHistory]);

  const handleCopy = useCallback(async (message) => {
    const text = stripHtml(message?.content ?? '');
    if (!text) {
      pushNotification({ type: 'warning', message: 'Response is empty.' });
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      pushNotification({ type: 'success', message: 'Response copied to clipboard.' });
    } catch (error) {
      console.error('Copy failed', error);
      pushNotification({ type: 'error', message: 'Unable to copy response right now.' });
    }
  }, [pushNotification]);

  const handleShare = useCallback(async (message) => {
    const text = stripHtml(message?.content ?? '');
    if (!text) {
      pushNotification({ type: 'warning', message: 'Response is empty.' });
      return;
    }
    if (navigator?.share) {
      try {
        await navigator.share({ title: 'Bubble AI Response', text });
        pushNotification({ type: 'success', message: 'Response shared.' });
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Share failed', error);
          pushNotification({ type: 'error', message: 'Unable to share right now.' });
        }
      }
      return;
    }
    pushNotification({ type: 'info', message: 'Sharing is not supported on this device yet.' });
  }, [pushNotification]);

  const handleNarrate = useCallback(async (message) => {
    const currentStatus = ttsStatusMap.get(message.id) ?? 'idle';
    if (currentStatus === 'loading' || currentStatus === 'playing') {
      stopNarration(message.id);
      return;
    }

    if (!serverUrl) {
      pushNotification({ type: 'error', message: 'Audio service is not configured yet.' });
      return;
    }

    if (typeof document !== 'undefined') {
      const wrapper = document.querySelector(`.ai-answer-wrapper[data-message-id="${message.id}"]`);
      const header = wrapper?.previousElementSibling;
      header?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const plainText = extractPlainTextFromHtml(message?.content ?? '');
    if (!plainText) {
      pushNotification({ type: 'warning', message: 'Nothing to narrate in this reply.' });
      return;
    }

    const sentences = splitIntoSentences(plainText);
    if (!sentences.length) {
      pushNotification({ type: 'warning', message: 'Nothing to narrate in this reply.' });
      return;
    }

    const controller = new AbortController();
    ttsPlayersRef.current.set(message.id, { controller, audios: [], objectUrls: [] });
    updateTtsStatus(message.id, 'loading');

    try {
      for (const sentence of sentences) {
        const response = await fetch(`${serverUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sentence, language: message.language ?? aiSettings.language }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`TTS request failed with status ${response.status}`);
        }
        const data = await response.json();
        const audioUrl = createAudioUrlFromBase64(data.audioContent ?? '');
        if (!audioUrl) {
          continue;
        }
        const currentEntry = ttsPlayersRef.current.get(message.id);
        if (!currentEntry || currentEntry.controller !== controller) {
          URL.revokeObjectURL(audioUrl);
          return;
        }
        const audio = new Audio(audioUrl);
        audio.preload = 'auto';
        currentEntry.audios.push(audio);
        currentEntry.objectUrls.push(audioUrl);
      }

      const currentEntry = ttsPlayersRef.current.get(message.id);
      if (!currentEntry || currentEntry.controller !== controller) {
        return;
      }

      if (!currentEntry.audios.length) {
        stopNarration(message.id);
        pushNotification({ type: 'warning', message: 'Nothing to narrate in this reply.' });
        return;
      }

      updateTtsStatus(message.id, 'playing');

      let index = 0;
      const playNext = () => {
        const activeEntry = ttsPlayersRef.current.get(message.id);
        if (!activeEntry) {
          return;
        }
        if (index >= activeEntry.audios.length) {
          stopNarration(message.id);
          return;
        }
        const audio = activeEntry.audios[index];
        audio.onended = () => {
          index += 1;
          playNext();
        };
        audio.onerror = () => {
          index += 1;
          playNext();
        };
        audio.play().catch((error) => {
          console.error('Failed to play narration', error);
          index += 1;
          playNext();
        });
      };

      playNext();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('TTS generation failed', error);
        pushNotification({ type: 'error', message: 'Unable to generate narration right now.' });
      }
      stopNarration(message.id);
    }
  }, [aiSettings.language, pushNotification, serverUrl, stopNarration, ttsStatusMap, updateTtsStatus]);
  const handleReaction = useCallback((message, nextState) => {
    setReactions((prev) => {
      const next = new Map(prev);
      if (!nextState) {
        next.delete(message.id);
      } else {
        next.set(message.id, nextState);
      }
      return next;
    });
  }, []);

  const handleLanguageChange = useCallback((language) => {
    if (language === aiSettings.language) {
      return;
    }
    setAiSettings({ language });
    pushNotification({ type: 'success', message: `AI responses will now use ${language}.` });
  }, [aiSettings.language, setAiSettings, pushNotification]);

  const handleToggleSetting = useCallback((key) => {
    const nextValue = !aiSettings[key];
    setAiSettings({ [key]: nextValue });
    const message = key === 'highlightKeywords'
      ? `Keyword highlighting ${nextValue ? 'enabled' : 'disabled'}.`
      : `Number highlighting ${nextValue ? 'enabled' : 'disabled'}.`;
    pushNotification({ type: 'success', message });
  }, [aiSettings, setAiSettings, pushNotification]);

  if (aiViewPhase === 'selection') {
    return (
      <div className="space-y-6 fade-in">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="ai-header-icon ai-pulse">
              <span className="material-symbols-outlined ai-icon-gradient">bubble_chart</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold ai-gradient-text">Bubble AI Assistant</h2>
              <p className="text-gray-400">Select a category to kick off a guided conversation.</p>
            </div>
          </div>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableCategories.map((category, index) => (
            <button
              key={category.key}
              type="button"
              className="ai-category-card scale-in text-left"
              style={{ '--bg-image': `url(${category.image})`, animationDelay: `${index * 100}ms` }}
              onClick={() => handleCategorySelect(category)}
            >
              <div className="ai-category-icon-wrapper">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: category.icon }}
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4">{category.text}</h3>
              <p className="text-sm text-white/70 mt-1 mb-4 flex-grow">{category.subtext}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const modeLabel = aiMode === 'ai' ? 'Bubble AI' : 'AccuraBot';
  const canSend = draft.trim().length > 0;

  return (
    <div className="ai-chat-view-container fade-in">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{currentAICategoryText ?? 'Conversation'}</h3>
          <p className="text-xs text-gray-400">Mode: {modeLabel}</p>
        </div>
        <button
          type="button"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
          onClick={handleBackToCategories}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Categories
        </button>
      </div>
      <div ref={chatContainerRef} className="ai-chat-log">
        {(aiChatHistory ?? []).map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            settings={aiSettings}
            reaction={reactions.get(message.id) ?? null}
            onCopy={handleCopy}
            onShare={handleShare}
            onNarrate={handleNarrate}
            onReaction={handleReaction}
            onFollowUp={handleFollowUp}
            onAnimationComplete={handleAnimationComplete}
            ttsStatus={ttsStatusMap.get(message.id) ?? 'idle'}
          />
        ))}
      </div>
      <form className="ai-chat-input-bar" onSubmit={handleSubmit}>
        <div className="ai-input-row">
          <button
            type="button"
            className={`ai-input-icon-button${settingsOpen ? ' active' : ''}`}
            onClick={() => setSettingsOpen((open) => !open)}
            ref={settingsTriggerRef}
            title="AI settings"
          >
            <i className="fas fa-sliders-h"></i>
          </button>
          <input
            ref={inputRef}
            type="text"
            className="form-input flex-1"
            placeholder="Ask a follow-up question..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="ai-send-button" disabled={!canSend} aria-label="Send message">
            <i className="fas fa-arrow-up"></i>
          </button>
        </div>
        {settingsOpen ? (
          <div ref={settingsRef} className="ai-settings-panel">
            <div className="ai-settings-panel-content">
              <div className="ai-settings-section">
                <div className="ai-settings-section-header">
                  <div className="ai-settings-section-icon">
                    <i className="fas fa-language"></i>
                  </div>
                  <div>
                    <h4>Language</h4>
                    <p>Select the language Bubble AI should respond with.</p>
                  </div>
                </div>
                <div className="ai-settings-chip-group">
                  <button
                    type="button"
                    className={`ai-settings-chip ${aiSettings.language === 'English' ? 'active' : ''}`}
                    aria-pressed={aiSettings.language === 'English'}
                    onClick={() => handleLanguageChange('English')}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={`ai-settings-chip ${aiSettings.language === 'Arabic' ? 'active' : ''}`}
                    aria-pressed={aiSettings.language === 'Arabic'}
                    onClick={() => handleLanguageChange('Arabic')}
                  >
                    Arabic
                  </button>
                </div>
              </div>
              <div className="ai-settings-section">
                <div className="ai-settings-section-header">
                  <div className="ai-settings-section-icon">
                    <i className="fas fa-highlighter"></i>
                  </div>
                  <div>
                    <h4>Answer Styling</h4>
                    <p>Control how insights are highlighted inside responses.</p>
                  </div>
                </div>
                <div className="ai-settings-toggle-group">
                  <button
                    type="button"
                    className={`ai-settings-toggle ${aiSettings.highlightKeywords ? 'active' : ''}`}
                    aria-pressed={aiSettings.highlightKeywords}
                    onClick={() => handleToggleSetting('highlightKeywords')}
                  >
                    <div className="ai-toggle-label">
                      <span>Highlight Keywords</span>
                      <small>Emphasize important terms and concepts.</small>
                    </div>
                    <div className="ai-toggle-switch"><span></span></div>
                    <span className="ai-toggle-status">{aiSettings.highlightKeywords ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    type="button"
                    className={`ai-settings-toggle ${aiSettings.highlightNumbers ? 'active' : ''}`}
                    aria-pressed={aiSettings.highlightNumbers}
                    onClick={() => handleToggleSetting('highlightNumbers')}
                  >
                    <div className="ai-toggle-label">
                      <span>Highlight Numbers</span>
                      <small>Spot KPIs and financial metrics quickly.</small>
                    </div>
                    <div className="ai-toggle-switch"><span></span></div>
                    <span className="ai-toggle-status">{aiSettings.highlightNumbers ? 'On' : 'Off'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}









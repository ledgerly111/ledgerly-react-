import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { AI_CATEGORIES, BenkaAI } from '../utils/ai.js';
import { formatCurrency } from '../utils/currency.js';
import BubbleBIcon from '../components/icons/BubbleBIcon.jsx';
import { GCC_COUNTRIES } from '../constants/gccCountries.js';

const GENERIC_ERROR_HTML = '<div class="ai-response-error"><h4><i class="fas fa-exclamation-triangle"></i>Connection Error</h4><p>I\'m sorry, I couldn\'t connect to the AI service. Please check your connection and try again.</p></div>';

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

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function generateAiAnswer(question, context, categoryText) {
  const safeContext = context ?? {};
  const sentiment = BenkaAI.analyzeSentiment(question);
  const intro = sentiment === 'positive'
    ? 'Great news! I can see strong momentum in your figures.'
    : sentiment === 'negative'
      ? 'I noticed some pressure points we should address right away.'
      : 'Here is a grounded look at the data you asked about.';

  const insights = BenkaAI
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
  return { html };
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
  onReaction,
  onAnimationComplete,
}) {
  if (!message) {
    return null;
  }

  if (message.sender === 'user') {
    return (
      <div className="chat-message chat-message--user">
        <div className="chat-message__avatar">
          <div style={{ width: '40px', height: '40px' }}></div>
        </div>
        <div className="chat-message__body">
          <div className="user-question-bubble">{message.content}</div>
        </div>
      </div>
    );
  }

  if (message.sender === 'thinking') {
    return (
      <div className="chat-message chat-message--ai thinking-message">
        <div className="chat-message__avatar">
          <div className="accura-icon loading">
            <BubbleBIcon size={32} />
          </div>
        </div>
        <div className="chat-message__body">
          <div className="ai-answer-header fade-in">
            <div className="clean-thinking-container">
              <p className="thinking-text">Thinking</p>
              <div className="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.sender === 'welcome') {
    return (
      <div className="chat-message chat-message--ai">
        <div className="chat-message__avatar">
          <div className="accura-icon">
            <BubbleBIcon size={32} />
          </div>
        </div>
        <div className="chat-message__body">
          <div
            className="ai-answer-body"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
      </div>
    );
  }

  if (message.sender !== 'ai') {
    return null;
  }

  const highlightProps = {
    'data-highlight-keywords': settings?.highlightKeywords ? 'true' : 'false',
    'data-highlight-numbers': settings?.highlightNumbers ? 'true' : 'false',
  };

  const direction = message.language === 'Arabic' ? 'rtl' : 'ltr';
  const handleResponseAnimationComplete = useCallback(() => {
    onAnimationComplete?.(message.id);
  }, [message.id, onAnimationComplete]);

  return (
    <div className="chat-message chat-message--ai" {...highlightProps}>
      <div className="chat-message__avatar">
        <div className="accura-icon">
          <BubbleBIcon size={32} />
        </div>
      </div>
      <div className="chat-message__body">
        <div className="ai-answer-header fade-in">
          <div>
            <div className="text-sm font-semibold text-white">Benka AI</div>
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
            onComplete={handleResponseAnimationComplete}
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
          </div>
        </div>
      </div>
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
    hasFeaturePermission,
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

  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const settingsRef = useRef(null);
  const settingsTriggerRef = useRef(null);
  const historyRef = useRef(aiChatHistory);
  const pendingRequestsRef = useRef(new Map());

  const canUseAI = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'ai.access');
    }
    return true;
  }, [hasFeaturePermission, currentUser?.id]);

  const abortAllPending = useCallback(() => {
    pendingRequestsRef.current.forEach((controller) => controller.abort());
    pendingRequestsRef.current.clear();
  }, []);

  const availableCategories = useMemo(() => {
    if (!canUseAI) {
      return [];
    }
    const role = currentUser?.role ?? 'worker';
    return AI_CATEGORIES[role] ?? AI_CATEGORIES.worker;
  }, [canUseAI, currentUser]);

  const dataContext = useMemo(() => ({
    sales,
    expenses,
    products,
    customers,
    selectedCountry,
  }), [sales, expenses, products, customers, selectedCountry]);

  useEffect(() => {
    if (!canUseAI) {
      historyRef.current = aiChatHistory;
      return;
    }
    const normalized = ensureMessageIds(aiChatHistory);
    const changed = normalized.some((message, index) => message !== aiChatHistory?.[index]);
    if (changed) {
      historyRef.current = normalized;
      setAiChatHistory(normalized);
    } else {
      historyRef.current = aiChatHistory;
    }
  }, [aiChatHistory, setAiChatHistory, canUseAI]);

  useEffect(() => {
    if (!canUseAI) {
      return;
    }
    if (aiViewPhase === 'chat') {
      inputRef.current?.focus();
    } else {
      setDraft('');
      setSettingsOpen(false);
    }
  }, [aiViewPhase, currentAICategoryText, canUseAI]);

  useEffect(() => {
    if (!canUseAI) {
      return;
    }
    const container = chatContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [aiChatHistory, canUseAI]);

  useEffect(() => {
    if (!canUseAI) {
      return;
    }
    if ((aiChatHistory ?? []).length === 0) {
      setReactions(new Map());
    }
  }, [aiChatHistory, canUseAI]);

  useEffect(() => {
    if (!canUseAI) {
      return;
    }
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
  }, [settingsOpen, canUseAI]);

  useEffect(() => () => {
    if (!canUseAI) {
      return undefined;
    }
    abortAllPending();
    return undefined;
  }, [abortAllPending, canUseAI]);

  const handleCategorySelect = useCallback((category) => {
    abortAllPending();
    setDraft('');
    setSettingsOpen(false);
    setReactions(new Map());
    startAiChatSession(category.key, category.text);
  }, [abortAllPending, startAiChatSession]);

  const handleBackToCategories = useCallback(() => {
    abortAllPending();
    setDraft('');
    setSettingsOpen(false);
    setReactions(new Map());
    showAiCategories();
  }, [abortAllPending, showAiCategories]);

  const handleAsk = useCallback(async (rawQuestion) => {
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
    }

    const aiEntry = {
      id: thinkingEntry.id,
      sender: 'ai',
      content: html || GENERIC_ERROR_HTML,
      language,
      animate: true,
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

  useEffect(() => {
    if (!Array.isArray(aiChatHistory) || aiChatHistory.length === 0) {
      return;
    }
    const container = document.querySelector('.ai-chat-log');
    if (!container) {
      return;
    }
    const tables = container.querySelectorAll('.ai-answer-body table');
    tables.forEach((table) => {
      if (table.closest('.ai-table-scroll')) {
        return;
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'ai-table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }, [aiChatHistory]);

  const handleShare = useCallback(async (message) => {
    const text = stripHtml(message?.content ?? '');
    if (!text) {
      pushNotification({ type: 'warning', message: 'Response is empty.' });
      return;
    }
    if (navigator?.share) {
      try {
        await navigator.share({ title: 'Benka AI Response', text });
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

  if (!canUseAI) {
    return (
      <div className="perplexity-card p-8 text-center text-gray-400 fade-in">
        Your account does not have access to Benka AI yet.
      </div>
    );
  }

  if (aiViewPhase === 'selection') {
    return (
      <div className="space-y-6 fade-in">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="ai-header-icon ai-pulse">
              <BubbleBIcon size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold ai-gradient-text">Benka AI Assistant</h2>
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

  const modeLabel = aiMode === 'ai' ? 'Benka AI' : 'AccuraBot';
  const canSend = draft.trim().length > 0;

  return (
    <div className="ai-chat-view-container fade-in">
      <div ref={chatContainerRef} className="ai-chat-log">
        {(aiChatHistory ?? []).map((message, index) => {
          const messageKey = message.id ?? (message.timestamp ? `ai-message-${message.timestamp}-${index}` : `ai-message-${index}`);
          return (
            <ChatMessage
              key={messageKey}
              message={message}
              settings={aiSettings}
              reaction={reactions.get(message.id) ?? null}
              onCopy={handleCopy}
              onShare={handleShare}
              onReaction={handleReaction}
              onAnimationComplete={handleAnimationComplete}
            />
          );
        })}
      </div>
      <form className="ai-chat-input-bar" onSubmit={handleSubmit}>
        <div className="ai-input-row">
          <input
            ref={inputRef}
            type="text"
            className="form-input flex-1"
            placeholder="Ask a question..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className={`ai-send-button ${!draft.trim() ? 'ai-send-button--empty' : ''}`}
            disabled={!canSend}
            aria-label="Send message"
          >
            <i className="fas fa-arrow-up"></i>
          </button>
        </div>
      </form>
    </div>
  );
}

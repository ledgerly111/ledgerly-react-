import { useAppActions, useAppState } from '../context/AppContext.jsx';
import BubbleBIcon from './icons/BubbleBIcon.jsx';

export default function Navbar() {
  const state = useAppState();
  const actions = useAppActions();

  const aiIconShineClass = state.aiMode === 'ai' ? 'ai-icon-shine' : 'bot-icon-shine';
  const aiText = state.aiMode === 'ai' ? 'Benka AI' : 'AccuraBot';
  const unreadCount = Array.isArray(state.messages)
    ? state.messages.filter((message) => !message.read).length
    : 0;

  const handleQuickSale = () => {
    actions.setQuickSaleActive(true);
  };

  const handleNavigateAiOrBot = () => {
    const isBot = state.aiMode === 'bot';
    const targetView = isBot ? 'bot' : 'accura-ai';
    if (!isBot) {
      actions.showAiCategories();
    }
    actions.setView(targetView);
  };

  const handleInbox = () => {
    actions.setView('inbox');
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand-group">
          <button
            type="button"
            className="burger-menu"
            onClick={() => actions.toggleMobileMenu()}
            title="Toggle navigation"
            aria-label="Toggle navigation"
          >
            <i className="fas fa-bars text-white text-lg"></i>
          </button>

          <div className="navbar__logo" aria-hidden="true" />
        </div>

        <div className="navbar__icon-group">
          <button
            type="button"
            data-action="start-quick-sale"
            className="quick-sale-button quick-sale-pulse navbar__quick-sale-btn"
            title="Quick Sale"
            aria-label="Quick Sale"
            onClick={handleQuickSale}
          >
            <i className="fas fa-bolt text-lg"></i>
            <span className="navbar__quick-sale-text ml-2">Quick Sale</span>
          </button>

          <button
            type="button"
            data-action="navigate-to-ai-or-bot"
            className="navbar__icon-button"
            title={aiText}
            aria-label={aiText}
            onClick={handleNavigateAiOrBot}
          >
            <span className={`navbar__ai-icon ${aiIconShineClass}`}>
              <BubbleBIcon size={24} />
            </span>
          </button>

          <button
            type="button"
            data-action="inbox"
            className="navbar__icon-button navbar__icon-button--inbox"
            title="Messages"
            aria-label="Inbox"
            onClick={handleInbox}
          >
            <i className="fas fa-envelope text-lg"></i>
            {unreadCount > 0 ? <span className="navbar__badge">{unreadCount}</span> : null}
          </button>

          <button
            type="button"
            data-action="logout"
            className="navbar__icon-button navbar__logout-btn"
            title="Logout"
            aria-label="Logout"
            onClick={() => actions.logout()}
          >
            <i className="fas fa-sign-out-alt"></i>
            <span className="navbar__logout-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}





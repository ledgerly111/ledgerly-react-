import { useAppActions, useAppState } from '../context/AppContext.jsx';

const roleCards = [
  {
    role: 'admin',
    cardClass: 'user-selection-card user-selection-admin',
    icon: 'verified_user',
    title: 'Admin',
    description: 'Command every module, configure teams, and launch AI workflows.',
    tags: ['Full Suite', 'AI Control'],
  },
  {
    role: 'manager',
    cardClass: 'user-selection-card user-selection-supervision',
    icon: 'supervisor_account',
    title: 'Supervision',
    description: 'Guide performance, approve insights, and keep operations on track.',
    tags: ['Team Analytics', 'Approvals'],
  },
  {
    role: 'worker',
    cardClass: 'user-selection-card user-selection-sales',
    icon: 'trending_up',
    title: 'Sales',
    description: 'Close deals, record activity, and track live commissions effortlessly.',
    tags: ['Sales Cockpit', 'Live Earnings'],
  },
];

export default function LoginView() {
  const state = useAppState();
  const actions = useAppActions();

  const users = Array.isArray(state.users) ? state.users : [];

  const handleSelectRole = (role) => {
    const roleUsers = users.filter((user) => user.role === role);

    if (role === 'admin' || roleUsers.length === 1) {
      const selectedUser = roleUsers[0] ?? {
        id: `${role}-placeholder`,
        name: role === 'admin' ? 'Administrator' : role === 'manager' ? 'Supervisor' : 'Sales Agent',
        role,
      };
      actions.login(selectedUser, 'dashboard');
      return;
    }

    actions.setPendingRole(role);
    actions.setView('userSelection');
  };

  const handleKeyDown = (event, role) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectRole(role);
    }
  };

  return (
    <div className="login-hero">
      <div className="login-shell fade-in">
        <div className="login-brand">
          <span className="material-symbols-outlined owl-logo-icon">owl</span>
          <div>
            <h1 className="login-brand-title">Owlio</h1>
            <p className="login-brand-subtitle">AI-Powered Business Command Center</p>
          </div>
        </div>

        <p className="login-tagline">Choose your vantage point and jump into the data.</p>

        <div className="login-pill-row">
          <span className="login-pill">Benka AI Insights</span>
          <span className="login-pill">AccuraBot Automation</span>
          <span className="login-pill">GCC Ready</span>
        </div>

        <div className="user-selection-grid">
          {roleCards.map((card) => (
            <div
              key={card.role}
              className={card.cardClass}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectRole(card.role)}
              onKeyDown={(event) => handleKeyDown(event, card.role)}
              data-role={card.role}
            >
              <span className="material-symbols-outlined user-card-icon">{card.icon}</span>
              <h3 className="user-card-title">{card.title}</h3>
              <p className="user-card-description">{card.description}</p>
              <div className="user-card-tags">
                {card.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="login-footer-note">
          Precision finance | Realtime intelligence | Human-friendly AI
        </div>
      </div>
    </div>
  );
}

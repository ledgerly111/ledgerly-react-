import { useEffect, useMemo } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';

export default function UserSelectionView() {
  const state = useAppState();
  const actions = useAppActions();

  const role = state.pendingRole;

  useEffect(() => {
    if (!role) {
      actions.setView('login');
    }
  }, [actions, role]);

  if (!role) {
    return null;
  }

  const users = useMemo(() => {
    if (!Array.isArray(state.users)) {
      return [];
    }
    return state.users.filter((user) => user.role === role);
  }, [state.users, role]);

  const handleSelectUser = (user) => {
    actions.login(user, 'dashboard');
  };

  const handleBackToRoles = () => {
    actions.setPendingRole(null);
    actions.setView('login');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #242938 100%)' }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold gradient-text">Select Profile</h1>
          <p className="text-gray-300 mt-2 text-lg">
            Choose your profile to log in as a {role}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {users.length > 0 ? (
            users.map((user, index) => (
              <div
                key={user.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectUser(user)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectUser(user);
                  }
                }}
                className="user-selection-card fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
                data-user-id={user.id}
              >
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-4 border-gray-600">
                  <span className="text-4xl font-bold text-white">
                    {user.name ? user.name.charAt(0) : '?'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">{user.name}</h3>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-400">
              <p>No profiles configured for this role yet.</p>
            </div>
          )}
        </div>

        <div className="text-center mt-12 fade-in">
          <button type="button" className="perplexity-button px-6 py-3" onClick={handleBackToRoles}>
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Roles
          </button>
        </div>
      </div>
    </div>
  );
}

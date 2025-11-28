import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';

export default function Layout({ children }) {
  const state = useAppState();
  const actions = useAppActions();

  const mainContentClasses = [
    'main-content',
    state.currentView === 'accura-ai' ? 'ai-view-active' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="app-container app-container-grid">
      <Sidebar />

      <div
        id="sidebar-overlay"
        className={`sidebar-overlay ${state.mobileMenuOpen ? 'open' : ''}`}
        onClick={() => actions.setMobileMenu(false)}
      />

      <Navbar />

      <main className={mainContentClasses}>{children}</main>
    </div>
  );
}

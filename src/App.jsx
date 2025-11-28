import { useEffect } from 'react';
import Layout from './components/Layout.jsx';
import ModalHost from './components/ModalHost.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import { AppStateProvider, useAppActions, useAppState } from './context/AppContext.jsx';
import { authenticatedViewMap, specialViews } from './views/index.js';
import './styles/ai-chat.css';

function AppShell() {
  const state = useAppState();
  const actions = useAppActions();

  useEffect(() => {
    if (state.theme === 'default' || !state.theme) {
      document.body.className = '';
    } else {
      document.body.className = state.theme;
    }
  }, [state.theme]);

  useEffect(() => {
    actions.setMobileMenu(false);
  }, [actions, state.currentView]);

  const isAuthenticated = Boolean(state.currentUser);

  if (!isAuthenticated) {
    const ViewComponent = state.currentView === 'userSelection'
      ? specialViews.userSelection
      : specialViews.login;

    return (
      <div className="app-container">
        <ViewComponent />
        <NotificationCenter />
        <ModalHost />
      </div>
    );
  }

  const ViewComponent = authenticatedViewMap[state.currentView] ?? authenticatedViewMap.dashboard;
  const QuickSaleComponent = specialViews.quickSale;

  return (
    <>
      <Layout>
        <ViewComponent />
      </Layout>

      {state.quickSale.active ? (
        <div className="quick-sale-overlay">
          <QuickSaleComponent />
        </div>
      ) : null}

      <NotificationCenter />
      <ModalHost />
    </>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}

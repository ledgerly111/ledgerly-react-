import { useMemo } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import AccountFormModal from '../components/AccountFormModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function ChartOfAccountsView() {
  const { chartOfAccounts = [] } = useAppState();
  const {
    openModal,
    closeModal,
    deleteAccount,
    pushNotification,
  } = useAppActions();

  const sortedAccounts = useMemo(
    () => [...chartOfAccounts].sort((a, b) => a.code.localeCompare(b.code)),
    [chartOfAccounts],
  );

  const handleAddAccount = () => {
    openModal(AccountFormModal, {
      mode: 'create',
      onCancel: () => closeModal?.(),
    });
  };

  const handleEditAccount = (account) => {
    openModal(AccountFormModal, {
      mode: 'edit',
      initialValues: account,
      onCancel: () => closeModal?.(),
    });
  };

  const handleDeleteAccount = (account) => {
    openModal(ConfirmModal, {
      title: 'Delete Account',
      message: `Are you sure you want to delete account ${account.code} - ${account.name}?`,
      confirmLabel: 'Delete',
      confirmTone: 'danger',
      onConfirm: () => {
        deleteAccount(account.code);
        pushNotification?.({
          type: 'info',
          message: `Account ${account.code} deleted.`,
        });
        closeModal?.();
      },
      onCancel: () => closeModal?.(),
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Chart of Accounts</h1>
          <p className="text-gray-400 text-sm">
            Manage the financial accounts used for journal entries and reports.
          </p>
        </div>
        <button
          type="button"
          className="perplexity-button px-4 py-2 rounded-xl font-semibold"
          onClick={handleAddAccount}
        >
          <i className="fas fa-plus mr-2" />
          Add Account
        </button>
      </header>

      <section className="perplexity-card overflow-hidden">
        <div className="responsive-table">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Normal Balance</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sortedAccounts.length ? (
                sortedAccounts.map((account) => (
                  <tr key={account.code} className="hover:bg-gray-900/40 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-200 font-semibold">{account.code}</td>
                    <td className="px-6 py-3 text-sm text-gray-200">{account.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{account.type}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{account.normalBalance}</td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          className="text-sky-300 hover:text-sky-200 transition-colors"
                          onClick={() => handleEditAccount(account)}
                        >
                          <i className="fas fa-edit mr-1" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300 transition-colors"
                          onClick={() => handleDeleteAccount(account)}
                        >
                          <i className="fas fa-trash mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                    <i className="fas fa-list-ol text-2xl mb-3 opacity-40" />
                    <p>No accounts yet. Use the button above to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { useCallback, useMemo } from 'react';
import JournalEntryModal from '../components/JournalEntryModal.jsx';
import JournalDeleteModal from '../components/JournalDeleteModal.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';

function formatAmount(value, countryCode) {
  return formatCurrency(value || 0, { countryCode, showSymbol: true });
}

function resolveAccount(accountCode, chartOfAccounts) {
  return chartOfAccounts.find((account) => account.code === accountCode);
}

export default function JournalView() {
  const {
    journal,
    chartOfAccounts,
    selectedCountry,
    currentUser,
    sales = [],
    expenses = [],
    products = [],
    accessibleUserIds = [],
  } = useAppState();
  const { openModal, closeModal, createJournalEntry, deleteJournalEntry } = useAppActions();

  const accessibleUserIdSet = useMemo(() => {
    const ids = new Set(
      (accessibleUserIds ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    );
    const currentUserId = Number(currentUser?.id);
    if (Number.isFinite(currentUserId)) {
      ids.add(currentUserId);
    }
    return ids;
  }, [accessibleUserIds, currentUser?.id]);

  const salesById = useMemo(() => {
    const map = new Map();
    (sales ?? []).forEach((sale) => {
      if (sale?.id != null) {
        map.set(String(sale.id), sale);
      }
    });
    return map;
  }, [sales]);

  const expensesById = useMemo(() => {
    const map = new Map();
    (expenses ?? []).forEach((expense) => {
      if (expense?.id != null) {
        map.set(String(expense.id), expense);
      }
    });
    return map;
  }, [expenses]);

  const scopedJournal = useMemo(() => {
    const role = currentUser?.role ?? 'guest';
    if (role === 'admin') {
      return journal;
    }
    return (journal ?? []).filter((entry) => {
      const source = entry?.metadata?.source;
      if (source === 'sale') {
        const saleId = entry?.metadata?.saleId;
        if (saleId == null) {
          return false;
        }
        const sale = salesById.get(String(saleId));
        if (!sale) {
          return false;
        }
        const salesPersonId = Number(sale?.salesPersonId);
        return Number.isFinite(salesPersonId) && accessibleUserIdSet.has(salesPersonId);
      }
      if (source === 'expense') {
        const expenseId = entry?.metadata?.expenseId;
        if (expenseId == null) {
          return false;
        }
        const expense = expensesById.get(String(expenseId));
        if (!expense) {
          return false;
        }
        const addedById = Number(expense?.addedBy ?? expense?.createdByUserId);
        return Number.isFinite(addedById) && accessibleUserIdSet.has(addedById);
      }
      return false;
    });
  }, [journal, currentUser?.role, salesById, expensesById, accessibleUserIdSet]);

  const sortedJournal = useMemo(() => {
    return [...scopedJournal].sort((a, b) => {
      const aDate = new Date(a?.date ?? 0).getTime();
      const bDate = new Date(b?.date ?? 0).getTime();
      if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) {
        return bDate - aDate;
      }
      return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
    });
  }, [scopedJournal]);

  const totals = useMemo(() => sortedJournal.reduce((acc, entry) => {
    (entry.entries ?? []).forEach((line) => {
      acc.debit += Number(line.debit) || 0;
      acc.credit += Number(line.credit) || 0;
    });
    return acc;
  }, { debit: 0, credit: 0 }), [sortedJournal]);

  const handleCreateEntry = useCallback(() => {
    openModal(JournalEntryModal, {
      title: 'New Journal Entry',
      chartOfAccounts,
      onCancel: closeModal,
      onSubmit: (payload) => {
        createJournalEntry(payload);
        closeModal();
      },
    });
  }, [chartOfAccounts, openModal, closeModal, createJournalEntry]);

  const handleDeleteEntry = useCallback((entry) => {
    openModal(JournalDeleteModal, {
      entry,
      sales,
      expenses,
      products,
      selectedCountry,
      onConfirm: (entryToDelete) => {
        deleteJournalEntry(entryToDelete);
        closeModal();
      },
      onCancel: closeModal,
    });
  }, [openModal, closeModal, deleteJournalEntry, sales, expenses, products, selectedCountry]);

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Journal Entries</h2>
          <p className="text-gray-400">Review every debit and credit posted to the ledger.</p>
        </div>
        <button
          type="button"
          className="ai-button px-4 py-2 rounded-xl font-medium"
          onClick={handleCreateEntry}
        >
          <i className="fas fa-plus mr-2" />New Entry
        </button>
      </header>

      {sortedJournal.length === 0 ? (
        <div className="perplexity-card p-6">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-gray-400">
            <i className="fas fa-book text-4xl text-gray-600" />
            <h3 className="text-lg font-semibold text-white">No journal entries yet</h3>
            <p className="text-sm text-gray-400">Record your first transaction to populate the ledger.</p>
          </div>
        </div>
      ) : (
        <div className="perplexity-card overflow-hidden">
          <div className="responsive-table">
            <table className="w-full">
              <thead className="border-b-2 border-gray-700 bg-gray-900/60">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-300">Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-300">Description</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-300">Account</th>
                  <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-blue-300">Debit</th>
                  <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-teal-300">Credit</th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sortedJournal.map((entry) => {
                  const lines = entry.entries ?? [];
                  return lines.map((line, index) => {
                    const account = resolveAccount(line.accountCode, chartOfAccounts);
                    const accountLabel = account
                      ? `${account.name} (${account.code})`
                      : line.accountCode || 'Unknown account';
                    return (
                      <tr key={`${entry.id}-${index}`} className="hover:bg-gray-800/30 transition-colors">
                        {index === 0 ? (
                          <td className="px-4 py-4 align-top border-r border-gray-800/30" rowSpan={lines.length}>
                            <div className="font-semibold text-white text-sm">{entry.date}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{entry.reference ?? 'Manual entry'}</div>
                          </td>
                        ) : null}
                        {index === 0 ? (
                          <td className="px-4 py-4 align-top border-r border-gray-800/30" rowSpan={lines.length}>
                            <span className="text-sm text-gray-300">{entry.description}</span>
                          </td>
                        ) : null}
                        <td className="px-4 py-4 border-r border-gray-800/30">
                          <span className="text-sm text-gray-200">{accountLabel}</span>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-blue-400 border-r border-gray-800/30">
                          {line.debit > 0 ? formatAmount(line.debit, selectedCountry) : '—'}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-teal-400 border-r border-gray-800/30">
                          {line.credit > 0 ? formatAmount(line.credit, selectedCountry) : '—'}
                        </td>
                        {index === 0 ? (
                          <td className="px-4 py-4 align-top text-center" rowSpan={lines.length}>
                            <button
                              type="button"
                              className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                              onClick={() => handleDeleteEntry(entry)}
                            >
                              <i className="fas fa-trash mr-1.5" />Delete
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  });
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-700 bg-gray-900/60">
                <tr>
                  <td className="px-4 py-4 text-sm font-bold text-white" colSpan={3}>TOTALS</td>
                  <td className="px-4 py-4 text-right font-mono text-base font-bold text-blue-400 border-l border-gray-700">{formatAmount(totals.debit, selectedCountry)}</td>
                  <td className="px-4 py-4 text-right font-mono text-base font-bold text-teal-400 border-l border-gray-700">{formatAmount(totals.credit, selectedCountry)}</td>
                  <td className="px-4 py-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

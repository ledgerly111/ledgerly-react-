import { useMemo, useState } from 'react';
import { useAppState } from '../context/AppContext.jsx';
import { calculateLedgerAccount } from '../utils/journal.js';
import { formatCurrency } from '../utils/currency.js';

function formatAmount(amount, countryCode) {
  return amount > 0 ? formatCurrency(amount, { countryCode, showSymbol: true }) : '';
}

export default function LedgerView() {
  const {
    journal,
    chartOfAccounts,
    selectedCountry,
    currentUser,
    sales = [],
    expenses = [],
    accessibleUserIds = [],
  } = useAppState();
  const [selectedAccountCode, setSelectedAccountCode] = useState(null);

  const orderedAccounts = useMemo(() => {
    return [...chartOfAccounts].sort((a, b) => a.code.localeCompare(b.code));
  }, [chartOfAccounts]);

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

  const ledger = useMemo(() => {
    if (!selectedAccountCode) {
      return null;
    }
    return calculateLedgerAccount(scopedJournal, chartOfAccounts, selectedAccountCode);
  }, [scopedJournal, chartOfAccounts, selectedAccountCode]);

  if (!selectedAccountCode || !ledger) {
    return (
      <div className="space-y-6 fade-in">
        <header>
          <h2 className="text-2xl font-bold text-white mb-2">General Ledger</h2>
          <p className="text-gray-400">Select an account to review its detailed debits and credits.</p>
        </header>
        <div className="perplexity-card overflow-hidden">
          <div className="responsive-table">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700 bg-gray-900/40 text-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide">Code</th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide">Account</th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide">Type</th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide">Normal Balance</th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orderedAccounts.map((account) => (
                  <tr key={account.code} className="bg-gray-950/40 hover:bg-gray-900/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">{account.code}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{account.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{account.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{account.normalBalance}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="perplexity-button px-3 py-1 text-xs font-semibold"
                        onClick={() => setSelectedAccountCode(account.code)}
                      >
                        <i className="fas fa-eye mr-1" />View Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const { account, transactions, totalDebit, totalCredit, endingBalance, balanceType } = ledger;

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            className="mb-2 inline-flex items-center text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200"
            onClick={() => setSelectedAccountCode(null)}
          >
            <i className="fas fa-arrow-left mr-1" />Back to accounts
          </button>
          <h2 className="text-2xl font-bold text-white">{account.name}</h2>
          <p className="text-gray-400">{account.code} - {account.type}</p>
        </div>
        <div className="rounded-xl border border-gray-700/60 bg-gray-900/40 px-4 py-2 text-sm text-gray-300">
          <span className="font-semibold text-white">Ending Balance:</span>{' '}
          <span className="font-mono text-teal-300">{formatCurrency(Math.abs(endingBalance), { countryCode: selectedCountry, showSymbol: true })}</span>{' '}
          <span className="text-xs uppercase tracking-wide text-gray-400">{balanceType}</span>
        </div>
      </header>

      <div className="perplexity-card overflow-hidden">
        <div className="responsive-table">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 bg-gray-900/40 text-gray-300">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wide">Description</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wide">Debit</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wide">Credit</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {transactions.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-center text-sm text-gray-400" colSpan={5}>
                    No postings for this account yet.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <tr key={`${account.code}-${index}`} className="bg-gray-950/40 hover:bg-gray-900/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">{transaction.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{transaction.description}</td>
                    <td className="px-6 py-4 text-right">
                      {formatAmount(transaction.debit, selectedCountry) ? (
                        <span className="inline-block px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 font-mono text-blue-400">
                          {formatAmount(transaction.debit, selectedCountry)}
                        </span>
                      ) : ''}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-teal-400">{formatAmount(transaction.credit, selectedCountry)}</td>
                    <td className="px-6 py-4 text-right font-mono text-white">
                      {formatCurrency(Math.abs(transaction.balance), { countryCode: selectedCountry, showSymbol: true })}
                      <span className="ml-2 text-xs uppercase tracking-wide text-gray-400">
                        {transaction.balance >= 0 ? account.normalBalance : account.normalBalance === 'Debit' ? 'Credit' : 'Debit'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-900/40 text-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm font-semibold" colSpan={2}>Totals</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-block px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 font-mono text-blue-400 font-semibold">
                    {formatCurrency(totalDebit, { countryCode: selectedCountry, showSymbol: true })}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-teal-400 font-semibold">{formatCurrency(totalCredit, { countryCode: selectedCountry, showSymbol: true })}</td>
                <td className="px-6 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}


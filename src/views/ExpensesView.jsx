import { useCallback, useMemo, useState } from 'react';
import ExpenseDeleteModal from '../components/ExpenseDeleteModal.jsx';
import ExpenseFormModal from '../components/ExpenseFormModal.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';

const CATEGORY_ALL = 'all';
const MAX_VISIBLE_NOTES = 60;

export default function ExpensesView() {
  const state = useAppState();
  const {
    addExpense,
    updateExpense,
    deleteExpense,
    pushNotification,
    openModal,
    closeModal,
  } = useAppActions();
  const {
    expenses = [],
    users = [],
    expenseCategories = [],
    selectedCountry,
    currentUser,
    accessibleUserIds = [],
    hasFeaturePermission,
  } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_ALL);

  const role = currentUser?.role ?? 'guest';

  const canUsePermission = useCallback(
    (permissionKey) => {
      if (!permissionKey) {
        return false;
      }
      if (role === 'admin') {
        return true;
      }
      if (typeof hasFeaturePermission === 'function') {
        return hasFeaturePermission(currentUser?.id, permissionKey);
      }
      return false;
    },
    [currentUser?.id, hasFeaturePermission, role],
  );

  const canCreateExpense = useMemo(
    () => canUsePermission('expenses.create'),
    [canUsePermission],
  );
  const canEditExpense = useMemo(
    () => canUsePermission('expenses.edit'),
    [canUsePermission],
  );
  const canDeleteExpense = useMemo(
    () => canUsePermission('expenses.delete'),
    [canUsePermission],
  );

  const normalizedExpenses = useMemo(
    () =>
      expenses.map((expense) => ({
        ...expense,
        amount: expense.amount ?? 0,
        date: expense.date ?? new Date().toISOString().slice(0, 10),
        category: expense.category ?? 'Other',
        addedBy: expense.addedBy ?? expense.createdByUserId ?? null,
        notes: expense.notes ?? '',
      })),
    [expenses],
  );

  const filteredExpenses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filterCategory = categoryFilter;

    return normalizedExpenses.filter((expense) => {
      const matchesSearch = term
        ? [expense.description, expense.category, expense.notes]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term))
        : true;

      const matchesCategory = filterCategory === CATEGORY_ALL || expense.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [normalizedExpenses, searchTerm, categoryFilter]);

  const totals = useMemo(() => {
    if (!filteredExpenses.length) {
      return {
        count: 0,
        totalAmount: 0,
        averageAmount: 0,
        categoryCount: 0,
      };
    }

    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0);
    const uniqueCategories = new Set(filteredExpenses.map((expense) => expense.category));

    return {
      count: filteredExpenses.length,
      totalAmount,
      averageAmount: totalAmount / filteredExpenses.length,
      categoryCount: uniqueCategories.size,
    };
  }, [filteredExpenses]);

  const formatValue = useCallback(
    (value) => formatCurrency(value, { countryCode: selectedCountry, showSymbol: true }),
    [selectedCountry],
  );

  const resolveUserName = useCallback(
    (userId) => users.find((user) => user.id === userId)?.name ?? 'Unknown',
    [users],
  );

  const requireExpensePermission = useCallback(
    (condition, message) => {
      if (condition) {
        return true;
      }
      pushNotification({ type: 'warning', message });
      return false;
    },
    [pushNotification],
  );

  const getNextExpenseId = useCallback(() => {
    const numericIds = expenses
      .map((expense) => Number(expense?.id))
      .filter((value) => Number.isFinite(value));
    if (!numericIds.length) {
      return 1;
    }
    return Math.max(...numericIds) + 1;
  }, [expenses]);

  const defaultFormValues = useMemo(
    () => ({
      date: new Date().toISOString().slice(0, 10),
      addedBy: currentUser?.id ?? null,
    }),
    [currentUser],
  );

  const showExpenseActions = canEditExpense || canDeleteExpense;

  const openCreateExpenseModal = useCallback(() => {
    if (!requireExpensePermission(canCreateExpense, 'You do not have permission to add expenses.')) {
      return;
    }

    openModal(ExpenseFormModal, {
      title: 'Add Expense',
      mode: 'create',
      initialValues: defaultFormValues,
      expenseCategories,
      users,
      currentUserId: currentUser?.id ?? null,
      onCancel: closeModal,
      onSubmit: (formExpense) => {
        const newExpense = {
          ...formExpense,
          id: getNextExpenseId(),
        };
        addExpense(newExpense);
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Expense added',
          description: `${formExpense.description} saved to the ledger.`,
        });
      },
    });
  }, [
    requireExpensePermission,
    canCreateExpense,
    openModal,
    defaultFormValues,
    expenseCategories,
    users,
    currentUser,
    closeModal,
    getNextExpenseId,
    addExpense,
    pushNotification,
  ]);

  const openEditExpenseModal = useCallback(
    (expense) => {
      if (!requireExpensePermission(canEditExpense, 'You do not have permission to edit expenses.')) {
        return;
      }

      openModal(ExpenseFormModal, {
        title: 'Edit Expense',
        mode: 'edit',
        initialValues: expense,
        expenseCategories,
        users,
        currentUserId: currentUser?.id ?? null,
        onCancel: closeModal,
        onSubmit: (formExpense) => {
          updateExpense({ ...expense, ...formExpense });
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Expense updated',
            description: `${formExpense.description} changes saved.`,
          });
        },
      });
    },
    [
      requireExpensePermission,
      canEditExpense,
      openModal,
      expenseCategories,
      users,
      currentUser,
      closeModal,
      updateExpense,
      pushNotification,
    ],
  );

  const openDeleteExpenseModal = useCallback(
    (expense) => {
      if (!requireExpensePermission(canDeleteExpense, 'You do not have permission to delete expenses.')) {
        return;
      }

      openModal(ExpenseDeleteModal, {
        expense,
        formatAmount: formatValue,
        onCancel: closeModal,
        onConfirm: () => {
          if (expense?.id == null) {
            closeModal();
            return;
          }
          deleteExpense(expense.id);
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Expense deleted',
            description: `${expense.description ?? 'Expense'} removed from the ledger.`,
          });
        },
      });
    },
    [
      requireExpensePermission,
      canDeleteExpense,
      openModal,
      formatValue,
      closeModal,
      deleteExpense,
      pushNotification,
    ],
  );

  const truncateNotes = (notes) => {
    if (!notes) return '-';
    if (notes.length <= MAX_VISIBLE_NOTES) return notes;
    return `${notes.slice(0, MAX_VISIBLE_NOTES)}...`;
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Expense Ledger</h2>
          <p className="text-gray-400">Control spending, categories, and approvals in one place.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl font-medium ${
              canCreateExpense ? 'expenses-button' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            onClick={openCreateExpenseModal}
            disabled={!canCreateExpense}
          >
            <i className="fas fa-plus mr-2" />Add Expense
          </button>
        </div>
      </header>

      <section className="responsive-grid-4">
        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-white">{totals.count}</p>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-receipt text-red-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Amount</p>
              <p className="text-lg font-bold text-red-400">{formatValue(totals.totalAmount)}</p>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-dollar-sign text-red-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Average Spend</p>
              <p className="text-lg font-bold text-white">{formatValue(totals.averageAmount)}</p>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-red-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Categories</p>
              <p className="text-lg font-bold text-white">{totals.categoryCount}</p>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-tags text-red-400" />
            </div>
          </div>
        </div>
      </section>

      <div className="perplexity-card p-4 slide-up">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="expense-search" className="block text-sm font-medium text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="expense-search"
                type="search"
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
                placeholder="Description, category, or notes"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="expense-category-filter" className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              id="expense-category-filter"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value={CATEGORY_ALL}>All Categories</option>
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="perplexity-card overflow-hidden">
        <div className="responsive-table">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Expense</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Category</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Recorded</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Notes</th>
                {showExpenseActions ? (
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {filteredExpenses.length ? (
                [...filteredExpenses].reverse().map((expense, index) => (
                  <tr
                    key={expense.id ?? `${expense.description}-${index}`}
                    className={`hover:bg-gray-800/50 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{expense.description ?? 'Expense'}</div>
                      <div className="text-gray-400 text-sm">Added by {resolveUserName(expense.addedBy)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">{formatValue(expense.amount)}</td>
                    <td className="px-6 py-4 text-gray-300">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{truncateNotes(expense.notes)}</td>
                    {showExpenseActions ? (
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {canEditExpense ? (
                            <button
                              type="button"
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              onClick={() => openEditExpenseModal(expense)}
                            >
                              <i className="fas fa-edit" />
                            </button>
                          ) : null}
                          {canDeleteExpense ? (
                            <button
                              type="button"
                              className="text-red-400 hover:text-red-300 transition-colors"
                              onClick={() => openDeleteExpenseModal(expense)}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-400" colSpan={showExpenseActions ? 6 : 5}>
                    <i className="fas fa-receipt text-3xl mb-3 opacity-50" />
                    <p>No expenses match this view yet.</p>
                    {canCreateExpense ? (
                      <div className="mt-4 flex justify-center">
                        <button type="button" className="expenses-button px-4 py-2 rounded-xl" onClick={openCreateExpenseModal}>
                          <i className="fas fa-plus mr-2" />Add Expense
                        </button>
                      </div>
                    ) : null}
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

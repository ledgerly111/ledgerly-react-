import { useCallback, useMemo, useState } from 'react';
import CustomerDeleteModal from '../components/CustomerDeleteModal.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';

const TYPE_FILTERS = [
  { key: 'all', label: 'All Customers', icon: 'fas fa-users' },
  { key: 'Business', label: 'Business', icon: 'fas fa-building' },
  { key: 'Individual', label: 'Individual', icon: 'fas fa-user' },
];

export default function CustomersView() {
  const state = useAppState();
  const {
    addCustomer,
    updateCustomer,
    deleteCustomer,
    pushNotification,
    openModal,
    closeModal,
  } = useAppActions();
  const {
    customers = [],
    users = [],
    selectedCountry,
    currentUser,
    accessibleUserIds = [],
    hasFeaturePermission,
  } = state;
  const [filter, setFilter] = useState('all');

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

  const canCreateCustomer = useMemo(
    () => canUsePermission('customers.create'),
    [canUsePermission],
  );
  const canEditCustomer = useMemo(
    () => canUsePermission('customers.edit'),
    [canUsePermission],
  );
  const canDeleteCustomer = useMemo(
    () => canUsePermission('customers.delete'),
    [canUsePermission],
  );

  const isManagerView = currentUser?.role === 'manager';
  const showActionColumn = canEditCustomer || canDeleteCustomer;

  const requireCustomerPermission = useCallback(
    (condition, message) => {
      if (condition) {
        return true;
      }
      pushNotification({ type: 'warning', message });
      return false;
    },
    [pushNotification],
  );

  const accessibleUserIdSet = useMemo(() => {
    return new Set(
      (accessibleUserIds ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    );
  }, [accessibleUserIds]);

  const scopedCustomers = useMemo(() => {
    if ((currentUser?.role ?? 'guest') === 'admin') {
      return customers;
    }
    return customers.filter((customer) => {
      const ownerId = Number(customer?.accountOwnerId ?? customer?.ownerId);
      if (!Number.isFinite(ownerId)) {
        return false;
      }
      return accessibleUserIdSet.has(ownerId);
    });
  }, [customers, currentUser?.role, accessibleUserIdSet]);

  const ownerOptions = useMemo(() => {
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return users.filter((user) => accessibleUserIdSet.has(Number(user?.id)));
  }, [users, accessibleUserIdSet]);

  const normalizedCustomers = useMemo(
    () => scopedCustomers.map((customer) => ({
      ...customer,
      type: customer.type ?? 'Individual',
      creditLimit: customer.creditLimit ?? 0,
      balance: customer.balance ?? 0,
    })),
    [scopedCustomers],
  );

  const filteredCustomers = useMemo(() => {
    if (filter === 'all') return normalizedCustomers;
    return normalizedCustomers.filter((customer) => (customer.type ?? 'Individual') === filter);
  }, [normalizedCustomers, filter]);

  const totals = useMemo(() => {
    const businessCount = normalizedCustomers.filter((customer) => customer.type === 'Business').length;
    const individualCount = normalizedCustomers.length - businessCount;
    const totalCreditLimit = normalizedCustomers.reduce((sum, customer) => sum + (customer.creditLimit ?? 0), 0);

    return {
      totalCount: normalizedCustomers.length,
      businessCount,
      individualCount,
      totalCreditLimit,
    };
  }, [normalizedCustomers]);

  const formatValue = useCallback(
    (value) => formatCurrency(value, { countryCode: selectedCountry, showSymbol: true }),
    [selectedCountry],
  );

  const getNextCustomerId = useCallback(() => {
    const numericIds = customers
      .map((customer) => Number(customer?.id))
      .filter((value) => Number.isFinite(value));
    if (!numericIds.length) {
      return 1;
    }
    return Math.max(...numericIds) + 1;
  }, [customers]);

  const openCreateCustomerModal = useCallback(() => {
    if (!requireCustomerPermission(canCreateCustomer, 'You do not have permission to add customers.')) {
      return;
    }

    openModal(CustomerFormModal, {
      title: 'Add Customer',
      mode: 'create',
      ownerOptions,
      defaultOwnerId: ownerOptions.find((user) => Number(user.id) === Number(currentUser?.id))?.id
        ?? ownerOptions[0]?.id
        ?? null,
      canSelectOwner: canEditCustomer,
      onCancel: closeModal,
      onSubmit: (formCustomer) => {
        const newCustomer = {
          ...formCustomer,
          id: getNextCustomerId(),
          accountOwnerId: Number.isFinite(Number(formCustomer.accountOwnerId))
            ? Number(formCustomer.accountOwnerId)
            : Number(currentUser?.id),
        };
        addCustomer(newCustomer);
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Customer added',
          description: `${formCustomer.name} has been added to the directory.`,
        });
      },
    });
  }, [
    requireCustomerPermission,
    canCreateCustomer,
    canEditCustomer,
    openModal,
    ownerOptions,
    currentUser,
    closeModal,
    getNextCustomerId,
    addCustomer,
    pushNotification,
  ]);

  const openEditCustomerModal = useCallback(
    (customer) => {
      if (!requireCustomerPermission(canEditCustomer, 'You do not have permission to edit customers.')) {
        return;
      }

      openModal(CustomerFormModal, {
        title: 'Edit Customer',
        mode: 'edit',
        initialValues: customer,
        ownerOptions,
        defaultOwnerId: Number.isFinite(Number(customer?.accountOwnerId))
          ? Number(customer.accountOwnerId)
          : ownerOptions.find((user) => Number(user.id) === Number(currentUser?.id))?.id
            ?? ownerOptions[0]?.id
            ?? null,
        canSelectOwner: canEditCustomer,
        onCancel: closeModal,
        onSubmit: (formCustomer) => {
          updateCustomer({
            ...customer,
            ...formCustomer,
            accountOwnerId: Number.isFinite(Number(formCustomer.accountOwnerId))
              ? Number(formCustomer.accountOwnerId)
              : Number(customer?.accountOwnerId ?? currentUser?.id),
          });
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Customer updated',
            description: `${formCustomer.name} details saved.`,
          });
        },
      });
    },
    [
      requireCustomerPermission,
      canEditCustomer,
      openModal,
      ownerOptions,
      currentUser,
      closeModal,
      updateCustomer,
      pushNotification,
    ],
  );

  const openDeleteCustomerModal = useCallback(
    (customer) => {
      if (!requireCustomerPermission(canDeleteCustomer, 'You do not have permission to delete customers.')) {
        return;
      }

      openModal(CustomerDeleteModal, {
        customer,
        onCancel: closeModal,
        onConfirm: () => {
          if (customer?.id == null) {
            closeModal();
            return;
          }
          deleteCustomer(customer.id);
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Customer deleted',
            description: `${customer.name ?? 'Customer'} removed from the directory.`,
          });
        },
      });
    },
    [
      requireCustomerPermission,
      canDeleteCustomer,
      openModal,
      closeModal,
      deleteCustomer,
      pushNotification,
    ],
  );

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Customer Directory</h2>
          <p className="text-gray-400">Manage relationships and credit exposure across your customer base.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`perplexity-button px-4 py-2 rounded-xl font-medium ${
              canCreateCustomer ? '' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={openCreateCustomerModal}
            disabled={!canCreateCustomer}
          >
            <i className="fas fa-user-plus mr-2" />Add Customer
          </button>
        </div>
      </header>

      <section className="responsive-grid-4">
        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-white">{totals.totalCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-users text-blue-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Business Accounts</p>
              <p className="text-2xl font-bold text-emerald-400">{totals.businessCount}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-building text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Individual Accounts</p>
              <p className="text-2xl font-bold text-purple-400">{totals.individualCount}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-user text-purple-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Credit</p>
              <p className="text-lg font-bold text-yellow-400">{formatValue(totals.totalCreditLimit)}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-credit-card text-yellow-400" />
            </div>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 bg-gray-800/50 p-1 rounded-xl">
        {TYPE_FILTERS.map((option) => {
          const isActive = filter === option.key;
          const activeClass = isActive ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50';
          return (
            <button
              key={option.key}
              type="button"
              className={`flex-1 min-w-[140px] px-4 py-2 rounded-lg font-medium transition-all ${activeClass}`}
              onClick={() => handleFilterChange(option.key)}
            >
              <i className={`${option.icon} mr-2`} />{option.label}
            </button>
          );
        })}
      </nav>

      <section className="perplexity-card overflow-hidden">
        <div className="responsive-table">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Credit Limit</th>
                {showActionColumn ? (
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {filteredCustomers.length ? (
                filteredCustomers.map((customer, index) => {
                  const gradientClass = customer.type === 'Business'
                    ? 'from-green-500 to-emerald-500'
                    : 'from-purple-500 to-pink-500';

                  return (
                    <tr
                      key={customer.id ?? `${customer.name}-${index}`}
                      className={`hover:bg-gray-800/50 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${gradientClass} rounded-lg flex items-center justify-center`}>
                            <i className={`fas ${customer.type === 'Business' ? 'fa-building' : 'fa-user'} text-white`} />
                          </div>
                          <div>
                            <div className="text-white font-medium">{customer.name}</div>
                            <div className="text-gray-400 text-sm">{customer.address ?? 'No address provided'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${customer.type === 'Business' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}`}>
                          {customer.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white">{customer.email}</div>
                        <div className="text-gray-400 text-sm">{customer.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {formatValue(customer.creditLimit ?? 0)}
                      </td>
                      {showActionColumn ? (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {canEditCustomer ? (
                              <button
                                type="button"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                onClick={() => openEditCustomerModal(customer)}
                              >
                                <i className="fas fa-edit" />
                              </button>
                            ) : null}
                            {canDeleteCustomer ? (
                              <button
                                type="button"
                                className="text-red-400 hover:text-red-300 transition-colors"
                                onClick={() => openDeleteCustomerModal(customer)}
                              >
                                <i className="fas fa-trash" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-400" colSpan={showActionColumn ? 5 : 4}>
                    <i className="fas fa-address-book text-3xl mb-3 opacity-50" />
                    <p>
                      {isManagerView
                        ? 'No customers under your supervision match this view yet.'
                        : 'No customers match this view yet.'}
                    </p>
                    {canCreateCustomer ? (
                      <div className="mt-4 flex justify-center gap-3">
                        <button type="button" className="perplexity-button px-4 py-2 rounded-xl" onClick={openCreateCustomerModal}>
                          <i className="fas fa-user-plus mr-2" />Add Customer
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

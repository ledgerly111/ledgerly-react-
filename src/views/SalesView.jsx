import { useCallback, useMemo, useState } from 'react';
import SaleDeleteModal from '../components/SaleDeleteModal.jsx';
import SaleFormModal from '../components/SaleFormModal.jsx';
import { useAppActions, useAppState, prepareInvoiceForDownload } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { downloadInvoicePdf } from '../utils/invoicePdf.jsx';
import { buildInvoiceFromSale } from '../utils/invoiceUtils.js';

const STATUS_FILTERS = [
  { key: 'all', label: 'All Sales', icon: 'fas fa-layer-group' },
  { key: 'cash', label: 'Cash', icon: 'fas fa-money-bill-wave' },
  { key: 'credit', label: 'Credit', icon: 'fas fa-credit-card' },
];

export default function SalesView() {
  const state = useAppState();
  const {
    addSale,
    updateSale,
    deleteSale,
    pushNotification,
    setQuickSaleActive,
    openModal,
    closeModal,
  } = useAppActions();
  const {
    sales = [],
    customers = [],
    users = [],
    products = [],
    invoices = [],
    selectedCountry,
    companyName,
    currentUser,
    accessibleUserIds = [],
    hasFeaturePermission,
    invoiceTemplates = {},
    serverUrl,
    invoiceShareBaseUrl,
    supervisionLinks = [],
    branches = [],
    currentBranchId = null,
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

  const canCreateSale = useMemo(
    () => canUsePermission('sales.create'),
    [canUsePermission],
  );
  const canEditAnySale = useMemo(
    () => canUsePermission('sales.editAny'),
    [canUsePermission],
  );
  const canEditOwnSale = useMemo(
    () => canEditAnySale || canUsePermission('sales.editOwn'),
    [canEditAnySale, canUsePermission],
  );
  const canDeleteAnySale = useMemo(
    () => canUsePermission('sales.deleteAny'),
    [canUsePermission],
  );
  const canDeleteOwnSale = useMemo(
    () => canDeleteAnySale || canUsePermission('sales.deleteOwn'),
    [canDeleteAnySale, canUsePermission],
  );
  const canGenerateInvoice = useMemo(
    () => canUsePermission('sales.generateInvoice') || canCreateSale,
    [canUsePermission, canCreateSale],
  );

  const requirePermission = useCallback(
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

  const scopedSales = useMemo(() => {
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return sales.filter((sale) => accessibleUserIdSet.has(Number(sale?.salesPersonId)));
  }, [sales, accessibleUserIdSet]);

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

  const permittedSalesUsers = useMemo(() => {
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return users.filter((user) => accessibleUserIdSet.has(Number(user?.id)));
  }, [users, accessibleUserIdSet]);

  const filteredSales = useMemo(() => {
    if (filter === 'all') return scopedSales;
    return scopedSales.filter((sale) => (sale.saleType ?? 'Cash').toLowerCase() === filter);
  }, [scopedSales, filter]);

  const totals = useMemo(() => {
    if (!filteredSales.length) {
      return {
        count: 0,
        revenue: 0,
        average: 0,
        commission: currentUser?.commission ?? 0,
      };
    }

    const revenue = filteredSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0);
    const average = revenue / filteredSales.length;
    const commission = currentUser?.commission ?? 0;

    return {
      count: filteredSales.length,
      revenue,
      average,
      commission,
    };
  }, [filteredSales, currentUser]);

  const formatValue = useCallback(
    (value) => formatCurrency(value, { countryCode: selectedCountry, showSymbol: true }),
    [selectedCountry],
  );

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      if (product?.id != null) {
        map.set(product.id, product);
      }
    });
    return map;
  }, [products]);

  const getNextSaleId = useCallback(() => {
    const numericIds = sales
      .map((sale) => Number(sale?.id))
      .filter((value) => Number.isFinite(value));
    if (!numericIds.length) {
      return 1;
    }
    return Math.max(...numericIds) + 1;
  }, [sales]);

  const buildSaleDraft = useCallback(
    () => ({
      customerId: '',
      salesPersonId: currentUser?.id ?? '',
      saleType: 'Cash',
      date: new Date().toISOString().slice(0, 10),
      discount: 0,
      taxRate: 5,
      notes: '',
      items: [{ productId: '', unitName: '', conversion: 1, quantity: 1, unitPrice: 0 }],
      branchId: currentBranchId != null ? String(currentBranchId) : '',
    }),
    [currentUser?.id, currentBranchId],
  );

  const openCreateSaleModal = useCallback(() => {
    if (!requirePermission(canCreateSale, 'You do not have permission to create sales.')) {
      return;
    }

    openModal(SaleFormModal, {
      title: 'Add Sale',
      mode: 'create',
      initialValues: buildSaleDraft(),
      customers: scopedCustomers,
      products,
      branches,
      currentBranchId,
      users: permittedSalesUsers,
      currentUserId: currentUser?.id ?? null,
      onCancel: closeModal,
      onSubmit: (formSale) => {
        const newSale = {
          ...formSale,
          id: getNextSaleId(),
        };
        addSale({ sale: newSale });
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Sale recorded',
          description: `Sale #${newSale.id} logged successfully.`,
        });
      },
    });
  }, [
    requirePermission,
    canCreateSale,
    openModal,
    scopedCustomers,
    products,
    permittedSalesUsers,
    currentUser,
    closeModal,
    getNextSaleId,
    addSale,
    pushNotification,
  ]);

  const openEditSaleModal = useCallback(
    (sale) => {
      const ownsSale = Number(sale?.salesPersonId) === Number(currentUser?.id);
      const canEditSale = canEditAnySale || (ownsSale && canEditOwnSale);
      if (!requirePermission(canEditSale, 'You do not have permission to edit this sale.')) {
        return;
      }

      openModal(SaleFormModal, {
        title: 'Edit Sale',
        mode: 'edit',
      initialValues: sale,
      customers: scopedCustomers,
      products,
      branches,
      currentBranchId,
      users: permittedSalesUsers,
        currentUserId: currentUser?.id ?? null,
        onCancel: closeModal,
        onSubmit: (formSale) => {
          updateSale({ ...sale, ...formSale });
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Sale updated',
            description: `Sale #${sale.id} updated successfully.`,
          });
        },
      });
    },
    [
      canEditAnySale,
      canEditOwnSale,
      currentUser,
      openModal,
      scopedCustomers,
      products,
      permittedSalesUsers,
      closeModal,
      updateSale,
      pushNotification,
      requirePermission,
    ],
  );

  const openDeleteSaleModal = useCallback(
    (sale) => {
      const ownsSale = Number(sale?.salesPersonId) === Number(currentUser?.id);
      const canDeleteSale = canDeleteAnySale || (ownsSale && canDeleteOwnSale);
      if (!requirePermission(canDeleteSale, 'You do not have permission to delete this sale.')) {
        return;
      }

      openModal(SaleDeleteModal, {
        sale,
        formatAmount: formatValue,
        onCancel: closeModal,
        onConfirm: () => {
          if (sale?.id == null) {
            closeModal();
            return;
          }
          deleteSale(sale.id);
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Sale deleted',
            description: `Sale #${sale.id} removed from the ledger.`,
          });
        },
      });
    },
    [
      canDeleteAnySale,
      canDeleteOwnSale,
      currentUser,
      openModal,
      formatValue,
      closeModal,
      deleteSale,
      pushNotification,
      requirePermission,
    ],
  );

  const handleQuickSale = useCallback(() => {
    if (!requirePermission(canCreateSale, 'You do not have permission to create sales.')) {
      return;
    }
    setQuickSaleActive(true);
  }, [requirePermission, canCreateSale, setQuickSaleActive]);

  const invoiceContext = useMemo(
    () => ({
      companyName,
      currentUser,
      users,
      invoiceTemplates,
      serverUrl,
      invoiceShareBaseUrl,
      supervisionLinks,
    }),
    [companyName, currentUser, users, invoiceTemplates, serverUrl, invoiceShareBaseUrl, supervisionLinks],
  );

  const handleGenerateInvoice = useCallback(async (saleId) => {
    if (!requirePermission(canGenerateInvoice, 'You do not have permission to generate invoices.')) {
      return;
    }
    const sale = scopedSales.find((entry) => entry.id === saleId);
    if (!sale) {
      pushNotification({ type: 'error', message: 'Sale #' + saleId + ' not found.' });
      return;
    }

    const existingInvoice = invoices.find((invoice) => invoice.saleId === saleId || invoice.originSaleId === saleId);
    const invoice = existingInvoice ?? buildInvoiceFromSale(sale, { customers: scopedCustomers, products, users: permittedSalesUsers });
    if (!invoice) {
      pushNotification({ type: 'error', message: 'Unable to build invoice from this sale.' });
      return;
    }

    try {
      const preparedInvoice = prepareInvoiceForDownload(invoiceContext, invoice);
      await downloadInvoicePdf(preparedInvoice ?? invoice, { companyName, countryCode: selectedCountry });
      pushNotification({
        type: 'success',
        message: 'Invoice downloaded',
        description: (invoice.invoiceNumber ?? ('Sale #' + saleId)),
      });
    } catch (error) {
      console.error('Failed to generate invoice PDF', error);
      pushNotification({ type: 'error', message: 'Unable to generate invoice PDF right now.' });
    }
  }, [
    requirePermission,
    canGenerateInvoice,
    scopedSales,
    invoices,
    scopedCustomers,
    products,
    permittedSalesUsers,
    companyName,
    selectedCountry,
    pushNotification,
    invoiceContext,
  ]);

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Sales Overview</h2>
          <p className="text-gray-400">Track performance, customer activity, and revenue in real-time.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`quick-sale-button px-4 py-2 rounded-xl font-medium ${canCreateSale ? '' : 'cursor-not-allowed opacity-60'}`}
            onClick={handleQuickSale}
            disabled={!canCreateSale}
          >
            <i className="fas fa-bolt mr-2" />Quick Sale
          </button>
          <button
            type="button"
            className={`perplexity-button px-4 py-2 rounded-xl font-medium ${
              canCreateSale ? '' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={openCreateSaleModal}
            disabled={!canCreateSale}
          >
            <i className="fas fa-plus mr-2" />Add Sale
          </button>
        </div>
      </header>

      <section className="responsive-grid-4">
        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-white">{totals.count}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-shopping-cart text-blue-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Revenue</p>
              <p className="text-lg font-bold text-green-400">{formatValue(totals.revenue)}</p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-dollar-sign text-green-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Average Sale</p>
              <p className="text-lg font-bold text-white">{formatValue(totals.average)}</p>
            </div>
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-amber-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Commission (Your Role)</p>
              <p className="text-lg font-bold text-purple-400">{formatValue(totals.commission)}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-user-tie text-purple-400" />
            </div>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 bg-gray-800/50 p-1 rounded-xl">
        {STATUS_FILTERS.map((option) => {
          const isActive = filter === option.key;
          const activeClass = isActive ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50';
          return (
            <button
              key={option.key}
              type="button"
              className={`flex-1 min-w-[140px] px-4 py-2 rounded-lg font-medium transition-all ${activeClass}`}
              onClick={() => setFilter(option.key)}
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
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Sale ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Items</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Total</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {filteredSales.length ? (
                [...filteredSales].reverse().map((sale, index) => {
                  const customer = scopedCustomers.find((entry) => entry.id === sale.customerId);
                  const salesperson = permittedSalesUsers.find((user) => user.id === sale.salesPersonId);
                  const ownsSale = Number(sale.salesPersonId) === Number(currentUser?.id);
                  const allowEdit = canEditAnySale || (ownsSale && canEditOwnSale);
                  const allowDelete = canDeleteAnySale || (ownsSale && canDeleteOwnSale);

                  return (
                    <tr
                      key={sale.id ?? `${sale.customerId}-${index}`}
                      className={`hover:bg-gray-800/50 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">#{sale.id}</div>
                        <div className="text-gray-400 text-sm">by {salesperson?.name ?? 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{customer?.name ?? 'Unknown Customer'}</div>
                        <div className="text-gray-400 text-sm">{sale.saleType ?? 'Cash'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white">
                          {sale.items?.length ?? 0} item{sale.items && sale.items.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {(sale.items ?? []).map((item) => {
                            const product = productMap.get(item.productId);
                            const unitName = item.unitName ?? product?.baseUnit ?? 'unit';
                            return `${item.quantity ?? 0}x ${product?.name ?? 'Product'} (${unitName})`;
                          }).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-bold">{formatValue(sale.total ?? 0)}</div>
                        {sale.discount > 0 ? (
                          <div className="text-gray-400 text-sm">Discount: {formatValue(sale.discount)}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {sale.date ? new Date(sale.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            className={`transition-colors ${
                              canGenerateInvoice ? 'text-blue-400 hover:text-blue-300' : 'text-gray-500 cursor-not-allowed'
                            }`}
                            onClick={() => handleGenerateInvoice(sale.id)}
                            title="Generate Invoice"
                            disabled={!canGenerateInvoice}
                          >
                            <i className="fas fa-file-invoice" />
                          </button>
                          {allowEdit ? (
                            <button
                              type="button"
                              className="text-emerald-400 hover:text-emerald-300 transition-colors"
                              onClick={() => openEditSaleModal(sale)}
                              title="Edit sale"
                            >
                              <i className="fas fa-edit" />
                            </button>
                          ) : null}
                          {allowDelete ? (
                            <button
                              type="button"
                              className="text-red-400 hover:text-red-300 transition-colors"
                              onClick={() => openDeleteSaleModal(sale)}
                              title="Delete sale"
                            >
                              <i className="fas fa-trash" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-400" colSpan={6}>
                    <i className="fas fa-chart-line text-3xl mb-3 opacity-50" />
                    <p>No sales yet.</p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        type="button"
                        className={`quick-sale-button px-4 py-2 rounded-xl ${canCreateSale ? '' : 'cursor-not-allowed opacity-60'}`}
                        onClick={handleQuickSale}
                        disabled={!canCreateSale}
                      >
                        <i className="fas fa-bolt mr-2" />Start Quick Sale
                      </button>
                      <button
                        type="button"
                        className={`perplexity-button px-4 py-2 rounded-xl ${canCreateSale ? '' : 'cursor-not-allowed opacity-60'}`}
                        onClick={openCreateSaleModal}
                        disabled={!canCreateSale}
                      >
                        <i className="fas fa-plus mr-2" />Add Sale
                      </button>
                    </div>
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




























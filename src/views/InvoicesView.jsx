import { useMemo, useState, useCallback } from 'react';
import { useAppActions, useAppState, prepareInvoiceForDownload, buildInvoiceShareUrl } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { downloadInvoicePdf, openInvoicePdf, createInvoicePdfBlob, getInvoicePdfFileName } from '../utils/invoicePdf.jsx';

const STATUS_ALL = 'all';
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Draft' },
];

const STATUS_STYLES = {
  paid: 'bg-green-500/20 text-green-400',
  sent: 'bg-blue-500/20 text-blue-400',
  overdue: 'bg-red-500/20 text-red-400',
  draft: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-gray-700/40 text-gray-300',
};

export default function InvoicesView() {
  const state = useAppState();
  const actions = useAppActions();
  const {
    invoices = [],
    customers = [],
    users = [],
    selectedCountry,
    currentUser,
    companyName,
    accessibleUserIds = [],
    hasFeaturePermission,
    invoiceTemplates = {},
    serverUrl,
    invoiceShareBaseUrl,
    supervisionLinks = [],
  } = state;
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

  const canManageInvoices = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'invoices.manage');
    }
    return ['admin', 'manager'].includes(currentUser?.role ?? 'guest');
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);

  const accessibleUserIdSet = useMemo(
    () => new Set(
      (accessibleUserIds ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    ),
    [accessibleUserIds],
  );

  const scopedCustomers = useMemo(() => {
    if (canManageInvoices) {
      return customers;
    }
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return customers.filter((customer) => {
      const ownerId = Number(customer?.accountOwnerId ?? customer?.ownerId);
      if (!Number.isFinite(ownerId)) {
        return false;
      }
      return accessibleUserIdSet.has(ownerId);
    });
  }, [customers, accessibleUserIdSet, canManageInvoices]);

  const scopedInvoices = useMemo(() => {
    if (canManageInvoices) {
      return invoices;
    }
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return invoices.filter((invoice) => {
      const issuedBy = Number(invoice?.issuedBy ?? invoice?.createdBy);
      const customerOwnerId = Number(
        (customers.find((customer) => customer.id === (invoice.customerId ?? invoice.customer?.id))?.accountOwnerId)
        ?? invoice.customer?.accountOwnerId
        ?? invoice.customer?.ownerId,
      );
      const issuedByAllowed = Number.isFinite(issuedBy) && accessibleUserIdSet.has(issuedBy);
      const customerAllowed = Number.isFinite(customerOwnerId) && accessibleUserIdSet.has(customerOwnerId);
      return issuedByAllowed || customerAllowed;
    });
  }, [invoices, customers, accessibleUserIdSet, canManageInvoices]);

  const permittedInvoiceUsers = useMemo(() => {
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return users.filter((user) => accessibleUserIdSet.has(Number(user?.id)));
  }, [users, accessibleUserIdSet]);

  const normalizedInvoices = useMemo(() => {
    return scopedInvoices.map((invoice) => {
      const customerId = invoice.customerId ?? invoice.customer?.id ?? null;
      const customer = scopedCustomers.find((entry) => entry.id === customerId) ?? invoice.customer ?? null;
      const issuedByUser = permittedInvoiceUsers.find((user) => user.id === (invoice.issuedBy ?? invoice.createdBy)) ?? null;
      const subtotal = invoice.subtotal ?? (invoice.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
      const taxAmount = invoice.taxAmount ?? subtotal * (invoice.taxRate ?? 0);
      const total = invoice.total ?? subtotal + taxAmount - (invoice.discount ?? 0);
      const balanceDue = invoice.balanceDue ?? (invoice.status === 'paid' ? 0 : total);
      const shareUrl = buildInvoiceShareUrl(invoiceContext, invoice);
      return {
        ...invoice,
        customer,
        customerName: customer?.name ?? 'Unknown Customer',
        issuedByUser,
        subtotal,
        taxAmount,
        total,
        balanceDue,
        shareUrl,
      };
    });
  }, [scopedInvoices, scopedCustomers, permittedInvoiceUsers, invoiceContext]);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return normalizedInvoices.filter((invoice) => {
      const matchesSearch = term
        ? [invoice.invoiceNumber, invoice.customerName, invoice.status]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term))
        : true;

      const matchesStatus = statusFilter === STATUS_ALL || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [normalizedInvoices, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const count = normalizedInvoices.length;
    const paidTotal = normalizedInvoices
      .filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
    const outstandingTotal = normalizedInvoices
      .filter((invoice) => invoice.status !== 'paid')
      .reduce((sum, invoice) => sum + (invoice.balanceDue ?? 0), 0);
    const overdueCount = normalizedInvoices.filter((invoice) => invoice.status === 'overdue').length;

    return {
      count,
      paidTotal,
      outstandingTotal,
      overdueCount,
    };
  }, [normalizedInvoices]);

  const formatValue = (value) => formatCurrency(value, { countryCode: selectedCountry, showSymbol: true });

  const handleAddInvoice = () => {
    if (!canManageInvoices) {
      actions.pushNotification({ type: 'warning', message: 'You do not have permission to manage invoices.' });
      return;
    }

    actions.pushNotification({
      type: 'info',
      message: 'Invoices follow your sales and expenses',
      description: 'Record a sale or expense entry to spin up a fresh invoice automatically.',
    });
  };

  const handleViewInvoice = async (invoice) => {
    try {
      const preparedInvoice = prepareInvoiceForDownload(invoiceContext, invoice);
      await openInvoicePdf(preparedInvoice ?? invoice, { companyName, countryCode: selectedCountry });
      actions.pushNotification({
        type: 'success',
        message: 'Invoice preview opened',
        description: `Preview for ${invoice.invoiceNumber} opened in a new tab.`,
      });
    } catch (error) {
      console.error('Failed to open invoice PDF', error);
      actions.pushNotification({
        type: 'error',
        message: 'Failed to open invoice PDF',
        description: error?.message ?? 'Please try again shortly.',
      });
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      const preparedInvoice = prepareInvoiceForDownload(invoiceContext, invoice);
      await downloadInvoicePdf(preparedInvoice ?? invoice, { companyName, countryCode: selectedCountry });
      actions.pushNotification({
        type: 'success',
        message: 'Invoice downloaded',
        description: `${invoice.invoiceNumber} saved as PDF.`,
      });
    } catch (error) {
      console.error('Failed to download invoice PDF', error);
      actions.pushNotification({
        type: 'error',
        message: 'Download failed',
        description: error?.message ?? 'Unable to generate the PDF right now.',
      });
    }
  };

  const handleMarkAsPaid = (invoice) => {
    if (!canManageInvoices) {
      actions.pushNotification({ type: 'warning', message: 'You do not have permission to update invoices.' });
      return;
    }

    if (invoice.status === 'paid') {
      actions.pushNotification({ type: 'info', message: 'Invoice already paid.' });
      return;
    }

    actions.updateInvoice({ ...invoice, status: 'paid', balanceDue: 0 });
    actions.pushNotification({
      type: 'success',
      message: 'Invoice marked as paid',
      description: `Invoice ${invoice.invoiceNumber} has been settled.`,
    });
  };

  const handleDeleteInvoice = (invoice) => {
    if (!canManageInvoices) {
      actions.pushNotification({ type: 'warning', message: 'You do not have permission to delete invoices.' });
      return;
    }

    actions.deleteInvoice(invoice.id);
    actions.pushNotification({
      type: 'success',
      message: 'Invoice deleted',
      description: `${invoice.invoiceNumber} removed from the ledger.`,
    });
  };

  const handleShareInvoice = useCallback(async (invoice) => {
    try {
      const preparedInvoice = prepareInvoiceForDownload(invoiceContext, invoice);
      const exportReadyInvoice = preparedInvoice ?? invoice;
      const blob = await createInvoicePdfBlob(exportReadyInvoice, { companyName, countryCode: selectedCountry });
      const fileName = getInvoicePdfFileName(exportReadyInvoice);
      const shareFile = new File([blob], fileName, { type: 'application/pdf' });

      let canShareFile = false;
      try {
        canShareFile = Boolean(navigator?.canShare?.({ files: [shareFile] }));
      } catch (shareError) {
        console.warn('navigator.canShare threw', shareError);
      }

      if (navigator?.share && canShareFile) {
        await navigator.share({
          title: fileName.replace(/_/g, ' '),
          text: exportReadyInvoice.customerName ? `Customer: ${exportReadyInvoice.customerName}` : undefined,
          files: [shareFile],
        });
        actions.pushNotification({
          type: 'success',
          message: 'Invoice shared',
          description: 'The PDF has been handed to your share target.',
        });
        return;
      }

      await downloadInvoicePdf(exportReadyInvoice, { companyName, countryCode: selectedCountry });
      actions.pushNotification({
        type: 'info',
        message: 'Share unavailable',
        description: 'PDF downloaded instead so you can share it manually.',
      });
    } catch (error) {
      console.error('Failed to share invoice PDF', error);
      actions.pushNotification({
        type: 'error',
        message: 'Unable to share invoice',
        description: error?.message ?? 'Try again or download the PDF manually.',
      });
    }
  }, [actions, companyName, invoiceContext, selectedCountry]);

  const formatStatus = (status) => status.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const getStatusClass = (status) => STATUS_STYLES[status] ?? 'bg-gray-700/40 text-gray-300';

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Invoice Management</h2>
          <p className="text-gray-400">Track billing progress and outstanding revenue.</p>
        </div>

        <button
          type="button"
          className={`px-4 py-2 rounded-xl font-medium ${canManageInvoices ? 'perplexity-button' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
          onClick={handleAddInvoice}
          disabled={!canManageInvoices}
        >
          <i className="fas fa-plus mr-2" />Add Invoice
        </button>
      </header>

      <section className="responsive-grid-4">
        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Invoices</p>
              <p className="text-2xl font-bold text-white">{summary.count}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-file-invoice text-blue-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Outstanding</p>
              <p className="text-lg font-bold text-yellow-400">{formatValue(summary.outstandingTotal)}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-exclamation-circle text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Collected</p>
              <p className="text-lg font-bold text-emerald-400">{formatValue(summary.paidTotal)}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-check-circle text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Overdue</p>
              <p className="text-lg font-bold text-red-400">{summary.overdueCount}</p>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-clock text-red-400" />
            </div>
          </div>
        </div>
      </section>

      <section className="perplexity-card p-4 slide-up">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="invoice-search" className="block text-sm font-medium text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="invoice-search"
                type="search"
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40"
                placeholder="Invoice number or customer"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => {
                const isActive = statusFilter === option.value;
                const activeClass = isActive ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50';
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeClass}`}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="perplexity-card overflow-hidden">
        <div className="responsive-table">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Invoice</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Dates</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {filteredInvoices.length ? (
                [...filteredInvoices].reverse().map((invoice, index) => (
                  <tr
                    key={invoice.id ?? invoice.invoiceNumber ?? index}
                    className={`hover:bg-gray-800/50 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-semibold">{invoice.invoiceNumber}</div>
                      <div className="text-gray-400 text-sm">Issued by {invoice.issuedByUser?.name ?? 'Team'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{invoice.customerName}</div>
                      <div className="text-gray-400 text-sm">Balance: {formatValue(invoice.balanceDue)}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      <div>Issued: {invoice.date ? new Date(invoice.date).toLocaleDateString() : '�'}</div>
                      <div>Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '�'}</div>
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">{formatValue(invoice.total)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(invoice.status)}`}>
                        {formatStatus(invoice.status ?? 'draft')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          onClick={() => handleViewInvoice(invoice)}
                          title="Preview"
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <button
                          type="button"
                          className="text-sky-400 hover:text-sky-300 transition-colors"
                          onClick={() => handleShareInvoice(invoice)}
                          title="Share"
                        >
                          <i className="fas fa-share-alt" />
                        </button>
                        <button
                          type="button"
                          className="text-teal-400 hover:text-teal-300 transition-colors"
                          onClick={() => handleDownloadInvoice(invoice)}
                          title="Download"
                        >
                          <i className="fas fa-file-download" />
                        </button>
                        {invoice.status !== 'paid' ? (
                          <button
                            type="button"
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                            onClick={() => handleMarkAsPaid(invoice)}
                            title="Mark as Paid"
                          >
                            <i className="fas fa-check" />
                          </button>
                        ) : null}
                        {canManageInvoices ? (
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-300 transition-colors"
                            onClick={() => handleDeleteInvoice(invoice)}
                            title="Delete"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-400" colSpan={6}>
                    <i className="fas fa-file-invoice text-3xl mb-3 opacity-50" />
                    <p>No invoices match this view yet.</p>
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























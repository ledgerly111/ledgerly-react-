import { useCallback, useMemo, useState } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import PurchaseOrderFormModal from '../components/PurchaseOrderFormModal.jsx';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ReceivePurchaseOrderModal from '../components/ReceivePurchaseOrderModal.jsx';
import { formatCurrency } from '../utils/currency.js';
import { downloadPurchaseOrderPdf } from '../utils/purchaseOrderPdf.jsx';

const STATUS_BADGE_CLASSES = {
  Draft: 'bg-gray-700/40 text-gray-300 border border-gray-600/60',
  Ordered: 'bg-blue-500/10 text-blue-200 border border-blue-400/40',
  Received: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/40',
};

const TAB_OPTIONS = [
  { key: 'all', label: 'All Purchase Orders' },
  { key: 'bills', label: 'Bills to Pay' },
];

export default function PurchasingView() {
  const state = useAppState();
  const {
    openModal,
    closeModal,
    receivePurchaseOrder,
    deletePurchaseOrder,
    recordPoPayment,
    pushNotification,
  } = useAppActions();
  const {
    purchaseOrders = [],
    products = [],
    selectedCountry,
    companyName,
  } = state;
  const [activeTab, setActiveTab] = useState('all');

  const formatValue = useCallback(
    (amount) => formatCurrency(amount ?? 0, { countryCode: selectedCountry, showSymbol: true }),
    [selectedCountry],
  );

  const purchaseOrdersWithDerived = useMemo(() => purchaseOrders.map((purchaseOrder) => {
    const totalCost = purchaseOrder.totalCost != null
      ? Number(purchaseOrder.totalCost)
      : (purchaseOrder.items ?? []).reduce((sum, item) => {
        const quantity = Number(item?.quantity) || 0;
        const cost = Number(item?.cost) || 0;
        return sum + quantity * cost;
      }, 0);
    return { ...purchaseOrder, totalCost };
  }), [purchaseOrders]);

  const billsToPay = useMemo(
    () => purchaseOrdersWithDerived.filter((order) => {
      const status = String(order.status ?? '').toLowerCase();
      const paymentStatus = String(order.paymentStatus ?? 'Unpaid').toLowerCase();
      return status === 'received' && paymentStatus !== 'paid';
    }),
    [purchaseOrdersWithDerived],
  );

  const handleCreatePurchaseOrder = () => {
    openModal?.(PurchaseOrderFormModal, {
      title: 'Create Purchase Order',
      products,
      onCancel: () => closeModal?.(),
    });
  };

  const handleEditPurchaseOrder = (purchaseOrder) => {
    if (!purchaseOrder) {
      return;
    }
    openModal?.(PurchaseOrderFormModal, {
      title: 'Edit Purchase Order',
      mode: 'edit',
      initialValues: purchaseOrder,
      products,
      onCancel: () => closeModal?.(),
    });
  };

  const handleMarkAsReceived = (purchaseOrder) => {
    if (!purchaseOrder?.id) return;
    if (String(purchaseOrder.status ?? '').toLowerCase() !== 'ordered') return;
    openModal?.(ReceivePurchaseOrderModal, {
      purchaseOrder,
      products,
      branches: state.branches ?? [],
      onCancel: () => closeModal?.(),
      onSubmit: (receiptPayload) => {
        receivePurchaseOrder?.(receiptPayload);
        pushNotification?.({
          type: 'success',
          message: 'Purchase Order Received',
          description: `PO #${purchaseOrder.id} marked as received.`,
        });
        closeModal?.();
      },
    });
  };

  const handleDeletePurchaseOrder = (purchaseOrder) => {
    if (!purchaseOrder?.id) return;
    openModal?.(ConfirmModal, {
      title: 'Delete Purchase Order',
      message: `Are you sure you want to permanently delete PO #${purchaseOrder.id}? This action cannot be undone.`,
      confirmTone: 'danger',
      confirmLabel: 'Delete Purchase Order',
      onConfirm: () => {
        deletePurchaseOrder?.(purchaseOrder.id);
        pushNotification?.({
          type: 'info',
          message: 'Purchase Order Deleted',
          description: `PO #${purchaseOrder.id} has been removed.`,
        });
        closeModal?.();
      },
      onCancel: () => closeModal?.(),
    });
  };

  const handleRecordPayment = (purchaseOrder) => {
    if (!purchaseOrder?.id) {
      return;
    }
    openModal?.(RecordPaymentModal, {
      purchaseOrder,
      formatValue,
      onCancel: () => closeModal?.(),
      onConfirm: ({ paymentDate, paymentAmount, paymentAccountCode }) => {
        recordPoPayment?.({
          purchaseOrderId: purchaseOrder.id,
          paymentDate,
          paymentAccountCode,
        });
        pushNotification?.({
          type: 'success',
          message: 'Payment Recorded',
          description: `PO #${purchaseOrder.id} has been marked as paid.`,
        });
        closeModal?.();
      },
    });
  };

  const handleDownloadPurchaseOrder = async (purchaseOrder) => {
    if (!purchaseOrder) {
      return;
    }
    try {
      await downloadPurchaseOrderPdf(purchaseOrder, {
        companyName: companyName ?? 'Owlio',
        countryCode: selectedCountry,
      });
    } catch (error) {
      console.error('Failed to download purchase order PDF', error);
      pushNotification?.({
        type: 'error',
        message: 'Download Failed',
        description: 'Unable to generate the purchase order PDF. Please try again.',
      });
    }
  };

  const renderPurchaseOrdersTable = (orders) => (
    <section className="perplexity-card overflow-hidden slide-up">
      <div className="responsive-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">PO ID</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Supplier</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Order Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Total Cost</th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {orders.length ? (
              orders.map((purchaseOrder, index) => {
                const orderDate = purchaseOrder.orderDate
                  ? new Date(purchaseOrder.orderDate).toLocaleDateString()
                  : 'N/A';
                const status = purchaseOrder.status ?? 'Draft';
                const badgeClass = STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.Draft;
                return (
                  <tr
                    key={purchaseOrder.id ?? index}
                    className={`${index % 2 === 0 ? 'bg-gray-900/40' : ''} hover:bg-gray-800/40 transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {purchaseOrder.id ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-200">
                      {purchaseOrder.supplierName || 'Unknown Supplier'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-2 ${badgeClass}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {orderDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-200">
                      {formatValue(purchaseOrder.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          className="text-blue-300 hover:text-blue-200 transition-colors"
                          onClick={() => handleEditPurchaseOrder(purchaseOrder)}
                          title="Edit Purchase Order"
                          aria-label="Edit purchase order"
                        >
                          <i className="fas fa-edit" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="text-indigo-300 hover:text-indigo-200 transition-colors"
                          onClick={() => handleDownloadPurchaseOrder(purchaseOrder)}
                          title="Download Purchase Order PDF"
                          aria-label="Download purchase order PDF"
                        >
                          <i className="fas fa-file-pdf" aria-hidden="true" />
                        </button>
                        {String(status).toLowerCase() === 'ordered' ? (
                          <button
                            type="button"
                            className="text-emerald-300 hover:text-emerald-200 transition-colors"
                            onClick={() => handleMarkAsReceived(purchaseOrder)}
                          >
                            <i className="fas fa-check-circle" aria-hidden="true" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-red-300 hover:text-red-200 transition-colors"
                          onClick={() => handleDeletePurchaseOrder(purchaseOrder)}
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                  <i className="fas fa-clipboard-list text-3xl mb-3 opacity-40" />
                  <p>No purchase orders yet. Start by creating one.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderBillsToPayTable = () => (
    <section className="perplexity-card overflow-hidden slide-up">
      <div className="responsive-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Supplier</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">PO ID</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Amount Owed</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Due Date</th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {billsToPay.length ? (
              billsToPay.map((purchaseOrder, index) => {
                const dueDate = purchaseOrder.expectedDate
                  ? new Date(purchaseOrder.expectedDate).toLocaleDateString()
                  : 'N/A';
                return (
                  <tr
                    key={purchaseOrder.id ?? `bill-${index}`}
                    className={`${index % 2 === 0 ? 'bg-gray-900/40' : ''} hover:bg-gray-800/40 transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-200">
                      {purchaseOrder.supplierName || 'Unknown Supplier'}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {purchaseOrder.id ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-200">
                      {formatValue(purchaseOrder.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {dueDate}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          className="text-emerald-300 hover:text-emerald-200 transition-colors"
                          onClick={() => handleRecordPayment(purchaseOrder)}
                        >
                          <i className="fas fa-money-check-alt mr-2" aria-hidden="true" />
                          Record Payment
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                  <i className="fas fa-file-invoice-dollar text-3xl mb-3 opacity-40" />
                  <p>No outstanding bills to pay. Great job keeping up!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Purchase Orders</h2>
          <p className="text-gray-400">Track supplier orders, expected deliveries, and receiving status.</p>
        </div>
        <button
          type="button"
          className="perplexity-button px-4 py-2 rounded-xl font-semibold"
          onClick={handleCreatePurchaseOrder}
        >
          <i className="fas fa-plus mr-2" />Create Purchase Order
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'all'
        ? renderPurchaseOrdersTable(purchaseOrdersWithDerived)
        : renderBillsToPayTable()}
    </div>
  );
}

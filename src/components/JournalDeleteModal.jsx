import { useEffect, useRef, useState, useMemo } from 'react';
import { formatCurrency } from '../utils/currency.js';

export default function JournalDeleteModal({
    entry,
    sales = [],
    expenses = [],
    products = [],
    selectedCountry,
    onConfirm,
    onCancel,
}) {
    const mountedRef = useRef(true);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => () => {
        mountedRef.current = false;
    }, []);

    const affectedEntities = useMemo(() => {
        if (!entry?.metadata) {
            return { type: 'manual', details: [] };
        }

        const { source, saleId, expenseId, purchaseOrderId } = entry.metadata;

        if (source === 'sale' && saleId) {
            const sale = sales.find((s) => s.id === saleId);
            if (!sale) {
                return { type: 'sale', details: [], warning: `Sale #${saleId} not found` };
            }

            const affectedProducts = (sale.items || []).map((item) => {
                const product = products.find((p) => p.id === item.productId);
                const baseQuantity = Number(item.baseQuantity) ||
                    Number(item.quantity || 0) * Number(item.conversion || 1);

                return {
                    id: item.productId,
                    name: product?.name || 'Unknown Product',
                    quantityToRestore: baseQuantity,
                };
            }).filter((item) => item.quantityToRestore > 0);

            return {
                type: 'sale',
                saleId,
                saleTotal: sale.total,
                customerId: sale.customerId,
                details: affectedProducts,
            };
        }

        if (source === 'expense' && expenseId) {
            const expense = expenses.find((e) => e.id === expenseId);
            if (!expense) {
                return { type: 'expense', details: [], warning: `Expense #${expenseId} not found` };
            }

            return {
                type: 'expense',
                expenseId,
                expenseAmount: expense.amount,
                description: expense.description,
                details: [],
            };
        }

        if ((source === 'purchase-order' || source === 'purchase-order-payment') && purchaseOrderId) {
            return {
                type: 'purchase',
                purchaseOrderId,
                details: [],
            };
        }

        return { type: 'manual', details: [] };
    }, [entry, sales, expenses, products]);

    const handleDelete = async () => {
        setError('');
        setDeleting(true);
        try {
            await Promise.resolve(onConfirm?.(entry));
        } catch (err) {
            if (!mountedRef.current) {
                return;
            }
            setError(err?.message ?? 'Failed to delete the journal entry. Please try again.');
            setDeleting(false);
            return;
        }

        if (!mountedRef.current) {
            return;
        }

        setDeleting(false);
    };

    const formatAmount = (amount) => formatCurrency(amount, { countryCode: selectedCountry, showSymbol: true });

    const totalDebit = useMemo(() => {
        return (entry?.entries || []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    }, [entry]);

    const totalCredit = useMemo(() => {
        return (entry?.entries || []).reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    }, [entry]);

    return (
        <div className="space-y-5">
            <header className="space-y-2">
                <h3 className="text-xl font-semibold text-white">Delete Journal Entry</h3>
                <p className="text-gray-400 text-sm">
                    This action will reverse ALL changes made by this journal entry.
                </p>
            </header>

            {/* Entry Details */}
            <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white font-medium">{entry?.date}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Description:</span>
                    <span className="text-white font-medium">{entry?.description}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Debit:</span>
                    <span className="text-blue-400 font-mono font-semibold">{formatAmount(totalDebit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Credit:</span>
                    <span className="text-teal-400 font-mono font-semibold">{formatAmount(totalCredit)}</span>
                </div>
            </div>

            {/* Warning based on entry type */}
            {affectedEntities.warning ? (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300">
                    <i className="fas fa-exclamation-triangle mr-2" />
                    {affectedEntities.warning}
                </div>
            ) : affectedEntities.type === 'sale' ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 space-y-3">
                    <div className="text-sm font-semibold text-red-300">
                        <i className="fas fa-undo mr-2" />
                        This will reverse Sale #{affectedEntities.saleId}
                    </div>
                    <div className="text-sm text-gray-300">
                        Sale Amount: <span className="font-semibold text-white">{formatAmount(affectedEntities.saleTotal)}</span>
                    </div>
                    {affectedEntities.details.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-gray-400 mb-2">Product Inventory Changes:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {affectedEntities.details.map((product) => (
                                    <div key={product.id} className="text-xs text-gray-300 flex justify-between">
                                        <span>{product.name}</span>
                                        <span className="text-green-400">+{product.quantityToRestore} units restored</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : affectedEntities.type === 'expense' ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 space-y-2">
                    <div className="text-sm font-semibold text-red-300">
                        <i className="fas fa-undo mr-2" />
                        This will reverse Expense #{affectedEntities.expenseId}
                    </div>
                    <div className="text-sm text-gray-300">
                        Amount: <span className="font-semibold text-white">{formatAmount(affectedEntities.expenseAmount)}</span>
                    </div>
                    {affectedEntities.description && (
                        <div className="text-xs text-gray-400">{affectedEntities.description}</div>
                    )}
                </div>
            ) : affectedEntities.type === 'purchase' ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
                    <div className="text-sm font-semibold text-red-300">
                        <i className="fas fa-undo mr-2" />
                        This will affect Purchase Order #{affectedEntities.purchaseOrderId}
                    </div>
                </div>
            ) : (
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 px-4 py-3">
                    <div className="text-sm text-gray-400">
                        <i className="fas fa-info-circle mr-2" />
                        This is a manual journal entry. Only the entry will be deleted.
                    </div>
                </div>
            )}

            {error ? (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                <button
                    type="button"
                    className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
                    onClick={() => onCancel?.()}
                    disabled={deleting}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                    onClick={handleDelete}
                    disabled={deleting}
                >
                    {deleting ? 'Deleting...' : 'Delete & Reverse'}
                </button>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useAppActions } from '../context/AppContext.jsx';

export default function ReportDamageModal({
    product,
    onCancel,
    onSubmit,
}) {
    const { pushNotification } = useAppActions();
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('Broken');
    const [notes, setNotes] = useState('');

    const maxQuantity = product?.stock ?? 0;

    useEffect(() => {
        if (quantity > maxQuantity) {
            setQuantity(maxQuantity);
        }
    }, [maxQuantity, quantity]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (quantity <= 0) {
            pushNotification({ type: 'error', message: 'Quantity must be greater than 0' });
            return;
        }
        if (quantity > maxQuantity) {
            pushNotification({ type: 'error', message: 'Cannot report more than current stock' });
            return;
        }

        onSubmit({
            productId: product.id,
            quantity: Number(quantity),
            reason,
            notes,
        });
    };

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h3 className="text-xl font-semibold text-white">Report Damaged Stock</h3>
                <p className="text-gray-400 text-sm">
                    Record damaged or lost inventory to keep stock levels accurate.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Product
                    </label>
                    <div className="text-white font-medium text-lg">
                        {product?.name}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        Current Stock: {maxQuantity} units
                    </div>
                </div>

                <label className="flex flex-col gap-2 text-sm text-gray-300">
                    <span className="text-sm font-medium text-gray-200">Quantity Damaged</span>
                    <input
                        id="damage-quantity"
                        type="number"
                        min="1"
                        max={maxQuantity}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        required
                    />
                </label>

                <label className="flex flex-col gap-2 text-sm text-gray-300">
                    <span className="text-sm font-medium text-gray-200">Reason</span>
                    <select
                        id="damage-reason"
                        className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    >
                        <option value="Broken">Broken / Damaged</option>
                        <option value="Expired">Expired</option>
                        <option value="Lost">Lost / Stolen</option>
                        <option value="Other">Other</option>
                    </select>
                </label>

                <label className="flex flex-col gap-2 text-sm text-gray-300">
                    <span className="text-sm font-medium text-gray-200">Notes (Optional)</span>
                    <textarea
                        id="damage-notes"
                        className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40 resize-none"
                        rows={4}
                        placeholder="Additional details about the damaged stock..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </label>

                <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                    <button
                        type="button"
                        className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
                    >
                        Report Damage
                    </button>
                </div>
            </form>
        </div>
    );
}

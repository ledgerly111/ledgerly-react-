import { pdf } from '@react-pdf/renderer';
import PurchaseOrderDocument from '../pdf/PurchaseOrderDocument.jsx';
import { formatCurrency as baseFormatCurrency } from './currency.js';

export function getPurchaseOrderPdfFileName(purchaseOrder) {
  const identifier = purchaseOrder?.id ?? Date.now();
  const safeId = String(identifier).replace(/[^a-z0-9_-]+/gi, '-');
  return `PurchaseOrder_${safeId}.pdf`;
}

export async function createPurchaseOrderPdfBlob(purchaseOrder, { companyName, countryCode } = {}) {
  const formatCurrency = (value) => baseFormatCurrency(value ?? 0, {
    countryCode,
    showSymbol: true,
  });

  const document = (
    <PurchaseOrderDocument
      purchaseOrder={purchaseOrder}
      companyName={companyName}
      formatCurrency={formatCurrency}
    />
  );

  const instance = pdf(document);
  return instance.toBlob();
}

export async function downloadPurchaseOrderPdf(purchaseOrder, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF downloads are only available in the browser.');
  }

  const blob = await createPurchaseOrderPdfBlob(purchaseOrder, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getPurchaseOrderPdfFileName(purchaseOrder);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

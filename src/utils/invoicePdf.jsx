import { pdf } from '@react-pdf/renderer';
import InvoiceDocument from '../pdf/InvoiceDocument.jsx';
import { formatCurrency as baseFormatCurrency } from './currency.js';

export function getInvoicePdfFileName(invoice) {
  const safeNumber = invoice.invoiceNumber ?? `invoice-${invoice.id ?? Date.now()}`;
  return `Invoice_${safeNumber.replace(/[^a-z0-9_-]+/gi, '-')}.pdf`;
}

export async function createInvoicePdfBlob(invoice, { companyName, countryCode } = {}) {
  const formatCurrency = (value) => baseFormatCurrency(value, { countryCode, showSymbol: true });
  const document = (
    <InvoiceDocument invoice={invoice} companyName={companyName} formatCurrency={formatCurrency} />
  );

  const instance = pdf(document);
  return instance.toBlob();
}

export async function downloadInvoicePdf(invoice, { companyName, countryCode } = {}) {
  const blob = await createInvoicePdfBlob(invoice, { companyName, countryCode });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getInvoicePdfFileName(invoice);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function openInvoicePdf(invoice, { companyName, countryCode } = {}) {
  const blob = await createInvoicePdfBlob(invoice, { companyName, countryCode });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
}

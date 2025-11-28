function toInvoiceItems(saleItems = [], products = []) {
  return saleItems.map((item) => {
    const product = products.find((productEntry) => productEntry.id === item.productId) ?? null;
    const quantity = item.quantity ?? 0;
    const unitPrice = item.unitPrice ?? product?.price ?? 0;
    return {
      description: item.description ?? product?.name ?? 'Line item',
      quantity,
      unitPrice,
    };
  });
}

function normalizeTaxRate(subtotal, taxAmount, fallbackRate) {
  if (typeof fallbackRate === 'number' && Number.isFinite(fallbackRate) && fallbackRate >= 0) {
    return fallbackRate;
  }
  if (!subtotal) {
    return 0;
  }
  return taxAmount ? taxAmount / subtotal : 0;
}

export function buildInvoiceFromSale(sale, { customers = [], products = [], users = [] } = {}) {
  if (!sale) {
    return null;
  }

  const customer = customers.find((entry) => entry.id === sale.customerId) ?? null;
  const issuedByUser = users.find((user) => user.id === sale.salesPersonId) ?? null;
  const items = toInvoiceItems(sale.items ?? [], products);
  const subtotal = typeof sale.subtotal === 'number'
    ? sale.subtotal
    : items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
  const discount = sale.discount ?? 0;
  const taxAmount = sale.taxAmount ?? 0;
  const taxRate = normalizeTaxRate(subtotal, taxAmount, sale.taxRate);
  const total = sale.total ?? subtotal - discount + taxAmount;
  const balanceDue = sale.paymentStatus === 'paid' ? 0 : total;

  const invoiceNumber = sale.invoiceNumber
    ?? `SALE-${String(sale.id ?? Date.now()).padStart(4, '0')}`;

  const saleDate = sale.date ?? new Date().toISOString();

  return {
    id: sale.invoiceId ?? `sale-${sale.id ?? Date.now()}`,
    saleId: sale.id,
    invoiceNumber,
    customerId: customer?.id ?? sale.customerId ?? null,
    customer,
    issuedBy: issuedByUser?.id ?? sale.salesPersonId ?? null,
    issuedByUser,
    date: saleDate,
    dueDate: sale.dueDate ?? saleDate,
    status: sale.paymentStatus ?? 'sent',
    subtotal,
    discount,
    taxRate,
    taxAmount,
    total,
    balanceDue,
    notes: sale.notes ?? 'Generated from sales record.',
    items,
  };
}

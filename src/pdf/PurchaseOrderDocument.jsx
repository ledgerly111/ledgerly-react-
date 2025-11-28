import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatCurrency as baseFormatCurrency } from '../utils/currency.js';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingVertical: 36,
    paddingHorizontal: 44,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 500,
    color: '#111827',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 10,
  },
  tableCellNarrow: {
    flex: 0.8,
  },
  tableCellAmount: {
    flex: 1,
    textAlign: 'right',
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1f2937',
  },
  summary: {
    marginTop: 10,
    marginLeft: 'auto',
    width: '50%',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  summaryRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#111827',
  },
  summaryLabel: {
    fontWeight: 500,
    color: '#374151',
  },
  summaryTotal: {
    fontWeight: 700,
    fontSize: 12,
  },
  footerNote: {
    marginTop: 24,
    fontSize: 10,
    color: '#6b7280',
  },
});

function formatWithFallback(value, formatter) {
  if (typeof formatter === 'function') {
    return formatter(value ?? 0);
  }
  if (Number.isFinite(value)) {
    return value.toFixed(2);
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
}

export default function PurchaseOrderDocument({
  purchaseOrder,
  companyName,
  formatCurrency,
}) {
  const safeOrder = purchaseOrder ?? {};
  const supplierName = safeOrder.supplierName || 'Supplier';
  const poNumber = safeOrder.id ?? 'Pending ID';
  const orderDate = safeOrder.orderDate
    ? new Date(safeOrder.orderDate).toLocaleDateString()
    : 'N/A';
  const expectedDate = safeOrder.expectedDate
    ? new Date(safeOrder.expectedDate).toLocaleDateString()
    : 'N/A';
  const status = safeOrder.status ?? 'Draft';
  const paymentStatus = safeOrder.paymentStatus ?? 'Unpaid';
  const issuingCompany = companyName || 'Owlio';

  const items = Array.isArray(safeOrder.items) ? safeOrder.items : [];
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item?.quantity) || 0;
    const cost = Number(item?.cost) || 0;
    return sum + quantity * cost;
  }, 0);

  const appliedFormatter = formatCurrency
    ?? ((value) => baseFormatCurrency(value ?? 0, { countryCode: 'AE', showSymbol: true }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Purchase Order</Text>
          <Text style={styles.subtitle}>
            Issued by {issuingCompany}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>Purchase Order</Text>
              <Text style={styles.infoValue}>PO #{poNumber}</Text>
              <Text style={styles.infoLabel}>Supplier</Text>
              <Text style={styles.infoValue}>{supplierName}</Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>Order Date</Text>
              <Text style={styles.infoValue}>{orderDate}</Text>
              <Text style={styles.infoLabel}>Expected Delivery</Text>
              <Text style={styles.infoValue}>{expectedDate}</Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{status}</Text>
              <Text style={styles.infoLabel}>Payment Status</Text>
              <Text style={styles.infoValue}>{paymentStatus}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>Description</Text>
              <Text style={[styles.tableCell, styles.tableCellNarrow, styles.tableCellHeader]}>Quantity</Text>
              <Text style={[styles.tableCell, styles.tableCellNarrow, styles.tableCellHeader]}>Unit</Text>
              <Text style={[styles.tableCell, styles.tableCellAmount, styles.tableCellHeader]}>Unit Cost</Text>
              <Text style={[styles.tableCell, styles.tableCellAmount, styles.tableCellHeader]}>Line Total</Text>
            </View>
            {items.length ? (
              items.map((item, index) => {
                const quantity = Number(item?.quantity) || 0;
                const unitCost = Number(item?.cost) || 0;
                const lineTotal = quantity * unitCost;
                return (
                  <View key={`po-item-${index}`} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{item?.description || item?.productName || `Line ${index + 1}`}</Text>
                    <Text style={[styles.tableCell, styles.tableCellNarrow]}>{quantity}</Text>
                    <Text style={[styles.tableCell, styles.tableCellNarrow]}>{item?.unitName ?? 'unit'}</Text>
                    <Text style={[styles.tableCell, styles.tableCellAmount]}>
                      {formatWithFallback(unitCost, appliedFormatter)}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellAmount]}>
                      {formatWithFallback(lineTotal, appliedFormatter)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { textAlign: 'center' }]}>
                  No items recorded for this purchase order.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text>{formatWithFallback(subtotal, appliedFormatter)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={styles.summaryTotal}>{formatWithFallback(subtotal, appliedFormatter)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Thank you for your partnership. Please contact us if you have any questions about this order.
        </Text>
      </Page>
    </Document>
  );
}

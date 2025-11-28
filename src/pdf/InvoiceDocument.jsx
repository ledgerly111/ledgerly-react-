

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 44,
    color: '#111827',
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  section: {
    marginBottom: 12,
  },
  accentBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 600,
  },
  subheading: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  textMuted: {
    color: '#6b7280',
  },
  label: {
    fontWeight: 600,
    marginRight: 4,
  },
  table: {
    display: 'table',
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexGrow: 1,
    fontSize: 11,
  },
  amountCell: {
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalRow: {
    marginTop: 8,
    borderTopWidth: 2,
    paddingTop: 8,
    fontWeight: 700,
    fontSize: 14,
  },
  notes: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    color: '#374151',
  },
  barcodeBlock: {
    marginTop: 6,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeFrame: {
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeImage: {
    width: 64,
    height: 64,
  },
  barcodeCaption: {
    marginTop: 4,
    fontSize: 8.5,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 160,
  },
});

const classicStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerRowReverse: {
    flexDirection: 'row-reverse',
  },
  headerBlock: {
    flex: 1,
  },
  alignLeft: {
    textAlign: 'left',
  },
  alignRight: {
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailRowStacked: {
    flexDirection: 'column',
  },
  detailColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 12,
  },
  detailColumnSpacing: {
    marginRight: 12,
  },
  detailColumnStacked: {
    marginBottom: 12,
  },
  summaryContainer: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: '65%',
  },
  summaryContainerFull: {
    maxWidth: '100%',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bottomRowSingle: {
    justifyContent: 'flex-end',
  },
  barcodeWrapper: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
const columnStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoGridStacked: {
    flexDirection: 'column',
  },
  infoColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0f766e33',
    borderRadius: 6,
    padding: 12,
  },
  infoColumnSpacing: {
    marginRight: 12,
  },
  infoColumnStacked: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#0f766e',
    marginBottom: 6,
  },
  infoEntry: {
    fontSize: 11,
    color: '#0f172a',
    marginBottom: 4,
  },
  totalsColumn: {
    borderWidth: 1,
    borderColor: '#0f766e33',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#ecfdf5',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalsLabel: {
    fontSize: 11,
    color: '#0f766e',
  },
  totalsValue: {
    fontSize: 11,
    fontWeight: 600,
    color: '#0b5550',
  },
  totalsGrand: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0b5550',
  },
  barcodeWrapper: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});

const minimalStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 44,
    color: '#0f172a',
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 8,
  },
  metaLine: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  column: {
    flex: 1,
  },
  columnSpacing: {
    marginRight: 24,
  },
  columnLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  columnValue: {
    fontSize: 11,
    color: '#0f172a',
    marginBottom: 3,
  },
  table: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 6,
  },
  headerCell: {
    flex: 1,
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  cell: {
    flex: 1,
    fontSize: 11,
    color: '#0f172a',
  },
  cellRight: {
    textAlign: 'right',
  },
  totals: {
    marginTop: 12,
    alignSelf: 'flex-end',
    minWidth: 200,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 11,
  },
  totalsLabel: {
    color: '#6b7280',
  },
  totalsValue: {
    color: '#0f172a',
  },
  totalsGrand: {
    fontSize: 14,
    fontWeight: 700,
  },
  qrContainer: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerColumn: {
    flex: 1,
    minWidth: 200,
  },
  footerSpacing: {
    marginRight: 16,
  },
  columnValueSmall: {
    fontSize: 9,
  },
});

const VALID_BODY_VARIANTS = new Set(['classic', 'column', 'minimal']);

function normalizeAppearanceColor(color, fallback = '#111827') {
  if (typeof color !== 'string') {
    return fallback;
  }
  const trimmed = color.trim();
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

function tintColor(color, factor = 0.15) {
  if (typeof color !== 'string' || !/^#([0-9a-fA-F]{6})$/.test(color)) {
    return '#f4f4f5';
  }
  const raw = color.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (component) => Math.round(component + (255 - component) * factor);
  const toHex = (value) => value.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

function formatDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString();
}

const DEFAULT_LAYOUT_OPTIONS = {
  headerColor: '#0f172a',
  companyBlockPosition: 'right',
  detailLayout: 'two-column',
  showInvoiceStatus: true,
  showNotes: true,
  showFooterCompanyDetails: true,
  showBarcode: true,
  bodyVariant: 'classic',
};

function normalizeLayoutOptions(layoutOptions) {
  const source = layoutOptions && typeof layoutOptions === 'object' ? layoutOptions : {};
  const next = { ...DEFAULT_LAYOUT_OPTIONS };
  if (typeof source.headerColor === 'string' && /^#([0-9a-fA-F]{6})$/.test(source.headerColor.trim())) {
    next.headerColor = source.headerColor.trim();
  }
  const companyPosition = typeof source.companyBlockPosition === 'string' ? source.companyBlockPosition.toLowerCase() : '';
  if (companyPosition === 'left' || companyPosition === 'right') {
    next.companyBlockPosition = companyPosition;
  }
  const detailLayout = typeof source.detailLayout === 'string' ? source.detailLayout.toLowerCase() : '';
  if (detailLayout === 'stacked' || detailLayout === 'two-column') {
    next.detailLayout = detailLayout;
  }
  const variantRaw = typeof source.bodyVariant === 'string' ? source.bodyVariant.toLowerCase() : '';
  const variant = variantRaw === 'modern' ? 'column' : variantRaw;
  if (VALID_BODY_VARIANTS.has(variant)) {
    next.bodyVariant = variant;
  }
  next.showInvoiceStatus = source.showInvoiceStatus !== false;
  next.showNotes = source.showNotes !== false;
  next.showFooterCompanyDetails = source.showFooterCompanyDetails !== false;
  next.showBarcode = source.showBarcode !== false;
  return next;
}

function KeyValue({ label, value }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
      <Text style={baseStyles.label}>{label}:</Text>
      <Text>{value}</Text>
    </View>
  );
}

function renderBarcode(invoice, options = {}) {
  if (!invoice || invoice.layoutOptions?.showBarcode === false) {
    return null;
  }
  if (!invoice.barcodeDataUrl) {
    return null;
  }

  const {
    marginTop = 6,
    marginBottom = 6,
    frameSize = 76,
    imageSize = 64,
    captionWidth = 160,
  } = options;

  const accentColor = invoice.layoutOptions?.headerColor;
  const blockStyles = [baseStyles.barcodeBlock, { marginTop, marginBottom }];
  const frameStyles = [baseStyles.barcodeFrame, { width: frameSize, height: frameSize }];
  if (accentColor) {
    frameStyles.push({
      borderColor: tintColor(accentColor, 0.5),
      backgroundColor: tintColor(accentColor, 0.92),
    });
  }
  const imageStyles = [baseStyles.barcodeImage, { width: imageSize, height: imageSize }];
  const captionStyles = [baseStyles.barcodeCaption, { maxWidth: captionWidth }];
  return (
    <View style={blockStyles}>
      <View style={frameStyles}>
        <Image src={invoice.barcodeDataUrl} style={imageStyles} />
      </View>
      {invoice.shareUrl ? (
        <Text style={captionStyles}>{invoice.shareUrl}</Text>
      ) : null}
    </View>
  );
}
function renderClassicLayout(context) {
  const {
    accentColor,
    layoutOptions,
    invoice,
    effectiveCompanyName,
    showCompanyHeading,
    companyLines,
    customerLines,
    customer,
    items,
    formatCurrency,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    total,
    balanceDue,
  } = context;

  const isStacked = layoutOptions.detailLayout === 'stacked';
  const detailContainerStyle = [
    baseStyles.section,
    isStacked ? classicStyles.detailRowStacked : classicStyles.detailRow,
  ];
  const leftColumnStyles = [classicStyles.detailColumn];
  const rightColumnStyles = [classicStyles.detailColumn];
  if (isStacked) {
    leftColumnStyles.push(classicStyles.detailColumnStacked, { width: '100%' });
    rightColumnStyles.push(classicStyles.detailColumnStacked, { width: '100%' });
  } else {
    leftColumnStyles.push(classicStyles.detailColumnSpacing);
  }
  const summaryContainerStyles = [classicStyles.summaryContainer];
  if (isStacked) {
    summaryContainerStyles.push(classicStyles.summaryContainerFull);
  }

  const summaryContent = (
    <View style={summaryContainerStyles}>
      <View style={baseStyles.summaryRow}>
        <Text>Subtotal</Text>
        <Text>{formatCurrency(subtotal)}</Text>
      </View>
      {discount ? (
        <View style={baseStyles.summaryRow}>
          <Text>Discount</Text>
          <Text>- {formatCurrency(discount)}</Text>
        </View>
      ) : null}
      <View style={baseStyles.summaryRow}>
        <Text>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
        <Text>{formatCurrency(taxAmount)}</Text>
      </View>
      <View style={[baseStyles.summaryRow, baseStyles.totalRow, { borderColor: accentColor, color: accentColor }]}>
        <Text>Total Due</Text>
        <Text>{formatCurrency(total)}</Text>
      </View>
      {balanceDue > 0.01 ? (
        <View style={baseStyles.summaryRow}>
          <Text>Balance Outstanding</Text>
          <Text>{formatCurrency(balanceDue)}</Text>
        </View>
      ) : null}
    </View>
  );

  const barcodeContent = renderBarcode(invoice, {
    marginTop: 0,
    marginBottom: 0,
    frameSize: 72,
    imageSize: 58,
    captionWidth: 150,
  });

  return (
    <Page size="A4" style={baseStyles.page}>
      <View style={[baseStyles.accentBar, { backgroundColor: accentColor }]} />
      <View
        style={[
          baseStyles.section,
          classicStyles.headerRow,
          layoutOptions.companyBlockPosition === 'left' ? classicStyles.headerRowReverse : null,
        ]}
      >
        <View style={classicStyles.headerBlock}>
          <Text style={[baseStyles.heading, { color: accentColor }]}>INVOICE</Text>
          <Text style={baseStyles.subheading}>{invoice.invoiceNumber}</Text>
        </View>
        <View
          style={[
            classicStyles.headerBlock,
            layoutOptions.companyBlockPosition === 'left' ? classicStyles.alignLeft : classicStyles.alignRight,
          ]}
        >
          {showCompanyHeading ? (
            <Text style={{ fontSize: 14, fontWeight: 600 }}>{effectiveCompanyName}</Text>
          ) : null}
          {companyLines.map((line) => (
            <Text key={line.id} style={baseStyles.textMuted}>
              {line.label ? `${line.label}: ` : ''}
              {line.value}
            </Text>
          ))}
        </View>
      </View>

      <View style={detailContainerStyle}>
        <View style={leftColumnStyles}>
          <Text style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Bill To</Text>
          {customerLines.length ? (
            customerLines.map((line) => (
              <Text key={line.id} style={baseStyles.textMuted}>
                {line.label ? `${line.label}: ` : ''}
                {line.value}
              </Text>
            ))
          ) : (
            <>
              <Text style={{ fontWeight: 600 }}>{customer.name ?? 'Customer'}</Text>
              {customer.address ? <Text style={baseStyles.textMuted}>{customer.address}</Text> : null}
              {customer.email ? <Text style={baseStyles.textMuted}>{customer.email}</Text> : null}
              {customer.phone ? <Text style={baseStyles.textMuted}>{customer.phone}</Text> : null}
            </>
          )}
        </View>
        <View style={rightColumnStyles}>
          <KeyValue label="Invoice Date" value={formatDate(invoice.date)} />
          <KeyValue label="Due Date" value={formatDate(invoice.dueDate)} />
          <KeyValue label="Issued By" value={invoice.issuedByUser?.name} />
          {layoutOptions.showInvoiceStatus ? (
            <KeyValue label="Status" value={(invoice.status ?? 'draft').toUpperCase()} />
          ) : null}
        </View>
      </View>

      <View style={baseStyles.section}>
        <View style={baseStyles.table}>
          <View style={baseStyles.tableHeader}>
            <Text style={[baseStyles.tableCell, { flexBasis: '50%', fontWeight: 600 }]}>Description</Text>
            <Text style={[baseStyles.tableCell, { width: 60, textAlign: 'center', fontWeight: 600 }]}>Qty</Text>
            <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 90, fontWeight: 600 }]}>Unit Price</Text>
            <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 100, fontWeight: 600 }]}>Amount</Text>
          </View>

          {items.length ? (
            items.map((item, index) => {
              const quantity = item.quantity ?? 0;
              const unitPrice = item.unitPrice ?? 0;
              const amount = quantity * unitPrice;
              return (
                <View key={index} style={baseStyles.tableRow}>
                  <Text style={[baseStyles.tableCell, { flexBasis: '50%' }]}>{item.description ?? 'Line item'}</Text>
                  <Text style={[baseStyles.tableCell, { width: 60, textAlign: 'center' }]}>{quantity}</Text>
                  <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 90 }]}>{formatCurrency(unitPrice)}</Text>
                  <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 100 }]}>{formatCurrency(amount)}</Text>
                </View>
              );
            })
          ) : (
            <View style={baseStyles.tableRow}>
              <Text style={[baseStyles.tableCell, { flexBasis: '100%', textAlign: 'center', color: '#6b7280' }]}>
                No line items yet.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[baseStyles.section, classicStyles.bottomRow, !barcodeContent ? classicStyles.bottomRowSingle : null]}>
        {summaryContent}
        {barcodeContent ? (
          <View style={classicStyles.barcodeWrapper}>
            {barcodeContent}
          </View>
        ) : null}
      </View>


      {layoutOptions.showNotes && invoice.notes ? (
        <View style={baseStyles.notes}>
          <Text style={{ fontWeight: 600, marginBottom: 4 }}>Notes</Text>
          <Text
            style={{
              fontSize: invoice.notes.length > 240 ? 9 : 10,
              lineHeight: 1.35,
            }}
          >
            {invoice.notes}
          </Text>
        </View>
      ) : null}
    </Page>
  );
}

function renderColumnLayout(context) {
  const {
    accentColor,
    layoutOptions,
    invoice,
    effectiveCompanyName,
    showCompanyHeading,
    companyLines,
    customerLines,
    customer,
    items,
    formatCurrency,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    total,
    balanceDue,
  } = context;

  const isStacked = layoutOptions.detailLayout === 'stacked';
  const accentTint = tintColor(accentColor, 0.85);

  const infoGridStyle = [columnStyles.infoGrid];
  if (isStacked) {
    infoGridStyle.push(columnStyles.infoGridStacked);
  }
  const billColumnStyle = [columnStyles.infoColumn];
  const metaColumnStyle = [columnStyles.infoColumn];
  const totalsColumnStyle = [columnStyles.totalsColumn];
  if (isStacked) {
    billColumnStyle.push(columnStyles.infoColumnStacked);
    metaColumnStyle.push(columnStyles.infoColumnStacked);
    totalsColumnStyle.push(columnStyles.infoColumnStacked);
  } else {
    billColumnStyle.push(columnStyles.infoColumnSpacing);
    metaColumnStyle.push(columnStyles.infoColumnSpacing);
  }

  const barcodeContent = renderBarcode(invoice, {
    marginTop: 0,
    marginBottom: 0,
    frameSize: 64,
    imageSize: 54,
    captionWidth: 140,
  });

  return (
    <Page size="A4" style={baseStyles.page}>
      <View style={[baseStyles.accentBar, { backgroundColor: accentColor }]} />

      <View style={columnStyles.headerRow}>
        <View>
          <Text style={[baseStyles.heading, { color: accentColor }]}>Invoice</Text>
          <Text style={baseStyles.subheading}>{invoice.invoiceNumber}</Text>
        </View>
        <View style={{ textAlign: layoutOptions.companyBlockPosition === 'left' ? 'left' : 'right' }}>
          {showCompanyHeading ? (
            <Text style={{ fontSize: 14, fontWeight: 600 }}>{effectiveCompanyName}</Text>
          ) : null}
          {companyLines.map((line) => (
            <Text key={line.id} style={baseStyles.textMuted}>
              {line.label ? `${line.label}: ` : ''}
              {line.value}
            </Text>
          ))}
        </View>
      </View>

      <View style={infoGridStyle}>
        <View style={billColumnStyle}>
          <Text style={columnStyles.infoTitle}>Bill To</Text>
          {customerLines.length ? (
            customerLines.map((line) => (
              <Text key={line.id} style={columnStyles.infoEntry}>
                {line.label ? `${line.label}: ` : ''}
                {line.value}
              </Text>
            ))
          ) : (
            <>
              <Text style={[columnStyles.infoEntry, { fontWeight: 600 }]}>{customer.name ?? 'Customer'}</Text>
              {customer.address ? <Text style={columnStyles.infoEntry}>{customer.address}</Text> : null}
              {customer.email ? <Text style={columnStyles.infoEntry}>{customer.email}</Text> : null}
              {customer.phone ? <Text style={columnStyles.infoEntry}>{customer.phone}</Text> : null}
            </>
          )}
        </View>
        <View style={metaColumnStyle}>
          <Text style={columnStyles.infoTitle}>Invoice Details</Text>
          <Text style={columnStyles.infoEntry}>Invoice Date: {formatDate(invoice.date) ?? '-'}</Text>
          <Text style={columnStyles.infoEntry}>Due Date: {formatDate(invoice.dueDate) ?? '-'}</Text>
          <Text style={columnStyles.infoEntry}>Issued By: {invoice.issuedByUser?.name ?? '-'}</Text>
          {layoutOptions.showInvoiceStatus ? (
            <Text style={columnStyles.infoEntry}>Status: {(invoice.status ?? 'draft').toUpperCase()}</Text>
          ) : null}
        </View>
        <View style={totalsColumnStyle}>
          <Text style={columnStyles.infoTitle}>Summary</Text>
          <View style={columnStyles.totalsRow}>
            <Text style={columnStyles.totalsLabel}>Subtotal</Text>
            <Text style={columnStyles.totalsValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {discount ? (
            <View style={columnStyles.totalsRow}>
              <Text style={columnStyles.totalsLabel}>Discount</Text>
              <Text style={columnStyles.totalsValue}>- {formatCurrency(discount)}</Text>
            </View>
          ) : null}
          <View style={columnStyles.totalsRow}>
            <Text style={columnStyles.totalsLabel}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
            <Text style={columnStyles.totalsValue}>{formatCurrency(taxAmount)}</Text>
          </View>
          <View style={columnStyles.totalsRow}>
            <Text style={columnStyles.totalsGrand}>Total</Text>
            <Text style={columnStyles.totalsGrand}>{formatCurrency(total)}</Text>
          </View>
          {balanceDue > 0.01 ? (
            <View style={columnStyles.totalsRow}>
              <Text style={columnStyles.totalsLabel}>Balance Due</Text>
              <Text style={columnStyles.totalsValue}>{formatCurrency(balanceDue)}</Text>
            </View>
          ) : null}
          {barcodeContent ? (
            <View style={columnStyles.barcodeWrapper}>
              {barcodeContent}
            </View>
          ) : null}
        </View>
      </View>

      <View style={baseStyles.section}>
        <View style={[baseStyles.table, { borderColor: accentColor }]}>
          <View style={[baseStyles.tableHeader, { backgroundColor: accentTint, borderColor: accentColor }]}>
            <Text style={[baseStyles.tableCell, { flexBasis: '40%', fontWeight: 600, color: '#0f172a' }]}>Description</Text>
            <Text style={[baseStyles.tableCell, { width: 60, textAlign: 'center', fontWeight: 600, color: '#0f172a' }]}>Qty</Text>
            <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 90, fontWeight: 600, color: '#0f172a' }]}>Unit Price</Text>
            <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 100, fontWeight: 600, color: '#0f172a' }]}>Amount</Text>
          </View>

          {items.length ? (
            items.map((item, index) => {
              const quantity = item.quantity ?? 0;
              const unitPrice = item.unitPrice ?? 0;
              const amount = quantity * unitPrice;
              return (
                <View key={index} style={baseStyles.tableRow}>
                  <Text style={[baseStyles.tableCell, { flexBasis: '40%' }]}>{item.description ?? 'Line item'}</Text>
                  <Text style={[baseStyles.tableCell, { width: 60, textAlign: 'center' }]}>{quantity}</Text>
                  <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 90 }]}>{formatCurrency(unitPrice)}</Text>
                  <Text style={[baseStyles.tableCell, baseStyles.amountCell, { width: 100 }]}>{formatCurrency(amount)}</Text>
                </View>
              );
            })
          ) : (
            <View style={baseStyles.tableRow}>
              <Text style={[baseStyles.tableCell, { flexBasis: '100%', textAlign: 'center', color: '#6b7280' }]}>
                No line items yet.
              </Text>
            </View>
          )}
        </View>
      </View>

      {layoutOptions.showNotes && invoice.notes ? (
        <View style={baseStyles.notes}>
          <Text style={{ fontWeight: 600, marginBottom: 4 }}>Notes</Text>
          <Text
            style={{
              fontSize: invoice.notes.length > 240 ? 9 : 10,
              lineHeight: 1.35,
            }}
          >
            {invoice.notes}
          </Text>
        </View>
      ) : null}
    </Page>
  );
}
function renderMinimalLayout(context) {
  const {
    accentColor,
    invoice,
    effectiveCompanyName,
    companyLines,
    customerLines,
    customer,
    items,
    formatCurrency,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    total,
    balanceDue,
    layoutOptions,
  } = context;

  return (
    <Page size="A4" style={minimalStyles.page}>
      <View style={minimalStyles.header}>
        <Text style={[minimalStyles.title, { color: accentColor }]}>Invoice</Text>
        <Text style={minimalStyles.metaLine}>Invoice No: {invoice.invoiceNumber ?? '-'}</Text>
        <Text style={minimalStyles.metaLine}>Issue date: {formatDate(invoice.date) ?? '-'}</Text>
        <Text style={minimalStyles.metaLine}>Due date: {formatDate(invoice.dueDate) ?? '-'}</Text>
      </View>

      <View style={minimalStyles.twoColumn}>
        <View style={[minimalStyles.column, minimalStyles.columnSpacing]}>
          <Text style={minimalStyles.columnLabel}>From</Text>
          <Text style={[minimalStyles.columnValue, { fontWeight: 600 }]}>{effectiveCompanyName}</Text>
          {companyLines.map((line) => (
            <Text key={line.id} style={minimalStyles.columnValue}>
              {line.label ? `${line.label}: ` : ''}
              {line.value}
            </Text>
          ))}
        </View>
        <View style={minimalStyles.column}>
          <Text style={minimalStyles.columnLabel}>To</Text>
          {customerLines.length ? (
            customerLines.map((line) => (
              <Text key={line.id} style={minimalStyles.columnValue}>
                {line.label ? `${line.label}: ` : ''}
                {line.value}
              </Text>
            ))
          ) : (
            <>
              <Text style={[minimalStyles.columnValue, { fontWeight: 600 }]}>{customer.name ?? 'Customer'}</Text>
              {customer.address ? <Text style={minimalStyles.columnValue}>{customer.address}</Text> : null}
              {customer.email ? <Text style={minimalStyles.columnValue}>{customer.email}</Text> : null}
              {customer.phone ? <Text style={minimalStyles.columnValue}>{customer.phone}</Text> : null}
            </>
          )}
        </View>
      </View>

      <View style={minimalStyles.twoColumn}>
        <View style={[minimalStyles.column, minimalStyles.columnSpacing]}>
          <Text style={minimalStyles.columnLabel}>Invoice Details</Text>
          <Text style={minimalStyles.columnValue}>Issued By: {invoice.issuedByUser?.name ?? '-'}</Text>
          {layoutOptions.showInvoiceStatus ? (
            <Text style={minimalStyles.columnValue}>Status: {(invoice.status ?? 'draft').toUpperCase()}</Text>
          ) : null}
        </View>
        <View style={minimalStyles.column} />
      </View>

      <View style={minimalStyles.table}>
        <View style={minimalStyles.tableHeader}>
          <Text style={minimalStyles.headerCell}>Item</Text>
          <Text style={[minimalStyles.headerCell, minimalStyles.cellRight]}>Quantity</Text>
          <Text style={[minimalStyles.headerCell, minimalStyles.cellRight]}>Price</Text>
          <Text style={[minimalStyles.headerCell, minimalStyles.cellRight]}>Total</Text>
        </View>
        {items.length ? (
          items.map((item, index) => {
            const quantity = item.quantity ?? 0;
            const unitPrice = item.unitPrice ?? 0;
            const amount = quantity * unitPrice;
            return (
              <View key={index} style={minimalStyles.row}>
                <Text style={minimalStyles.cell}>{item.description ?? 'Line item'}</Text>
                <Text style={[minimalStyles.cell, minimalStyles.cellRight]}>{quantity}</Text>
                <Text style={[minimalStyles.cell, minimalStyles.cellRight]}>{formatCurrency(unitPrice)}</Text>
                <Text style={[minimalStyles.cell, minimalStyles.cellRight]}>{formatCurrency(amount)}</Text>
              </View>
            );
          })
        ) : (
          <View style={minimalStyles.row}>
            <Text style={[minimalStyles.cell, { flexBasis: '100%', textAlign: 'center', color: '#6b7280' }]}>
              No line items yet.
            </Text>
          </View>
        )}
      </View>

      <View style={minimalStyles.summaryRow}>
        <View style={minimalStyles.totals}>
          <View style={minimalStyles.totalsRow}>
            <Text style={minimalStyles.totalsLabel}>Subtotal</Text>
            <Text style={minimalStyles.totalsValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {discount ? (
            <View style={minimalStyles.totalsRow}>
              <Text style={minimalStyles.totalsLabel}>Discount</Text>
              <Text style={minimalStyles.totalsValue}>- {formatCurrency(discount)}</Text>
            </View>
          ) : null}
          <View style={minimalStyles.totalsRow}>
            <Text style={minimalStyles.totalsLabel}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
            <Text style={minimalStyles.totalsValue}>{formatCurrency(taxAmount)}</Text>
          </View>
          <View style={minimalStyles.totalsRow}>
            <Text style={minimalStyles.totalsLabel}>Total</Text>
            <Text style={[minimalStyles.totalsValue, minimalStyles.totalsGrand]}>{formatCurrency(total)}</Text>
          </View>
          {balanceDue > 0.01 ? (
            <View style={minimalStyles.totalsRow}>
              <Text style={minimalStyles.totalsLabel}>Balance Due</Text>
              <Text style={minimalStyles.totalsValue}>{formatCurrency(balanceDue)}</Text>
            </View>
          ) : null}
        </View>
        {layoutOptions.showBarcode !== false && invoice.barcodeDataUrl ? (
          <View style={minimalStyles.qrContainer}>
            {renderBarcode(invoice, {
              marginTop: 0,
              marginBottom: 0,
              frameSize: 60,
              imageSize: 52,
              captionWidth: 120,
            })}
          </View>
        ) : null}
      </View>

      <View style={minimalStyles.footer}>
        {layoutOptions.showFooterCompanyDetails !== false ? (
          <View style={[minimalStyles.footerColumn, minimalStyles.footerSpacing]}>
            <Text style={minimalStyles.columnLabel}>Payment details</Text>
            {companyLines.length ? (
              companyLines.map((line) => (
                <Text key={line.id} style={minimalStyles.columnValue}>
                  {line.label ? `${line.label}: ` : ''}
                  {line.value}
                </Text>
              ))
            ) : (
              <Text style={minimalStyles.columnValue}>{effectiveCompanyName}</Text>
            )}
          </View>
        ) : null}
        <View style={minimalStyles.footerColumn}>
          <Text style={minimalStyles.columnLabel}>Note</Text>
          {invoice.notes && (layoutOptions.showNotes !== false) ? (
            <Text
              style={[
                minimalStyles.columnValue,
                invoice.notes.length > 240 ? minimalStyles.columnValueSmall : null,
              ]}
            >
              {invoice.notes}
            </Text>
          ) : (
            <Text style={minimalStyles.columnValue}>Thank you for your business.</Text>
          )}
        </View>
      </View>
    </Page>
  );
}

const VARIANT_RENDERERS = {
  classic: renderClassicLayout,
  column: renderColumnLayout,
  minimal: renderMinimalLayout,
};

export default function InvoiceDocument({ invoice, companyName, formatCurrency }) {
  const safeFormatCurrency = typeof formatCurrency === 'function'
    ? formatCurrency
    : (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

  const customer = invoice.customer ?? {};
  const items = invoice.items ?? [];
  const layoutOptions = normalizeLayoutOptions(invoice.layoutOptions);
  const variant = VALID_BODY_VARIANTS.has(layoutOptions.bodyVariant) ? layoutOptions.bodyVariant : 'classic';
  const accentColor = normalizeAppearanceColor(invoice.appearance?.headerColor ?? layoutOptions.headerColor);
  const effectiveCompanyName = invoice.companyName ?? companyName ?? 'Your Company';
  const displayLines = invoice.displayLines ?? {};
  const companyLines = Array.isArray(displayLines.company)
    ? displayLines.company
        .map((line, index) => ({
          id: line.id ?? `company-${index}`,
          label: line.label ?? '',
          value: line.value ?? '',
          source: line.source ?? 'custom',
        }))
        .filter((line) => line.value)
    : [];
  const customerLines = Array.isArray(displayLines.customer)
    ? displayLines.customer
        .map((line, index) => ({
          id: line.id ?? `customer-${index}`,
          label: line.label ?? '',
          value: line.value ?? '',
          source: line.source ?? 'custom',
        }))
        .filter((line) => line.value)
    : [];
  const showCompanyHeading = !companyLines.some((line) => line.source === 'companyName');

  const subtotal = typeof invoice.subtotal === 'number'
    ? invoice.subtotal
    : items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
  const discount = invoice.discount ?? 0;
  const taxRate = invoice.taxRate ?? 0;
  const taxAmount = invoice.taxAmount ?? subtotal * taxRate;
  const total = invoice.total ?? subtotal - discount + taxAmount;
  const balanceDue = invoice.balanceDue ?? (invoice.status === 'paid' ? 0 : total);

  const renderer = VARIANT_RENDERERS[variant] ?? renderClassicLayout;

  const context = {
    accentColor,
    layoutOptions,
    invoice,
    effectiveCompanyName,
    showCompanyHeading,
    companyLines,
    customerLines,
    customer,
    items,
    formatCurrency: safeFormatCurrency,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    total,
    balanceDue,
  };

  return (
    <Document>
      {renderer(context)}
    </Document>
  );
}

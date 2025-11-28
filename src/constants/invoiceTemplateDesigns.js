const baseClassic = {
  headerColor: '#1f2937',
  companyBlockPosition: 'right',
  detailLayout: 'two-column',
  showInvoiceStatus: true,
  showNotes: true,
  showBarcode: true,
  showFooterCompanyDetails: true,
  noteText: 'Payment due within 15 days of invoice date.',
  bodyVariant: 'classic',
  companyLines: [
    { id: 'classic-company-address', label: 'Address', source: 'custom', text: 'Criterion Tower, Dubai, UAE' },
    { id: 'classic-company-phone', label: 'Phone', source: 'custom', text: '+971 50 000 0000' },
    { id: 'classic-company-email', label: 'Email', source: 'custom', text: 'hello@owlio.io' },
  ],
  customerLines: [
    { id: 'classic-customer-name', label: '', source: 'customerName', text: '' },
    { id: 'classic-customer-address', label: 'Address', source: 'customerAddress', text: '' },
    { id: 'classic-customer-email', label: 'Email', source: 'customerEmail', text: '' },
  ],
};

const baseColumn = {
  headerColor: '#0e7c7b',
  companyBlockPosition: 'right',
  detailLayout: 'two-column',
  showInvoiceStatus: true,
  showNotes: true,
  showBarcode: true,
  showFooterCompanyDetails: true,
  noteText: 'Please remit payment to our bank account using the reference above.',
  bodyVariant: 'column',
  companyLines: [
    { id: 'column-company-bank', label: 'Bank', source: 'custom', text: 'Emirates NBD - IBAN AE12 3456 7890 1234' },
    { id: 'column-company-phone', label: 'Phone', source: 'custom', text: '+971 04 123 4567' },
    { id: 'column-company-email', label: 'Email', source: 'custom', text: 'accounts@owlio.io' },
  ],
  customerLines: [
    { id: 'column-recipient', label: '', source: 'customerName', text: '' },
    { id: 'column-recipient-address', label: 'Address', source: 'customerAddress', text: '' },
    { id: 'column-recipient-email', label: 'Email', source: 'customerEmail', text: '' },
  ],
};

const baseMinimal = {
  headerColor: '#0f172a',
  companyBlockPosition: 'left',
  detailLayout: 'stacked',
  showInvoiceStatus: false,
  showNotes: false,
  showBarcode: true,
  showFooterCompanyDetails: false,
  noteText: '',
  bodyVariant: 'minimal',
  companyLines: [
    { id: 'minimal-company-name', label: '', source: 'companyName', text: '' },
    { id: 'minimal-company-email', label: 'Email', source: 'custom', text: 'hello@owlio.io' },
    { id: 'minimal-company-phone', label: 'Phone', source: 'custom', text: '+971 50 000 0000' },
  ],
  customerLines: [
    { id: 'minimal-recipient', label: '', source: 'customerName', text: '' },
    { id: 'minimal-recipient-email', label: 'Email', source: 'customerEmail', text: '' },
    { id: 'minimal-recipient-address', label: 'Address', source: 'customerAddress', text: '' },
  ],
};

export const invoiceTemplateDesigns = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional two-column layout with emphasised totals and structured info boxes.',
    baseConfig: baseClassic,
  },
  {
    id: 'column',
    name: 'Column',
    description: 'Grid-first layout that keeps every detail in aligned columns for maximum clarity.',
    baseConfig: baseColumn,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Type-driven layout with subtle dividers and generous white space—no boxes, just information.',
    baseConfig: baseMinimal,
  },
];

const LEGACY_TEMPLATE_REMAPPINGS = {
  minimalist: 'minimal',
  bold: 'column',
  compact: 'column',
  sleek: 'column',
  modern: 'column',
};

export function getInvoiceTemplateById(id) {
  if (!id) {
    return invoiceTemplateDesigns[0];
  }
  const remappedId = LEGACY_TEMPLATE_REMAPPINGS[id] ?? id;
  return invoiceTemplateDesigns.find((template) => template.id === remappedId) ?? invoiceTemplateDesigns[0];
}

export const defaultInvoiceTemplateId = invoiceTemplateDesigns[0]?.id ?? 'classic';

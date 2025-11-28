const classicPurchaseOrder = {
  headerColor: '#1f2937',
  summaryLayout: 'split',
  highlightColor: '#0ea5e9',
  bodyVariant: 'classic',
  noteText: 'Please confirm delivery schedule within 24 hours of receipt.',
  includeTotals: true,
  includeRequestedBy: true,
};

const modernPurchaseOrder = {
  headerColor: '#0f172a',
  summaryLayout: 'stacked',
  highlightColor: '#10b981',
  bodyVariant: 'minimal',
  noteText: 'Deliver to the primary warehouse unless otherwise specified.',
  includeTotals: true,
  includeRequestedBy: true,
  showBrandAccent: true,
};

export const purchaseOrderTemplateDesigns = [
  {
    id: 'classic-po',
    name: 'Classic PO',
    description: 'Structured purchase order layout with clear supplier and delivery details.',
    baseConfig: classicPurchaseOrder,
  },
  {
    id: 'modern-po',
    name: 'Modern PO',
    description: 'Contemporary layout with prominent totals and fulfillment highlights.',
    baseConfig: modernPurchaseOrder,
  },
];

export function getPurchaseOrderTemplateById(id) {
  if (!id) {
    return purchaseOrderTemplateDesigns[0];
  }
  return purchaseOrderTemplateDesigns.find((template) => template.id === id)
    ?? purchaseOrderTemplateDesigns[0];
}

export const defaultPurchaseOrderTemplateId = purchaseOrderTemplateDesigns[0]?.id ?? 'classic-po';

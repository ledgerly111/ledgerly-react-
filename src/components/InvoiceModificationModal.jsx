import { useMemo, useState } from 'react';

const COMPANY_LINE_OPTIONS = [
  { value: 'companyName', label: 'Company Name (from Settings)' },
  { value: 'custom', label: 'Custom Text' },
];

const CUSTOMER_LINE_OPTIONS = [
  { value: 'customerName', label: 'Customer Name' },
  { value: 'customerAddress', label: 'Customer Address' },
  { value: 'customerEmail', label: 'Customer Email' },
  { value: 'customerPhone', label: 'Customer Phone' },
  { value: 'custom', label: 'Custom Text' },
];

const SAMPLE_COMPANY = {
  name: 'Owlio Technologies',
  address: 'Criterion Tower, Dubai, UAE',
  email: 'hello@owlio.io',
  phone: '+971 50 000 0000',
};

const SAMPLE_CUSTOMER = {
  name: 'Emirates Tech Solutions',
  address: 'DIFC, Dubai, UAE',
  email: 'contact@emirates-tech.com',
  phone: '+971 50 123 4570',
};

const SAMPLE_INVOICE = {
  invoiceNumber: 'INV-1001',
  date: '2024-01-18',
  dueDate: '2024-02-02',
  status: 'sent',
  items: [{ description: 'Premium Laptop', quantity: 2, unitPrice: 1299.99 }],
  subtotal: 2599.98,
  discount: 0,
  taxRate: 0.05,
  taxAmount: 130,
  total: 2729.98,
  balanceDue: 2729.98,
  notes: 'Payment due within 15 days of invoice date.',
};

const DEFAULT_TEMPLATE = {
  headerColor: '#0f172a',
  companyBlockPosition: 'right',
  detailLayout: 'two-column',
  showInvoiceStatus: true,
  showNotes: true,
  showFooterCompanyDetails: false,
  showBarcode: true,
  noteText: 'Payment due within 15 days of invoice date.',
  bodyVariant: 'classic',
  companyLines: [
    { id: 'company-address', label: 'Address', source: 'custom', text: SAMPLE_COMPANY.address },
    { id: 'company-phone', label: 'Phone', source: 'custom', text: SAMPLE_COMPANY.phone },
  ],
  customerLines: [
    { id: 'customer-name', label: '', source: 'customerName', text: '' },
    { id: 'customer-address', label: 'Address', source: 'customerAddress', text: '' },
    { id: 'customer-email', label: 'Email', source: 'customerEmail', text: '' },
  ],
};

function createLineId(prefix = 'line') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const TEMPLATE_BODY_VARIANTS = new Set(['classic', 'column', 'minimal']);

function sanitizeLines(lines, defaults, options) {
  const sourceLines = Array.isArray(lines) ? lines : [];
  const seen = new Set();
  const normalized = sourceLines
    .map((line) => {
      const source = typeof line?.source === 'string' ? line.source : 'custom';
      if (!options.some((option) => option.value === source)) {
        return null;
      }
      const label = typeof line?.label === 'string' ? line.label.trim() : '';
      const text = typeof line?.text === 'string' ? line.text.trim() : '';
      const id = line?.id ? String(line.id) : createLineId(source);
      const signature = `${source}:${label}:${text}`;
      if (seen.has(signature)) {
        return null;
      }
      seen.add(signature);
      return { id, source, label, text };
    })
    .filter(Boolean);
  if (normalized.length === 0) {
    const fallbackSeen = new Set();
    return defaults
      .map((line) => ({
        ...line,
        id: createLineId(line.source ?? 'line'),
      }))
      .filter((line) => {
        const signature = `${line.source}:${line.label}:${line.text}`;
        if (fallbackSeen.has(signature)) {
          return false;
        }
        fallbackSeen.add(signature);
        return true;
      });
  }
  return normalized.slice(0, 20);
}

function sanitizeTemplate(template) {
  const source = template && typeof template === 'object' ? template : {};
  const next = { ...DEFAULT_TEMPLATE };

  if (typeof source.headerColor === 'string' && /^#([0-9a-fA-F]{6})$/.test(source.headerColor.trim())) {
    next.headerColor = source.headerColor.trim();
  }
  const position = typeof source.companyBlockPosition === 'string' ? source.companyBlockPosition.toLowerCase() : '';
  if (position === 'left' || position === 'right') {
    next.companyBlockPosition = position;
  }
  const detailLayout = typeof source.detailLayout === 'string' ? source.detailLayout.toLowerCase() : '';
  if (detailLayout === 'stacked' || detailLayout === 'two-column') {
    next.detailLayout = detailLayout;
  }
  const variantRaw = typeof source.bodyVariant === 'string' ? source.bodyVariant.toLowerCase() : '';
  const variant = variantRaw === 'modern' ? 'column' : variantRaw;
  if (TEMPLATE_BODY_VARIANTS.has(variant)) {
    next.bodyVariant = variant;
  }
  next.showInvoiceStatus = source.showInvoiceStatus !== false;
  next.showNotes = source.showNotes !== false;
  next.showFooterCompanyDetails = source.showFooterCompanyDetails !== false;
  next.showBarcode = source.showBarcode !== false;
  if (typeof source.noteText === 'string') {
    next.noteText = source.noteText.trim();
  }
  next.companyLines = sanitizeLines(source.companyLines, DEFAULT_TEMPLATE.companyLines, COMPANY_LINE_OPTIONS);
  next.customerLines = sanitizeLines(source.customerLines, DEFAULT_TEMPLATE.customerLines, CUSTOMER_LINE_OPTIONS);
  return next;
}

function resolveLineValue(line, sample) {
  switch (line.source) {
    case 'companyName':
      return SAMPLE_COMPANY.name;
    case 'companyAddress':
      return SAMPLE_COMPANY.address;
    case 'companyEmail':
      return SAMPLE_COMPANY.email;
    case 'companyPhone':
      return SAMPLE_COMPANY.phone;
    case 'customerName':
      return sample.customer.name;
    case 'customerAddress':
      return sample.customer.address;
    case 'customerEmail':
      return sample.customer.email;
    case 'customerPhone':
      return sample.customer.phone;
    case 'custom':
    default:
      return line.text ?? '';
  }
}

function buildPreview(templateState) {
  const sanitized = sanitizeTemplate(templateState);
  const summary = {
    subtotal: SAMPLE_INVOICE.subtotal,
    discount: SAMPLE_INVOICE.discount,
    taxRate: SAMPLE_INVOICE.taxRate,
    taxAmount: SAMPLE_INVOICE.taxAmount,
    total: SAMPLE_INVOICE.total,
    balanceDue: SAMPLE_INVOICE.balanceDue,
    quantity: SAMPLE_INVOICE.items[0].quantity,
    unitPrice: SAMPLE_INVOICE.items[0].unitPrice,
    amount: SAMPLE_INVOICE.items[0].quantity * SAMPLE_INVOICE.items[0].unitPrice,
  };
  const displayLines = {
    company: sanitized.companyLines
      .map((line) => ({
        id: line.id,
        label: line.label,
        value: resolveLineValue(line, { customer: SAMPLE_CUSTOMER }),
        source: line.source,
      }))
      .filter((line) => line.value),
    customer: sanitized.customerLines
      .map((line) => ({
        id: line.id,
        label: line.label,
        value: resolveLineValue(line, { customer: SAMPLE_CUSTOMER }),
        source: line.source,
      }))
      .filter((line) => line.value),
  };
  return {
    layout: sanitized,
    company: SAMPLE_COMPANY,
    customer: SAMPLE_CUSTOMER,
    invoice: SAMPLE_INVOICE,
    summary,
    displayLines,
  };
}

function LineRow({
  line,
  index,
  options,
  section,
  onChange,
  onMove,
  onRemove,
  disableRemove,
  canMoveUp,
  canMoveDown,
}) {
  const optionLabels = {
    companyName: 'Company name shown in Settings',
    custom: 'Custom text field',
    customerName: 'Invoice customer name',
    customerAddress: 'Invoice customer address',
    customerEmail: 'Invoice customer email',
    customerPhone: 'Invoice customer phone',
  };
  const hint = optionLabels[line.source] ?? '';

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr,1fr,1fr,auto]">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-gray-500">Label</label>
          <input
            type="text"
            value={line.label}
            onChange={(event) => onChange(section, index, { label: event.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            placeholder="e.g. VAT Number"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-gray-500">Value Source</label>
          <select
            value={line.source}
            onChange={(event) => onChange(section, index, { source: event.target.value, text: event.target.value === 'custom' ? line.text : '' })}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-gray-500">
            {line.source === 'custom' ? 'Custom Text' : 'Preview'}
          </label>
          {line.source === 'custom' ? (
            <input
              type="text"
              value={line.text}
              onChange={(event) => onChange(section, index, { text: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              placeholder="Enter the text you want to display"
            />
          ) : (
            <p className="mt-1 rounded-lg border border-dashed border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-500">
              {hint}
            </p>
          )}
        </div>
        <div className="flex items-end justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-700 px-2 py-2 text-[11px] font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
            onClick={() => onMove(section, index, -1)}
            disabled={!canMoveUp}
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-700 px-2 py-2 text-[11px] font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
            onClick={() => onMove(section, index, 1)}
            disabled={!canMoveDown}
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-500/60 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => onRemove(section, index)}
            disabled={disableRemove}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

const PREVIEW_BARCODE_GRID = [
  [1, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 0, 1],
  [1, 1, 0, 1, 1, 1],
  [0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 0],
];

function PreviewBarcode() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3">
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-3 shadow-inner">
        <div className="grid grid-cols-6 gap-[2px]">
          {PREVIEW_BARCODE_GRID.map((row, rowIndex) =>
            row.map((cell, cellIndex) => (
              <span
                // rowIndex is at most 6 so safe for key
                // eslint-disable-next-line react/no-array-index-key
                key={`${rowIndex}-${cellIndex}`}
                className={`h-2 w-2 rounded-[2px] ${cell ? 'bg-gray-200' : 'bg-gray-700/60'}`}
              />
            )),
          )}
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Invoice QR code
      </span>
    </div>
  );
}

export default function InvoiceModificationModal({
  initialTemplate,
  scopeLabel,
  onSave,
  onClose,
}) {
  const [template, setTemplate] = useState(() => sanitizeTemplate(initialTemplate));

  const preview = useMemo(() => buildPreview(template), [template]);

  const handleFieldChange = (field, value) => {
    setTemplate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLineChange = (section, index, updates) => {
    setTemplate((prev) => {
      const key = section === 'company' ? 'companyLines' : 'customerLines';
      const nextLines = prev[key].map((line, lineIndex) => (
        lineIndex === index ? { ...line, ...updates } : line
      ));
      return { ...prev, [key]: nextLines };
    });
  };

  const handleAddLine = (section) => {
    const key = section === 'company' ? 'companyLines' : 'customerLines';
    const options = section === 'company' ? COMPANY_LINE_OPTIONS : CUSTOMER_LINE_OPTIONS;
    const defaultSource = 'custom';
    const newLine = {
      id: createLineId(section),
      label: '',
      source: options.some((option) => option.value === defaultSource) ? defaultSource : 'custom',
      text: '',
    };
    setTemplate((prev) => ({
      ...prev,
      [key]: [...prev[key], newLine],
    }));
  };

  const handleRemoveLine = (section, index) => {
    const key = section === 'company' ? 'companyLines' : 'customerLines';
    setTemplate((prev) => {
      const nextLines = prev[key].filter((_, lineIndex) => lineIndex !== index);
      return {
        ...prev,
        [key]: nextLines.length ? nextLines : prev[key],
      };
    });
  };

  const handleMoveLine = (section, index, direction) => {
    const key = section === 'company' ? 'companyLines' : 'customerLines';
    setTemplate((prev) => {
      const lines = [...prev[key]];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= lines.length) {
        return prev;
      }
      [lines[index], lines[targetIndex]] = [lines[targetIndex], lines[index]];
      return {
        ...prev,
        [key]: lines,
      };
    });
  };

  const handleSubmit = () => {
    onSave?.(sanitizeTemplate(template));
  };

  const variant = preview.layout.bodyVariant ?? 'classic';

  const headerLayoutClass = preview.layout.companyBlockPosition === 'left'
    ? 'flex-col gap-4 sm:flex-row sm:flex-row-reverse sm:justify-between'
    : 'flex-col gap-4 sm:flex-row sm:justify-between';

  const detailLayoutClass = preview.layout.detailLayout === 'two-column'
    ? 'grid gap-4 sm:grid-cols-2'
    : 'space-y-4';

  const showCompanyHeading = !preview.displayLines.company.some((line) => line.source === 'companyName');
  const companyBlockAlign = template.companyBlockPosition === 'left' ? 'text-left' : 'text-right';

  return (
    <div className="space-y-6 p-1">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-white">Invoice Customisation</h3>
        <p className="text-sm text-gray-400">
          Design a universal invoice template. Every future invoice will adopt these settings automatically.
        </p>
        {scopeLabel ? <p className="text-xs text-sky-300">{scopeLabel}</p> : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400">Header Colour</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="color"
              value={template.headerColor}
              onChange={(event) => handleFieldChange('headerColor', event.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-700 bg-gray-900"
              title="Invoice header colour"
            />
            <span className="text-sm text-gray-300">{template.headerColor}</span>
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400">Company Block Position</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {['left', 'right'].map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => handleFieldChange('companyBlockPosition', position)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  template.companyBlockPosition === position
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-100'
                    : 'border-gray-700 bg-gray-900/40 text-gray-300 hover:border-amber-500/40'
                }`}
              >
                {position === 'left' ? 'Left' : 'Right'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400">Details Layout</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFieldChange('detailLayout', 'two-column')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                template.detailLayout === 'two-column'
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-100'
                  : 'border-gray-700 bg-gray-900/40 text-gray-300 hover:border-sky-500/40'
              }`}
            >
              Two Column
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('detailLayout', 'stacked')}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                template.detailLayout === 'stacked'
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-100'
                  : 'border-gray-700 bg-gray-900/40 text-gray-300 hover:border-sky-500/40'
              }`}
            >
              Stacked
            </button>
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-wide text-gray-400">Show / Hide Elements</label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-600 bg-gray-950 text-sky-500 focus:ring-sky-500"
              checked={template.showInvoiceStatus}
              onChange={(event) => handleFieldChange('showInvoiceStatus', event.target.checked)}
            />
            Show invoice status row
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-600 bg-gray-950 text-sky-500 focus:ring-sky-500"
              checked={template.showNotes}
              onChange={(event) => handleFieldChange('showNotes', event.target.checked)}
            />
            Show notes section
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-600 bg-gray-950 text-sky-500 focus:ring-sky-500"
              checked={template.showFooterCompanyDetails}
              onChange={(event) => handleFieldChange('showFooterCompanyDetails', event.target.checked)}
            />
            Show payment details block
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-gray-600 bg-gray-950 text-sky-500 focus:ring-sky-500"
              checked={template.showBarcode}
              onChange={(event) => handleFieldChange('showBarcode', event.target.checked)}
            />
            Show invoice QR code
          </label>
        </div>
      </section>

      <section>
        <label className="text-xs uppercase tracking-wide text-gray-400">Default Note Text</label>
        <textarea
          value={template.noteText ?? ''}
          onChange={(event) => handleFieldChange('noteText', event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          placeholder="Enter the default notes you want to appear on each invoice..."
          disabled={!template.showNotes}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Company Block Lines</h4>
            <p className="text-xs text-gray-500">
              Add or reorder the lines that appear beside your company heading.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/60 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/15 transition-colors"
            onClick={() => handleAddLine('company')}
          >
            <i className="fas fa-plus text-xs" />
            Add Company Line
          </button>
        </div>
        <div className="space-y-2">
          {template.companyLines.map((line, index) => (
            <LineRow
              key={line.id}
              line={line}
              index={index}
              options={COMPANY_LINE_OPTIONS}
              section="company"
              onChange={handleLineChange}
              onMove={handleMoveLine}
              onRemove={handleRemoveLine}
              disableRemove={template.companyLines.length <= 1}
              canMoveUp={index > 0}
              canMoveDown={index < template.companyLines.length - 1}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Customer Block Lines</h4>
            <p className="text-xs text-gray-500">
              Select which customer details appear for every invoice. Add extra labelled lines when needed.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/60 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/15 transition-colors"
            onClick={() => handleAddLine('customer')}
          >
            <i className="fas fa-plus text-xs" />
            Add Customer Line
          </button>
        </div>
        <div className="space-y-2">
          {template.customerLines.map((line, index) => (
            <LineRow
              key={line.id}
              line={line}
              index={index}
              options={CUSTOMER_LINE_OPTIONS}
              section="customer"
              onChange={handleLineChange}
              onMove={handleMoveLine}
              onRemove={handleRemoveLine}
              disableRemove={template.customerLines.length <= 1}
              canMoveUp={index > 0}
              canMoveDown={index < template.customerLines.length - 1}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Live Preview</h4>
          <span className="text-[11px] uppercase tracking-wide text-gray-500">Sample invoice</span>
        </div>
        <div className="mt-3 rounded-xl border border-gray-800 bg-gray-950/70 shadow-inner overflow-hidden">
          <div
            className="h-2 w-full"
            style={{ backgroundColor: preview.layout.headerColor }}
          />
          {variant === 'minimal' ? (
            <div className="space-y-6 px-5 py-6 text-sm text-gray-200">
              <div className="border-b border-gray-800 pb-4">
                <p className="text-2xl font-semibold text-white">Invoice</p>
                <p className="text-xs text-gray-400 mt-1">
                  Invoice No:{' '}
                  <span className="text-gray-100">{preview.invoice.invoiceNumber}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Issue date:{' '}
                  <span className="text-gray-100">{new Date(preview.invoice.date).toLocaleDateString()}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Due date:{' '}
                  <span className="text-gray-100">{new Date(preview.invoice.dueDate).toLocaleDateString()}</span>
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">From</p>
                  <p className="text-sm font-semibold text-white">{preview.company.name}</p>
                  {preview.displayLines.company.map((line) => (
                    <p key={line.id} className="text-xs text-gray-400">
                      {line.label ? `${line.label}: ` : ''}
                      {line.value}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">To</p>
                  {preview.displayLines.customer.map((line) => (
                    <p key={line.id} className="text-xs text-gray-400">
                      {line.label ? `${line.label}: ` : ''}
                      {line.value}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-gray-800">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900/40 text-[11px] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Item</th>
                      <th className="px-3 py-2 font-semibold text-right">Qty</th>
                      <th className="px-3 py-2 font-semibold text-right">Price</th>
                      <th className="px-3 py-2 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.invoice.items.map((item, index) => (
                      <tr key={index} className="border-t border-gray-800">
                        <td className="px-3 py-2 text-gray-200">{item.description}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{preview.summary.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{preview.summary.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-gray-400">
                <div>
                  <span className="mr-3">Subtotal</span>
                  <span className="text-gray-100">{preview.summary.subtotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="mr-3">Tax ({(preview.summary.taxRate * 100).toFixed(0)}%)</span>
                  <span className="text-gray-100">{preview.summary.taxAmount.toFixed(2)}</span>
                </div>
                <div className="text-sm font-semibold text-emerald-300">
                  <span className="mr-3">Total</span>
                  <span>{preview.summary.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {template.showFooterCompanyDetails ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Payment details</p>
                    {preview.displayLines.company.map((line) => (
                      <p key={`${line.id}-footer`} className="text-xs text-gray-400">
                        {line.label ? `${line.label}: ` : ''}
                        {line.value}
                      </p>
                    ))}
                  </div>
                ) : null}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Note</p>
                  <p className="text-xs text-gray-400">
                    {preview.layout.noteText || SAMPLE_INVOICE.notes}
                  </p>
                </div>
              </div>
            </div>
          ) : variant === 'column' ? (
            <div className="space-y-6 px-5 py-6 text-sm text-gray-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">Invoice</p>
                  <p className="text-2xl font-bold text-white">{preview.invoice.invoiceNumber}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-gray-400">
                    Invoice Date:{' '}
                    <span className="text-gray-100">{new Date(preview.invoice.date).toLocaleDateString()}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Due Date:{' '}
                    <span className="text-gray-100">{new Date(preview.invoice.dueDate).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-200">Bill To</p>
                  {preview.displayLines.customer.map((line) => (
                    <p key={line.id} className="text-xs text-emerald-100/80">
                      {line.label ? `${line.label}: ` : ''}
                      {line.value}
                    </p>
                  ))}
                </div>
                <div className="rounded-lg border border-emerald-500/25 bg-gray-900/60 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Invoice Details</p>
                  <p className="text-xs text-gray-300">
                    Issued By:{' '}
                    <span className="text-gray-100">{preview.invoice.issuedByUser?.name ?? 'Jane Worker'}</span>
                  </p>
                  {preview.layout.showInvoiceStatus ? (
                    <p className="text-xs text-gray-300">
                      Status:{' '}
                      <span className="text-gray-100">{preview.invoice.status.toUpperCase()}</span>
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-200">Summary</p>
                  <div className="mt-2 space-y-1 text-xs text-emerald-100/80">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{preview.summary.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({(preview.summary.taxRate * 100).toFixed(0)}%)</span>
                      <span>{preview.summary.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-emerald-200">
                      <span>Total</span>
                      <span>{preview.summary.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-emerald-500/30">
                <table className="w-full text-left text-xs text-gray-200">
                  <thead className="bg-emerald-500/20 text-[11px] uppercase tracking-wide text-emerald-100">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Description</th>
                      <th className="px-3 py-2 font-semibold text-center">Qty</th>
                      <th className="px-3 py-2 font-semibold text-right">Unit</th>
                      <th className="px-3 py-2 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.invoice.items.map((item, index) => (
                      <tr key={index} className="border-t border-emerald-500/30">
                        <td className="px-3 py-2 text-gray-100">{item.description}</td>
                        <td className="px-3 py-2 text-center text-gray-300">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{preview.summary.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-100">{preview.summary.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.layout.showBarcode ? (
                <PreviewBarcode />
              ) : null}

              <div className="flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Company</p>
                  {preview.displayLines.company.map((line) => (
                    <p key={line.id} className="text-xs text-gray-400">
                      {line.label ? `${line.label}: ` : ''}
                      {line.value}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Notes</p>
                  {preview.layout.showNotes ? (
                    <p className="text-xs text-gray-300">{preview.layout.noteText || SAMPLE_INVOICE.notes}</p>
                  ) : (
                    <p className="text-xs text-gray-600">Notes hidden</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 px-5 py-6 text-sm text-gray-200">
              <div className={`flex ${headerLayoutClass}`}>
                <div className={`space-y-1 ${companyBlockAlign === 'text-left' ? 'sm:text-right' : 'text-left'}`}>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">Invoice</p>
                  <p className="text-2xl font-bold text-white">{preview.invoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">
                    Invoice Date:{' '}
                    <span className="text-gray-100">{new Date(preview.invoice.date).toLocaleDateString()}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Due Date:{' '}
                    <span className="text-gray-100">{new Date(preview.invoice.dueDate).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className={`${companyBlockAlign} space-y-1`}>
                  {showCompanyHeading ? (
                    <p className="text-base font-semibold text-white">{preview.company.name}</p>
                  ) : null}
                  {preview.displayLines.company.map((line) => (
                    <p key={line.id} className="text-xs text-gray-400">
                      {line.label ? `${line.label}: ` : ''}
                      {line.value}
                    </p>
                  ))}
                </div>
              </div>

              <div className={detailLayoutClass}>
                <div className="space-y-1 rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bill To</p>
                  {preview.displayLines.customer.map((line) => (
                    <p key={line.id} className="text-xs text-gray-400">
                      {line.label ? `${line.label}: ` : ''}
                      {line.value}
                    </p>
                  ))}
                </div>
                <div className="space-y-1 rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Invoice Details</p>
                  <p className="text-xs text-gray-400">
                    Amount:{' '}
                    <span className="text-gray-100">AED {preview.summary.total.toFixed(2)}</span>
                  </p>
                  {preview.layout.showInvoiceStatus ? (
                    <p className="text-xs text-gray-400">
                      Status:{' '}
                      <span className="text-gray-100">{preview.invoice.status.toUpperCase()}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-800">
                <div className="hidden sm:grid grid-cols-[3fr,1fr,1fr,1fr] bg-gray-900/60 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <div className="px-4 py-3">Description</div>
                  <div className="px-4 py-3 text-center">Qty</div>
                  <div className="px-4 py-3 text-right">Unit Price</div>
                  <div className="px-4 py-3 text-right">Amount</div>
                </div>
                <div className="sm:hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-800">
                  Line Items
                </div>
                <div className="grid gap-2 border-t border-gray-800 px-4 py-3 text-sm text-gray-200 sm:grid-cols-[3fr,1fr,1fr,1fr]">
                  <div>
                    <p className="font-semibold text-white">{preview.invoice.items[0].description}</p>
                    <div className="mt-1 flex justify-between text-xs text-gray-400 sm:hidden">
                      <span>Qty: {preview.summary.quantity}</span>
                      <span>Unit: {preview.summary.unitPrice.toFixed(2)}</span>
                      <span>Total: {preview.summary.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center text-gray-300">
                    {preview.summary.quantity}
                  </div>
                  <div className="hidden sm:flex items-center justify-end text-gray-300">
                    {preview.summary.unitPrice.toFixed(2)}
                  </div>
                  <div className="hidden sm:flex items-center justify-end font-semibold text-white">
                    {preview.summary.amount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-gray-100">{preview.summary.subtotal.toFixed(2)}</span>
                </div>
                {preview.summary.discount ? (
                  <div className="flex justify-between text-gray-400">
                    <span>Discount</span>
                    <span className="text-gray-100">- {preview.summary.discount.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-gray-400">
                  <span>Tax ({(preview.summary.taxRate * 100).toFixed(0)}%)</span>
                  <span className="text-gray-100">{preview.summary.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-2 text-base font-semibold" style={{ color: template.headerColor }}>
                  <span>Total Due</span>
                  <span>{preview.summary.total.toFixed(2)}</span>
                </div>
                {preview.summary.balanceDue ? (
                  <div className="flex justify-between text-gray-400">
                    <span>Balance Outstanding</span>
                    <span className="text-gray-100">{preview.summary.balanceDue.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>

              {preview.layout.showBarcode ? (
                <PreviewBarcode />
              ) : null}

              {preview.layout.showNotes && (preview.layout.noteText || SAMPLE_INVOICE.notes) ? (
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-xs text-gray-300">
                  <p className="font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                  <p className="mt-1 text-gray-200">{preview.layout.noteText || SAMPLE_INVOICE.notes}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
          onClick={() => onClose?.()}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition-colors"
          onClick={handleSubmit}
        >
          Save Template
        </button>
      </footer>
    </div>
  );
}

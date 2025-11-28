import { useMemo, useState } from 'react';

const DEFAULT_TEMPLATE = {
  headerColor: '#1f2937',
  highlightColor: '#0ea5e9',
  summaryLayout: 'split',
  bodyVariant: 'classic',
  noteText: 'Please confirm delivery schedule within 24 hours of receipt.',
  includeTotals: true,
  includeRequestedBy: true,
  showBrandAccent: false,
};

const SUMMARY_LAYOUT_OPTIONS = [
  { value: 'split', label: 'Side by Side Summary' },
  { value: 'stacked', label: 'Stacked Summary' },
];

const BODY_VARIANT_OPTIONS = [
  { value: 'classic', label: 'Classic Table' },
  { value: 'minimal', label: 'Minimal Blocks' },
];

function sanitizeTemplate(template) {
  const source = template && typeof template === 'object' ? template : {};
  const next = { ...DEFAULT_TEMPLATE };

  if (typeof source.headerColor === 'string' && /^#([0-9a-fA-F]{6})$/.test(source.headerColor.trim())) {
    next.headerColor = source.headerColor.trim();
  }
  if (typeof source.highlightColor === 'string' && /^#([0-9a-fA-F]{6})$/.test(source.highlightColor.trim())) {
    next.highlightColor = source.highlightColor.trim();
  }
  const summaryLayout = typeof source.summaryLayout === 'string' ? source.summaryLayout.toLowerCase() : '';
  if (summaryLayout === 'split' || summaryLayout === 'stacked') {
    next.summaryLayout = summaryLayout;
  }
  const bodyVariant = typeof source.bodyVariant === 'string' ? source.bodyVariant.toLowerCase() : '';
  if (bodyVariant === 'classic' || bodyVariant === 'minimal') {
    next.bodyVariant = bodyVariant;
  }
  if (typeof source.noteText === 'string') {
    next.noteText = source.noteText.trim();
  }
  if (typeof source.includeTotals === 'boolean') {
    next.includeTotals = source.includeTotals;
  }
  if (typeof source.includeRequestedBy === 'boolean') {
    next.includeRequestedBy = source.includeRequestedBy;
  }
  if (typeof source.showBrandAccent === 'boolean') {
    next.showBrandAccent = source.showBrandAccent;
  }
  return next;
}

export default function PurchaseOrderModificationModal({
  initialTemplate,
  scopeLabel,
  onSave,
  onClose,
}) {
  const [templateState, setTemplateState] = useState(() => sanitizeTemplate(initialTemplate));
  const [saving, setSaving] = useState(false);

  const previewConfig = useMemo(
    () => sanitizeTemplate(templateState),
    [templateState],
  );

  const handleChange = (field, value) => {
    setTemplateState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleToggle = (field) => {
    setTemplateState((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await Promise.resolve(onSave(previewConfig));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Customise Purchase Order Template</h2>
        {scopeLabel ? (
          <p className="text-xs text-gray-400">{scopeLabel}</p>
        ) : null}
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Branding</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs text-gray-400">
                <span className="text-sm font-medium text-gray-200">Header Colour</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={templateState.headerColor}
                    onChange={(event) => handleChange('headerColor', event.target.value)}
                    className="h-10 w-16 rounded border border-gray-700 bg-gray-900"
                  />
                  <input
                    type="text"
                    value={templateState.headerColor}
                    onChange={(event) => handleChange('headerColor', event.target.value)}
                    className="flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 text-xs text-gray-400">
                <span className="text-sm font-medium text-gray-200">Accent Colour</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={templateState.highlightColor}
                    onChange={(event) => handleChange('highlightColor', event.target.value)}
                    className="h-10 w-16 rounded border border-gray-700 bg-gray-900"
                  />
                  <input
                    type="text"
                    value={templateState.highlightColor}
                    onChange={(event) => handleChange('highlightColor', event.target.value)}
                    className="flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-2 text-xs text-gray-400">
              <span className="text-sm font-medium text-gray-200">Summary Layout</span>
              <select
                value={templateState.summaryLayout}
                onChange={(event) => handleChange('summaryLayout', event.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {SUMMARY_LAYOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs text-gray-400">
              <span className="text-sm font-medium text-gray-200">Body Style</span>
              <select
                value={templateState.bodyVariant}
                onChange={(event) => handleChange('bodyVariant', event.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {BODY_VARIANT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Details</h3>

            <label className="flex flex-col gap-2 text-xs text-gray-400">
              <span className="text-sm font-medium text-gray-200">Notes</span>
              <textarea
                value={templateState.noteText}
                onChange={(event) => handleChange('noteText', event.target.value)}
                rows={3}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={templateState.includeTotals}
                  onChange={() => handleToggle('includeTotals')}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                />
                Show totals summary
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={templateState.includeRequestedBy}
                  onChange={() => handleToggle('includeRequestedBy')}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                />
                Display requested-by section
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={templateState.showBrandAccent}
                  onChange={() => handleToggle('showBrandAccent')}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                />
                Highlight brand accent strip
              </label>
            </div>
          </section>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 space-y-4">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Live Preview</p>
            <div className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-xs text-gray-300">
              <span className="font-semibold text-white">Purchase Order</span>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>Header Colour:</span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-gray-700"
                    style={{ backgroundColor: previewConfig.headerColor }}
                  />
                  {previewConfig.headerColor}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>Accent Colour:</span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-gray-700"
                    style={{ backgroundColor: previewConfig.highlightColor }}
                  />
                  {previewConfig.highlightColor}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Summary Layout</span>
                <span className="text-white font-semibold">{previewConfig.summaryLayout}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Body Style</span>
                <span className="text-white font-semibold">{previewConfig.bodyVariant}</span>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-[11px] text-gray-400">
                <p className="text-gray-200 font-semibold mb-1">Notes</p>
                <p className="text-gray-400">{previewConfig.noteText || 'No additional notes provided.'}</p>
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-gray-400">
                <span>Totals Visible: <strong className="text-white">{previewConfig.includeTotals ? 'Yes' : 'No'}</strong></span>
                <span>Requested By: <strong className="text-white">{previewConfig.includeRequestedBy ? 'Shown' : 'Hidden'}</strong></span>
                <span>Brand Accent: <strong className="text-white">{previewConfig.showBrandAccent ? 'Enabled' : 'Disabled'}</strong></span>
              </div>
            </div>
          </header>
        </div>
      </div>

      <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </footer>
    </form>
  );
}

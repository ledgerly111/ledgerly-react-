import PropTypes from 'prop-types';
import { memo } from 'react';
import { invoiceTemplateDesigns } from '../constants/invoiceTemplateDesigns.js';

function TemplatePreview({ template }) {
  const { baseConfig } = template;
  const headerColor = baseConfig.headerColor ?? '#222222';
  const variant = baseConfig.bodyVariant ?? 'classic';
  const detailLayout = baseConfig.detailLayout ?? 'two-column';
  const companyPosition = baseConfig.companyBlockPosition ?? 'right';

  let body;
  if (variant === 'minimal') {
    body = (
      <div className="p-3 space-y-3 text-[10px] text-gray-400">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold tracking-[0.25em] text-gray-500">INVOICE</p>
          <div className="h-1 w-16 rounded-full bg-gray-700" />
          <div className="h-1 w-20 rounded-full bg-gray-800" />
          <div className="h-1 w-24 rounded-full bg-gray-800" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wide text-gray-500">From</p>
            <div className="h-1 w-16 rounded-full bg-gray-700" />
            <div className="h-1 w-24 rounded-full bg-gray-800" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wide text-gray-500">To</p>
            <div className="h-1 w-16 rounded-full bg-gray-700" />
            <div className="h-1 w-20 rounded-full bg-gray-800" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-white font-semibold">
            <span>Total</span>
            <span>AED 2,729.98</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>136.50</span>
          </div>
        </div>
      </div>
    );
  } else if (variant === 'column') {
    body = (
      <div className="p-3 space-y-3 text-[10px] text-gray-400">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold text-white text-xs">INVOICE</div>
          <div className="flex gap-2 text-right">
            <div className="h-1.5 w-10 rounded-full bg-emerald-500/40" />
            <div className="h-1.5 w-8 rounded-full bg-emerald-500/20" />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2">
            <div className="h-1.5 w-12 rounded-full bg-emerald-400/70 mb-1" />
            <div className="h-1 w-full rounded-full bg-emerald-400/40 mb-0.5" />
            <div className="h-1 w-12 rounded-full bg-emerald-400/30" />
          </div>
          <div className="rounded-lg border border-emerald-500/25 bg-gray-900/60 p-2">
            <div className="h-1.5 w-14 rounded-full bg-gray-600 mb-1" />
            <div className="h-1 w-16 rounded-full bg-gray-700 mb-0.5" />
            <div className="h-1 w-10 rounded-full bg-gray-800" />
          </div>
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-2">
            <div className="h-1.5 w-10 rounded-full bg-emerald-400/70 mb-1" />
            <div className="flex justify-between text-emerald-200">
              <span>Subtotal</span>
              <span>2,599.98</span>
            </div>
            <div className="flex justify-between text-emerald-200">
              <span>Total</span>
              <span>2,729.98</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 overflow-hidden">
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr] bg-emerald-500/20 text-emerald-100 text-[9px] uppercase tracking-wide">
            <div className="px-2 py-1.5">Description</div>
            <div className="px-2 py-1.5 text-center">Qty</div>
            <div className="px-2 py-1.5 text-right">Unit</div>
            <div className="px-2 py-1.5 text-right">Amount</div>
          </div>
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr] border-t border-emerald-500/30 px-2 py-1.5 text-gray-200">
            <div className="h-1.5 w-20 rounded-full bg-gray-700" />
            <div className="flex items-center justify-center">
              <div className="h-1 w-6 rounded-full bg-gray-700" />
            </div>
            <div className="flex items-center justify-end">
              <div className="h-1 w-8 rounded-full bg-gray-700" />
            </div>
            <div className="flex items-center justify-end">
              <div className="h-1 w-10 rounded-full bg-gray-600" />
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="p-3 space-y-3 text-[10px] text-gray-400">
        <div className={`flex ${companyPosition === 'left' ? 'flex-col sm:flex-row-reverse' : 'flex-col sm:flex-row'} justify-between gap-2`}>
          <div className="font-semibold text-white text-xs">INVOICE</div>
          <div className="text-right space-y-1">
            <div className="h-1.5 w-16 rounded-full bg-gray-700" />
            <div className="h-1 w-12 rounded-full bg-gray-800" />
            <div className="h-1 w-10 rounded-full bg-gray-800" />
          </div>
        </div>
        <div className={detailLayout === 'two-column' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          <div className="rounded-lg border border-dashed border-gray-800 p-2">
            <div className="h-1.5 w-10 rounded-full bg-gray-700 mb-1" />
            <div className="h-1 w-full rounded-full bg-gray-800 mb-0.5" />
            <div className="h-1 w-10 rounded-full bg-gray-800" />
          </div>
          <div className="rounded-lg border border-dashed border-gray-800 p-2">
            <div className="h-1 w-16 rounded-full bg-gray-700 mb-1" />
            <div className="h-1 w-12 rounded-full bg-gray-800 mb-0.5" />
            <div className="h-1 w-8 rounded-full bg-gray-800" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-white font-semibold">
            <span className="text-[11px]">Total</span>
            <span className="text-[11px]">AED 2,729.98</span>
          </div>
          {baseConfig.showNotes ? (
            <div className="h-6 rounded-lg border border-gray-800 bg-gray-900/70" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 shadow-inner overflow-hidden">
      <div className="h-6" style={{ backgroundColor: headerColor }} />
      {body}
    </div>
  );
}

TemplatePreview.propTypes = {
  template: PropTypes.shape({
    baseConfig: PropTypes.object.isRequired,
  }).isRequired,
};

function TemplateCard({
  template,
  isActive,
  onSelect,
  onCustomize,
  disableCustomize,
}) {
  const { id, name, description } = template;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-colors ${
        isActive
          ? 'border-sky-500/80 shadow-[0_0_0_2px_rgba(56,189,248,0.45)]'
          : 'border-gray-800 hover:border-sky-500/40'
      } bg-gray-900/60`}
    >
      {isActive ? (
        <div className="absolute right-3 top-3 rounded-full border border-sky-400 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
          Active
        </div>
      ) : null}
      <div className="p-4 space-y-3">
        <TemplatePreview template={template} />
        <div>
          <h3 className="text-base font-semibold text-white">{name}</h3>
          <p className="mt-1 text-xs text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-gray-800 px-4 py-3">
        <button
          type="button"
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            isActive
              ? 'bg-sky-600 text-white hover:bg-sky-500'
              : 'border border-sky-500/60 text-sky-200 hover:bg-sky-500/10'
          }`}
          onClick={() => onSelect(id)}
        >
          {isActive ? 'Selected' : 'Use Template'}
        </button>
        <button
          type="button"
          className="rounded-xl border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
          onClick={() => onCustomize(template, isActive)}
          disabled={disableCustomize}
        >
          Customize Details
        </button>
      </div>
    </div>
  );
}

TemplateCard.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    baseConfig: PropTypes.object.isRequired,
  }).isRequired,
  isActive: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onCustomize: PropTypes.func.isRequired,
  disableCustomize: PropTypes.bool,
};

TemplateCard.defaultProps = {
  isActive: false,
  disableCustomize: false,
};

const TemplateCardMemo = memo(TemplateCard);

export default function InvoiceTemplateSelector({
  activeTemplateId,
  onSelectTemplate,
  onCustomizeTemplate,
  canCustomize,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {invoiceTemplateDesigns.map((template) => (
          <TemplateCardMemo
            key={template.id}
            template={template}
            isActive={template.id === activeTemplateId}
            onSelect={onSelectTemplate}
            onCustomize={onCustomizeTemplate}
            disableCustomize={!canCustomize}
          />
        ))}
      </div>
      {!canCustomize ? (
        <p className="text-xs text-gray-500">
          Only administrators and supervisors can customise invoice details.
        </p>
      ) : null}
    </div>
  );
}

InvoiceTemplateSelector.propTypes = {
  activeTemplateId: PropTypes.string,
  onSelectTemplate: PropTypes.func.isRequired,
  onCustomizeTemplate: PropTypes.func.isRequired,
  canCustomize: PropTypes.bool,
};

InvoiceTemplateSelector.defaultProps = {
  activeTemplateId: null,
  canCustomize: true,
};

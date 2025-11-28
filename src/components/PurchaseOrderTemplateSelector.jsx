import PropTypes from 'prop-types';
import { memo } from 'react';
import { purchaseOrderTemplateDesigns } from '../constants/purchaseOrderTemplateDesigns.js';

function TemplatePreview({ template }) {
  const { baseConfig } = template;
  const headerColor = baseConfig.headerColor ?? '#1f2937';
  const highlightColor = baseConfig.highlightColor ?? '#0ea5e9';
  const layout = baseConfig.summaryLayout ?? 'split';
  const bodyVariant = baseConfig.bodyVariant ?? 'classic';

  const summaryBadge = (
    <div
      className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        color: highlightColor,
        backgroundColor: `${highlightColor}15`,
        border: `1px solid ${highlightColor}40`,
      }}
    >
      Purchase Order
    </div>
  );

  let body;
  if (bodyVariant === 'minimal') {
    body = (
      <div className="p-3 space-y-3 text-[10px] text-gray-400">
        <div className="flex items-center justify-between text-white text-xs font-semibold">
          <span>Purchase Order</span>
          {summaryBadge}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-500">Supplier</p>
            <div className="h-1 w-20 rounded-full bg-gray-700 mt-1" />
            <div className="h-1 w-24 rounded-full bg-gray-800 mt-1" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-500">Deliver To</p>
            <div className="h-1 w-20 rounded-full bg-gray-700 mt-1" />
            <div className="h-1 w-24 rounded-full bg-gray-800 mt-1" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 p-2">
          <div className="flex justify-between text-white font-semibold">
            <span>Total</span>
            <span>AED 12,450.00</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Requested by</span>
            <span>M. Alvarez</span>
          </div>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="p-3 space-y-3 text-[10px] text-gray-400">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 text-white">
            <p className="text-xs font-semibold tracking-wide uppercase">Purchase Order</p>
            <div className="h-1 w-20 rounded-full bg-gray-700" />
            <div className="h-1 w-24 rounded-full bg-gray-800" />
          </div>
          <div className="flex gap-2">
            <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: `${highlightColor}60` }} />
            <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: `${highlightColor}30` }} />
          </div>
        </div>
        <div className={`grid gap-2 ${layout === 'stacked' ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-2 space-y-1">
            <p className="text-[9px] uppercase tracking-wide text-gray-500">Supplier</p>
            <div className="h-1 w-20 rounded-full bg-gray-700" />
            <div className="h-1 w-24 rounded-full bg-gray-800" />
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-2 space-y-1">
            <p className="text-[9px] uppercase tracking-wide text-gray-500">Ship To</p>
            <div className="h-1 w-20 rounded-full bg-gray-700" />
            <div className="h-1 w-24 rounded-full bg-gray-800" />
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-2 space-y-1">
            <p className="text-[9px] uppercase tracking-wide text-gray-500">Summary</p>
            <div className="flex justify-between text-white">
              <span>Subtotal</span>
              <span>12,450.00</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Ship Date</span>
              <span>Aug 24</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div
            className="grid grid-cols-[2fr,1fr,1fr,1fr] text-[9px] uppercase tracking-wide text-white"
            style={{ backgroundColor: `${highlightColor}25` }}
          >
            <div className="px-2 py-1.5">Item</div>
            <div className="px-2 py-1.5 text-center">Qty</div>
            <div className="px-2 py-1.5 text-right">Unit</div>
            <div className="px-2 py-1.5 text-right">Amount</div>
          </div>
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr] border-t border-gray-800 px-2 py-1.5 text-gray-300">
            <div className="h-1.5 w-24 rounded-full bg-gray-700" />
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
          ? 'border-emerald-500/80 shadow-[0_0_0_2px_rgba(16,185,129,0.45)]'
          : 'border-gray-800 hover:border-emerald-500/40'
      } bg-gray-900/60`}
    >
      {isActive ? (
        <div className="absolute right-3 top-3 rounded-full border border-emerald-400 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
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
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'border border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/10'
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

export default function PurchaseOrderTemplateSelector({
  activeTemplateId,
  onSelectTemplate,
  onCustomizeTemplate,
  canCustomize,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {purchaseOrderTemplateDesigns.map((template) => (
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
          Only administrators and supervisors can customise purchase order details.
        </p>
      ) : null}
    </div>
  );
}

PurchaseOrderTemplateSelector.propTypes = {
  activeTemplateId: PropTypes.string,
  onSelectTemplate: PropTypes.func.isRequired,
  onCustomizeTemplate: PropTypes.func.isRequired,
  canCustomize: PropTypes.bool,
};

PurchaseOrderTemplateSelector.defaultProps = {
  activeTemplateId: null,
  canCustomize: true,
};

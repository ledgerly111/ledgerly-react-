import { useMemo } from 'react';
import { useAppState } from '../context/AppContext.jsx';
import { calculateBalanceSheet } from '../utils/journal.js';
import { formatCurrency } from '../utils/currency.js';

function Section({ title, items, total, colorClass, countryCode }) {
  return (
    <div className="perplexity-card p-6 space-y-4">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">No accounts posted yet.</div>
        ) : (
          items.map((item) => (
            <div key={item.code} className="flex items-center justify-between text-sm text-gray-300">
              <span>{item.name}</span>
              <span className="font-mono">{formatCurrency(item.balance, { countryCode, showSymbol: true })}</span>
            </div>
          ))
        )}
      </div>
      <div className={`flex items-center justify-between border-t border-gray-700 pt-3 text-lg font-bold ${colorClass}`}>
        <span>Total {title}</span>
        <span className="font-mono">{formatCurrency(total, { countryCode, showSymbol: true })}</span>
      </div>
    </div>
  );
}

export default function BalanceSheetView() {
  const { journal, chartOfAccounts, selectedCountry } = useAppState();

  const report = useMemo(() => calculateBalanceSheet(journal, chartOfAccounts), [journal, chartOfAccounts]);

  return (
    <div className="space-y-6 fade-in">
      <header>
        <h2 className="text-2xl font-bold text-white mb-2">Balance Sheet</h2>
        <p className="text-gray-400">Snapshot of assets, liabilities, and equity right now.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section
          title="Assets"
          items={report.assets}
          total={report.totals.assets}
          colorClass="text-teal-400"
          countryCode={selectedCountry}
        />
        <Section
          title="Liabilities"
          items={report.liabilities}
          total={report.totals.liabilities}
          colorClass="text-red-400"
          countryCode={selectedCountry}
        />
        <Section
          title="Equity"
          items={report.equity}
          total={report.totals.equity}
          colorClass="text-blue-400"
          countryCode={selectedCountry}
        />
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 rounded-xl border border-gray-700/60 bg-gray-900/40 px-4 py-3 text-sm text-gray-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Total Assets</span>
            <span className="font-mono text-teal-300">{formatCurrency(report.totals.assets, { countryCode: selectedCountry, showSymbol: true })}</span>
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-gray-700/60 bg-gray-900/40 px-4 py-3 text-sm text-gray-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Liabilities + Equity</span>
            <span className="font-mono text-blue-300">{formatCurrency(report.totals.liabilitiesAndEquity, { countryCode: selectedCountry, showSymbol: true })}</span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${report.totals.isBalanced ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
        <i className={`fas ${report.totals.isBalanced ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`} />
        {report.totals.isBalanced ? 'Balance sheet balances.' : 'Assets do not equal liabilities plus equity. Investigate discrepancies.'}
      </div>
    </div>
  );
}

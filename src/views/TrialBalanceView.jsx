import { useMemo } from 'react';
import { useAppState } from '../context/AppContext.jsx';
import { calculateTrialBalance } from '../utils/journal.js';
import { formatCurrency } from '../utils/currency.js';

export default function TrialBalanceView() {
  const { journal, chartOfAccounts, selectedCountry } = useAppState();

  const report = useMemo(() => calculateTrialBalance(journal, chartOfAccounts), [journal, chartOfAccounts]);

  return (
    <div className="space-y-6 fade-in">
      <header>
        <h2 className="text-2xl font-bold text-white mb-2">Trial Balance</h2>
        <p className="text-gray-400">Verify that every debit and credit aligns before closing the books.</p>
      </header>

      <div className="perplexity-card overflow-hidden">
        <div className="responsive-table">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 bg-gray-900/40 text-gray-300">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wide">Account</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wide">Debit</th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wide">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {report.rows.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-center text-sm text-gray-400" colSpan={3}>
                    Post journal entries to generate a trial balance.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.code} className="bg-gray-950/40 hover:bg-gray-900/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{row.name} ({row.code})</td>
                    <td className="px-6 py-4 text-right font-mono text-blue-400">
                      {row.debit > 0 ? formatCurrency(row.debit, { countryCode: selectedCountry, showSymbol: true }) : ''}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-teal-400">
                      {row.credit > 0 ? formatCurrency(row.credit, { countryCode: selectedCountry, showSymbol: true }) : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-900/40 text-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm font-semibold">Total</td>
                <td className="px-6 py-4 text-right font-mono text-blue-400 font-semibold">{formatCurrency(report.totalDebit, { countryCode: selectedCountry, showSymbol: true })}</td>
                <td className="px-6 py-4 text-right font-mono text-teal-400 font-semibold">{formatCurrency(report.totalCredit, { countryCode: selectedCountry, showSymbol: true })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${report.isBalanced ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
        <i className={`fas ${report.isBalanced ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`} />
        {report.isBalanced ? 'Debits and credits are in balance.' : 'Trial balance is out of balance. Review recent postings.'}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { calculateProfitAndLoss } from '../utils/journal.js';

const EMPTY_REPORT = {
  totalRevenue: 0,
  totalDiscounts: 0,
  netRevenue: 0,
  totalCOGS: 0,
  grossProfit: 0,
  operatingExpenses: {},
  totalOperatingExpenses: 0,
  netIncome: 0,
};

function getDefaultDateRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const format = (date) => date.toISOString().slice(0, 10);
  return {
    start: format(start),
    end: format(today),
  };
}

export default function PnlView() {
  const { journal = [], chartOfAccounts = [], selectedCountry } = useAppState();
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const datesValid = useMemo(() => {
    if (!startDate || !endDate) {
      return false;
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start <= end;
  }, [startDate, endDate]);

  const report = useMemo(() => {
    if (!datesValid) {
      return EMPTY_REPORT;
    }
    return calculateProfitAndLoss(journal, chartOfAccounts, { startDate, endDate });
  }, [datesValid, journal, chartOfAccounts, startDate, endDate]);

  const expenseEntries = useMemo(() => {
    return Object.entries(report.operatingExpenses ?? {})
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [report.operatingExpenses]);

  const netLabel = report.netIncome >= 0 ? 'Net Income' : 'Net Loss';
  const netClass = report.netIncome >= 0 ? 'text-green-400 border-green-500' : 'text-red-400 border-red-500';
  const formattedNetIncome = report.netIncome >= 0
    ? formatCurrency(report.netIncome, { countryCode: selectedCountry, showSymbol: true })
    : `(${formatCurrency(Math.abs(report.netIncome), { countryCode: selectedCountry, showSymbol: true })})`;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Profit &amp; Loss Statement</h2>
        <p className="text-gray-400">Analyze revenue, costs, and profitability for any date range.</p>
      </div>

      <div className="perplexity-card p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-300" htmlFor="pnl-start">
              Start Date
            </label>
            <input
              id="pnl-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="form-input mt-1 w-full"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-300" htmlFor="pnl-end">
              End Date
            </label>
            <input
              id="pnl-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="form-input mt-1 w-full"
            />
          </div>
        </div>
        {!datesValid ? (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            Select a valid date range where the start date comes before the end date.
          </div>
        ) : null}
      </div>

      <div className="perplexity-card p-6 slide-up">
        <div className="space-y-6">
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <span className="text-lg font-medium text-white">Revenue</span>
            </header>
            <div className="flex items-center justify-between border-l-2 border-gray-700 pl-4 text-sm text-gray-300">
              <span>Total Sales Revenue</span>
              <span className="font-mono">
                {formatCurrency(report.totalRevenue, { countryCode: selectedCountry, showSymbol: true })}
              </span>
            </div>
            <div className="flex items-center justify-between border-l-2 border-gray-700 pl-4 text-sm text-gray-300">
              <span>Less: Sales Discounts</span>
              <span className="font-mono">
                ({formatCurrency(report.totalDiscounts, { countryCode: selectedCountry, showSymbol: true })})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-600 pt-2 text-lg font-semibold text-white">
              <span>Net Revenue</span>
              <span className="font-mono">
                {formatCurrency(report.netRevenue, { countryCode: selectedCountry, showSymbol: true })}
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between text-lg font-medium text-white">
              <span>Cost of Goods Sold (COGS)</span>
              <span className="font-mono">
                ({formatCurrency(report.totalCOGS, { countryCode: selectedCountry, showSymbol: true })})
              </span>
            </div>
            <div className="flex items-center justify-between border-t-2 border-gray-500 pt-3 text-xl font-semibold text-teal-400">
              <span>Gross Profit</span>
              <span className="font-mono">
                {formatCurrency(report.grossProfit, { countryCode: selectedCountry, showSymbol: true })}
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <header className="text-lg font-medium text-white">Operating Expenses</header>
            {expenseEntries.length === 0 ? (
              <div className="rounded-lg border border-gray-700/60 bg-gray-900/40 px-4 py-3 text-sm text-gray-400">
                No expenses recorded for this period.
              </div>
            ) : (
              expenseEntries.map((expense) => (
                <div key={expense.name} className="flex items-center justify-between border-l-2 border-gray-700 pl-4 text-sm text-gray-300">
                  <span>{expense.name}</span>
                  <span className="font-mono">
                    ({formatCurrency(expense.amount, { countryCode: selectedCountry, showSymbol: true })})
                  </span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between border-t border-gray-600 pt-2 text-lg font-semibold text-white">
              <span>Total Operating Expenses</span>
              <span className="font-mono">
                ({formatCurrency(report.totalOperatingExpenses, { countryCode: selectedCountry, showSymbol: true })})
              </span>
            </div>
          </section>

          <section className="border-t-4 pt-4" style={{ borderColor: report.netIncome >= 0 ? 'rgba(30, 215, 96, 0.6)' : 'rgba(248, 113, 113, 0.6)' }}>
            <div className={`flex items-center justify-between text-2xl font-bold ${netClass}`}>
              <span>{netLabel}</span>
              <span className="font-mono">{formattedNetIncome}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


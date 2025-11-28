import { useCallback, useMemo } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';
import { exportJson } from '../utils/export.js';

function formatMonthLabel(monthKey) {
  if (!monthKey) {
    return 'Unknown';
  }
  const date = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function ReportsView() {
  const state = useAppState();
  const { pushNotification, setView } = useAppActions();
  const {
    sales = [],
    expenses = [],
    products = [],
    customers = [],
    invoices = [],
    lowStockThreshold = 0,
    selectedCountry,
    accessibleUserIds = [],
    hasFeaturePermission,
    currentUser,
  } = state;

  const canViewReports = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'reports.view');
    }
    const role = currentUser?.role ?? 'guest';
    return role === 'admin' || role === 'manager';
  }, [hasFeaturePermission, currentUser?.id, currentUser?.role]);

  const accessibleUserIdSet = useMemo(
    () => {
      if (!canViewReports) {
        return new Set();
      }
      return new Set(
        (accessibleUserIds ?? [])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value)),
      );
    },
    [accessibleUserIds, canViewReports],
  );
  const accessibleEmployeeCount = accessibleUserIdSet.size;

  const scopedSales = useMemo(() => {
    if (!canViewReports || accessibleUserIdSet.size === 0) {
      return [];
    }
    return sales.filter((sale) => accessibleUserIdSet.has(Number(sale?.salesPersonId)));
  }, [sales, accessibleUserIdSet, canViewReports]);

  const scopedExpenses = useMemo(() => {
    if (!canViewReports || accessibleUserIdSet.size === 0) {
      return [];
    }
    return expenses.filter((expense) => {
      const addedBy = Number(expense?.addedBy ?? expense?.createdBy);
      return Number.isFinite(addedBy) ? accessibleUserIdSet.has(addedBy) : false;
    });
  }, [expenses, accessibleUserIdSet, canViewReports]);

  const scopedCustomers = useMemo(() => {
    if (!canViewReports || accessibleUserIdSet.size === 0) {
      return [];
    }
    return customers.filter((customer) => {
      const ownerId = Number(customer?.accountOwnerId ?? customer?.ownerId);
      return Number.isFinite(ownerId) && accessibleUserIdSet.has(ownerId);
    });
  }, [customers, accessibleUserIdSet, canViewReports]);

  const scopedInvoices = useMemo(() => {
    if (!canViewReports || accessibleUserIdSet.size === 0) {
      return [];
    }
    return invoices.filter((invoice) => {
      const issuedBy = Number(invoice?.issuedBy ?? invoice?.createdBy);
      const customerOwnerId = Number(
        (customers.find((customer) => customer.id === (invoice.customerId ?? invoice.customer?.id))?.accountOwnerId)
        ?? invoice.customer?.accountOwnerId
        ?? invoice.customer?.ownerId,
      );
      const issuedByAllowed = Number.isFinite(issuedBy) && accessibleUserIdSet.has(issuedBy);
      const customerAllowed = Number.isFinite(customerOwnerId) && accessibleUserIdSet.has(customerOwnerId);
      return issuedByAllowed || customerAllowed;
    });
  }, [invoices, customers, accessibleUserIdSet, canViewReports]);

  const productsCount = products.length;
  const customersCount = scopedCustomers.length;

  const overview = useMemo(() => {
    if (!canViewReports) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        products: 0,
        customers: 0,
        employees: 0,
      };
    }
    const totalRevenue = scopedSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0);
    const totalExpenses = scopedExpenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      products: productsCount,
      customers: customersCount,
      employees: accessibleEmployeeCount,
    };
  }, [scopedSales, scopedExpenses, productsCount, customersCount, accessibleEmployeeCount, canViewReports]);

  const salesByMonth = useMemo(() => {
    if (!canViewReports) {
      return [];
    }
    const monthMap = new Map();
    scopedSales.forEach((sale) => {
      if (!sale?.date) {
        return;
      }
      const key = String(sale.date).slice(0, 7);
      const existing = monthMap.get(key) ?? 0;
      monthMap.set(key, existing + (sale.total ?? 0));
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => ({ key, amount, label: formatMonthLabel(key) }));
  }, [scopedSales, canViewReports]);

  const recentMonthlySales = useMemo(() => salesByMonth.slice(-6), [salesByMonth]);

  const topProducts = useMemo(() => {
    if (!canViewReports) {
      return [];
    }
    const quantityMap = new Map();
    scopedSales.forEach((sale) => {
      (sale.items ?? []).forEach((item) => {
        const product = products.find((candidate) => String(candidate?.id) === String(item.productId));
        if (!product) {
          return;
        }
        const previous = quantityMap.get(product.name) ?? 0;
        quantityMap.set(product.name, previous + (item.quantity ?? 0));
      });
    });
    return Array.from(quantityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [scopedSales, products, canViewReports]);

  const topCustomers = useMemo(() => {
    if (!canViewReports) {
      return [];
    }
    const revenueMap = new Map();
    scopedSales.forEach((sale) => {
      const customerId = sale.customerId ?? sale.customer?.id;
      if (customerId == null) {
        return;
      }
      const customer = customers.find((candidate) => String(candidate?.id) === String(customerId));
      if (!customer) {
        return;
      }
      const key = customer.name ?? `Customer ${customerId}`;
      const previous = revenueMap.get(key) ?? 0;
      revenueMap.set(key, previous + (sale.total ?? 0));
    });
    return Array.from(revenueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [scopedSales, customers, canViewReports]);

  const inventoryStatus = useMemo(() => {
    if (!canViewReports) {
      return { inStock: 0, low: 0, out: 0 };
    }
    const lowStock = products.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= lowStockThreshold);
    const outOfStock = products.filter((product) => (product.stock ?? 0) <= 0);
    const damaged = products.filter((product) => (product.damagedStock ?? 0) > 0);
    return {
      inStock: products.length - lowStock.length - outOfStock.length,
      low: lowStock.length,
      out: outOfStock.length,
      damaged: damaged.length,
      damagedValue: damaged.reduce((sum, p) => sum + (p.damagedStock * (p.baseUnitPrice ?? 0)), 0),
    };
  }, [products, lowStockThreshold, canViewReports]);

  const reportSnapshot = useMemo(() => ({
    overview,
    salesByMonth,
    topProducts,
    topCustomers,
    inventoryStatus,
    invoices: scopedInvoices,
    customers: scopedCustomers,
    expenses: scopedExpenses,
    sales: scopedSales,
  }), [
    overview,
    salesByMonth,
    topProducts,
    topCustomers,
    inventoryStatus,
    scopedInvoices,
    scopedCustomers,
    scopedExpenses,
    scopedSales,
  ]);

  const handleExportData = useCallback(() => {
    try {
      exportJson(reportSnapshot, `ledgerly-reports-${Date.now()}.json`);
      pushNotification({ type: 'success', message: 'Report export started.' });
    } catch (error) {
      console.error('Failed to export reports', error);
      pushNotification({ type: 'error', message: 'Failed to export reports.' });
    }
  }, [reportSnapshot, pushNotification]);
  const handleNavigate = useCallback((viewKey) => {
    setView(viewKey);
  }, [setView]);

  if (!canViewReports) {
    return (
      <div className="perplexity-card p-8 text-center text-gray-400 fade-in">
        You do not have permission to view reports yet.
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Business Reports</h2>
          <p className="text-gray-400">Comprehensive analytics to understand performance across the business.</p>
        </div>
        <button
          type="button"
          className="perplexity-button px-4 py-2 rounded-xl font-medium"
          onClick={handleExportData}
        >
          <i className="fas fa-download mr-2" />Export Data
        </button>
      </div>

      <div className="responsive-grid-6">
        <div className="perplexity-card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            {formatCurrency(overview.totalRevenue, { countryCode: selectedCountry, showSymbol: true })}
          </div>
          <div className="text-sm text-gray-400 mt-1">Total Revenue</div>
        </div>
        <div className="perplexity-card p-4 text-center">
          <div className="text-3xl font-bold text-red-400">
            {formatCurrency(overview.totalExpenses, { countryCode: selectedCountry, showSymbol: true })}
          </div>
          <div className="text-sm text-gray-400 mt-1">Total Expenses</div>
        </div>
        <div className="perplexity-card p-4 text-center">
          <div className={`text-3xl font-bold ${overview.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {formatCurrency(overview.netProfit, { countryCode: selectedCountry, showSymbol: true })}
          </div>
          <div className="text-sm text-gray-400 mt-1">Net Profit</div>
        </div>
        <div className="perplexity-card p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{overview.products}</div>
          <div className="text-sm text-gray-400 mt-1">Products</div>
        </div>
        <div className="perplexity-card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{overview.customers}</div>
          <div className="text-sm text-gray-400 mt-1">Customers</div>
        </div>
        <div className="perplexity-card p-4 text-center">
          <div className="text-3xl font-bold text-teal-400">{overview.employees}</div>
          <div className="text-sm text-gray-400 mt-1">Employees</div>
        </div>
      </div>

      <div className="perplexity-card p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <i className="fas fa-file-invoice-dollar text-green-400 mr-2" />
          Financial Reports
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl hover:border-green-500/50 transition-all text-center"
            onClick={() => handleNavigate('pnl')}
          >
            <i className="fas fa-chart-line text-green-400 text-2xl mb-2" />
            <div className="text-white font-medium">Profit &amp; Loss</div>
            <div className="text-xs text-gray-400 mt-1">Income Statement</div>
          </button>
          <button
            type="button"
            className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-all text-center"
            onClick={() => handleNavigate('balance-sheet')}
          >
            <i className="fas fa-balance-scale text-blue-400 text-2xl mb-2" />
            <div className="text-white font-medium">Balance Sheet</div>
            <div className="text-xs text-gray-400 mt-1">Financial Position</div>
          </button>
          <button
            type="button"
            className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition-all text-center"
            onClick={() => handleNavigate('trial-balance')}
          >
            <i className="fas fa-equals text-purple-400 text-2xl mb-2" />
            <div className="text-white font-medium">Trial Balance</div>
            <div className="text-xs text-gray-400 mt-1">Account Balances</div>
          </button>
          <button
            type="button"
            className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl hover:border-yellow-500/50 transition-all text-center"
            onClick={() => handleNavigate('journal')}
          >
            <i className="fas fa-book text-yellow-400 text-2xl mb-2" />
            <div className="text-white font-medium">General Journal</div>
            <div className="text-xs text-gray-400 mt-1">All Transactions</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="perplexity-card p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <i className="fas fa-calendar-alt text-blue-400 mr-2" />
            Monthly Sales Trend
          </h3>
          <div className="space-y-3">
            {recentMonthlySales.length === 0 ? (
              <div className="text-gray-400 text-center py-4">No sales data available.</div>
            ) : (
              recentMonthlySales.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
                  <span className="text-gray-300">{entry.label}</span>
                  <span className="text-white font-bold">
                    {formatCurrency(entry.amount, { countryCode: selectedCountry, showSymbol: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="perplexity-card p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <i className="fas fa-trophy text-yellow-400 mr-2" />
            Top Selling Products
          </h3>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <div className="text-gray-400 text-center py-4">No products sold yet.</div>
            ) : (
              topProducts.map(([name, quantity], index) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-bold">#{index + 1}</span>
                    <span className="text-gray-300">{name}</span>
                  </div>
                  <span className="text-white font-bold">{quantity} units</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="perplexity-card p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <i className="fas fa-star text-purple-400 mr-2" />
          Top Customers by Revenue
        </h3>
        {topCustomers.length === 0 ? (
          <div className="text-gray-400 text-center py-4">No customer revenue recorded yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topCustomers.map(([name, revenue], index) => (
              <div key={name} className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-purple-400 font-bold text-lg">#{index + 1}</span>
                  <i className="fas fa-user-circle text-purple-400 text-xl" />
                </div>
                <div className="text-white font-medium">{name}</div>
                <div className="mt-1 text-lg font-bold text-green-400">
                  {formatCurrency(revenue, { countryCode: selectedCountry, showSymbol: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="perplexity-card p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <i className="fas fa-warehouse text-teal-400 mr-2" />
          Inventory Status
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
            <div className="text-2xl text-green-400 mb-2">OK</div>
            <div className="text-2xl font-bold text-white">{inventoryStatus.inStock}</div>
            <div className="text-sm text-gray-400">In Stock</div>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
            <div className="text-2xl text-yellow-400 mb-2">LOW</div>
            <div className="text-2xl font-bold text-white">{inventoryStatus.low}</div>
            <div className="text-sm text-gray-400">Low Stock</div>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <div className="text-2xl text-red-400 mb-2">OUT</div>
            <div className="text-2xl font-bold text-white">{inventoryStatus.out}</div>
            <div className="text-sm text-gray-400">Out of Stock</div>
          </div>
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-center">
            <div className="text-2xl text-orange-400 mb-2">DMG</div>
            <div className="text-2xl font-bold text-white">{inventoryStatus.damaged}</div>
            <div className="text-sm text-gray-400">Damaged Items</div>
            <div className="text-xs text-orange-400 mt-1">
              Val: {formatCurrency(inventoryStatus.damagedValue, { countryCode: selectedCountry, showSymbol: true })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






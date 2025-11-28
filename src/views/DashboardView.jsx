import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { PieChart } from '@mui/x-charts/PieChart';
import { useAppActions, useAppState, prepareInvoiceForDownload } from '../context/AppContext.jsx';
import { inboxNotifications } from '../utils/ai.js';
import { downloadInvoicePdf } from '../utils/invoicePdf.jsx';
import { buildInvoiceFromSale } from '../utils/invoiceUtils.js';
import { formatCurrency } from '../utils/currency.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge.jsx';

// Number formatter for unit quantities
const unitFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const QUICK_ACTIONS = [
  { id: 'add-sale', icon: 'fas fa-plus', label: 'New Sale', description: 'Multi-product', className: 'perplexity-button', targetView: 'sales', permission: 'sales.create' },
  { id: 'add-expense', icon: 'fas fa-receipt', label: 'Add Expense', description: 'Track costs', className: 'expenses-button', targetView: 'expenses', permission: 'expenses.create' },
  { id: 'add-product', icon: 'fas fa-box', label: 'Add Product', description: 'Expand inventory', className: 'ai-button', targetView: 'products', permission: 'products.manage' },
  { id: 'add-customer', icon: 'fas fa-user-plus', label: 'New Customer', description: 'Grow base', className: 'bot-button', targetView: 'customers', permission: 'customers.create' },
];

function useSalesChart(chartConfig, { glowColor = 'rgba(16, 185, 129, 0.65)' } = {}) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const configRef = useRef(null);
  const tooltipFormatterRef = useRef(null);
  const yTickFormatterRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Store formatter functions in refs to avoid recreating chart
  useEffect(() => {
    tooltipFormatterRef.current = chartConfig?.tooltipFormatter;
    yTickFormatterRef.current = chartConfig?.yTickFormatter;
  }, [chartConfig?.tooltipFormatter, chartConfig?.yTickFormatter]);

  // Extract stable data values
  const labels = useMemo(() =>
    Array.isArray(chartConfig?.labels) ? chartConfig.labels : [],
    [chartConfig?.labels]
  );
  const data = useMemo(() =>
    Array.isArray(chartConfig?.datasets?.[0]?.data) ? chartConfig.datasets[0].data : [],
    [chartConfig?.datasets]
  );
  const borderColor = useMemo(() =>
    chartConfig?.datasets?.[0]?.borderColor ?? '#00d4aa',
    [chartConfig?.datasets]
  );

  // Use a callback ref to detect when canvas is mounted
  const setCanvasRef = useCallback((canvas) => {
    canvasRef.current = canvas;
    setCanvasReady(!!canvas);
  }, []);

  useEffect(() => {
    // Use a small delay to ensure canvas is fully mounted
    const timeoutId = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !chartConfig) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      // Serialize config to check if data actually changed
      const currentConfigKey = JSON.stringify({
        labels,
        data,
        borderColor,
      });

      // Only recreate chart if data actually changed
      if (configRef.current === currentConfigKey && chartInstanceRef.current) {
        return;
      }

      configRef.current = currentConfigKey;

      // Destroy existing chart if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      // Only create chart if we have data
      if (labels.length === 0 || data.length === 0) {
        return;
      }

      const height = canvas.height || canvas.clientHeight || 280;
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

      const datasetConfig = {
        label: chartConfig.datasets?.[0]?.label,
        data,
        backgroundColor: gradient,
        borderColor,
        pointBackgroundColor: '#0f172a',
        pointBorderColor: borderColor,
        pointBorderWidth: 2,
        tension: chartConfig.datasets?.[0]?.tension ?? 0.35,
        fill: chartConfig.datasets?.[0]?.fill ?? true,
        pointRadius: chartConfig.datasets?.[0]?.pointRadius,
        pointHoverRadius: chartConfig.datasets?.[0]?.pointHoverRadius,
      };

      const glowPlugin = {
        id: 'outerGlow',
        beforeDatasetsDraw(chart, args, pluginOptions) {
          const { ctx } = chart;
          ctx.save();
          ctx.shadowBlur = pluginOptions?.blur ?? 20;
          ctx.shadowColor = pluginOptions?.color ?? glowColor;
        },
        afterDatasetsDraw(chart) {
          chart.ctx.restore();
        },
      };

      chartInstanceRef.current = new Chart(context, {
        type: 'line',
        data: {
          labels,
          datasets: [datasetConfig],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 0, // Disable animation to prevent looping
          },
          plugins: {
            legend: { display: false },
            outerGlow: { color: glowColor, blur: 20 },
            tooltip: {
              displayColors: false,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderColor: glowColor,
              borderWidth: 1,
              callbacks: {
                label(context) {
                  const value = context.parsed.y ?? context.parsed ?? 0;
                  return typeof tooltipFormatterRef.current === 'function'
                    ? tooltipFormatterRef.current(value, context)
                    : value;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: '#9ca3af', padding: 10, maxRotation: 0 },
              grid: { color: 'rgba(148, 163, 184, 0.12)' },
              border: { color: 'rgba(148, 163, 184, 0.2)' },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#9ca3af',
                padding: 8,
                callback(value) {
                  return typeof yTickFormatterRef.current === 'function'
                    ? yTickFormatterRef.current(value)
                    : value;
                },
              },
              grid: { color: 'rgba(148, 163, 184, 0.12)' },
              border: { color: 'rgba(148, 163, 184, 0.2)' },
            },
          },
        },
        plugins: [glowPlugin],
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [labels, data, borderColor, glowColor, chartConfig, canvasReady]);

  return {
    salesCanvasRef: setCanvasRef,
  };
}

function scopeDataForUser(state, user) {
  if (user.role === 'admin') {
    return { sales: state.sales, expenses: state.expenses };
  }

  if (user.role === 'manager') {
    const workerIds = state.users.filter((u) => u.role === 'worker').map((u) => u.id);
    const managedIds = new Set([user.id, ...workerIds]);
    return {
      sales: state.sales.filter((sale) => managedIds.has(sale.salesPersonId)),
      expenses: state.expenses.filter((expense) => managedIds.has(expense.createdByUserId ?? expense.addedBy)),
    };
  }

  return {
    sales: state.sales.filter((sale) => sale.salesPersonId === user.id),
    expenses: state.expenses.filter((expense) => (expense.createdByUserId ?? expense.addedBy) === user.id),
  };
}

function buildSalesByMonth(sales) {
  const monthlyTotals = new Map();

  sales.forEach((sale) => {
    if (!sale?.date) return;
    const date = new Date(sale.date);
    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    const previous = monthlyTotals.get(key);

    monthlyTotals.set(key, {
      label,
      total: (previous?.total ?? 0) + (sale.total ?? 0),
    });
  });

  return Array.from(monthlyTotals.values());
}

function buildRecentSales(sales) {
  return [...sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
}

// Helper hook for bar chart
function useBarChart(chartConfig, { glowColor = 'rgba(59, 130, 246, 0.65)', isMobileOptimized = false } = {}) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const configRef = useRef(null);
  const tooltipFormatterRef = useRef(null);
  const yTickFormatterRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Store formatter functions in refs to avoid recreating chart
  useEffect(() => {
    tooltipFormatterRef.current = chartConfig?.tooltipFormatter;
    yTickFormatterRef.current = chartConfig?.yTickFormatter;
  }, [chartConfig?.tooltipFormatter, chartConfig?.yTickFormatter]);

  // Extract stable data values
  const labels = useMemo(() =>
    Array.isArray(chartConfig?.labels) ? chartConfig.labels : [],
    [chartConfig?.labels]
  );
  const data = useMemo(() =>
    Array.isArray(chartConfig?.datasets?.[0]?.data) ? chartConfig.datasets[0].data : [],
    [chartConfig?.datasets]
  );
  const backgroundColor = useMemo(() =>
    chartConfig?.datasets?.[0]?.backgroundColor,
    [chartConfig?.datasets]
  );
  const borderColor = useMemo(() =>
    chartConfig?.datasets?.[0]?.borderColor,
    [chartConfig?.datasets]
  );

  // Use a callback ref to detect when canvas is mounted
  const setCanvasRef = useCallback((canvas) => {
    canvasRef.current = canvas;
    setCanvasReady(!!canvas);
  }, []);

  useEffect(() => {
    // Use a small delay to ensure canvas is fully mounted
    const timeoutId = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !chartConfig) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      // Serialize config to check if data actually changed
      const currentConfigKey = JSON.stringify({
        labels,
        data,
        backgroundColor,
        borderColor,
        isMobileOptimized,
      });

      // Only recreate chart if data actually changed
      if (configRef.current === currentConfigKey && chartInstanceRef.current) {
        return;
      }

      configRef.current = currentConfigKey;

      // Destroy existing chart if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      // Only create chart if we have data
      if (labels.length === 0 || data.length === 0) {
        return;
      }

      // Calculate bar percentage based on mobile optimization
      const barPercentage = isMobileOptimized ? 0.5 : 0.8; // Slimmer bars for mobile (50% vs 80%)
      const categoryPercentage = isMobileOptimized ? 0.7 : 0.9; // Tighter spacing for mobile

      chartInstanceRef.current = new Chart(context, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: chartConfig.datasets?.[0]?.label,
            data,
            backgroundColor,
            borderColor,
            borderWidth: chartConfig.datasets?.[0]?.borderWidth ?? 2,
            barThickness: isMobileOptimized ? 'flex' : undefined,
            maxBarThickness: isMobileOptimized ? 40 : undefined,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'x',
          animation: {
            duration: 0, // Disable animation to prevent looping
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              displayColors: false,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderColor: glowColor,
              borderWidth: 1,
              padding: 12,
              titleFont: { size: 12 },
              bodyFont: { size: 11 },
              callbacks: {
                label(context) {
                  const value = context.parsed.y ?? context.parsed ?? 0;
                  return typeof tooltipFormatterRef.current === 'function'
                    ? tooltipFormatterRef.current(value, context)
                    : value;
                },
              },
            },
          },
          scales: {
            x: {
              barPercentage,
              categoryPercentage,
              ticks: {
                color: '#9ca3af',
                padding: isMobileOptimized ? 5 : 10,
                font: {
                  size: isMobileOptimized ? 10 : 12,
                },
                maxRotation: isMobileOptimized ? 45 : 0,
                minRotation: isMobileOptimized ? 45 : 0,
              },
              grid: {
                color: 'rgba(148, 163, 184, 0.12)',
                display: false, // Hide grid lines for cleaner mobile look
              },
              border: { color: 'rgba(148, 163, 184, 0.2)' },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#9ca3af',
                padding: isMobileOptimized ? 5 : 8,
                font: {
                  size: isMobileOptimized ? 10 : 12,
                },
                callback(value) {
                  return typeof yTickFormatterRef.current === 'function'
                    ? yTickFormatterRef.current(value)
                    : value;
                },
              },
              grid: {
                color: 'rgba(148, 163, 184, 0.12)',
                drawBorder: false,
              },
              border: { color: 'rgba(148, 163, 184, 0.2)' },
            },
          },
        },
      });

    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [labels, data, backgroundColor, borderColor, glowColor, isMobileOptimized, chartConfig, canvasReady]);

  return { chartCanvasRef: setCanvasRef };
}

// Helper hook for pie chart
// Salesperson Dashboard Component
function SalespersonDashboard() {
  const state = useAppState();
  const actions = useAppActions();
  const currentUser = state.currentUser;
  const {
    sales = [],
    customers = [],
    tasks = [],
    selectedCountry,
  } = state;

  const [expandedCharts, setExpandedCharts] = useState({
    revenueTrend: false,
    customerRevenue: false,
  });

  const formatValue = useCallback((value) => formatCurrency(value, { countryCode: selectedCountry }), [selectedCountry]);

  const toggleChart = (chartName) => {
    setExpandedCharts((prev) => ({
      ...prev,
      [chartName]: !prev[chartName],
    }));
  };

  // Create stable formatter functions using useCallback
  const tooltipFormatter = useCallback((value) => formatValue(value), [formatValue]);
  const yTickFormatter = useCallback((value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  }, []);

  // Filter sales made by the current salesperson
  const mySales = useMemo(
    () => sales.filter((sale) => sale.salesPersonId === currentUser.id),
    [sales, currentUser.id],
  );

  // Calculate current month sales
  const currentMonthSales = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return mySales.filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
  }, [mySales]);

  const currentMonthRevenue = useMemo(
    () => currentMonthSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0),
    [currentMonthSales],
  );

  // Hardcoded monthly goal
  const monthlyGoal = 25000;
  const progressPercentage = Math.min((currentMonthRevenue / monthlyGoal) * 100, 100);

  // Calculate commission
  const currentCommission = currentUser.commission ?? 0;

  // Get top customers
  const topCustomers = useMemo(() => {
    const customerRevenue = new Map();

    mySales.forEach((sale) => {
      const customerId = sale.customerId;
      const current = customerRevenue.get(customerId) || 0;
      customerRevenue.set(customerId, current + (sale.total ?? 0));
    });

    return Array.from(customerRevenue.entries())
      .map(([customerId, revenue]) => {
        const customer = customers.find((c) => c.id === customerId);
        return {
          id: customerId,
          name: customer?.name ?? 'Unknown Customer',
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [mySales, customers]);

  // Get recent sales
  const recentSales = useMemo(
    () => [...mySales]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5),
    [mySales],
  );

  // Get my tasks (where I'm a participant)
  const myTasks = useMemo(
    () => tasks
      .filter((task) => task.participants?.includes(currentUser.id))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5),
    [tasks, currentUser.id],
  );

  // Combine recent activity (sales and tasks)
  const recentActivity = useMemo(() => {
    const activities = [];

    // Add recent sales
    recentSales.forEach((sale) => {
      const customer = customers.find((c) => c.id === sale.customerId);
      activities.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        date: new Date(sale.date),
        description: `New Sale to ${customer?.name ?? 'Customer'}`,
        amount: sale.total,
        code: `SALE-C-${sale.id}`,
      });
    });

    // Add recent tasks
    myTasks.forEach((task) => {
      activities.push({
        id: `task-${task.id}`,
        type: 'task',
        date: new Date(task.createdAt || 0),
        description: task.status === 'completed'
          ? `Task Completed: ${task.title}`
          : `Task Assigned: ${task.title}`,
        status: task.status,
        code: `TASK-${task.status === 'completed' ? 'F' : 'C'}-${task.id}`,
      });
    });

    return activities
      .sort((a, b) => b.date - a.date)
      .slice(0, 8);
  }, [recentSales, myTasks, customers]);

  // Chart data: Monthly revenue trend
  const monthlyRevenueData = useMemo(() => {
    const monthlyMap = new Map();

    mySales.forEach((sale) => {
      if (!sale?.date) return;
      const date = new Date(sale.date);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const current = monthlyMap.get(key) || { label, total: 0 };
      monthlyMap.set(key, { ...current, total: current.total + (sale.total ?? 0) });
    });

    const sorted = Array.from(monthlyMap.values()).sort((a, b) => {
      return new Date(a.label) - new Date(b.label);
    });

    return {
      labels: sorted.map((m) => m.label),
      data: sorted.map((m) => m.total),
    };
  }, [mySales]);

  // Chart data: Top customers revenue
  const customerRevenueChartData = useMemo(() => {
    const top5 = topCustomers.slice(0, 5);
    return {
      labels: top5.map((c) => {
        const name = c.name.length > 12 ? c.name.substring(0, 12) + '...' : c.name;
        return name;
      }),
      data: top5.map((c) => c.revenue),
    };
  }, [topCustomers]);

  const revenueChartConfig = useMemo(() => ({
    labels: monthlyRevenueData.labels,
    datasets: [{
      label: 'Monthly Revenue',
      data: monthlyRevenueData.data,
      borderColor: '#00d4aa',
      backgroundColor: 'rgba(0, 212, 170, 0.2)',
      tension: 0.35,
      fill: true,
    }],
    tooltipFormatter,
    yTickFormatter,
  }), [
    monthlyRevenueData.labels?.join(','),
    monthlyRevenueData.data?.join(','),
    tooltipFormatter,
    yTickFormatter,
  ]);

  const customerChartConfig = useMemo(() => ({
    labels: customerRevenueChartData.labels,
    datasets: [{
      label: 'Revenue',
      data: customerRevenueChartData.data,
      backgroundColor: 'rgba(250, 204, 21, 0.6)',
      borderColor: '#facc15',
      borderWidth: 2,
    }],
    tooltipFormatter,
    yTickFormatter,
  }), [
    customerRevenueChartData.labels?.join(','),
    customerRevenueChartData.data?.join(','),
    tooltipFormatter,
    yTickFormatter,
  ]);

  const { salesCanvasRef: revenueChartRef } = useSalesChart(revenueChartConfig, { glowColor: 'rgba(16, 185, 129, 0.65)' });
  const { chartCanvasRef: customerChartRef } = useBarChart(customerChartConfig, {
    glowColor: 'rgba(250, 204, 21, 0.65)',
    isMobileOptimized: true, // Enable mobile optimization for slimmer bars
  });

  const displayName = currentUser.name ?? 'Salesperson';

  return (
    <div className="space-y-6 fade-in max-w-2xl mx-auto px-4">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-white">My Dashboard</h2>
        <p className="text-gray-400">Welcome back, {displayName}! 🎯</p>
      </div>

      {/* My Sales Target Panel */}
      <Card className="slide-up border-gray-700/70 bg-gradient-to-br from-teal-900/20 to-blue-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <i className="fas fa-bullseye text-teal-400" />
            My Sales Target
          </CardTitle>
          <CardDescription>Monthly goal progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400">Current Progress</p>
                <p className="text-3xl font-bold text-white">{formatValue(currentMonthRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Goal</p>
                <p className="text-2xl font-bold text-teal-400">{formatValue(monthlyGoal)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="text-teal-400 font-semibold">{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-500 relative"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {monthlyGoal - currentMonthRevenue > 0
                  ? `${formatValue(monthlyGoal - currentMonthRevenue)} remaining to reach goal`
                  : '🎉 Goal achieved! Keep going!'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Commission Panel */}
      <Card className="slide-up border-gray-700/70 bg-gradient-to-br from-green-900/20 to-emerald-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <i className="fas fa-coins text-green-400" />
            Live Commission
            <div className="ml-auto flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">LIVE</span>
            </div>
          </CardTitle>
          <CardDescription>Your earnings this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">
              {formatValue(currentCommission)}
            </p>
            <p className="text-sm text-gray-400">Earned this period</p>
            {currentCommission > 0 && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <p className="text-green-400 text-sm">
                  <i className="fas fa-check-circle mr-2" />
                  Great work! Keep it up!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Top Customers Panel */}
      <Card className="slide-up border-gray-700/70 bg-gray-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <i className="fas fa-star text-yellow-400" />
            My Top Customers
          </CardTitle>
          <CardDescription>Your best customers by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-600/30 hover:border-yellow-500/50 transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                      ${index === 1 ? 'bg-gray-400/20 text-gray-400' : ''}
                      ${index === 2 ? 'bg-orange-500/20 text-orange-400' : ''}
                      ${index > 2 ? 'bg-blue-500/20 text-blue-400' : ''}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{customer.name}</p>
                      <p className="text-gray-400 text-xs">
                        {mySales.filter((s) => s.customerId === customer.id).length} sales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatValue(customer.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-users text-3xl mb-3 opacity-50" />
              <p>No customer data yet</p>
              <p className="text-sm mt-2">Start making sales to see your top customers!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Recent Activity Panel */}
      <Card className="slide-up border-gray-700/70 bg-gray-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <i className="fas fa-history text-blue-400" />
            My Recent Activity
          </CardTitle>
          <CardDescription>Your latest sales and tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-800/50 rounded-xl border border-gray-600/30 hover:border-blue-500/50 transition-all duration-300"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${activity.type === 'sale' ? 'bg-gradient-to-r from-teal-500 to-blue-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}
                    `}>
                      <i className={`fas ${activity.type === 'sale' ? 'fa-shopping-bag' : 'fa-tasks'} text-white text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm break-words">{activity.description}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {activity.date.toLocaleDateString()} {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {activity.code && (
                        <Badge variant="outline" className="mt-1 text-xs font-mono max-w-full truncate">
                          {activity.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 sm:text-right">
                    {activity.type === 'sale' && activity.amount != null ? (
                      <p className="text-white font-bold text-sm whitespace-nowrap">{formatValue(activity.amount)}</p>
                    ) : (
                      <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-clock text-3xl mb-3 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-2">Your sales and tasks will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expandable Revenue Trend Chart */}
      {monthlyRevenueData.labels.length > 0 && (
        <Card className="slide-up border-gray-700/70 bg-gray-900/40">
          <CardHeader
            className="pb-3 cursor-pointer hover:bg-gray-800/30 rounded-t-2xl transition-colors"
            onClick={() => toggleChart('revenueTrend')}
          >
            <CardTitle className="text-white text-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-chart-line text-teal-400" />
                <span>Revenue Trend</span>
              </div>
              <i className={`fas fa-chevron-${expandedCharts.revenueTrend ? 'up' : 'down'} text-gray-400 transition-transform`} />
            </CardTitle>
            <CardDescription>Monthly sales performance over time</CardDescription>
          </CardHeader>
          {expandedCharts.revenueTrend && (
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <canvas ref={revenueChartRef} className="h-full w-full" />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Expandable Customer Revenue Chart */}
      {customerRevenueChartData.labels.length > 0 && (
        <Card className="slide-up border-gray-700/70 bg-gray-900/40">
          <CardHeader
            className="pb-3 cursor-pointer hover:bg-gray-800/30 rounded-t-2xl transition-colors"
            onClick={() => toggleChart('customerRevenue')}
          >
            <CardTitle className="text-white text-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-chart-bar text-yellow-400" />
                <span>Top Customers Revenue</span>
              </div>
              <i className={`fas fa-chevron-${expandedCharts.customerRevenue ? 'up' : 'down'} text-gray-400 transition-transform`} />
            </CardTitle>
            <CardDescription>Revenue breakdown by top customers</CardDescription>
          </CardHeader>
          {expandedCharts.customerRevenue && (
            <CardContent className="pt-0">
              <div className="h-[240px] sm:h-[280px]">
                <canvas ref={customerChartRef} className="h-full w-full" />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Quick Action Button */}
      <div className="flex justify-center pb-4">
        <button
          type="button"
          className="perplexity-button px-6 py-3 rounded-xl text-lg font-semibold hover:scale-105 transition-all duration-300"
          onClick={() => actions.setView('sales')}
        >
          <i className="fas fa-plus mr-2" />
          Record New Sale
        </button>
      </div>
    </div>
  );
}

// Manager Dashboard Component
function ManagerDashboard() {
  const state = useAppState();
  const actions = useAppActions();
  const currentUser = state.currentUser;
  const {
    sales = [],
    users = [],
    accessibleUserIds = [],
    messages = [],
    logs = [],
    selectedCountry,
    stockBatches = [],
    products = [],
    branches = [],
    nearExpiryDays = 30,
  } = state;

  const [expandedCharts, setExpandedCharts] = useState({
    teamPerformance: false,
    leaderboard: false,
  });

  const formatValue = useCallback((value) => formatCurrency(value, { countryCode: selectedCountry }), [selectedCountry]);

  const toggleChart = (chartName) => {
    setExpandedCharts((prev) => ({
      ...prev,
      [chartName]: !prev[chartName],
    }));
  };

  // Create stable formatter functions using useCallback
  const tooltipFormatter = useCallback((value) => formatValue(value), [formatValue]);
  const yTickFormatter = useCallback((value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  }, []);

  const leaderboardBadgeGradients = [
    'from-yellow-400/80 to-orange-500/60 text-yellow-50 border-yellow-400/40',
    'from-gray-300/70 to-gray-600/40 text-gray-50 border-gray-400/40',
    'from-orange-400/70 to-pink-500/50 text-orange-50 border-orange-400/40',
  ];

  const branchLookup = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => {
      if (branch?.id != null) {
        map.set(branch.id, branch);
      }
    });
    return map;
  }, [branches]);

  const productLookup = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      if (product?.id != null) {
        map.set(product.id, product);
      }
    });
    return map;
  }, [products]);

  const stockHealth = useMemo(() => {
    const totals = { nearExpiry: 0, expired: 0, damaged: 0 };
    const nearExpiry = [];
    const expired = [];
    const damaged = [];
    const batches = Array.isArray(stockBatches) ? stockBatches : [];
    const createEntry = (batch) => {
      const product = productLookup.get(batch.productId);
      const branch = branchLookup.get(batch.vanId);
      return {
        id: batch.id,
        productId: batch.productId,
        productName: product?.name ?? `Product #${batch.productId}`,
        vanId: batch.vanId,
        vanName: branch?.name ?? (batch.vanId ? `Van ${batch.vanId}` : 'Unassigned'),
        expiryDate: batch.expiryDate,
        quantity: Number(batch.quantity) || 0,
        status: batch.status ?? 'active',
      };
    };
    batches.forEach((batch) => {
      if (!batch) return;
      const entry = createEntry(batch);
      if (!entry.quantity) {
        return;
      }
      const status = (entry.status ?? 'active').toLowerCase();
      if (status === 'near_expiry') {
        nearExpiry.push(entry);
        totals.nearExpiry += entry.quantity;
      } else if (status === 'expired') {
        expired.push(entry);
        totals.expired += entry.quantity;
      } else if (status === 'damaged' || status === 'written_off') {
        damaged.push(entry);
        totals.damaged += entry.quantity;
      }
    });
    const sortByDate = (list) => list
      .slice()
      .sort((a, b) => {
        const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
        if (aTime === bTime) {
          return a.productName.localeCompare(b.productName);
        }
        return aTime - bTime;
      });
    return {
      totals,
      nearExpiry: sortByDate(nearExpiry),
      expired: sortByDate(expired),
      damaged: damaged.slice().sort((a, b) => a.productName.localeCompare(b.productName)),
    };
  }, [stockBatches, branchLookup, productLookup]);

  const formatDateShort = useCallback((value) => {
    if (!value) return 'No expiry';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'No expiry';
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, []);

  // Get current month date range
  const currentMonthSales = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
  }, [sales]);

  // Filter sales for accessible users (team members)
  const teamSales = useMemo(
    () => currentMonthSales.filter((sale) => accessibleUserIds.includes(sale.salesPersonId)),
    [currentMonthSales, accessibleUserIds],
  );

  const totalTeamRevenue = useMemo(
    () => teamSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0),
    [teamSales],
  );

  // Sales Leaderboard: Team members ordered by revenue contribution
  const salesLeaderboard = useMemo(() => {
    const revenueByUser = new Map();
    const salesCountByUser = new Map();

    teamSales.forEach((sale) => {
      const userId = sale.salesPersonId;
      if (!userId) {
        return;
      }
      revenueByUser.set(userId, (revenueByUser.get(userId) || 0) + (sale.total ?? 0));
      salesCountByUser.set(userId, (salesCountByUser.get(userId) || 0) + 1);
    });

    return accessibleUserIds
      .map((userId) => {
        const user = users.find((u) => u.id === userId);
        return {
          id: userId,
          name: user?.name ?? 'Unknown User',
          role: user?.role ?? 'worker',
          revenue: revenueByUser.get(userId) ?? 0,
          salesCount: salesCountByUser.get(userId) ?? 0,
        };
      })
      .sort((a, b) => {
        if (b.revenue === a.revenue) {
          if (b.salesCount === a.salesCount) {
            return (a.name ?? '').localeCompare(b.name ?? '');
          }
          return b.salesCount - a.salesCount;
        }
        return b.revenue - a.revenue;
      });
  }, [accessibleUserIds, teamSales, users]);

  const leaderboardInsights = useMemo(() => {
    if (salesLeaderboard.length === 0) {
      return [];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const todayTotals = new Map();
    const yesterdayTotals = new Map();

    teamSales.forEach((sale) => {
      if (!sale?.date) return;
      const saleDate = new Date(sale.date);
      if (Number.isNaN(saleDate.getTime())) return;
      const userId = sale.salesPersonId;
      if (!userId) return;

      if (saleDate >= todayStart && saleDate < tomorrowStart) {
        todayTotals.set(userId, (todayTotals.get(userId) || 0) + (sale.total ?? 0));
      } else if (saleDate >= yesterdayStart && saleDate < todayStart) {
        yesterdayTotals.set(userId, (yesterdayTotals.get(userId) || 0) + (sale.total ?? 0));
      }
    });

    return salesLeaderboard.map((person, index) => {
      const todayRevenue = todayTotals.get(person.id) ?? 0;
      const yesterdayRevenue = yesterdayTotals.get(person.id) ?? 0;
      const delta = todayRevenue - yesterdayRevenue;
      const changePercent = yesterdayRevenue > 0
        ? (delta / yesterdayRevenue) * 100
        : null;
      const contribution = totalTeamRevenue > 0
        ? (person.revenue / totalTeamRevenue) * 100
        : 0;

      return {
        ...person,
        rank: index + 1,
        todayRevenue,
        yesterdayRevenue,
        delta,
        changePercent,
        contribution,
      };
    });
  }, [salesLeaderboard, teamSales, totalTeamRevenue]);

  const topSalesLeaderboard = useMemo(
    () => salesLeaderboard.slice(0, 5),
    [salesLeaderboard],
  );

  // Pending messages that need manager attention
  const pendingMessages = useMemo(() => {
    return messages.filter((message) => {
      const isRecipient = message.recipientId === currentUser.id || message.to === currentUser.id;
      const status = message.stockStatus ?? message.status ?? null;
      const needsReview = status === 'pending_review' || status === 'issue_reported';
      return isRecipient && needsReview;
    });
  }, [messages, currentUser.id]);

  // Recent team activity from logs
  const teamActivity = useMemo(() => {
    const accessibleIdSet = new Set(accessibleUserIds);
    return logs
      .filter((log) => accessibleIdSet.has(log.actorId))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [logs, accessibleUserIds]);

  // Chart data: Team performance over time
  const teamPerformanceChartData = useMemo(() => {
    const monthlyMap = new Map();

    teamSales.forEach((sale) => {
      if (!sale?.date) return;
      const date = new Date(sale.date);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const current = monthlyMap.get(key) || { label, total: 0 };
      monthlyMap.set(key, { ...current, total: current.total + (sale.total ?? 0) });
    });

    const sorted = Array.from(monthlyMap.values()).sort((a, b) => {
      return new Date(a.label) - new Date(b.label);
    });

    return {
      labels: sorted.map((m) => m.label),
      data: sorted.map((m) => m.total),
    };
  }, [teamSales]);

  const teamPerformanceChartConfig = useMemo(() => ({
    labels: teamPerformanceChartData.labels,
    datasets: [{
      label: 'Team Revenue',
      data: teamPerformanceChartData.data,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      tension: 0.35,
      fill: true,
    }],
    tooltipFormatter,
    yTickFormatter,
  }), [
    teamPerformanceChartData.labels?.join(','),
    teamPerformanceChartData.data?.join(','),
    tooltipFormatter,
    yTickFormatter,
  ]);

  const { salesCanvasRef: teamPerformanceChartRef } = useSalesChart(teamPerformanceChartConfig, { glowColor: 'rgba(59, 130, 246, 0.65)' });

  // Helper function to render log message
  const renderLogMessage = (message) => {
    if (!Array.isArray(message)) {
      return String(message ?? 'Action recorded.');
    }
    return message.map((segment, index) => (
      <span
        key={index}
        className={segment.type === 'highlight' ? 'text-teal-400 font-semibold' : ''}
      >
        {segment?.value ?? ''}
      </span>
    ));
  };

  const displayName = currentUser.name ?? 'Manager';
  const topNearExpiry = stockHealth.nearExpiry.slice(0, 4);
  const topExpired = stockHealth.expired.slice(0, 4);
  const topDamaged = stockHealth.damaged.slice(0, 4);

  const renderStockEntries = (entries, { showExpiry = true, emptyLabel }) => {
    if (!entries.length) {
      return <p className="text-sm text-gray-400">{emptyLabel}</p>;
    }
    return (
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-xl border border-gray-700/70 bg-gray-900/50 px-3 py-2"
          >
            <div className="min-w-0 pr-3">
              <p className="text-sm font-semibold text-white truncate">{entry.productName}</p>
              <p className="text-xs text-gray-400 truncate">{entry.vanName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{unitFormatter.format(entry.quantity)}</p>
              {showExpiry ? (
                <p className="text-xs text-gray-500">
                  {entry.expiryDate ? `Exp ${formatDateShort(entry.expiryDate)}` : 'No expiry'}
                </p>
              ) : (
                <p className="text-xs text-gray-500 capitalize">{entry.status.replace('_', ' ')}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-white">Manager Dashboard</h2>
        <p className="text-gray-400">Welcome back, {displayName}! 📊</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-300/80">
                Near Expiry (≤ {nearExpiryDays} days)
              </p>
              <p className="text-2xl font-semibold text-white mt-1">
                {unitFormatter.format(stockHealth.totals.nearExpiry ?? 0)}
              </p>
              <p className="text-xs text-amber-200/90">
                {stockHealth.nearExpiry.length} batch{stockHealth.nearExpiry.length === 1 ? '' : 'es'}
              </p>
            </div>
            <span className="rounded-full bg-amber-400/20 text-amber-200 p-3">
              <i className="fas fa-hourglass-half" />
            </span>
          </div>
          <div className="mt-4">
            {renderStockEntries(topNearExpiry, {
              showExpiry: true,
              emptyLabel: 'No stock approaching expiry.',
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-red-300/80">Expired Stock</p>
              <p className="text-2xl font-semibold text-white mt-1">
                {unitFormatter.format(stockHealth.totals.expired ?? 0)}
              </p>
              <p className="text-xs text-red-200/90">Awaiting write-off</p>
            </div>
            <span className="rounded-full bg-red-400/20 text-red-200 p-3">
              <i className="fas fa-skull-crossbones" />
            </span>
          </div>
          <div className="mt-4">
            {renderStockEntries(topExpired, {
              showExpiry: true,
              emptyLabel: 'All batches are still within shelf life.',
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-rose-300/80">Damaged / Written-off</p>
              <p className="text-2xl font-semibold text-white mt-1">
                {unitFormatter.format(stockHealth.totals.damaged ?? 0)}
              </p>
              <p className="text-xs text-rose-200/90">Requires manager review</p>
            </div>
            <span className="rounded-full bg-rose-400/20 text-rose-200 p-3">
              <i className="fas fa-band-aid" />
            </span>
          </div>
          <div className="mt-4">
            {renderStockEntries(topDamaged, {
              showExpiry: false,
              emptyLabel: 'No damaged stock reported.',
            })}
          </div>
        </div>
      </div>

      {/* Team Performance Panel */}
      <Card className="slide-up border-gray-700/70 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <i className="fas fa-chart-line text-blue-400" />
            Team Performance
          </CardTitle>
          <CardDescription>Your team's sales performance this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Total Team Revenue */}
            <div className="text-center p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
              <p className="text-sm text-gray-400 mb-2">Total Team Revenue (This Month)</p>
              <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {formatValue(totalTeamRevenue)}
              </p>
              <p className="text-xs text-gray-400 mt-2">{teamSales.length} sales this month</p>
            </div>

            {/* Sales Leaderboard */}
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <i className="fas fa-trophy text-yellow-400" />
                Sales Leaderboard
              </h4>
              {topSalesLeaderboard.length > 0 ? (
                <div className="space-y-3">
                  {topSalesLeaderboard.map((person, index) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-600/30 hover:border-blue-500/50 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                          ${index === 1 ? 'bg-gray-400/20 text-gray-400' : ''}
                          ${index === 2 ? 'bg-orange-500/20 text-orange-400' : ''}
                          ${index > 2 ? 'bg-blue-500/20 text-blue-400' : ''}
                        `}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium">{person.name}</p>
                          <p className="text-gray-400 text-xs">{person.salesCount} sales</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{formatValue(person.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <i className="fas fa-chart-bar text-3xl mb-3 opacity-50" />
                  <p>No sales data yet</p>
                  <p className="text-sm mt-2">Sales will appear here once your team starts selling</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Needs Action Panel */}
      <Card className="slide-up border-gray-700/70 bg-gradient-to-br from-orange-900/20 to-red-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <i className="fas fa-exclamation-circle text-orange-400" />
            Needs Action
            {pendingMessages.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingMessages.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Tasks and requests requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingMessages.length > 0 ? (
            <div className="space-y-3">
              {pendingMessages.map((message) => {
                const sender = users.find((u) => u.id === (message.senderId ?? message.from));
                const status = message.stockStatus ?? message.status ?? 'pending';
                const isStockRequest = message.conversationType === 'stock' || message.stockDetails;

                return (
                  <div
                    key={message.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-800/50 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300"
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className={`fas ${isStockRequest ? 'fa-boxes' : 'fa-envelope'} text-white text-sm`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm break-words">
                          {message.subject ?? (isStockRequest ? 'Stock Request' : 'Message')}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          From: {sender?.name ?? 'Team Member'}
                        </p>
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="perplexity-button px-4 py-2 rounded-lg text-sm hover:scale-105 transition-all flex-shrink-0 self-start sm:self-auto"
                      onClick={() => actions.setView('inbox')}
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-check-circle text-3xl mb-3 opacity-50 text-green-400" />
              <p className="text-green-400">All caught up!</p>
              <p className="text-sm mt-2">No pending items need your attention</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Activity Panel */}
      <Card className="slide-up border-gray-700/70 bg-gray-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <i className="fas fa-history text-teal-400" />
            Recent Team Activity
          </CardTitle>
          <CardDescription>Latest actions from your team members</CardDescription>
        </CardHeader>
        <CardContent>
          {teamActivity.length > 0 ? (
            <div className="space-y-3">
              {teamActivity.map((log) => {
                const timestamp = new Date(log.timestamp);
                const timeAgo = (() => {
                  const now = Date.now();
                  const diffMs = now - timestamp.getTime();
                  const diffMinutes = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const diffDays = Math.floor(diffMs / 86400000);

                  if (diffMinutes < 1) return 'Just now';
                  if (diffMinutes < 60) return `${diffMinutes}m ago`;
                  if (diffHours < 24) return `${diffHours}h ago`;
                  if (diffDays < 7) return `${diffDays}d ago`;
                  return timestamp.toLocaleDateString();
                })();

                return (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 p-3 bg-gray-800/50 rounded-xl border border-gray-600/30 hover:border-teal-500/50 transition-all duration-300"
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <i className="fas fa-user text-white text-xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{log.actorName}</p>
                        <p className="text-gray-300 text-sm break-words">
                          {renderLogMessage(log.message)}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">{timeAgo}</p>
                      </div>
                    </div>
                    {log.code && (
                      <Badge variant="outline" className="text-xs font-mono max-w-full truncate sm:ml-2 sm:flex-shrink-0 self-start sm:self-auto">
                        {log.code}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-clock text-3xl mb-3 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-2">Team activity will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expandable Team Performance Chart */}
      {teamPerformanceChartData.labels.length > 0 && (
        <Card className="slide-up border-gray-700/70 bg-gray-900/40">
          <CardHeader
            className="pb-3 cursor-pointer hover:bg-gray-800/30 rounded-t-2xl transition-colors"
            onClick={() => toggleChart('teamPerformance')}
          >
            <CardTitle className="text-white text-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-chart-line text-blue-400" />
                <span>Team Performance Trend</span>
              </div>
              <i className={`fas fa-chevron-${expandedCharts.teamPerformance ? 'up' : 'down'} text-gray-400 transition-transform`} />
            </CardTitle>
            <CardDescription>Monthly team revenue over time</CardDescription>
          </CardHeader>
          {expandedCharts.teamPerformance && (
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <canvas ref={teamPerformanceChartRef} className="h-full w-full" />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Expandable Leaderboard */}
      {salesLeaderboard.length > 0 && (
        <Card className="slide-up border-gray-700/70 bg-gray-900/40">
          <CardHeader
            className="pb-3 cursor-pointer hover:bg-gray-800/30 rounded-t-2xl transition-colors"
            onClick={() => toggleChart('leaderboard')}
          >
            <CardTitle className="text-white text-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-ranking-star text-emerald-400" />
                <span>Sales Leaderboard</span>
              </div>
              <i className={`fas fa-chevron-${expandedCharts.leaderboard ? 'up' : 'down'} text-gray-400 transition-transform`} />
            </CardTitle>
            <CardDescription>Contribution split with day-over-day momentum</CardDescription>
          </CardHeader>
          {expandedCharts.leaderboard && (
            <CardContent className="pt-0">
              {leaderboardInsights.length > 0 ? (
                <div className="space-y-4">
                  {leaderboardInsights.map((person) => {
                    const badgeClass = leaderboardBadgeGradients[person.rank - 1] ?? 'from-blue-500/60 to-purple-500/40 text-blue-50 border-blue-400/30';
                    const contributionWidth = Math.min(Math.max(person.contribution, 0), 100);
                    const trendIcon = person.delta > 0 ? 'fa-arrow-up' : person.delta < 0 ? 'fa-arrow-down' : 'fa-minus';
                    const trendClass = person.delta > 0 ? 'text-emerald-400' : person.delta < 0 ? 'text-red-400' : 'text-gray-400';
                    const trendLabel = person.changePercent != null
                      ? `${person.changePercent >= 0 ? '+' : '-'}${Math.abs(person.changePercent).toFixed(1)}% vs yesterday`
                      : person.todayRevenue > 0
                        ? 'New activity today'
                        : 'No movement yet';

                    return (
                      <div
                        key={person.id}
                        className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-4 shadow-lg shadow-black/20"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                          <div
                            className={`h-12 w-12 rounded-2xl border bg-gradient-to-br font-bold text-lg flex items-center justify-center shadow-inner shadow-black/10 ${badgeClass}`}
                          >
                            #{person.rank}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-white font-semibold truncate">{person.name}</p>
                                <p className="text-xs uppercase text-gray-400 tracking-wide">{person.role ?? 'Team Member'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">MTD</p>
                                <p className="text-white font-bold text-lg">{formatValue(person.revenue)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{person.salesCount} sales</span>
                              <span>{person.contribution.toFixed(1)}% of team</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-800/70 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500"
                                style={{ width: `${contributionWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-400">
                            <span>Today {formatValue(person.todayRevenue)}</span>
                            <span className="text-gray-500">Yesterday {formatValue(person.yesterdayRevenue)}</span>
                          </div>
                          <div className={`flex items-center gap-1 font-semibold ${trendClass}`}>
                            <i className={`fas ${trendIcon}`} />
                            <span>{trendLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-users mb-3 text-3xl opacity-50" />
                  <p>No leaderboard data yet</p>
                  <p className="text-sm mt-1">Once your team logs sales, contributions will appear here.</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="perplexity-button p-4 rounded-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center gap-2"
          onClick={() => actions.setView('inbox')}
        >
          <i className="fas fa-inbox text-xl block" />
          <div className="font-medium block">Inbox</div>
          <div className="text-xs opacity-80 block">Check messages</div>
        </button>
        <button
          type="button"
          className="ai-button p-4 rounded-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center gap-2"
          onClick={() => actions.setView('tasks')}
        >
          <i className="fas fa-tasks text-xl block" />
          <div className="font-medium block">Tasks</div>
          <div className="text-xs opacity-80 block">Manage goals</div>
        </button>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const state = useAppState();
  const actions = useAppActions();
  const currentUser = state.currentUser;
  const [notificationIndex, setNotificationIndex] = useState(0);
  const [notificationCollapsed, setNotificationCollapsed] = useState(false);
  const {
    sales = [],
    invoices = [],
    customers = [],
    products = [],
    users = [],
    selectedCountry,
    companyName,
    hasFeaturePermission,
    invoiceTemplates = {},
    serverUrl,
    invoiceShareBaseUrl,
    supervisionLinks = [],
  } = state;
  const invoiceContext = useMemo(
    () => ({
      companyName,
      currentUser,
      users,
      invoiceTemplates,
      serverUrl,
      invoiceShareBaseUrl,
      supervisionLinks,
    }),
    [companyName, currentUser, users, invoiceTemplates, serverUrl, invoiceShareBaseUrl, supervisionLinks],
  );
  const rotatingNotification = inboxNotifications?.[notificationIndex % (inboxNotifications.length || 1)] ?? null;

  useEffect(() => {
    if (!Array.isArray(inboxNotifications) || inboxNotifications.length === 0) {
      return undefined;
    }
    const active = inboxNotifications[notificationIndex % inboxNotifications.length];
    const timeout = active?.duration ?? 5000;
    const timer = setTimeout(() => {
      setNotificationIndex((prev) => (prev + 1) % inboxNotifications.length);
    }, timeout);
    return () => clearTimeout(timer);
  }, [notificationIndex]);

  const handleToggleNotificationBar = () => {
    setNotificationCollapsed((prev) => !prev);
  };

  if (!currentUser) {
    return null;
  }

  // Role-based dashboard rendering
  const userRole = currentUser.role ?? 'guest';

  if (userRole === 'worker') {
    return <SalespersonDashboard />;
  }

  if (userRole === 'manager') {
    return <ManagerDashboard />;
  }

  // Admin sees the traditional dashboard
  const { sales: scopedSales, expenses: scopedExpenses } = useMemo(
    () => scopeDataForUser(state, currentUser),
    [state, currentUser],
  );

  const totalRevenue = useMemo(
    () => scopedSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0),
    [scopedSales],
  );
  const totalExpenses = useMemo(
    () => scopedExpenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0),
    [scopedExpenses],
  );
  const netProfit = totalRevenue - totalExpenses;

  const lowStockProducts = useMemo(
    () => state.products.filter((product) => product.stock <= (state.lowStockThreshold ?? 10)),
    [state.products, state.lowStockThreshold],
  );

  const recentSales = useMemo(() => buildRecentSales(scopedSales), [scopedSales]);
  const totalInventoryValue = useMemo(
    () => state.products.reduce((sum, product) => {
      const stock = product.stock ?? 0;
      const baseUnitName = product.baseUnit ?? product.sellingUnits?.[0]?.name ?? 'unit';
      const baseUnit = Array.isArray(product.sellingUnits)
        ? product.sellingUnits.find((unit) => unit && unit.name === baseUnitName)
        ?? product.sellingUnits[0]
        : null;
      const baseUnitPrice = Number(baseUnit?.price) || 0;
      return sum + baseUnitPrice * stock;
    }, 0),
    [state.products],
  );

  const totalProducts = state.products.length;
  const totalCustomers = state.customers.length;
  const totalSalesCount = scopedSales.length;

  const monthlySalary = (currentUser.salary ?? 0) / 12;
  const totalEarnings = monthlySalary + (currentUser.commission ?? 0);

  const salesByMonth = useMemo(() => buildSalesByMonth(scopedSales), [scopedSales]);

  const salesPerformanceData = useMemo(
    () => salesByMonth.map((entry) => ({
      key: entry.key,
      label: entry.label,
      total: entry.total,
    })),
    [salesByMonth],
  );

  const extendedSalesPerformance = useMemo(() => {
    if (salesPerformanceData.length === 0) {
      return [];
    }
    if (salesPerformanceData.length > 1) {
      return salesPerformanceData;
    }
    const [first] = salesPerformanceData;
    const baseDate = new Date(`${first.key}-01T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) {
      return [
        { ...first, label: 'Previous', total: 0 },
        first,
      ];
    }
    const previousDate = new Date(baseDate);
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    return [
      {
        key: previousKey,
        label: previousDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
        total: 0,
      },
      first,
    ];
  }, [salesPerformanceData]);

  const lastSalesPoint = extendedSalesPerformance[extendedSalesPerformance.length - 1] ?? null;
  const trendDelta = lastSalesPoint && extendedSalesPerformance.length > 1
    ? lastSalesPoint.total - extendedSalesPerformance[extendedSalesPerformance.length - 2].total
    : null;

  const financePieData = useMemo(() => {
    const entries = [
      {
        id: 'revenue',
        label: 'Revenue',
        value: Math.max(totalRevenue, 0),
        color: 'rgba(0, 212, 170, 0.8)',
      },
      {
        id: 'expenses',
        label: 'Expenses',
        value: Math.max(totalExpenses, 0),
        color: 'rgba(239, 68, 68, 0.8)',
      },
      {
        id: 'net',
        label: netProfit >= 0 ? 'Net Profit' : 'Net Loss',
        value: Math.abs(netProfit),
        color: netProfit >= 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(249, 115, 22, 0.85)',
      },
    ].filter((entry) => entry.value > 0);

    return entries;
  }, [totalRevenue, totalExpenses, netProfit]);

  const pieValueFormatter = useCallback(
    ({ value }) => formatCurrency(value ?? 0, { countryCode: state.selectedCountry, showSymbol: true }),
    [state.selectedCountry],
  );

  const role = currentUser?.role ?? 'guest';

  const canUsePermission = useCallback(
    (permissionKey) => {
      if (!permissionKey) {
        return true;
      }
      if (role === 'admin') {
        return true;
      }
      if (typeof hasFeaturePermission === 'function') {
        return hasFeaturePermission(currentUser?.id, permissionKey);
      }
      return false;
    },
    [currentUser?.id, hasFeaturePermission, role],
  );

  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((action) => !action.permission || canUsePermission(action.permission)),
    [canUsePermission],
  );

  const formatValue = (value) => formatCurrency(value, { countryCode: state.selectedCountry });
  const formatAxisValue = useCallback(
    (value) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value ?? 0),
    [],
  );

  const displayMonths = Math.max(salesPerformanceData.length, 1);

  const salesChartConfig = useMemo(() => {
    const labels = extendedSalesPerformance.map((entry) => entry.label);
    const points = extendedSalesPerformance.map((entry) => entry.total);
    return {
      labels,
      datasets: [
        {
          label: `Monthly Sales (${state.selectedCountry})`,
          data: points,
          borderColor: '#00d4aa',
          tension: 0.35,
          fill: true,
          pointRadius: points.length > 1 ? 4 : 5,
          pointHoverRadius: 6,
        },
      ],
      tooltipFormatter: (value) => formatCurrency(value, { countryCode: state.selectedCountry, showSymbol: true }),
      yTickFormatter: formatAxisValue,
    };
  }, [extendedSalesPerformance, state.selectedCountry, formatAxisValue]);

  const { salesCanvasRef } = useSalesChart(salesChartConfig, { glowColor: 'rgba(16, 185, 129, 0.65)' });

  const handleQuickAction = (action) => {
    if (action.permission && !canUsePermission(action.permission)) {
      actions.pushNotification({ type: 'warning', message: `You do not have permission to use ${action.label}.` });
      return;
    }

    if (action.targetView) {
      actions.setView(action.targetView);
      return;
    }

    actions.pushNotification({
      type: 'info',
      message: action.pendingMessage ?? `${action.label} action coming soon.`,
    });
  };
  const handleInvoiceClick = useCallback(async (saleId) => {
    const sale = sales.find((entry) => entry.id === saleId);
    if (!sale) {
      actions.pushNotification({ type: 'error', message: 'Sale #' + saleId + ' not found.' });
      return;
    }

    const existingInvoice = invoices.find((invoice) => invoice.saleId === saleId || invoice.originSaleId === saleId);
    const invoice = existingInvoice ?? buildInvoiceFromSale(sale, { customers, products, users });
    if (!invoice) {
      actions.pushNotification({ type: 'error', message: 'Unable to build invoice from this sale.' });
      return;
    }

    try {
      const preparedInvoice = prepareInvoiceForDownload(invoiceContext, invoice);
      await downloadInvoicePdf(preparedInvoice ?? invoice, { companyName, countryCode: selectedCountry });
      actions.pushNotification({
        type: 'success',
        message: 'Invoice downloaded',
        description: (invoice.invoiceNumber ?? ('Sale #' + saleId)),
      });
    } catch (error) {
      console.error('Failed to generate invoice PDF', error);
      actions.pushNotification({ type: 'error', message: 'Unable to generate invoice PDF right now.' });
    }
  }, [actions, sales, invoices, customers, products, users, companyName, selectedCountry, invoiceContext]);

  const netProfitClass = netProfit >= 0 ? 'text-blue-400' : 'text-red-400';
  const netProfitIconContainer = netProfit >= 0 ? 'bg-blue-500/20' : 'bg-red-500/20';
  const netProfitIcon = netProfit >= 0 ? 'text-blue-400' : 'text-red-400';
  const displayName = currentUser.name ?? 'User';
  const showLiveEarnings = ['worker', 'manager'].includes(currentUser.role);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-white">Dashboard Overview</h2>
        <p className="text-gray-400">Welcome back, {displayName}!</p>
      </div>

      {rotatingNotification ? (
        <div className="space-y-2">
          <div className={`inbox-notification-wrapper ${notificationCollapsed ? 'collapsed' : ''}`}>
            <div className="inbox-notification-bar">
              <div className="w-full">
                <div className="notification-message animate-notification-appear">
                  <div className={`avatar ${rotatingNotification.avatarBackground ?? 'legacy-avatar-gradient'}`}>
                    <i className="fas fa-bell" />
                  </div>
                  <div className="content">
                    <div className={`username ${rotatingNotification.color ?? 'text-blue-400'}`}>
                      {rotatingNotification.username}
                    </div>
                    <div className="text">{rotatingNotification.content}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="dashboard-notification-toggle"
            data-action="toggle-dashboard-notification-bar"
            className="notification-toggle-btn"
            onClick={handleToggleNotificationBar}
            aria-label="Toggle dashboard notifications"
          >
            <i className={`fas ${notificationCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`} />
          </button>
        </div>
      ) : null}

      {showLiveEarnings ? (
        <div className="perplexity-card p-6 slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <i className="fas fa-coins text-teal-400 mr-2" />
              Live Earnings
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-green-400 font-medium">LIVE</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <div className="text-green-400 text-2xl mb-2">SAL</div>
              <p className="text-gray-400 text-sm mb-2">Monthly Salary</p>
              <p className="text-lg font-bold text-green-400" data-target={monthlySalary} data-format="currency">
                {formatValue(monthlySalary)}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
              <div className="text-blue-400 text-2xl mb-2">COM</div>
              <p className="text-gray-400 text-sm mb-2">Commission</p>
              <p className="text-lg font-bold text-blue-400" data-target={currentUser.commission ?? 0} data-format="currency">
                {formatValue(currentUser.commission ?? 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-teal-500/10 to-blue-500/10 rounded-xl border border-teal-500/20">
              <div className="text-teal-400 text-2xl mb-2">TOT</div>
              <p className="text-gray-400 text-sm mb-2">Total Earnings</p>
              <p className="text-xl font-bold text-teal-400" data-target={totalEarnings} data-format="currency">
                {formatValue(totalEarnings)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="responsive-grid-6">
        <div className="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Products</p>
              <p className="text-2xl font-bold text-white">{totalProducts}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-box text-blue-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Customers</p>
              <p className="text-2xl font-bold text-white">{totalCustomers}</p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-users text-green-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Sales</p>
              <p className="text-2xl font-bold text-white">{totalSalesCount}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-shopping-cart text-purple-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Revenue</p>
              <p className="text-lg font-bold text-green-400">{formatValue(totalRevenue)}</p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-arrow-up text-green-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Net Profit</p>
              <p className={`text-xl font-bold ${netProfitClass}`}>{formatValue(netProfit)}</p>
            </div>
            <div className={`w-10 h-10 ${netProfitIconContainer} rounded-xl flex items-center justify-center`}>
              <i className={`fas fa-chart-line ${netProfitIcon}`} />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Inventory Value</p>
              <p className="text-lg font-bold text-yellow-400">{formatValue(totalInventoryValue)}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-boxes text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="slide-up border-gray-700/70 bg-gray-900/40">
          <CardHeader className="flex flex-col gap-2 pb-0 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
            <div>
              <CardTitle className="text-white text-xl">Sales Performance</CardTitle>
              <CardDescription>
                {salesPerformanceData.length
                  ? `Revenue trend across the last ${displayMonths} ${displayMonths === 1 ? 'month' : 'months'}.`
                  : 'We will chart your revenue trend as soon as you record sales.'}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {salesPerformanceData.length > 0
                ? `Last ${displayMonths} ${displayMonths === 1 ? 'Month' : 'Months'}`
                : 'Awaiting data'}
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            {salesPerformanceData.length ? (
              <div className="h-[280px]">
                <canvas ref={salesCanvasRef} className="h-full w-full" />
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-12">
                Record a sale to start tracking sales performance.
              </p>
            )}
            {trendDelta != null ? (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-700/60 bg-gray-800/40 px-4 py-3 text-sm text-gray-300">
                <span>Last month vs previous</span>
                <span className={trendDelta >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {trendDelta >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(trendDelta), { countryCode: state.selectedCountry, showSymbol: true })}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="slide-up border-gray-700/70 bg-gray-900/40">
          <CardHeader className="flex flex-col gap-2 pb-0 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
            <div>
              <CardTitle className="text-white text-xl">Financial Overview</CardTitle>
              <CardDescription>
                Revenue vs. expenses split for the selected region.
              </CardDescription>
            </div>
            <Badge variant="secondary">Current Mix</Badge>
          </CardHeader>
          <CardContent className="pt-6">
            {financePieData.length ? (
              <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
                <div className="flex justify-center md:flex-1 pointer-events-none">
                  <PieChart
                    series={[{
                      data: financePieData,
                      highlightScope: { fade: 'global', highlight: 'item' },
                      faded: { innerRadius: 30, additionalRadius: -20, color: 'rgba(148, 163, 184, 0.25)' },
                      innerRadius: 36,
                      outerRadius: 82,
                      cornerRadius: 6,
                      paddingAngle: 2,
                      startAngle: 90,
                      endAngle: 450,
                      valueFormatter: pieValueFormatter,
                    }]}
                    height={200}
                    width={200}
                    margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    slotProps={{ legend: { hidden: true } }}
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
                <div className="grid w-full max-w-xs gap-3 md:max-w-sm">
                  {financePieData.map((slice) => (
                    <div
                      key={slice.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-700/60 bg-gray-900/50 px-4 py-3 text-sm text-gray-200 shadow-lg shadow-black/10"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="font-semibold tracking-wide uppercase text-gray-300">
                          {slice.label}
                        </span>
                      </div>
                      <span className="font-medium text-white">
                        {pieValueFormatter({ value: slice.value })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center">No financial data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="slide-up border-gray-700/70 bg-gray-900/40">
          <CardHeader className="flex flex-col gap-2 pb-0">
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <i className="fas fa-bolt text-yellow-400" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump directly into your most common workflows.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`${action.className} p-4 rounded-xl text-center hover:scale-105 transition-all duration-300`}
                  onClick={() => handleQuickAction(action)}
                >
                  <i className={`${action.icon} text-xl mb-2`} />
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs opacity-80 mt-1">{action.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="perplexity-card p-6 slide-up">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <i className="fas fa-clock text-blue-400 mr-2" />
            Recent Activity
          </h3>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => {
                const customer = state.customers.find((c) => c.id === sale.customerId);
                const firstItem = sale.items?.[0];
                const product = firstItem
                  ? state.products.find((candidate) => candidate.id === firstItem.productId)
                  : null;
                const productName = product?.name ?? null;
                const unitLabel = firstItem
                  ? firstItem.unitName ?? product?.baseUnit ?? 'unit'
                  : null;
                const itemSummary = sale.items?.length > 1
                  ? `${sale.items.length} items`
                  : firstItem
                    ? `${firstItem.quantity ?? 0} x ${productName ?? 'Item'} (${unitLabel})`
                    : 'No items recorded';

                return (
                  <div
                    key={sale.id}
                    className="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-600/30 hover:border-teal-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <i className="fas fa-shopping-bag text-white text-sm" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{itemSummary}</p>
                        <p className="text-gray-400 text-xs">{customer?.name ?? 'Customer'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{formatValue(sale.total ?? 0)}</p>
                      <button
                        type="button"
                        className="text-teal-400 hover:text-teal-300 text-xs"
                        onClick={() => handleInvoiceClick(sale.id)}
                      >
                        <i className="fas fa-file-invoice mr-1" />
                        Invoice
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-chart-line text-3xl mb-3 opacity-50" />
              <p className="mb-2">No recent sales</p>
              <button
                type="button"
                className="perplexity-button px-4 py-2 rounded-xl"
                onClick={() => actions.setView('sales')}
              >
                <i className="fas fa-plus mr-2" />
                Record Sale
              </button>
            </div>
          )}
        </div>
      </div>

      {lowStockProducts.length > 0 ? (
        <div className="perplexity-card p-6 border-l-4 border-red-500 bg-gradient-to-r from-red-500/10 to-transparent slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <i className="fas fa-exclamation-triangle text-red-400 mr-2 animate-pulse" />
              Stock Alert
            </h3>
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
              {lowStockProducts.length} Items
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((product) => {
              const baseUnitLabel = product.baseUnit ?? product.sellingUnits?.[0]?.name ?? 'units';
              return (
                <div
                  key={product.id}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 hover:border-red-500/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{product.name}</p>
                      <p className="text-red-400 text-sm font-bold">
                        {product.stock ?? 0} {baseUnitLabel} left
                      </p>
                    </div>
                    <div className="text-red-400 text-xl">
                      <i className="fas fa-exclamation-triangle" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="perplexity-button px-4 py-2 rounded-xl"
              onClick={() => actions.setView('products')}
            >
              <i className="fas fa-box mr-2" />
              Manage Inventory
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

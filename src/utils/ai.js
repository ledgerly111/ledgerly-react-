import { formatCurrency } from './currency.js';

const positiveWords = ['great', 'excellent', 'good', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'perfect', 'happy', 'success'];
const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'problem', 'issue', 'urgent', 'emergency', 'complaint'];

export const BenkaAI = {
  analyzeSentiment(text = '') {
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) positiveScore += 1;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) negativeScore += 1;
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  },

  generateBusinessInsights(sales = [], products = [], customers = [], expenses = []) {
    const insights = [];
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    if (netProfit > 10000) {
      insights.push({
        type: 'success',
        icon: 'fas fa-chart-line',
        title: 'Excellent Performance!',
        message: 'Outstanding net profit! Your business is thriving with strong financials.',
        action: 'Consider expansion opportunities or strategic investments for growth.',
      });
    } else if (netProfit < 0) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        title: 'Profit Alert',
        message: 'Expenses are exceeding revenue. Immediate attention required.',
        action: 'Review and optimize your expense structure and pricing strategy.',
      });
    }

    const lowStockProducts = products.filter((product) => product.stock <= 10);
    if (lowStockProducts.length > 0) {
      insights.push({
        type: 'alert',
        icon: 'fas fa-box-open',
        title: 'Inventory Warning',
        message: `${lowStockProducts.length} products need immediate restocking.`,
        action: 'Prevent stockouts by reordering inventory now to maintain sales flow.',
      });
    }

    if (customers.length > 50) {
      insights.push({
        type: 'info',
        icon: 'fas fa-users',
        title: 'Growing Customer Base',
        message: `Impressive! You have ${customers.length} customers in your database.`,
        action: 'Implement loyalty programs to maximize customer lifetime value and retention.',
      });
    }

    return insights;
  },

  getPerformanceRecommendations(userRole, commission = 0) {
    const recommendations = [];

    if (userRole === 'worker') {
      if (commission > 1000) {
        recommendations.push({
          type: 'celebration',
          icon: 'fas fa-trophy',
          title: 'Top Performer!',
          message: 'Your commission shows exceptional sales performance!',
          tip: "You're excelling! Consider mentoring team members and exploring leadership opportunities.",
        });
      } else if (commission < 200) {
        recommendations.push({
          type: 'improvement',
          icon: 'fas fa-lightbulb',
          title: 'Growth Opportunity',
          message: 'Your commission potential can be significantly improved with focus.',
          tip: 'Focus on building stronger customer relationships and consultative selling techniques.',
        });
      }
    }

    return recommendations;
  },
};

export const AccuraBot = {
  analyzeApp(state = {}) {
    return {
      overview: this.getAppOverview(state),
      alerts: this.getAlerts(state),
      recommendations: this.getRecommendations(state),
      quickActions: this.getQuickActions(state),
    };
  },

  getAppOverview(state) {
    const safeState = state || {};
    const totalRevenue = (safeState.sales ?? []).reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalExpenses = (safeState.expenses ?? []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const lowStockCount = (safeState.products ?? []).filter((p) => p.stock <= (safeState.lowStockThreshold ?? 10)).length;
    const unreadMessages = (safeState.messages ?? []).filter(
      (message) => safeState.currentUser && message.to === safeState.currentUser.id && !message.read,
    ).length;

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      products: (safeState.products ?? []).length,
      customers: (safeState.customers ?? []).length,
      employees: (safeState.users ?? []).length,
      lowStock: lowStockCount,
      unreadMessages,
      healthScore: this.calculateHealthScore(safeState),
    };
  },

  calculateHealthScore(state) {
    let score = 0;
    const totalRevenue = (state.sales ?? []).reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalExpenses = (state.expenses ?? []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    if (netProfit > 50000) score += 30;
    else if (netProfit > 10000) score += 25;
    else if (netProfit > 0) score += 15;
    else score += 5;

    const lowStockProducts = (state.products ?? []).filter((p) => p.stock <= (state.lowStockThreshold ?? 10)).length;
    const stockRatio = (state.products ?? []).length > 0 ? lowStockProducts / (state.products?.length ?? 1) : 0;
    if (stockRatio === 0) score += 25;
    else if (stockRatio < 0.1) score += 20;
    else if (stockRatio < 0.25) score += 15;
    else score += 5;

    if ((state.customers ?? []).length > 100) score += 20;
    else if ((state.customers ?? []).length > 50) score += 15;
    else if ((state.customers ?? []).length > 20) score += 10;
    else score += 5;

    if ((state.products ?? []).length > 0 && (state.customers ?? []).length > 0 && (state.sales ?? []).length > 0) score += 25;
    else score += 10;

    return Math.min(score, 100);
  },

  getAlerts(state) {
    const alerts = [];
    const lowStockProducts = (state.products ?? []).filter((product) => product.stock <= (state.lowStockThreshold ?? 10));
    if (lowStockProducts.length > 0) {
      alerts.push({
        type: 'urgent',
        icon: 'fas fa-exclamation-triangle',
        title: 'Critical Stock Alert',
        message: `${lowStockProducts.length} products critically low on stock`,
        action: 'products',
      });
    }

    const unreadMessages = (state.messages ?? []).filter(
      (message) => state.currentUser && message.to === state.currentUser.id && !message.read,
    );
    if (unreadMessages.length > 5) {
      alerts.push({
        type: 'info',
        icon: 'fas fa-info-circle',
        title: 'Unread Messages',
        message: `${unreadMessages.length} unread messages require attention`,
        action: 'inbox',
      });
    }

    return alerts;
  },

  getRecommendations(state) {
    const recommendations = [];
    const sales = state.sales ?? [];
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const avgSale = sales.length ? totalRevenue / sales.length : 0;

    if (avgSale < 100 && sales.length > 10) {
      recommendations.push({
        type: 'growth',
        icon: 'fas fa-level-up-alt',
        title: 'Boost Average Sale Value',
        message: 'Current average sale shows growth potential',
        tip: 'Implement cross-selling and upselling strategies to increase transaction values',
      });
    }

    if ((state.customers ?? []).length < 10) {
      recommendations.push({
        type: 'expansion',
        icon: 'fas fa-users',
        title: 'Expand Customer Base',
        message: 'Growing your customer base will drive sustainable revenue growth',
        tip: 'Focus on marketing and customer acquisition strategies',
      });
    }

    return recommendations;
  },

  getQuickActions(state) {
    const currentRole = state.currentUser?.role ?? 'guest';
    const actions = [];

    if (currentRole === 'admin') {
      actions.push(
        { id: 'add-employee', icon: 'fas fa-user-plus', label: 'Add Employee', color: 'blue' },
        { id: 'view-reports', icon: 'fas fa-chart-bar', label: 'View Reports', color: 'purple' },
        { id: 'settings', icon: 'fas fa-cog', label: 'Settings', color: 'gray' },
      );
    }

    if (currentRole === 'admin' || currentRole === 'manager') {
      actions.push(
        { id: 'add-product', icon: 'fas fa-box', label: 'Add Product', color: 'green' },
        { id: 'view-employees', icon: 'fas fa-users', label: 'View Team', color: 'blue' },
      );
    }

    actions.push(
      { id: 'add-sale', icon: 'fas fa-shopping-cart', label: 'Record Sale', color: 'green' },
      { id: 'add-expense', icon: 'fas fa-receipt', label: 'Add Expense', color: 'yellow' },
      { id: 'add-customer', icon: 'fas fa-handshake', label: 'Add Customer', color: 'blue' },
      { id: 'view-products', icon: 'fas fa-inventory', label: 'View Inventory', color: 'gray' },
    );

    return actions;
  },

  processCommand(command, state, formatter = formatCurrency) {
    const lowerCommand = (command ?? '').toLowerCase().trim();
    const safeState = state ?? {};
    let responseHtml = '';

    switch (lowerCommand) {
      case '#credit': {
        const customersWithBalance = (safeState.customers ?? []).filter((customer) => (customer.balance || 0) > 0);
        const totalOutstandingCredit = customersWithBalance.reduce((sum, customer) => sum + (customer.balance || 0), 0);
        responseHtml += `<p class="text-white font-medium mb-2">Total Outstanding Credit: ${formatter(totalOutstandingCredit, { countryCode: safeState.selectedCountry })}</p>`;
        if (customersWithBalance.length > 0) {
          const list = customersWithBalance
            .map(
              (customer) =>
                `<li>${customer.name}: ${formatter(customer.balance, { countryCode: safeState.selectedCountry })}</li>`,
            )
            .join('');
          responseHtml += `<p class="text-gray-300 mb-1">Customers with outstanding balance:</p><ul class="list-disc list-inside text-gray-300">${list}</ul>`;
        } else {
          responseHtml += '<p class="text-gray-300">No customers with outstanding credit balance.</p>';
        }
        break;
      }
      case '#sales': {
        const salesCount = (safeState.sales ?? []).length;
        const totalRevenue = (safeState.sales ?? []).reduce((sum, sale) => sum + (sale.total || 0), 0);
        responseHtml += `<p class="text-white font-medium mb-2">Total Sales Recorded: ${salesCount}</p>`;
        responseHtml += `<p class="text-white font-medium">Total Revenue: ${formatter(totalRevenue, { countryCode: safeState.selectedCountry })}</p>`;
        break;
      }
      case '#lowstock': {
        const lowStockProducts = (safeState.products ?? []).filter((product) => product.stock <= (product.reorderLevel ?? 0));
        if (lowStockProducts.length > 0) {
          const list = lowStockProducts
            .map(
              (product) =>
                `<li>${product.name} (SKU: ${product.sku}): ${product.stock} in stock (Reorder Level: ${product.reorderLevel})</li>`,
            )
            .join('');
          responseHtml += `<p class="text-white font-medium mb-2">Products critically low on stock (below reorder level):</p><ul class="list-disc list-inside text-gray-300">${list}</ul>`;
        } else {
          responseHtml += '<p class="text-white font-medium">Great! No products are currently below their reorder level.</p>';
        }
        break;
      }
      default:
        responseHtml = '<p class="text-red-400">Command not recognized. Try #credit, #sales, or #lowstock.</p>';
        break;
    }

    return responseHtml;
  },
};

export const inboxNotifications = [
  {
    avatarBackground: 'bg-gradient-to-r from-green-500 to-emerald-500',
    username: 'System',
    content: 'New sale recorded for Emirates Tech Solutions.',
    color: 'text-green-400',
    duration: 4000,
  },
  {
    avatarBackground: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    username: 'AccuraBot',
    content: 'Low stock warning for Wireless Mouse.',
    color: 'text-yellow-400',
    duration: 4000,
  },
  {
    avatarBackground: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    username: 'John Manager',
    content: 'Stock request for Premium Laptops approved.',
    color: 'text-blue-400',
    duration: 4500,
  },
  {
    avatarBackground: 'bg-gradient-to-r from-purple-500 to-pink-500',
    username: 'Benka AI',
    content: 'New insight: Consider a marketing campaign for External SSDs.',
    color: 'text-purple-400',
    duration: 5000,
  },
];

export const AI_CATEGORIES = {
  admin: [
    {
      key: 'financial',
      icon: '<path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path>',
      text: 'Financial Analysis',
      subtext: 'Analyze revenue, expenses, and profit.',
      image: 'https://images.unsplash.com/photo-1635776062360-af423602aff3?w=800&q=80',
    },
    {
      key: 'inventory',
      icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path>',
      text: 'Inventory Insights',
      subtext: 'Get insights on stock levels and reorder points.',
      image: 'https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=800&q=80',
    },
    {
      key: 'employee',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
      text: 'Employee Performance',
      subtext: 'Review sales, commissions, and productivity.',
      image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=800&q=80',
    },
    {
      key: 'general',
      icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
      text: 'General Inquiry',
      subtext: 'Ask any other business-related question.',
      image: 'https://images.unsplash.com/photo-1635776063328-153b13e3c245?w=800&q=80',
    },
  ],
  manager: [
    {
      key: 'sales-team',
      icon: '<path d="M3 13V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4"></path><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"></path><path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path><path d="M12 5V3"></path>',
      text: 'Sales Team Analysis',
      subtext: 'Analyze team sales and individual contributions.',
      image: 'https://images.unsplash.com/photo-1635776062360-af423602aff3?w=800&q=80',
    },
    {
      key: 'expense-control',
      icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path>',
      text: 'Expense Control',
      subtext: 'Identify spending patterns and savings opportunities.',
      image: 'https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=800&q=80',
    },
    {
      key: 'customer-relations',
      icon: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.82 2.94 0l.06-.06L12 11l2.96-2.96a2.17 2.17 0 0 0 0-3.08v0c-.82-.82-2.13-.82-2.94 0L12 5Z"></path>',
      text: 'Customer Relations',
      subtext: 'Discover top customers and buying habits.',
      image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=800&q=80',
    },
    {
      key: 'task-management',
      icon: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m9 15 2 2 4-4"></path>',
      text: 'Task Management',
      subtext: 'Get updates on team tasks and progress.',
      image: 'https://images.unsplash.com/photo-1635776063328-153b13e3c245?w=800&q=80',
    },
  ],
  worker: [
    {
      key: 'my-performance',
      icon: '<circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>',
      text: 'My Performance',
      subtext: 'Check your sales, earnings, and commissions.',
      image: 'https://images.unsplash.com/photo-1635776062360-af423602aff3?w=800&q=80',
    },
    {
      key: 'product-info',
      icon: '<path d="M10.1 2.2 3.2 5.1a2 2 0 0 0-1.2 1.8v8a2 2 0 0 0 1.2 1.8l6.9 2.9c.9.3 1.9.3 2.8 0l6.9-2.9a2 2 0 0 0 1.2-1.8v-8a2 2 0 0 0-1.2-1.8L13.9 2.2c-.9-.4-1.9-.4-2.8 0Z"></path><path d="m12 17-7-3 7-3 7 3-7 3Z"></path>',
      text: 'Product Information',
      subtext: 'Get details about stock, pricing, and features.',
      image: 'https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=800&q=80',
    },
    {
      key: 'customer-support',
      icon: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path>',
      text: 'Customer Support',
      subtext: 'Find customer history and information.',
      image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=800&q=80',
    },
    {
      key: 'daily-tasks',
      icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path>',
      text: 'Daily Tasks & Goals',
      subtext: 'Review your current tasks and objectives.',
      image: 'https://images.unsplash.com/photo-1635776063328-153b13e3c245?w=800&q=80',
    },
  ],
};

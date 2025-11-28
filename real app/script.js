// Suppress console warnings for Tailwind JIT
(function() {
    const originalWarn = console.warn;
    console.warn = function() {
        // Convert arguments to string to check content
        const args = Array.from(arguments);
        const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        // Skip Tailwind CDN warnings
        if (message && message.includes('cdn.tailwindcss.com')) {
            return;
        }
        
        // Call original console.warn for other warnings
        originalWarn.apply(console, arguments);
    };
})();

const GCC_COUNTRIES = {
    'AE': { name: 'United Arab Emirates', currency: 'AED', symbol: 'AED', rate: 3.67, tax: 0.05, taxName: 'VAT' },
    'SA': { name: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', rate: 3.75, tax: 0.15, taxName: 'VAT' },
    'KW': { name: 'Kuwait', currency: 'KWD', symbol: 'KWD', rate: 0.30, tax: 0.00, taxName: 'No Tax' },
    'QA': { name: 'Qatar', currency: 'QAR', symbol: 'QAR', rate: 3.64, tax: 0.00, taxName: 'No Tax' },
    'BH': { name: 'Bahrain', currency: 'BHD', symbol: 'BHD', rate: 0.38, tax: 0.10, taxName: 'VAT' },
    'OM': { name: 'Oman', currency: 'OMR', symbol: 'OMR', rate: 0.38, tax: 0.05, taxName: 'VAT' }
};

// Enhanced Notification System
class NotificationSystem {
    static show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const colors = {
            success: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400',
            info: 'text-blue-400'
        };
        
        notification.innerHTML = `
            <i class="${icons[type]} ${colors[type]} text-lg"></i>
            <div class="flex-1">
                <p class="text-white font-medium text-sm">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-white transition-colors ml-2">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
    
    static success(message) { this.show(message, 'success'); }
    static error(message) { this.show(message, 'error'); }
    static warning(message) { this.show(message, 'warning'); }
    static info(message) { this.show(message, 'info'); }
}

// Enhanced Data Storage
class DataStorage {
    static save(key, data) {
        try {
            const dataString = JSON.stringify(data);
            localStorage.setItem(key, dataString);
            return true;
        } catch (error) {
            console.error('Storage failed:', error);
            NotificationSystem.error('Storage failed. Data not saved.');
            return false;
        }
    }
    
    static load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Data loading failed:', error);
            return null;
        }
    }
}

// Bubble AI Implementation
const BubbleAI = {
    analyzeSentiment(text) {
        const positiveWords = ['great', 'excellent', 'good', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'perfect', 'happy', 'success'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'problem', 'issue', 'urgent', 'emergency', 'complaint'];

        const lowerText = text.toLowerCase();
        let positiveScore = 0;
        let negativeScore = 0;

        positiveWords.forEach(word => {
            if (lowerText.includes(word)) positiveScore++;
        });

        negativeWords.forEach(word => {
            if (lowerText.includes(word)) negativeScore++;
        });

        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    },

    generateBusinessInsights(salesData, products, customers, expenses) {
        const insights = [];
        const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        if (netProfit > 10000) {
            insights.push({
                type: 'success',
                icon: 'fas fa-chart-line',
                title: 'Excellent Performance!',
                message: 'Outstanding net profit! Your business is thriving with strong financials.',
                action: 'Consider expansion opportunities or strategic investments for growth.'
            });
        } else if (netProfit < 0) {
            insights.push({
                type: 'warning',
                icon: 'fas fa-exclamation-triangle',
                title: 'Profit Alert',
                message: 'Expenses are exceeding revenue. Immediate attention required.',
                action: 'Review and optimize your expense structure and pricing strategy.'
            });
        }

        const lowStockProducts = products.filter(p => p.stock <= 10);
        if (lowStockProducts.length > 0) {
            insights.push({
                type: 'alert',
                icon: 'fas fa-box-open',
                title: 'Inventory Warning',
                message: `${lowStockProducts.length} products need immediate restocking.`,
                action: 'Prevent stockouts by reordering inventory now to maintain sales flow.'
            });
        }

        if (customers.length > 50) {
            insights.push({
                type: 'info',
                icon: 'fas fa-users',
                title: 'Growing Customer Base',
                message: `Impressive! You have ${customers.length} customers in your database.`,
                action: 'Implement loyalty programs to maximize customer lifetime value and retention.'
            });
        }

        return insights;
    },

    getPerformanceRecommendations(userRole, commission, salary) {
        const recommendations = [];

        if (userRole === 'worker') {
            if (commission > 1000) {
                recommendations.push({
                    type: 'celebration',
                    icon: 'fas fa-trophy',
                    title: 'Top Performer!',
                    message: 'Your commission shows exceptional sales performance!',
                    tip: 'You\'re excelling! Consider mentoring team members and exploring leadership opportunities.'
                });
            } else if (commission < 200) {
                recommendations.push({
                    type: 'improvement',
                    icon: 'fas fa-lightbulb',
                    title: 'Growth Opportunity',
                    message: 'Your commission potential can be significantly improved with focus.',
                    tip: 'Focus on building stronger customer relationships and consultative selling techniques.'
                });
            }
        }

        return recommendations;
    }
};

// AccuraBot Implementation
const AccuraBot = {
    analyzeApp(state) {
        return {
            overview: this.getAppOverview(state),
            alerts: this.getAlerts(state),
            recommendations: this.getRecommendations(state),
            quickActions: this.getQuickActions(state)
        };
    },

    getAppOverview(state) {
        const totalRevenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalExpenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const lowStockCount = state.products.filter(p => p.stock <= state.lowStockThreshold).length;
        const unreadMessages = state.messages.filter(m => m.to === state.currentUser.id && !m.read).length;

        return {
            revenue: totalRevenue,
            expenses: totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            products: state.products.length,
            customers: state.customers.length,
            employees: state.users.length,
            lowStock: lowStockCount,
            unreadMessages: unreadMessages,
            healthScore: this.calculateHealthScore(state)
        };
    },

    calculateHealthScore(state) {
        let score = 0;
        const revenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
        const expenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = revenue - expenses;
        if (netProfit > 50000) score += 30; else if (netProfit > 10000) score += 25; else if (netProfit > 0) score += 15; else score += 5;
        const lowStockProducts = state.products.filter(p => p.stock <= state.lowStockThreshold).length;
        const stockRatio = state.products.length > 0 ? lowStockProducts / state.products.length : 0;
        if (stockRatio === 0) score += 25; else if (stockRatio < 0.1) score += 20; else if (stockRatio < 0.25) score += 15; else score += 5;
        if (state.customers.length > 100) score += 20; else if (state.customers.length > 50) score += 15; else if (state.customers.length > 20) score += 10; else score += 5;
        if (state.products.length > 0 && state.customers.length > 0 && state.sales.length > 0) score += 25; else score += 10;
        return Math.min(score, 100);
    },

    getAlerts(state) {
        const alerts = [];
        const lowStockProducts = state.products.filter(p => p.stock <= state.lowStockThreshold);
        if (lowStockProducts.length > 0) {
            alerts.push({ type: 'urgent', icon: 'fas fa-exclamation-triangle', title: 'Critical Stock Alert', message: `${lowStockProducts.length} products critically low on stock`, action: 'products' });
        }
        const unreadMessages = state.messages.filter(m => m.to === state.currentUser.id && !m.read);
        if (unreadMessages.length > 5) {
            alerts.push({ type: 'info', icon: 'fas fa-info-circle', title: 'Unread Messages', message: `${unreadMessages.length} unread messages require attention`, action: 'inbox' });
        }
        return alerts;
    },

    getRecommendations(state) {
        const recommendations = [];
        const totalRevenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
        const avgSale = totalRevenue / state.sales.length || 0;
        if (avgSale < 100 && state.sales.length > 10) {
            recommendations.push({ type: 'growth', icon: 'fas fa-level-up-alt', title: 'Boost Average Sale Value', message: 'Current average sale shows growth potential', tip: 'Implement cross-selling and upselling strategies to increase transaction values' });
        }
        if (state.customers.length < 10) {
            recommendations.push({ type: 'expansion', icon: 'fas fa-users', title: 'Expand Customer Base', message: 'Growing your customer base will drive sustainable revenue growth', tip: 'Focus on marketing and customer acquisition strategies' });
        }
        return recommendations;
    },

    getQuickActions(state) {
        const actions = [];
        if (state.currentUser.role === 'admin') {
            actions.push({ id: 'add-employee', icon: 'fas fa-user-plus', label: 'Add Employee', color: 'blue' }, { id: 'view-reports', icon: 'fas fa-chart-bar', label: 'View Reports', color: 'purple' }, { id: 'settings', icon: 'fas fa-cog', label: 'Settings', color: 'gray' });
        }
        if (['admin', 'manager'].includes(state.currentUser.role)) {
            actions.push({ id: 'add-product', icon: 'fas fa-box', label: 'Add Product', color: 'green' }, { id: 'view-employees', icon: 'fas fa-users', label: 'View Team', color: 'blue' });
        }
        actions.push({ id: 'add-sale', icon: 'fas fa-shopping-cart', label: 'Record Sale', color: 'green' }, { id: 'add-expense', icon: 'fas fa-receipt', label: 'Add Expense', color: 'yellow' }, { id: 'add-customer', icon: 'fas fa-handshake', label: 'Add Customer', color: 'blue' }, { id: 'view-products', icon: 'fas fa-inventory', label: 'View Inventory', color: 'gray' });
        return actions;
    },

    processCommand(command, state) {
        const lowerCommand = command.toLowerCase().trim();
        let responseHtml = '';
        switch (lowerCommand) {
            case '#credit':
                const customersWithBalance = state.customers.filter(c => c.balance > 0);
                const totalOutstandingCredit = customersWithBalance.reduce((sum, c) => sum + c.balance, 0);
                responseHtml += `<p class="text-white font-medium mb-2">Total Outstanding Credit: ${app.formatCurrency(totalOutstandingCredit)}</p>`;
                if (customersWithBalance.length > 0) {
                    responseHtml += `<p class="text-gray-300 mb-1">Customers with outstanding balance:</p><ul class="list-disc list-inside text-gray-300">`;
                    customersWithBalance.forEach(c => { responseHtml += `<li>${c.name}: ${app.formatCurrency(c.balance)}</li>`; });
                    responseHtml += `</ul>`;
                } else {
                    responseHtml += `<p class="text-gray-300">No customers with outstanding credit balance.</p>`;
                }
                break;
            case '#sales':
                const totalSalesCount = state.sales.length;
                const totalRevenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
                responseHtml += `<p class="text-white font-medium mb-2">Total Sales Recorded: ${totalSalesCount}</p><p class="text-white font-medium">Total Revenue: ${app.formatCurrency(totalRevenue)}</p>`;
                break;
            case '#lowstock':
                const lowStockProducts = state.products.filter(p => p.stock <= p.reorderLevel);
                if (lowStockProducts.length > 0) {
                    responseHtml += `<p class="text-white font-medium mb-2">Products critically low on stock (below reorder level):</p><ul class="list-disc list-inside text-gray-300">`;
                    lowStockProducts.forEach(p => { responseHtml += `<li>${p.name} (SKU: ${p.sku}): ${p.stock} in stock (Reorder Level: ${p.reorderLevel})</li>`; });
                    responseHtml += `</ul>`;
                } else {
                    responseHtml += `<p class="text-white font-medium">Great! No products are currently below their reorder level.</p>`;
                }
                break;
            default:
                responseHtml = `<p class="text-red-400">Command not recognized. Try #credit, #sales, or #lowstock.</p>`;
                break;
        }
        return responseHtml;
    }
};
            

            
// REPLACE your old inboxNotifications array with this one
const inboxNotifications = [
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
        username: 'Bubble AI',
        content: 'New insight: Consider a marketing campaign for External SSDs.',
        color: 'text-purple-400',
        duration: 5000,
    },
];
// PASTE THIS ENTIRE BLOCK OF CODE RIGHT BEFORE "const app = { ... }"

const AI_CATEGORIES = {
    admin: [
        { key: 'financial', icon: '<path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path>', text: 'Financial Analysis', subtext: 'Analyze revenue, expenses, and profit.', image: 'https://images.unsplash.com/photo-1635776062360-af423602aff3?w=800&q=80' },
        { key: 'inventory', icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path>', text: 'Inventory Insights', subtext: 'Get insights on stock levels and reorder points.', image: 'https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=800&q=80' },
        { key: 'employee', icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>', text: 'Employee Performance', subtext: 'Review sales, commissions, and productivity.', image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=800&q=80' },
        { key: 'general', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>', text: 'General Inquiry', subtext: 'Ask any other business-related question.', image: 'https://images.unsplash.com/photo-1635776063328-153b13e3c245?w=800&q=80' },
    ],
    manager: [
        { key: 'sales-team', icon: '<path d="M3 13V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4"></path><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"></path><path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path><path d="M12 5V3"></path>', text: 'Sales Team Analysis', subtext: 'Analyze team sales and individual contributions.', image: 'https://images.unsplash.com/photo-1635776062360-af423602aff3?w=800&q=80' },
        { key: 'expense-control', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path>', text: 'Expense Control', subtext: 'Identify spending patterns and savings opportunities.', image: 'https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=800&q=80' },
        { key: 'customer-relations', icon: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.82 2.94 0l.06-.06L12 11l2.96-2.96a2.17 2.17 0 0 0 0-3.08v0c-.82-.82-2.13-.82-2.94 0L12 5Z"></path>', text: 'Customer Relations', subtext: 'Discover top customers and buying habits.', image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=800&q=80' },
        { key: 'task-management', icon: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m9 15 2 2 4-4"></path>', text: 'Task Management', subtext: 'Get updates on team tasks and progress.', image: 'https://images.unsplash.com/photo-1635776063328-153b13e3c245?w=800&q=80' },
    ],
    worker: [
        { key: 'my-performance', icon: '<circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>', text: 'My Performance', subtext: 'Check your sales, earnings, and commissions.', image: 'https://images.unsplash.com/photo-1635776062360-af423602aff3?w=800&q=80' },
        { key: 'product-info', icon: '<path d="M10.1 2.2 3.2 5.1a2 2 0 0 0-1.2 1.8v8a2 2 0 0 0 1.2 1.8l6.9 2.9c.9.3 1.9.3 2.8 0l6.9-2.9a2 2 0 0 0 1.2-1.8v-8a2 2 0 0 0-1.2-1.8L13.9 2.2c-.9-.4-1.9-.4-2.8 0Z"></path><path d="m12 17-7-3 7-3 7 3-7 3Z"></path>', text: 'Product Information', subtext: 'Get details about stock, pricing, and features.', image: 'https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=800&q=80' },
        { key: 'customer-support', icon: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path>', text: 'Customer Support', subtext: 'Find customer history and information.', image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=800&q=80' },
        { key: 'daily-tasks', icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path>', text: 'Daily Tasks & Goals', subtext: 'Review your current tasks and objectives.', image: 'https://images.unsplash.com/photo-1635776063328-153b13e3c245?w=800&q=80' },
    ]
};
        // Main Application
   // Main Application
const app = {
    serverUrl: 'https://ledgerly-backend-e8au.onrender.com',
    charts: {},
    currentSaleCart: [],
    state: {
        aiChatHistory: [], // <--- CORRECT SPOT
        aiAudioPlayers: {},
        aiSettings: {
    language: 'English',
    highlightKeywords: false, // Default is OFF
    highlightNumbers: false   // Default is OFF
},
                currentUser: null,
                animationInterval: null,
                currentView: 'login',
                pendingRole: null,
                mobileMenuOpen: false,
                aiMode: 'ai',
                aiLoading: false,
                aiAnswer: null,
                pixelAnimation: null,
                selectedCountry: 'AE',
                companyName: 'Your Company',
                lowStockThreshold: 10,
                users: [ // <-- REPLACE THE ENTIRE USERS ARRAY WITH THIS
                    { id: 1, username: 'admin', role: 'admin', name: 'Administrator', email: 'admin@company.com', phone: '+971501234567', address: 'Business Bay, Dubai', hireDate: '2023-01-01', salary: 75000, commission: 0 },
                    { id: 2, username: 'manager', role: 'manager', name: 'John Manager', email: 'manager@company.com', phone: '+971501234568', address: 'Downtown Dubai', hireDate: '2023-02-01', salary: 60000, commission: 0 },
                    { id: 3, username: 'worker', role: 'worker', name: 'Jane Worker', email: 'worker@company.com', phone: '+971501234569', address: 'Dubai Marina', hireDate: '2023-03-01', salary: 45000, commission: 250 },
                    { id: 4, username: 'worker2', role: 'worker', name: 'Bob Worker', email: 'worker2@company.com', phone: '+971501234570', address: 'Dubai Marina', hireDate: '2023-03-02', salary: 45000, commission: 0 },
                    { id: 5, username: 'manager2', role: 'manager', name: 'Sarah Manager', email: 'manager2@company.com', phone: '+971501234571', address: 'Downtown Dubai', hireDate: '2023-02-02', salary: 60000, commission: 0 }
                ],
                products: [
                    { id: 1, name: 'Premium Laptop', price: 1299.99, cost: 800, stock: 25, category: 'Electronics', description: 'High-performance business laptop', sku: 'LAP001', supplier: 'TechCorp', reorderLevel: 5, imageUrl: 'https://via.placeholder.com/150/00d4aa/FFFFFF?text=Laptop' },
                    { id: 2, name: 'Wireless Mouse', price: 49.99, cost: 25, stock: 100, category: 'Accessories', description: 'Ergonomic wireless mouse', sku: 'MOU002', supplier: 'AccessoryPlus', reorderLevel: 20, imageUrl: 'https://via.placeholder.com/150/0ea5e9/FFFFFF?text=Mouse' },
                    { id: 3, name: 'USB-C Hub', price: 79.99, cost: 40, stock: 8, category: 'Accessories', description: '7-in-1 USB-C hub', sku: 'HUB003', supplier: 'ConnectTech', reorderLevel: 10, imageUrl: 'https://via.placeholder.com/150/8b5cf6/FFFFFF?text=USB+Hub' },
                    { id: 4, name: 'External SSD 1TB', price: 150.00, cost: 90, stock: 15, category: 'Storage', description: 'Fast and portable SSD', sku: 'SSD004', supplier: 'DataSolutions', reorderLevel: 5, imageUrl: 'https://via.placeholder.com/150/10b981/FFFFFF?text=SSD' },
                    { id: 5, name: 'Ergonomic Keyboard', price: 99.99, cost: 50, stock: 30, category: 'Peripherals', description: 'Comfortable typing experience', sku: 'KEY005', supplier: 'ErgoGear', reorderLevel: 10, imageUrl: 'https://via.placeholder.com/150/f59e0b/FFFFFF?text=Keyboard' },
                    { id: 6, name: '4K Monitor 27-inch', price: 399.99, cost: 250, stock: 12, category: 'Displays', description: 'Vivid 4K resolution monitor', sku: 'MON006', supplier: 'ViewTech', reorderLevel: 3, imageUrl: 'https://via.placeholder.com/150/ef4444/FFFFFF?text=Monitor' }
                ],
                customers: [
                    { id: 1, name: 'Emirates Tech Solutions', email: 'contact@emirates-tech.com', phone: '+971501234570', address: 'DIFC, Dubai, UAE', type: 'Business', taxId: 'TRN100123456789012', creditLimit: 50000, balance: 0 },
                    { id: 2, name: 'Ahmed Al Rashid', email: 'ahmed.alrashid@email.com', phone: '+971501234571', address: 'Jumeirah, Dubai, UAE', type: 'Individual', taxId: '', creditLimit: 5000, balance: 0 },
                    { id: 3, name: 'Global Innovations LLC', email: 'info@globalinnovations.com', phone: '+971501234572', address: 'Business Bay, Dubai, UAE', type: 'Business', taxId: 'TRN100123456789013', creditLimit: 75000, balance: 0 },
                    { id: 4, name: 'Fatima Khan', email: 'fatima.k@email.com', phone: '+971501234573', address: 'Al Barsha, Dubai, UAE', type: 'Individual', taxId: '', creditLimit: 10000, balance: 0 }
                ],
                sales: [
                    { id: 1, customerId: 1, items: [{productId: 1, quantity: 2, unitPrice: 1299.99}], total: 2599.98, date: '2024-01-15', salesPersonId: 3, subtotal: 2599.98, taxAmount: 0, taxRate: 0, saleType: 'Credit', discount: 0 }
                ],
                expenses: [
                    { id: 1, description: 'Office Rent', amount: 5000, category: '6110', date: '2024-01-01', addedBy: 1, notes: 'Monthly office rent payment' }
                ],
                invoices: [],
                messages: [
    // Example Task Message
    {
        id: 1,
        from: 1, // System or User ID
        to: 3,   // User or Branch ID
        subject: 'URGENT: Stock Request for Premium Laptops',
        content: 'Requesting 15 units of Premium Laptop (SKU: LAP001). Current stock is critically low.',
        type: 'task', // 'personal', 'branch', 'task'
        category: 'emergency', // 'emergency', 'complaint', 'request', 'info'
        status: 'pending_worker_approval', // 'pending_worker_approval', 'pending_manager_approval', 'approved_pending_acceptance', 'completed', 'declined'
        timestamp: new Date().toISOString(),
        read: false,
        requesterId: 2, // Manager who initiated
        history: [
            {
                user: 'John Manager',
                action: 'Request Sent',
                timestamp: new Date().toISOString()
            }
        ],
        taskDetails: {
            productId: 1,
            requestedStock: 15
        }
    }
],
branches: [
    { id: 1, name: 'Management Team', members: [1, 2] },
    { id: 2, name: 'Sales Floor', members: [3] }
],
inboxFilter: 'all', // 'all', 'personal', 'branch', 'task'
taskFilter: 'all', // can be 'all', 'live', or 'completed'
inboxSearchTerm: '',
categories: ['Electronics', 'Accessories', 'Software', 'Services', 'Storage', 'Peripherals', 'Displays', 'Other'],
expenseCategories: ['Office Supplies', 'Marketing', 'Utilities', 'Rent', 'Transportation', 'Meals & Entertainment', 'Equipment', 'Professional Services', 'Other'],
aiInsights: [],
botAnalysis: {},
lastAIUpdate: null,
quickSale: {
    active: false,
    selectedCustomer: null,
    selectedProducts: [], // { productId, quantity, unitPrice }
    discount: 0,
    paymentType: 'Cash',
    subtotal: 0,
    taxAmount: 0,
    total: 0
},
aiViewPhase: 'selection',
// Add this new empty array inside app.state
journal: [],
currentBranchId: null,
tasks: [],
announcements: [],
nboxNotificationInterval: null, 
                chartOfAccounts: [
                    { code: '1110', name: 'Cash on Hand', type: 'Asset', normalBalance: 'Debit' },
                    { code: '1120', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'Debit' },
                    { code: '1210', name: 'Inventory Asset', type: 'Asset', normalBalance: 'Debit' },
                    { code: '1310', name: 'Prepaid Expenses', type: 'Asset', normalBalance: 'Debit' },
                    { code: '1410', name: 'Property, Plant, & Equipment', type: 'Asset', normalBalance: 'Debit' },
                    { code: '2110', name: 'Accounts Payable', type: 'Liability', normalBalance: 'Credit' },
                    { code: '2210', name: 'VAT Payable', type: 'Liability', normalBalance: 'Credit' },
                    { code: '2310', name: 'Salaries Payable', type: 'Liability', normalBalance: 'Credit' },
                    { code: '3110', name: 'Owner\'s Equity', type: 'Equity', normalBalance: 'Credit' },
                    { code: '3210', name: 'Retained Earnings', type: 'Equity', normalBalance: 'Credit' },
                    { code: '4110', name: 'Sales Revenue', type: 'Revenue', normalBalance: 'Credit' },
                    { code: '4120', name: 'Sales Discount', type: 'Contra-Revenue', normalBalance: 'Debit' }, // Contra-revenue
                    { code: '5110', name: 'Cost of Goods Sold', type: 'COGS', normalBalance: 'Debit' },
                    { code: '6110', name: 'Rent Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6120', name: 'Salaries Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6130', name: 'Office Supplies Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6140', name: 'Marketing Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6150', name: 'Utilities Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6160', name: 'Transportation Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6170', name: 'Meals & Entertainment Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6180', name: 'Equipment Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6190', name: 'Professional Services Expense', type: 'Expense', normalBalance: 'Debit' },
                    { code: '6200', name: 'Other Expense', type: 'Expense', normalBalance: 'Debit' },
                ],
                currentLedgerAccount: null // To store the account code for the ledger view
            },

           init() {
    this.loadData();
    const savedTheme = DataStorage.load('OwlioTheme') || 'dark-theme'; // Default to dark
    this.setTheme(savedTheme);
    this.render();
    this.bindEvents();
    this.updateAIInsights();
    this.updateBotAnalysis();
},
            loadData() {
                const saved = DataStorage.load('OwlioData');
                if (saved) {
                    this.state = { ...this.state, ...saved };
                }
            },

             // THIS IS THE CORRECTED saveData FUNCTION
            saveData() {
                // Create a copy of the state to avoid modifying the live application state.
                const stateToSave = { ...this.state };

                // List all the temporary properties that should NOT be saved.
                const transientKeys = [
                    'pixelAnimation',
                    'mobileMenuOpen',
                    'aiLoading',
                    'aiAnswer',
                    'quickSale' // <-- ADDED THIS KEY TO PREVENT SAVING THE QUICK SALE STATE
                ];

                // Remove each of these temporary properties from the copy before we save it.
                transientKeys.forEach(key => delete stateToSave[key]);

                // Now, save the cleaned object that only contains the important, persistent data.
                return DataStorage.save('OwlioData', stateToSave);
            },

            toggleMobileSidebar() {
                this.state.mobileMenuOpen = !this.state.mobileMenuOpen;
                const sidebar = document.getElementById('mobile-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                
                if (this.state.mobileMenuOpen) {
                    sidebar?.classList.add('open');
                    overlay?.classList.add('open');
                } else {
                    sidebar?.classList.remove('open');
                    overlay?.classList.remove('open');
                }
            },

            closeMobileSidebar() {
                this.state.mobileMenuOpen = false;
                const sidebar = document.getElementById('mobile-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                
                sidebar?.classList.remove('open');
                overlay?.classList.remove('open');
            },

            updateAIInsights() {
                if (this.state.currentUser) {
                    this.state.aiInsights = BubbleAI.generateBusinessInsights(
                        this.state.sales, 
                        this.state.products, 
                        this.state.customers,
                        this.state.expenses
                    );
                    this.state.lastAIUpdate = new Date().toISOString();
                    this.saveData();
                }
            },

            updateBotAnalysis() {
                if (this.state.currentUser) {
                    this.state.botAnalysis = AccuraBot.analyzeApp(this.state);
                    this.saveData();
                }
            },

            bindEvents() {
                document.addEventListener('click', (e) => {
    const themeOption = e.target.closest('[data-theme]');
    if (themeOption) {
        this.setTheme(themeOption.getAttribute('data-theme'));
    }

    if (e.target.matches('[data-action]') || e.target.closest('[data-action]')) {
        const actionElement = e.target.matches('[data-action]') ? e.target : e.target.closest('[data-action]');
        const action = actionElement.getAttribute('data-action');
        const id = actionElement.getAttribute('data-id');
        this.handleAction(action, id, e);
    }

    // --- NEW: Close dropdowns on outside click ---
    const dropdownToggle = e.target.closest('[data-action="toggle-task-dropdown"]');
    const dropdownMenu = e.target.closest('.task-actions-dropdown');

    if (!dropdownToggle && !dropdownMenu) {
        document.querySelectorAll('.task-actions-dropdown.open').forEach(d => {
            d.classList.remove('open');
        });
    }
    // --- END NEW ---
});

                document.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formId = e.target.id;
                    this.handleFormSubmit(formId, e.target);
                });

                window.addEventListener('resize', () => {
                    if (window.innerWidth >= 1024 && this.state.mobileMenuOpen) {
                        this.closeMobileSidebar();
                    }
                });

                // Event listener for AccuraBot chat send button
                document.addEventListener('DOMContentLoaded', () => {
                    const botChatSendButton = document.getElementById('bot-chat-send');
                    if (botChatSendButton) {
                        botChatSendButton.addEventListener('click', this.handleBotChatCommand.bind(this));
                    }
                    const botChatInput = document.getElementById('bot-chat-input');
                    if (botChatInput) {
                        botChatInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault(); // Prevent form submission if input is part of a form
                                this.handleBotChatCommand();
                            }
                        });
                    }
                });
            },

            handleAction(action, id, event) {
    const actions = {
        'login-admin': () => this.selectUser('admin'),
        'login-manager': () => this.selectUser('manager'),
        'login-worker': () => this.selectUser('worker'),
        'ask-ai': (id) => this.handleAiQuestion(id),
        'ask-ai-followup': () => {
            const followupEl = event?.target?.closest('[data-action="ask-ai-followup"][data-question]');
            const question = followupEl?.getAttribute('data-question');
            if (question) {
                this.handleAiQuestion(question.trim());
            }
        },
        'share-ai-response': () => {
            NotificationSystem.info('Sharing options coming soon.');
        },
        'copy-ai-response': async (id) => {
            const index = parseInt(id, 10);
            const message = this.state.aiChatHistory?.[index];
            if (!message) {
                NotificationSystem.error('Nothing to copy for this message.');
                return;
            }
            try {
                const text = this.extractPlainTextFromHtml(message.content || message.html || message.messageHtml || message.text || '');
                if (!text) {
                    NotificationSystem.warning('Response is empty.');
                    return;
                }
                if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
                NotificationSystem.success('Response copied to clipboard.');
            } catch (err) {
                console.error('Copy failed', err);
                NotificationSystem.error('Unable to copy response right now.');
            }
        },
        'like-ai-response': (id) => {
            const likeBtn = event?.target?.closest('[data-action="like-ai-response"]');
            const dislikeBtn = document.querySelector(`.ai-answer-footer[data-message-index="${id}"] [data-action="dislike-ai-response"]`);
            if (likeBtn) likeBtn.classList.toggle('active');
            if (likeBtn?.classList.contains('active')) {
                dislikeBtn?.classList.remove('active');
            }
        },
        'dislike-ai-response': (id) => {
            const dislikeBtn = event?.target?.closest('[data-action="dislike-ai-response"]');
            const likeBtn = document.querySelector(`.ai-answer-footer[data-message-index="${id}"] [data-action="like-ai-response"]`);
            if (dislikeBtn) dislikeBtn.classList.toggle('active');
            if (dislikeBtn?.classList.contains('active')) {
                likeBtn?.classList.remove('active');
            }
        },
        'tts-ai-response': (id) => this.handleAiTtsClick(parseInt(id, 10)),
        'logout': () => this.logout(),
        'toggle-mobile-menu': () => this.toggleMobileSidebar(),
        'toggle-notification-bar': () => this.toggleNotificationBar(),
        'dashboard': () => this.navigateToView('dashboard'),
        'tasks': () => this.navigateToView('tasks'),
        'send-task-to-branch': (id) => this.showModal('send-task-to-branch', id),
        'toggle-task-dropdown': (id) => this.toggleTaskActionsDropdown(id),
        'edit-task': (id) => this.showModal('create-task', id), // <-- ADD THIS LINE
        'delete-task': (id) => this.deleteTask(id),
        'view-task-report': (id) => this.showModal('view-task-report', id), // <-- ADD THIS
        'download-task-pdf': (id) => this.downloadTaskPdf(parseInt(id)),   // <-- ADD THIS
        'download-task-txt': (id) => this.downloadTaskTxt(parseInt(id)),   // <-- ADD THIS
        'create-task': () => this.showModal('create-task'),
        'join-task': (id) => this.handleJoinTask(id),
        'products': () => this.navigateToView('products'),
        'customers': () => this.navigateToView('customers'),
        'sales': () => this.navigateToView('sales'),
        'expenses': () => this.navigateToView('expenses'),
        'employees': () => this.navigateToView('employees'),
        'invoices': () => this.navigateToView('invoices'),
        'reports': () => this.navigateToView('reports'),
        'settings': () => this.navigateToView('settings'),
        'inbox': () => this.navigateToView('inbox'),
        'navigate-to-ai-or-bot': () => {
    if (this.state.aiMode === 'bot') {
        this.navigateToView('bot');
    } else {
        this.navigateToView('accura-ai');
    }
},
        'journal': () => this.navigateToView('journal'),
        'pnl': () => this.navigateToView('pnl'),
        'ledger': () => this.navigateToView('ledger'),
        'view-ledger-account': (id) => {
            this.state.currentLedgerAccount = id;
            this.state.currentView = 'ledger';
            this.render();
        },

        'filter-tasks': (id) => {
    this.state.taskFilter = id;
    this.render();
},
        'trial-balance': () => this.navigateToView('trial-balance'),
        'balance-sheet': () => this.navigateToView('balance-sheet'),
        'toggle-ai-mode': () => this.toggleAIMode(),
        'change-country': () => this.changeCountry(event.target.value),
        'add-product': () => this.showModal('add-product'),
        'edit-product': (id) => this.showModal('edit-product', id),
        'delete-product': (id) => this.deleteProduct(id),
        'add-customer': () => this.showModal('add-customer'),
        'edit-customer': (id) => this.showModal('edit-customer', id),
        'delete-customer': (id) => this.deleteCustomer(id),
        'add-sale': () => this.showModal('add-sale'),
        'add-expense': () => this.showModal('add-expense'),
        'edit-expense': (id) => this.showModal('edit-expense', id),
        'delete-expense': (id) => this.deleteExpense(id),
        'add-employee': () => this.showModal('add-employee'),
        'edit-employee': (id) => this.showModal('edit-employee', id),
        'delete-employee': (id) => this.deleteUser(id),
        'generate-invoice': (id) => this.generateInvoice(id),
        'download-invoice': (id) => this.downloadInvoice(id),
        'close-modal': () => this.closeModal(),
        'export-data': () => this.exportData(),
        'compose-message': () => this.showModal('compose-message'),
        'mark-read': (id) => this.markMessageRead(id),
        'refresh-ai': () => { this.updateAIInsights(); this.render(); },
        'refresh-bot': () => { this.updateBotAnalysis(); this.render(); },
        'bot-quick-action': (id) => this.handleBotQuickAction(id),
        'add-item-to-sale-cart': () => this.addToSaleCart(),
        'start-quick-sale': () => this.startQuickSale(),
        'quick-sale-add-product': (id) => this.quickSaleAddProduct(id, event),
        'quick-sale-remove-product': (id) => this.quickSaleRemoveProduct(id),
        'quick-sale-update-quantity': (id) => this.quickSaleUpdateQuantity(id, event.target.value),
        'quick-sale-decrement-quantity': (id) => this.quickSaleUpdateQuantity(id, -1, true),
        'quick-sale-increment-quantity': (id) => this.quickSaleUpdateQuantity(id, 1, true),
        'finalize-quick-sale': () => this.finalizeQuickSale(),
        'cancel-quick-sale': () => this.cancelQuickSale(),
        'add-journal-entry': () => this.showModal('add-journal-entry'),
        'add-journal-row': () => this.addJournalEntryRow(),
        'remove-journal-row': () => this.removeJournalEntryRow(event.target.closest('.journal-entry-row')),
        'handle-system-alert': () => this.handleBotStockAlertAction(this.state.products.filter(p => p.stock <= this.state.lowStockThreshold)),
        'filter-inbox': () => {
            this.state.inboxFilter = event.target.value;
            this.renderInbox();
        },
        'search-inbox': () => {
            this.state.inboxSearchTerm = event.target.value.toLowerCase();
            this.renderInbox();
        },
        'view-message': (id) => this.showModal('view-message', id),
        'delete-message': (id) => this.deleteMessage(id),
        'create-branch': () => this.showModal('create-branch'),
        'send-stock-request': (id) => this.handleTaskAction(id, 'send-stock-request'),
        'approve-stock-request': (id) => this.handleTaskAction(id, 'approve-stock-request'),
        'accept-stock': (id) => this.handleTaskAction(id, 'accept-stock'),
        'decline-request': (id) => {
            const reason = prompt("Please provide a reason for declining:");
            if (reason) {
                this.handleTaskAction(id, 'decline-request', reason);
            }
        },
    };

    if (actions[action]) {
        actions[action](id); // This is the corrected line
    }
},


            navigateToView(view) {
    if (view === 'accura-ai') {
        this.state.aiViewPhase = 'selection';
        this.state.aiChatHistory = []; // Clear previous chat history
        this.state.aiAudioPlayers = {};
    }
    this.stopInboxNotifications();
    this.state.quickSale.active = false; // Close quick sale if navigating away
    this.state.currentLedgerAccount = null; // Reset selected ledger account
    
    // --- THIS IS THE FIX ---
    // Instead of using complex and buggy logic, we directly update the state
    // and then re-render the application. This is much more reliable.
    this.state.currentView = view;
    this.render();
    // --- END OF FIX ---

    if (window.innerWidth < 1024) {
        this.closeMobileSidebar();
    }
},
          toggleAIMode() {
    if (this.state.aiMode === 'ai') {
        this.state.aiMode = 'bot';
        this.state.currentView = 'bot'; // This line navigates to the bot view
    } else {
        this.state.aiMode = 'ai';
        this.state.currentView = 'accura-ai'; // This line navigates back to the AI view
    }
    this.saveData();
    this.render(); // Re-render the app to show the new page
    NotificationSystem.success(`Switched to Accura${this.state.aiMode === 'ai' ? 'AI' : 'Bot'} mode`);
},

            changeCountry(countryCode) {
                if (['admin', 'manager'].includes(this.state.currentUser.role)) {
                    this.state.selectedCountry = countryCode;
                    this.saveData();
                    this.render();
                    NotificationSystem.success(`Currency changed to ${GCC_COUNTRIES[countryCode].currency}`);
                }
            },

             selectUser(role) {
                const usersInRole = this.state.users.filter(u => u.role === role);
                
                if (role === 'admin' || usersInRole.length === 1) {
                    this.loginAsUser(usersInRole[0].id);
                } else {
                    this.state.pendingRole = role;
                    this.state.currentView = 'userSelection';
                    this.render();
                }
            },

            loginAsUser(userId) {
                this.state.currentUser = this.state.users.find(u => u.id === parseInt(userId));
                this.state.currentView = 'dashboard';
                this.render();
                
            },
// PASTE THE NEW LOGOUT FUNCTION HERE
getUserSelectionView() {
                const role = this.state.pendingRole;
                const users = this.state.users.filter(u => u.role === role);
                return `
                    <div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #242938 100%);">
                        <div class="w-full max-w-4xl mx-auto">
                            <div class="text-center mb-8 fade-in">
                                <h1 class="text-4xl font-bold gradient-text">Select Profile</h1>
                                <p class="text-gray-300 mt-2 text-lg">Choose your profile to log in as a ${role}</p>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                ${users.map(user => `
                                    <div onclick="app.loginAsUser(${user.id})" class="user-selection-card fade-in" style="animation-delay: ${users.indexOf(user) * 100}ms;">
                                        <div class="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-4 border-gray-600">
                                            <span class="text-4xl font-bold text-white">${user.name.charAt(0)}</span>
                                        </div>
                                        <h3 class="text-lg font-semibold text-white">${user.name}</h3>
                                    </div>
                                `).join('')}
                            </div>
                             <div class="text-center mt-12 fade-in">
                                <button onclick="app.logout()" class="perplexity-button px-6 py-3">
                                    <i class="fas fa-arrow-left mr-2"></i>Back to Roles
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            },
            logout() {
                this.state.currentUser = null;
                this.state.currentView = 'login';
                this.state.pendingRole = null; // Reset this from the user selection flow
                this.saveData(); // Save the logged-out state
                this.render();
                NotificationSystem.info('You have been logged out.');
            },

            

            
            // Currency conversion utilities
            convertCurrency(amount, fromCurrency = 'USD', toCurrency = null) {
                if (!toCurrency) {
                    toCurrency = GCC_COUNTRIES[this.state.selectedCountry].currency;
                }
                
                if (fromCurrency === toCurrency) return amount;
                
                // Assuming all rates in GCC_COUNTRIES are relative to USD
                const selectedCountryRate = GCC_COUNTRIES[this.state.selectedCountry].rate;

                if (fromCurrency === 'USD') {
                    return amount * selectedCountryRate;
                }
                
                if (toCurrency === 'USD') {
                    return amount / selectedCountryRate;
                }
                
                // If converting between two non-USD currencies, convert to USD first, then to target
                // This part might need more robust handling if you introduce more base currencies
                // For now, assuming all internal calculations are in USD and then converted for display
                return amount; 
            },

            // CORRECTED CODE
            formatCurrency(amount, showSymbol = true) {
                const countryInfo = GCC_COUNTRIES[this.state.selectedCountry];
                // The 'amount' variable is already the correct local currency value.
                // We just need to format it with the correct symbol and decimal places.
                
                if (showSymbol) {
                    return `${countryInfo.symbol} ${amount.toFixed(2)}`;
                }
                return `${amount.toFixed(2)} ${countryInfo.currency}`;
            },


            getTaxInfo() {
                const countryInfo = GCC_COUNTRIES[this.state.selectedCountry];
                return {
                    rate: countryInfo.tax,
                    name: countryInfo.taxName,
                    amount: (value) => value * countryInfo.tax // Calculate tax on a given value
                };
            },

            handleFormSubmit(formId, form) {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                const handlers = {
    'product-form': () => this.handleProductForm(data),
    'send-task-form': () => this.handleSendTaskForm(data),
    'task-form': () => this.handleTaskForm(data),
    'announcement-form': () => this.handleAnnouncementForm(data),
    'customer-form': () => this.handleCustomerForm(data),
    'sale-form': () => this.handleSaleForm(data, form),
    'expense-form': () => this.handleExpenseForm(data),
    'employee-form': () => this.handleEmployeeForm(data),
    'message-form': () => this.handleMessageForm(data),
    'company-settings-form': () => this.handleCompanySettingsForm(data),
    'journal-entry-form': () => this.handleJournalEntryForm(form),
    'branch-form': () => this.handleBranchForm(data, form),
    'reply-form': () => this.handleReplyForm(data),
};

                if (handlers[formId]) {
                    handlers[formId]();
                }
            },

            handleProductForm(data) {
                const isEdit = document.getElementById('product-id').value;
                const product = {
                    id: isEdit ? parseInt(isEdit) : Date.now(),
                    name: data.name,
                    price: parseFloat(data.price),
                    cost: parseFloat(data.cost),
                    stock: parseInt(data.stock),
                    category: data.category,
                    description: data.description,
                    sku: data.sku,
                    supplier: data.supplier,
                    reorderLevel: parseInt(data.reorderLevel),
                    imageUrl: data.imageUrl || 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=Product'
                };

                if (isEdit) {
                    const index = this.state.products.findIndex(p => p.id === product.id);
                    this.state.products[index] = product;
                    NotificationSystem.success('Product updated successfully!');
                } else {
                    this.state.products.push(product);
                    NotificationSystem.success('Product added successfully!');
                }

                this.closeModal();
                this.saveData();
                this.updateAIInsights();
                this.updateBotAnalysis();
                this.render();
            },

            handleCustomerForm(data) {
                const isEdit = document.getElementById('customer-id').value;
                const customer = {
                    id: isEdit ? parseInt(isEdit) : Date.now(),
                    name: data.name,
                    type: data.type,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    taxId: data.taxId || '',
                    creditLimit: parseFloat(data.creditLimit) || 0,
                    balance: isEdit ? this.state.customers.find(c => c.id === parseInt(isEdit))?.balance || 0 : 0
                };

                if (isEdit) {
                    const index = this.state.customers.findIndex(c => c.id === customer.id);
                    this.state.customers[index] = customer;
                    NotificationSystem.success('Customer updated successfully!');
                } else {
                    this.state.customers.push(customer);
                    NotificationSystem.success('Customer added successfully!');
                }

                this.closeModal();
                this.saveData();
                this.updateAIInsights();
                this.updateBotAnalysis();
                this.render();
            },

            // New function to add items to the current sale cart
            addToSaleCart() {
                const productId = parseInt(document.getElementById('productId').value);
                const quantity = parseInt(document.getElementById('quantity').value);
                const unitPrice = parseFloat(document.getElementById('unitPrice').value);

                if (!productId || !quantity || !unitPrice) {
                    NotificationSystem.warning('Please select a product, quantity, and unit price.');
                    return;
                }

                const product = this.state.products.find(p => p.id === productId);
                if (!product) {
                    NotificationSystem.error('Selected product not found.');
                    return;
                }

                if (quantity > product.stock) {
                    NotificationSystem.warning(`Not enough stock for ${product.name}. Available: ${product.stock}`);
                    return;
                }

                // Check if product already in cart, update quantity
                const existingItemIndex = this.currentSaleCart.findIndex(item => item.productId === productId);
                if (existingItemIndex > -1) {
                    this.currentSaleCart[existingItemIndex].quantity += quantity;
                    this.currentSaleCart[existingItemIndex].unitPrice = unitPrice; // Update price in case it changed
                } else {
                    this.currentSaleCart.push({
                        productId: productId,
                        quantity: quantity,
                        unitPrice: unitPrice
                    });
                }
                
                NotificationSystem.success(`${quantity} x ${product.name} added to sale cart.`);
                this.updateSalePrice(); // Recalculate total after adding item
            },

          handleSaleForm(data, form) {
    const formData = new FormData(form);
    const customerId = parseInt(data.customerId);
    const saleDate = data.date;
    const saleType = data.saleType;
    const discount = parseFloat(data.discount) || 0;
    
    const productIds = formData.getAll('productIds');
    if (productIds.length === 0) {
        NotificationSystem.error('Please select at least one product.');
        return;
    }

    const saleItems = [];
    productIds.forEach(productIdStr => {
        const productId = parseInt(productIdStr);
        const product = this.state.products.find(p => p.id === productId);
        if (product) {
            saleItems.push({ productId: productId, quantity: 1, unitPrice: product.price });
        }
    });

    let subtotal = saleItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    let finalSubtotal = subtotal - discount; // This is the actual revenue from items

    // --- ACCURATE PROFIT CALCULATION ---
    const totalCost = saleItems.reduce((sum, item) => {
        const product = this.state.products.find(p => p.id === item.productId);
        return sum + ((product?.cost || 0) * item.quantity);
    }, 0);
    const totalProfit = finalSubtotal - totalCost; // Profit is revenue AFTER discount, minus cost
    // --- END ACCURATE PROFIT CALCULATION ---

    const taxRate = this.getTaxInfo().rate;
    const taxAmount = finalSubtotal * taxRate;
    const total = finalSubtotal + taxAmount;

    const sale = {
        id: Date.now(), customerId, items: saleItems, subtotal: finalSubtotal, taxAmount, taxRate,
        discount, total, date: saleDate, salesPersonId: this.state.currentUser.id, saleType,
    };

    // Update stock, customer balance, and commission
    sale.items.forEach(item => {
        const productIndex = this.state.products.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) this.state.products[productIndex].stock -= item.quantity;
    });
    if (sale.saleType === 'Credit') {
        const customer = this.state.customers.find(c => c.id === sale.customerId);
        if (customer) customer.balance = (customer.balance || 0) + sale.total;
    }
    const commission = totalProfit * 0.1;
    const userIndex = this.state.users.findIndex(u => u.id === this.state.currentUser.id);
    if (userIndex !== -1) {
        this.state.users[userIndex].commission = (this.state.users[userIndex].commission || 0) + commission;
        if(this.state.currentUser.id === this.state.users[userIndex].id) this.state.currentUser.commission = this.state.users[userIndex].commission;
    }

    this.state.sales.push(sale);
    this.createSaleJournalEntry(sale);
    this.updateTaskProgress(sale, totalProfit);

    this.closeModal();
    this.saveData();
    this.render();
    NotificationSystem.success(`Sale recorded! Total: ${this.formatCurrency(sale.total)}`);
    this.triggerStockAlertCheck();
},

// REPLACE your old handleTaskForm function with this new one.

handleTaskForm(data) {
    const isEdit = data.taskId !== '';
    const taskId = isEdit ? parseInt(data.taskId) : Date.now();

    const taskData = {
        id: taskId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        createdBy: isEdit ? this.state.tasks.find(t=>t.id === taskId).createdBy : this.state.currentUser.id,
        goalType: data.goalType,
        goalTarget: parseFloat(data.goalTarget),
        participantLimit: parseInt(data.participantLimit),
        accuraBotEnabled: data.accuraBotEnabled === 'on',
        accuraBotReportFrequency: data.accuraBotEnabled === 'on' ? data.accuraBotReportFrequency : null,
    };

    if (isEdit) {
        const taskIndex = this.state.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            // Preserve existing data that isn't in the form
            const oldTask = this.state.tasks[taskIndex];
            this.state.tasks[taskIndex] = { ...oldTask, ...taskData };
            NotificationSystem.success('Task updated successfully!');
        }
    } else {
        // This is the logic for CREATING a new task
        const newTask = {
            ...taskData,
            branchId: null, // Not assigned to a branch yet
            progress: 0,
            participants: [this.state.currentUser.id], // Creator is the first participant
            status: 'active',
            isSubTask: false, // This is a main task
            parentTaskId: null, // It has no parent
            lastNotifiedProgress: 0
        };
        this.state.tasks.push(newTask);
        NotificationSystem.success('New main task created! You can now assign it to a branch.');
    }

    this.saveData();
    this.closeModal();
    this.render();
},

            // REPLACE handleExpenseForm
            handleExpenseForm(data) {
                const isEdit = document.getElementById('expense-id').value;
                const expense = {
                    id: isEdit ? parseInt(isEdit) : Date.now(),
                    description: data.description,
                    amount: parseFloat(data.amount),
                    category: data.category,
                    date: data.date,
                    // THIS LINE IS THE CRUCIAL ADDITION FOR DATA ASSOCIATION
                    createdByUserId: this.state.currentUser.id,
                    notes: data.notes || ''
                };

                if (isEdit) {
                    const index = this.state.expenses.findIndex(e => e.id === expense.id);
                    // Preserve original creator when editing
                    expense.createdByUserId = this.state.expenses[index].createdByUserId;
                    this.state.expenses[index] = expense;
                    NotificationSystem.success('Expense updated successfully!');
                } else {
                    this.state.expenses.push(expense);
                    NotificationSystem.success('Expense recorded successfully!');
                }

                const expenseAccountCode = expense.category;
                const expenseDescription = `Expense recorded: ${expense.description}`;
                this.createTransaction(expense.date, expenseDescription, [
                    { accountCode: expenseAccountCode, debit: expense.amount, credit: 0 },
                    { accountCode: '1110', debit: 0, credit: expense.amount }
                ]);

                this.closeModal();
                this.saveData();
                this.render();
            },

            handleEmployeeForm(data) {
                const isEdit = document.getElementById('employee-id').value;
                const employee = {
                    id: isEdit ? parseInt(isEdit) : Date.now(),
                    name: data.name,
                    username: data.username,
                    role: data.role,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    hireDate: data.hireDate,
                    salary: parseFloat(data.salary) || 0, // Ensure proper parsing
                    commission: isEdit ? (this.state.users.find(u => u.id === parseInt(isEdit))?.commission || 0) : 0
                };

                if (isEdit) {
                    const employeeId = parseInt(isEdit);
                    const index = this.state.users.findIndex(u => u.id === employeeId);
                    if (index !== -1) {
                        // Preserve commission but update all other fields including salary
                        employee.commission = this.state.users[index].commission || 0;
                        this.state.users[index] = employee;
                        
                        // Update current user if editing self
                        if (this.state.currentUser.id === employeeId) {
                            this.state.currentUser = { ...employee };
                        }
                        
                        NotificationSystem.success('Employee updated successfully!');
                    } else {
                        NotificationSystem.error('Employee not found for update.');
                        return;
                    }
                } else {
                    this.state.users.push(employee);
                    NotificationSystem.success('Employee added successfully!');
                }

                this.closeModal();
                this.saveData();
                this.updateAIInsights();
                this.updateBotAnalysis();
                this.render();
            },


            /**
             * Handles the submission of the new message form.
             * It creates a new message object from the form data, adds AI-based sentiment analysis,
             * pushes it to the main messages array, and then saves the application state.
             * @param {object} data - The message data collected from the form, including recipient, subject, and content.
             */
            handleMessageForm(data) {
                const message = {
                    id: Date.now(),
                    from: this.state.currentUser.id,
                    to: parseInt(data.recipient),
                    subject: data.subject,
                    content: data.content,
                    timestamp: new Date().toISOString(),
                    read: false,
                    sentiment: BubbleAI.analyzeSentiment(data.content),
aiAnalysis: `Message categorized as ${BubbleAI.analyzeSentiment(data.content)} sentiment. Context: Business communication with professional tone recommended.`
                };

                this.state.messages.push(message);
                this.closeModal();
                this.saveData();
                this.updateBotAnalysis();
                this.render();
                NotificationSystem.success('Message sent with AI analysis!');
            },

            handleCompanySettingsForm(data) {
                this.state.companyName = data.companyName || 'Your Company';
                this.state.lowStockThreshold = parseInt(data.lowStockThreshold) || 10;
                
                this.saveData();
                this.render();
                NotificationSystem.success('Company settings updated successfully!');
            },
           


// REPLACE your old updateTaskProgress function with this new one.

updateTaskProgress(sale, profit) {
    const salespersonId = sale.salesPersonId;
    
    // Find all ACTIVE SUB-TASKS this salesperson is a part of.
    // We only process sub-tasks directly to prevent double-counting progress.
    const activeSubTasks = this.state.tasks.filter(task => 
        task.isSubTask &&
        task.status === 'active' && 
        task.participants.includes(salespersonId)
    );

    activeSubTasks.forEach(subTask => {
        const subTaskIndex = this.state.tasks.findIndex(t => t.id === subTask.id);
        if (subTaskIndex === -1) return;

        // --- 1. Calculate Progress to Add (with new 'count' type) ---
        let progressToAdd = 0;
        if (subTask.goalType === 'sales') {
            progressToAdd = sale.total;
        } else if (subTask.goalType === 'profit') {
            progressToAdd = Math.max(0, profit);
        } else if (subTask.goalType === 'count') {
            progressToAdd = 1; // Each sale counts as 1
        }
        
        if (progressToAdd === 0) return;

        // --- 2. Update the Sub-Task's Progress ---
        this.state.tasks[subTaskIndex].progress += progressToAdd;
        
        // --- 3. Find and Update the Parent Main Task's Progress ---
        const parentTaskIndex = this.state.tasks.findIndex(t => t.id === subTask.parentTaskId);
        if (parentTaskIndex !== -1) {
            this.state.tasks[parentTaskIndex].progress += progressToAdd;
        }

        // --- 4. Check for Sub-Task Completion ---
        const updatedSubTask = this.state.tasks[subTaskIndex];
        const progressPercentage = (updatedSubTask.progress / updatedSubTask.goalTarget) * 100;

        if (progressPercentage >= 100) {
            this.state.tasks[subTaskIndex].status = 'completed';
            NotificationSystem.success(`Personal goal achieved for "${updatedSubTask.title}"!`);
            
            // --- 5. IMPORTANT: Check if the Main Task is now complete ---
            this.checkMainTaskCompletion(updatedSubTask.parentTaskId);
        }
        
        // --- 6. Handle Bot Notifications for the MAIN task ---
        // This sends notifications based on the overall team progress.
        if (parentTaskIndex !== -1) {
            const mainTask = this.state.tasks[parentTaskIndex];
            if (mainTask.accuraBotEnabled) {
                const mainProgressPercentage = (mainTask.progress / mainTask.goalTarget) * 100;
                
                if (mainProgressPercentage >= 75 && mainTask.lastNotifiedProgress < 75) {
                    this.sendTaskProgressNotification(mainTask, '75');
                    this.state.tasks[parentTaskIndex].lastNotifiedProgress = 75;
                } else if (mainProgressPercentage >= 50 && mainTask.lastNotifiedProgress < 50) {
                    this.sendTaskProgressNotification(mainTask, '50');
                    this.state.tasks[parentTaskIndex].lastNotifiedProgress = 50;
                } else if (mainProgressPercentage >= 25 && mainTask.lastNotifiedProgress < 25) {
                    this.sendTaskProgressNotification(mainTask, '25');
                    this.state.tasks[parentTaskIndex].lastNotifiedProgress = 25;
                }
            }
        }
    });
},

getTaskHealthReportHTML(task) {
    const progressPercentage = Math.min((task.progress / task.goalTarget) * 100, 100).toFixed(1);
    const isCompleted = task.status === 'completed';
    const title = isCompleted ? `Task Completed!` : `Task Progress Update`;
    const participants = task.participants.map(pId => this.state.users.find(u => u.id === pId)?.name || 'Unknown');

    return `
        <div class="bot-task-report">
            <div class="flex items-center space-x-3 mb-4">
                <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-white"></i>
                </div>
                <div>
                    <h4 class="font-bold text-white">${title}</h4>
                    <p class="text-sm text-green-400">AccuraBot Report for "${task.title}"</p>
                </div>
            </div>
            <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-400">Progress:</span>
                    <span class="font-medium text-white">${this.formatCurrency(task.progress)} / ${this.formatCurrency(task.goalTarget)}</span>
                </div>
                <div>
                    <div class="report-progress-bar-container">
                        <div class="report-progress-bar-fill" style="width: ${progressPercentage}%;"></div>
                    </div>
                    <div class="text-right text-xs text-gray-400 mt-1">${progressPercentage}% Complete</div>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Participants (${participants.length}):</span>
                    <span class="font-medium text-white">${participants.slice(0, 2).join(', ')}${participants.length > 2 ? '...' : ''}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Due Date:</span>
                    <span class="font-medium text-white">${task.dueDate}</span>
                </div>
            </div>
            <p class="text-xs text-center text-gray-500 mt-4">${isCompleted ? 'Excellent work, team!' : 'Keep up the great momentum!'}</p>
        </div>
    `;
},

// REPLACE your current sendTaskProgressNotification function with this new one.
sendTaskProgressNotification(task, percentage) {
    const isCompleted = task.status === 'completed';
    // --- FIX: Emojis removed from subject line ---
    const subject = isCompleted 
        ? `Task Completed: "${task.title}"` 
        : `Progress Update: "${task.title}"`;

    const recipients = [...new Set([task.createdBy, ...task.participants])];
    recipients.forEach(userId => {
        const message = {
            id: Date.now() + userId,
            from: 1, // System ID for AccuraBot
            to: userId,
            subject: subject,
            content: this.getTaskHealthReportHTML(task), // The full report for the modal view
            type: 'personal',
            category: 'bot_update',
            timestamp: new Date().toISOString(),
            read: false,
            // --- NEW: Add raw task data directly to the message for easier display ---
            taskDetails: {
                progress: task.progress,
                goalTarget: task.goalTarget,
                status: task.status,
                progressPercentage: percentage // We pass the milestone percentage (25, 50, etc.)
            }
        };
        this.state.messages.push(message);
    });
},


// REPLACE this entire function
handleSendTaskForm(data) {
    const taskId = parseInt(data.taskId);
    const branchId = parseInt(data.branchId);
    
    const taskIndex = this.state.tasks.findIndex(t => t.id === taskId);
    const mainTask = this.state.tasks[taskIndex];
    const branch = this.state.branches.find(b => b.id === branchId);

    if (!mainTask || !branch) {
        NotificationSystem.error('Error: Task or Branch not found.');
        return;
    }

    // --- NEW LOGIC ---
    // The only action is to link the task to the branch.
    // We no longer create sub-tasks or add all members as participants here.
    this.state.tasks[taskIndex].branchId = branchId;

    this.saveData();
    this.closeModal();
    this.render();
    // Updated success message
    NotificationSystem.success(`Task is now available for the "${branch.name}" branch to join.`);
},

// PASTE THIS NEW HELPER FUNCTION

toggleAccuraBotOptions(toggleElement) {
    const optionsDiv = document.getElementById('accurabot-options');
    const iconDiv = document.getElementById('accurabot-icon');
    const checkbox = document.getElementById('accuraBotEnabled');
    const messageDiv = document.getElementById('accurabot-message'); // Get the new message div

    toggleElement.classList.toggle('active');

    if (toggleElement.classList.contains('active')) {
        checkbox.checked = true;
        optionsDiv.classList.remove('hidden');
        iconDiv.classList.add('bot-pulse');

        // --- NEW INTERACTIVE MESSAGE LOGIC ---
        if (messageDiv) {
            // Set a slight delay to make it feel more interactive
            setTimeout(() => {
                messageDiv.innerHTML = `
                    <div class="bot-message-fade-in flex items-start space-x-3 p-3 bg-green-500/10 border-l-4 border-green-500/50 rounded-r-lg">
                        <i class="fas fa-robot text-green-400 mt-1"></i>
                        <p class="text-green-300">Excellent! I will monitor this task. How often do you need the reports?</p>
                    </div>
                `;
            }, 200); // 200ms delay
        }

    } else {
        checkbox.checked = false;
        optionsDiv.classList.add('hidden');
        iconDiv.classList.remove('bot-pulse');
        
        // --- CLEAR THE MESSAGE WHEN TOGGLED OFF ---
        if (messageDiv) {
            messageDiv.innerHTML = '';
        }
    }
},
            handleJournalEntryForm(form) {
                const date = form.querySelector('#journalDate').value;
                const description = form.querySelector('#journalDescription').value;
                const entryRows = form.querySelectorAll('.journal-entry-row');
                
                const entries = [];
                let totalDebits = 0;
                let totalCredits = 0;

                entryRows.forEach(row => {
                    const accountCode = row.querySelector('select[name="accountCode"]').value;
                    const debit = parseFloat(row.querySelector('input[name="debit"]').value) || 0;
                    const credit = parseFloat(row.querySelector('input[name="credit"]').value) || 0;

                    entries.push({ accountCode, debit, credit });
                    totalDebits += debit;
                    totalCredits += credit;
                });

                if (Math.abs(totalDebits - totalCredits) > 0.01) {
                    NotificationSystem.error('Journal entry is unbalanced! Debits must equal Credits.');
                    return;
                }

                this.createTransaction(date, description, entries);
                this.closeModal();
                this.saveData();
                this.render();
                NotificationSystem.success('Journal entry recorded successfully!');
            },

            // Permission methods
            canManageProducts() {
                return ['admin', 'manager'].includes(this.state.currentUser.role);
            },

            canManageEmployees() {
                return ['admin', 'manager'].includes(this.state.currentUser.role);
            },

            canViewReports() {
                return ['admin', 'manager'].includes(this.state.currentUser.role);
            },

            getUnreadMessageCount() {
                return this.state.messages.filter(m => m.to === this.state.currentUser.id && !m.read).length;
            },

            // Modal functions
            showModal(type, id = null) {
                const modal = document.getElementById('modal');
                const modalContent = document.getElementById('modal-content');

                if (!modal || !modalContent) {
                    console.error('Modal container not found in DOM!');
                    return;
                }

                // Get the specific HTML content for the modal type
                const { title, content } = this.getModalContent(type, id);

                // Update the modal's title and content
                modalContent.innerHTML = `
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-white">${title}</h3>
                        <button data-action="close-modal" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    ${content}
                `;

                // Show the modal
                modal.classList.remove('hidden');


                if (id && type.includes('edit')) {
                    this.prefillEditForm(type, parseInt(id));
                }

                // Specific logic for sale modal to initialize price calculation
                if (type === 'add-sale') {
                    this.currentSaleCart = []; // Clear cart for new sale
                    setTimeout(() => {
                        const productSelect = document.getElementById('productId');
                        const quantityInput = document.getElementById('quantity');
                        const unitPriceInput = document.getElementById('unitPrice');
                        const discountInput = document.getElementById('discount');
                        const addItemButton = document.getElementById('add-item-to-sale-cart-button');

                        // Set initial quantity to 1
                        if (quantityInput) quantityInput.value = 1;

                        // Event listeners for real-time price updates
                        if (productSelect) productSelect.addEventListener('change', this.updateSalePrice.bind(this));
                        if (quantityInput) quantityInput.addEventListener('input', this.updateSalePrice.bind(this));
                        if (unitPriceInput) unitPriceInput.addEventListener('input', this.updateSalePrice.bind(this));
                        if (discountInput) discountInput.addEventListener('input', this.updateSalePrice.bind(this));
                        if (addItemButton) addItemButton.addEventListener('click', this.addToSaleCart.bind(this));

                        this.updateSalePrice(); // Initial calculation
                    }, 100); // Small delay to ensure elements are rendered
                }

                if (type === 'add-journal-entry') {
                    setTimeout(() => {
                        this.addJournalEntryRow(); // Add initial row
                        this.updateJournalEntryTotals(); // Calculate totals
                    }, 100);
                }
            },

            closeModal() {
                const modal = document.getElementById('modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
                const modalContent = document.getElementById('modal-content');
                if (modalContent) {
                    modalContent.innerHTML = ''; // Clear content to prevent old data from flashing
                }
            },

        // REPLACE this entire function in your code
getModalContent(type, id = null) {
    const isEdit = id !== null;
    let content = '';
    let title = '';

    switch (type) {
        // --- THIS IS THE CORRECTED CASE FOR ASSIGNING TASKS ---
        case 'send-task-to-branch':
            title = 'Assign Task to a Branch';
            const taskToAssign = this.state.tasks.find(t => t.id === parseInt(id));
            
            // Filter branches to only include those the current user is a member of
            const manageableBranches = this.state.branches.filter(branch =>
                branch.members.includes(this.state.currentUser.id)
            );

            if (manageableBranches.length === 0) {
                content = `
                    <div class="p-4 bg-yellow-500/10 border-l-4 border-yellow-500/50 rounded-r-lg">
                        <h4 class="font-bold text-yellow-300">No Branches Available</h4>
                        <p class="text-yellow-400 mt-2">You are not a member of any branches. You must first join or create a branch before you can assign this task.</p>
                    </div>
                    <div class="flex justify-end pt-6">
                         <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Close</button>
                    </div>
                `;
            } else {
                content = `
                    <form id="send-task-form">
                        <input type="hidden" name="taskId" value="${taskToAssign.id}">
                        <p class="text-gray-300 mb-4">Select one of your branches to assign the task: <strong class="text-white">${taskToAssign.title}</strong></p>
                        <div>
                            <label for="branchId" class="block text-sm font-medium text-gray-300 mb-2">Branch</label>
                            <select id="branchId" name="branchId" class="form-input w-full" required>
                                <option value="">Select a branch...</option>
                                ${manageableBranches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex justify-end space-x-3 pt-6">
                            <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                            <button type="submit" class="perplexity-button px-6 py-3 rounded-xl">Assign Task</button>
                        </div>
                    </form>
                `;
            }
            break;

            // In script.js, inside the switch statement of getModalContent()

        case 'compose-message':
            title = 'New Message';
            const recipientId = id ? parseInt(id) : null;
            const preselectedUser = recipientId ? this.state.users.find(u => u.id === recipientId) : null;
            
            content = `
                <form id="message-form" class="space-y-4">
                    <div>
                        <label for="recipient" class="block text-sm font-medium text-gray-300 mb-2">To</label>
                        <select id="recipient" name="recipient" class="form-input w-full" required>
                            <option value="">Select recipient...</option>
                            <optgroup label="Direct Messages">
                                ${this.state.users
                                    .filter(u => u.id !== this.state.currentUser.id)
                                    .map(u => `
                                        <option value="${u.id}" ${preselectedUser && preselectedUser.id === u.id ? 'selected' : ''}>
                                            ${u.name} (${u.role})
                                        </option>
                                    `).join('')}
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label for="subject" class="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                        <input type="text" id="subject" name="subject" class="form-input w-full" required>
                    </div>
                    <div>
                        <label for="content" class="block text-sm font-medium text-gray-300 mb-2">Message</label>
                        <textarea id="content" name="content" rows="4" class="form-input w-full" required></textarea>
                    </div>
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                        <button type="submit" class="perplexity-button">Send Message</button>
                    </div>
                </form>
            `;
            break;
     
        case 'view-task-report':
            title = 'Task Performance Report';
            content = `
                <div class="bg-white rounded-lg max-h-[70vh] overflow-y-auto">
                    ${this.getTaskReportHtml(parseInt(id))}
                </div>
                <div class="flex justify-end space-x-3 pt-6">
                    <button data-action="download-task-txt" data-id="${id}" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">
                        <i class="fas fa-file-alt mr-2"></i>Download TXT
                    </button>
                    <button data-action="download-task-pdf" data-id="${id}" class="bot-button px-6 py-3 rounded-xl">
                        <i class="fas fa-file-pdf mr-2"></i>Download PDF
                    </button>
                </div>
            `;
            break;

        case 'add-customer':
        case 'edit-customer':
            title = isEdit ? 'Edit Customer' : 'Add New Customer';
            const customer = isEdit ? this.state.customers.find(c => c.id === parseInt(id)) : {};
            content = `
                <form id="customer-form" class="space-y-4">
                    <input type="hidden" id="customer-id" value="${id || ''}">
                    <input type="text" name="name" placeholder="Name" class="form-input w-full" value="${customer?.name || ''}" required>
                    <select name="type" class="form-input w-full">
                        <option value="Individual" ${customer?.type === 'Individual' ? 'selected' : ''}>Individual</option>
                        <option value="Business" ${customer?.type === 'Business' ? 'selected' : ''}>Business</option>
                    </select>
                    <input type="email" name="email" placeholder="Email" class="form-input w-full" value="${customer?.email || ''}">
                    <input type="tel" name="phone" placeholder="Phone" class="form-input w-full" value="${customer?.phone || ''}">
                    <input type="text" name="address" placeholder="Address" class="form-input w-full" value="${customer?.address || ''}">
                    <input type="text" name="taxId" placeholder="Tax ID (Optional)" class="form-input w-full" value="${customer?.taxId || ''}">
                    <input type="number" name="creditLimit" placeholder="Credit Limit" class="form-input w-full" value="${customer?.creditLimit || ''}">
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                        <button type="submit" class="perplexity-button">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
                    </div>
                </form>
            `;
            break;

        case 'add-employee':
        case 'edit-employee':
            title = isEdit ? 'Edit Employee' : 'Add New Employee';
            const employee = isEdit ? this.state.users.find(u => u.id === parseInt(id)) : {};
            content = `
                <form id="employee-form" class="space-y-4">
                    <input type="hidden" id="employee-id" value="${id || ''}">
                    <input type="text" name="name" placeholder="Full Name" class="form-input w-full" value="${employee?.name || ''}" required>
                    <input type="text" name="username" placeholder="Username" class="form-input w-full" value="${employee?.username || ''}" required>
                    <select name="role" class="form-input w-full" required>
                        <option value="worker" ${employee?.role === 'worker' ? 'selected' : ''}>Worker</option>
                        <option value="manager" ${employee?.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="admin" ${employee?.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <input type="email" name="email" placeholder="Email" class="form-input w-full" value="${employee?.email || ''}" required>
                    <input type="tel" name="phone" placeholder="Phone" class="form-input w-full" value="${employee?.phone || ''}">
                    <input type="text" name="address" placeholder="Address" class="form-input w-full" value="${employee?.address || ''}">
                    <input type="date" name="hireDate" class="form-input w-full" value="${employee?.hireDate || ''}" required>
                    <input type="number" name="salary" placeholder="Annual Salary" class="form-input w-full" value="${employee?.salary || ''}" required>
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                        <button type="submit" class="perplexity-button">${isEdit ? 'Save Changes' : 'Add Employee'}</button>
                    </div>
                </form>
            `;
            break;

        case 'create-branch':
            title = 'Create New Branch';
            content = `
                <form id="branch-form" class="space-y-4">
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-300 mb-2">Branch Name</label>
                        <input type="text" id="name" name="name" class="form-input w-full" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Select Members</label>
                        <div class="max-h-48 overflow-y-auto p-2 bg-gray-900 rounded-lg border border-gray-700 space-y-2">
                            ${this.state.users.map(user => `
                                <div class="flex items-center">
                                    <input type="checkbox" id="member-${user.id}" name="members" value="${user.id}" class="form-checkbox h-5 w-5 rounded text-teal-500 bg-gray-800 border-gray-600 focus:ring-teal-500">
                                    <label for="member-${user.id}" class="ml-3 text-white">${user.name} (${user.role})</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                        <button type="submit" class="perplexity-button px-6 py-3 rounded-xl">Create Branch</button>
                    </div>
                </form>
            `;
            break;

        case 'view-message':
            title = 'Message Details';
            const message = this.state.messages.find(m => m.id === parseInt(id));
            if (message) {
                const fromUser = this.state.users.find(u => u.id === message.from);
                const isSystemAlert = message.from === 1 && message.category === 'emergency';
                
                content = `
                    <div class="space-y-4">
                        <div class="flex items-center space-x-4 pb-4 border-b border-gray-700">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center ${
                                isSystemAlert ? 'bg-red-500/20' : 'bg-gradient-to-br from-teal-500 to-blue-500'
                            }">
                                ${isSystemAlert ? 
                                    '<i class="fas fa-robot text-red-400"></i>' :
                                    `<span class="text-white font-bold">${fromUser ? fromUser.name.charAt(0) : 'S'}</span>`
                                }
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-bold text-white">${isSystemAlert ? 'AccuraBot Alert' : fromUser ? fromUser.name : 'System'}</h3>
                                <p class="text-sm text-gray-400">${this.formatMessageTime(message.timestamp)}</p>
                            </div>
                        </div>
                        
                        <div class="bg-gray-800/50 rounded-xl p-4">
                            <h4 class="font-bold text-white mb-2">${message.subject}</h4>
                            <p class="text-gray-300 whitespace-pre-wrap">${message.content}</p>
                        </div>
                        
                        ${message.type === 'task' ? `
                            <div class="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                                <h4 class="font-bold text-purple-400 mb-3 flex items-center">
                                    <i class="fas fa-tasks mr-2"></i>Task Information
                                </h4>
                                <div class="space-y-2">
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Status:</span>
                                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${
                                            message.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            message.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }">
                                            ${message.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    ${message.taskDetails ? `
                                        <div class="flex justify-between">
                                            <span class="text-gray-400">Requested Stock:</span>
                                            <span class="text-white font-medium">${message.taskDetails.requestedStock} units</span>
                                        </div>
                                    ` : ''}
                                </div>
                                
                                <div class="mt-4 pt-4 border-t border-purple-500/30">
                                    <h5 class="font-medium text-white mb-2">History</h5>
                                    <div class="space-y-2">
                                        ${message.history.map(h => `
                                            <div class="text-sm">
                                                <span class="text-gray-500">${new Date(h.timestamp).toLocaleString()}</span>
                                                <div class="text-gray-300">${h.user}: ${h.action}</div>
                                                ${h.reason ? `<div class="text-gray-400 italic">Reason: ${h.reason}</div>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-purple-500/30">
                                    ${message.status === 'pending_worker_approval' && message.to === this.state.currentUser.id ? 
                                        `<button data-action="send-stock-request" data-id="${message.id}" class="perplexity-button px-4 py-2 rounded-xl">
                                            <i class="fas fa-paper-plane mr-2"></i>Send to Manager
                                        </button>` : ''}
                                    ${message.status === 'pending_manager_approval' && message.to === this.state.currentUser.id ? 
                                        `<button data-action="approve-stock-request" data-id="${message.id}" class="ai-button px-4 py-2 rounded-xl">
                                            <i class="fas fa-check mr-2"></i>Approve
                                        </button>` : ''}
                                    ${message.status === 'approved_pending_acceptance' && message.to === this.state.currentUser.id ? 
                                        `<button data-action="accept-stock" data-id="${message.id}" class="bot-button px-4 py-2 rounded-xl">
                                            <i class="fas fa-box-open mr-2"></i>Accept Stock
                                        </button>` : ''}
                                    ${(message.status === 'pending_worker_approval' || message.status === 'pending_manager_approval') && message.to === this.state.currentUser.id ? 
                                        `<button data-action="decline-request" data-id="${message.id}" class="expenses-button px-4 py-2 rounded-xl">
                                            <i class="fas fa-times mr-2"></i>Decline
                                        </button>` : ''}
                                </div>
                            </div>
                        ` : `
                            <div class="border-t border-gray-700 pt-4">
                                <form id="reply-form" class="space-y-3">
                                    <input type="hidden" name="recipient" value="${message.from}">
                                    <input type="hidden" name="subject" value="Re: ${message.subject}">
                                    <div class="relative">
                                        <textarea 
                                            name="content" 
                                            class="form-input w-full pr-12" 
                                            placeholder="Type your reply..." 
                                            rows="3"
                                            required
                                        ></textarea>
                                        <button type="submit" class="absolute bottom-3 right-3 text-teal-400 hover:text-teal-300 transition-colors">
                                            <i class="fas fa-paper-plane text-xl"></i>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        `}
                    </div>
                `;
            }
            break;

        case 'create-task':
            const task = isEdit ? this.state.tasks.find(t => t.id === parseInt(id)) : {};
            title = isEdit ? 'Edit Task' : 'Create New Collaborative Task';
            
            content = `
                <form id="task-form" class="space-y-4">
                    <input type="hidden" name="taskId" value="${id || ''}">
                    <div>
                        <label for="title" class="block text-sm font-medium text-gray-300 mb-2">Task Title</label>
                        <input type="text" id="title" name="title" class="form-input w-full" value="${task?.title || ''}" placeholder="e.g., Q3 Sales Drive" required>
                    </div>
                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea id="description" name="description" rows="3" class="form-input w-full" placeholder="Describe the main objective of this task...">${task?.description || ''}</textarea>
                    </div>
                    <div>
                        <label for="dueDate" class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                        <input type="date" id="dueDate" name="dueDate" class="form-input w-full" value="${task?.dueDate || ''}" required>
                    </div>
                    
                    <div class="perplexity-card p-4">
                        <h4 class="font-semibold text-white mb-3">Task Goal</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="goalType" class="block text-sm font-medium text-gray-300 mb-2">Goal Type</label>
                                <select id="goalType" name="goalType" class="form-input w-full">
                                    <option value="sales" ${task?.goalType === 'sales' ? 'selected' : ''}>Total Sales Value (e.g., 5000)</option>
                                    <option value="profit" ${task?.goalType === 'profit' ? 'selected' : ''}>Total Profit Value (e.g., 1500)</option>
                                    <option value="count" ${task?.goalType === 'count' ? 'selected' : ''}>Number of Sales (e.g., 50)</option>
                                </select>
                            </div>
                            <div>
                                <label for="goalTarget" class="block text-sm font-medium text-gray-300 mb-2">Goal Target</label>
                                <input type="number" id="goalTarget" name="goalTarget" class="form-input w-full" value="${task?.goalTarget || ''}" placeholder="e.g., 5000 or 50" required>
                            </div>
                        </div>
                    </div>

                    <div class="perplexity-card p-4">
                        <h4 class="font-semibold text-white mb-3">Collaboration & Reporting</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                                <label for="participantLimit" class="block text-sm font-medium text-gray-300 mb-2">Max Participants</label>
                                <input type="number" id="participantLimit" name="participantLimit" class="form-input w-full" value="${task?.participantLimit || '5'}" placeholder="e.g., 5" required>
                            </div>
                            <div class="flex items-center space-x-3 mt-6">
                                 <div id="accurabot-icon" class="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center ${task?.accuraBotEnabled ? 'bot-pulse' : ''}">
                                     <i class="fas fa-robot text-white"></i>
                                 </div>
                                 <label for="accuraBotEnabled" class="text-white">Enable AccuraBot Reports</label>
                                 <div class="toggle-switch ${task?.accuraBotEnabled ? 'active' : ''}" onclick="app.toggleAccuraBotOptions(this)">
                                    <div class="toggle-knob"></div>
                                 </div>
                                 <input type="checkbox" id="accuraBotEnabled" name="accuraBotEnabled" class="hidden" ${task?.accuraBotEnabled ? 'checked' : ''}>
                            </div>
                        </div>
                         <div id="accurabot-options" class="mt-4 space-y-2 ${task?.accuraBotEnabled ? '' : 'hidden'}">
                            <div id="accurabot-message" class="mb-3"></div>
                            <label for="accuraBotReportFrequency" class="block text-sm font-medium text-gray-300">Report Frequency</label>
                            <select id="accuraBotReportFrequency" name="accuraBotReportFrequency" class="form-input w-full">
                                <option value="daily" ${task?.accuraBotReportFrequency === 'daily' ? 'selected' : ''}>Daily</option>
                                <option value="weekly" ${task?.accuraBotReportFrequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="end_of_task" ${task?.accuraBotReportFrequency === 'end_of_task' ? 'selected' : ''}>End of Task</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                        <button type="submit" class="ai-button px-6 py-3 rounded-xl">${isEdit ? 'Save Changes' : 'Create Task'}</button>
                    </div>
                </form>
            `;
            break;

        case 'confirm-delete':
            title = id.title; 
            content = `
                <p class="text-gray-300 mb-6">${id.message}</p>
                <div class="flex justify-end space-x-3">
                    <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                    <button type="button" id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl">Confirm Delete</button>
                </div>
            `;
            setTimeout(() => {
                document.getElementById('confirm-delete-btn').onclick = id.onConfirm;
            }, 50);
            break;

        case 'add-product':
        case 'edit-product':
            title = isEdit ? 'Edit Product' : 'Add New Product';
            const product = isEdit ? this.state.products.find(p => p.id === parseInt(id)) : {};
            content = `
                <form id="product-form" class="space-y-4">
                    <input type="hidden" id="product-id" value="${id || ''}">
                    <div class="form-grid-responsive">
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                            <input type="text" id="name" name="name" class="form-input w-full" value="${product?.name || ''}" required>
                        </div>
                        <div>
                            <label for="category" class="block text-sm font-medium text-gray-300 mb-2">Category</label>
                            <select id="category" name="category" class="form-input w-full" required>
                                ${this.state.categories.map(cat => `<option value="${cat}" ${product?.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea id="description" name="description" rows="3" class="form-input w-full">${product?.description || ''}</textarea>
                    </div>
                    <div class="form-grid-responsive">
                        <div>
                            <label for="price" class="block text-sm font-medium text-gray-300 mb-2">Selling Price</label>
                            <input type="number" id="price" name="price" step="0.01" min="0" class="form-input w-full" value="${product?.price || ''}" required>
                        </div>
                        <div>
                            <label for="cost" class="block text-sm font-medium text-gray-300 mb-2">Cost Price</label>
                            <input type="number" id="cost" name="cost" step="0.01" min="0" class="form-input w-full" value="${product?.cost || ''}" required>
                        </div>
                        <div>
                            <label for="stock" class="block text-sm font-medium text-gray-300 mb-2">Stock</label>
                            <input type="number" id="stock" name="stock" min="0" class="form-input w-full" value="${product?.stock || ''}" required>
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                        <button type="submit" class="perplexity-button px-6 py-3 rounded-xl">${isEdit ? 'Save Changes' : 'Add Product'}</button>
                    </div>
                </form>
            `;
            break;
                    
        case 'add-sale':
            title = 'Record a New Sale';
            content = `
                <form id="sale-form" class="space-y-4">
                    <div class="form-grid-responsive">
                        <div>
                            <label for="customerId" class="block text-sm font-medium text-gray-300 mb-2">Customer</label>
                            <select id="customerId" name="customerId" class="form-input w-full" required>
                                ${this.state.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="date" class="block text-sm font-medium text-gray-300 mb-2">Sale Date</label>
                            <input type="date" id="date" name="date" value="${new Date().toISOString().split('T')[0]}" class="form-input w-full" required>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Products</label>
                        <div class="max-h-48 overflow-y-auto p-2 bg-gray-900 rounded-lg border border-gray-700 space-y-2">
                            ${this.state.products.map(p => `
                                <div class="flex items-center">
                                    <input type="checkbox" id="product-${p.id}" name="productIds" value="${p.id}" data-id="${p.id}" class="form-checkbox h-5 w-5 rounded text-teal-500 bg-gray-800 border-gray-600 focus:ring-teal-500">
                                    <label for="product-${p.id}" class="ml-3 text-white">${p.name} (${this.formatCurrency(p.price)}) - Stock: ${p.stock}</label>
                                </div>
                            `).join('')}
                        </div>
                        </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="saleType" class="block text-sm font-medium text-gray-300 mb-2">Sale Type</label>
                            <select id="saleType" name="saleType" class="form-input w-full">
                                <option value="Cash">Cash</option>
                                <option value="Credit">Credit</option>
                            </select>
                        </div>
                            <div>
                            <label for="discount" class="block text-sm font-medium text-gray-300 mb-2">Discount</label>
                            <input type="number" id="discount" name="discount" value="0" step="0.01" min="0" class="form-input w-full">
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                        <button type="submit" class="perplexity-button px-6 py-3 rounded-xl">Record Sale</button>
                    </div>
                </form>
            `;
            break;
           
        case 'branch-chat':
            const branch = this.state.branches.find(b => b.id === parseInt(id));
            if (branch) {
                title = branch.name;
                const branchMessages = this.state.messages.filter(m => m.type === 'branch' && m.branchId === branch.id)
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                content = `
                    <div class="space-y-4">
                        <div class="branch-header -mx-8 -mt-8 px-8 py-4 mb-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-lg font-bold text-white">${branch.name}</h3>
                                    <div class="branch-members-list">
                                        ${branch.members.map(memberId => {
                                            const user = this.state.users.find(u => u.id === memberId);
                                            return user ? `<span class="branch-member-chip">${user.name}</span>` : '';
                                        }).join('')}
                                    </div>
                                </div>
                                <button data-action="close-modal" class="text-gray-400 hover:text-white">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="space-y-3 max-h-96 overflow-y-auto" id="branch-messages-container">
                            ${branchMessages.length > 0 ? branchMessages.map(msg => this.renderBranchMessageBubbleHTML(msg)).join('') : `
                                <div class="text-center text-gray-400 py-8">
                                    <i class="fas fa-comments text-3xl mb-2"></i>
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            `}
                        </div>
                        
                        <form onsubmit="app.sendBranchMessage(event, ${branch.id})" class="flex gap-2 mt-4">
                            <input type="text" 
                                   id="branch-message-input" 
                                   placeholder="Type a message..." 
                                   class="form-input flex-1" 
                                   required>
                            <button type="submit" class="perplexity-button px-4">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                `;
                
                setTimeout(() => {
                    const container = document.getElementById('branch-messages-container');
                    if (container) container.scrollTop = container.scrollHeight;
                }, 100);
            }
            break;
 
        case 'add-expense':
        case 'edit-expense':
            title = isEdit ? 'Edit Expense' : 'Add New Expense';
            const expense = isEdit ? this.state.expenses.find(e => e.id === parseInt(id)) : {};
            content = `
            <form id="expense-form" class="space-y-4">
                <input type="hidden" id="expense-id" value="${id || ''}">
                <div>
                    <label for="description" class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <input type="text" id="description" name="description" class="form-input w-full" value="${expense?.description || ''}" required>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="amount" class="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                        <input type="number" id="amount" name="amount" step="0.01" min="0" class="form-input w-full" value="${expense?.amount || ''}" required>
                    </div>
                    <div>
                        <label for="date" class="block text-sm font-medium text-gray-300 mb-2">Expense Date</label>
                        <input type="date" id="date" name="date" value="${expense?.date || new Date().toISOString().split('T')[0]}" class="form-input w-full" required>
                    </div>
                </div>
                <div>
                    <label for="category" class="block text-sm font-medium text-gray-300 mb-2">Category</label>
                        <select id="category" name="category" class="form-input w-full" required>
                        ${this.state.chartOfAccounts.filter(acc => acc.type === 'Expense').map(cat => `<option value="${cat.code}" ${expense?.category === cat.code ? 'selected' : ''}>${cat.name}</option>`).join('')}
                    </select>
                </div>
                    <div>
                    <label for="notes" class="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                    <textarea id="notes" name="notes" rows="2" class="form-input w-full">${expense?.notes || ''}</textarea>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" data-action="close-modal" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl">Cancel</button>
                    <button type="submit" class="expenses-button px-6 py-3 rounded-xl">${isEdit ? 'Save Changes' : 'Add Expense'}</button>
                </div>
            </form>
            `;
            break;

      default:
            title = 'Action Not Found';
            content = '<p class="text-red-400">The content for this modal could not be found.</p>';
            break;
    }

    return { title, content };
},
            prefillEditForm(type, id) {
                let item;
                if (type === 'edit-product') {
                    item = this.state.products.find(p => p.id === id);
                } else if (type === 'edit-customer') {
                    item = this.state.customers.find(c => c.id === id);
                } else if (type === 'edit-employee') {
                    item = this.state.users.find(u => u.id === id);
                } else if (type === 'edit-expense') {
                    item = this.state.expenses.find(e => e.id === id);
                }

                if (item) {
                    setTimeout(() => {
                        Object.keys(item).forEach(key => {
                            const input = document.getElementById(key);
                            if (input) {
                                input.value = item[key];
                            }
                        });
                        
                        const idField = document.getElementById(`${type.split('-')[1]}-id`);
                        if (idField) idField.value = id;
                    }, 100);
                }
            },

            deleteProduct(id) {
                if (confirm('Are you sure you want to delete this product?')) {
                    this.state.products = this.state.products.filter(p => p.id !== parseInt(id));
                    this.saveData();
                    this.updateAIInsights();
                    this.updateBotAnalysis();
                    this.render();
                    NotificationSystem.success('Product deleted successfully!');
                }
            },

            deleteCustomer(id) {
                if (confirm('Are you sure you want to delete this customer?')) {
                    this.state.customers = this.state.customers.filter(c => c.id !== parseInt(id));
                    this.saveData();
                    this.updateAIInsights();
                    this.updateBotAnalysis();
                    this.render();
                    NotificationSystem.success('Customer deleted successfully!');
                }
            },

            deleteExpense(id) {
                if (confirm('Are you sure you want to delete this expense?')) {
                    this.state.expenses = this.state.expenses.filter(e => e.id !== parseInt(id));
                    this.saveData();
                    this.updateAIInsights();
                    this.updateBotAnalysis();
                    this.render();
                    NotificationSystem.success('Expense deleted successfully!');
                }
            },

            deleteUser(id) {
                if (confirm('Are you sure you want to delete this employee?')) {
                    this.state.users = this.state.users.filter(u => u.id !== parseInt(id));
                    this.saveData();
                    this.updateAIInsights();
                    this.updateBotAnalysis();
                    this.render();
                    NotificationSystem.success('Employee deleted successfully!');
                }
            },


            deleteTask(id) {
    const taskId = parseInt(id);
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // A custom, safer confirmation dialog
    this.showModal('confirm-delete', {
        title: 'Delete Task?',
        message: `Are you sure you want to permanently delete the task "${task.title}"? This action cannot be undone.`,
        onConfirm: () => {
            this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.render();
            this.closeModal();
            NotificationSystem.success('Task deleted successfully!');
        }
    });
},
toggleTaskActionsDropdown(id) {
    const dropdown = document.getElementById(`task-dropdown-${id}`);
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('open');

    // First, close all other dropdowns
    document.querySelectorAll('.task-actions-dropdown').forEach(d => {
        d.classList.remove('open');
    });

    // If the one we clicked wasn't already open, open it
    if (!isOpen) {
        dropdown.classList.add('open');
    }
},

// REPLACE this entire function
handleJoinTask(id) {
    const taskId = parseInt(id);
    const mainTaskIndex = this.state.tasks.findIndex(t => t.id === taskId);
    if (mainTaskIndex === -1) {
        NotificationSystem.error('Task not found.');
        return;
    }

    const mainTask = this.state.tasks[mainTaskIndex];
    const currentUserId = this.state.currentUser.id;

    // Validation: Check if user is already a participant
    if (mainTask.participants.includes(currentUserId)) {
        NotificationSystem.info('You have already joined this task.');
        return;
    }

    // Validation: Check if the task is full
    if (mainTask.participants.length >= mainTask.participantLimit) {
        NotificationSystem.warning('Sorry, this task has reached its participant limit.');
        return;
    }

    // --- NEW LOGIC: CREATE THE PERSONAL SUB-TASK ---
    
    // Calculate the pro-rata goal for this individual participant.
    const personalGoal = mainTask.goalTarget / mainTask.participantLimit;

    const newSubTask = {
        id: Date.now() + currentUserId,
        parentTaskId: mainTask.id,
        isSubTask: true,
        title: `${mainTask.title} (Personal Goal)`,
        description: `Your personal contribution towards the team task: "${mainTask.title}".`,
        dueDate: mainTask.dueDate,
        createdBy: mainTask.createdBy,
        goalType: mainTask.goalType,
        goalTarget: personalGoal,
        participantLimit: 1,
        accuraBotEnabled: false,
        branchId: mainTask.branchId,
        progress: 0,
        participants: [currentUserId], // Only this user is a participant of their sub-task
        status: 'active',
    };

    // Add the new sub-task to the state
    this.state.tasks.push(newSubTask);
    
    // Add the user to the MAIN task's participant list
    this.state.tasks[mainTaskIndex].participants.push(currentUserId);
    
    this.saveData();
    this.render(); // Re-render to update the UI
    NotificationSystem.success(`You have joined the task: "${mainTask.title}"!`);
},


         // REPLACE your old updateTaskProgress function with this correct one.
updateTaskProgress(sale, profit) {
    const salespersonId = sale.salesPersonId;
    const activeTasks = this.state.tasks.filter(task => 
        task.status === 'active' && task.participants.includes(salespersonId)
    );

    activeTasks.forEach(task => {
        const taskIndex = this.state.tasks.findIndex(t => t.id === task.id);
        if (taskIndex === -1) return;

        let progressToAdd = 0;
        if (task.goalType === 'sales') {
            progressToAdd = sale.total;
        } else if (task.goalType === 'profit') {
            progressToAdd = Math.max(0, profit);
        }

        if (progressToAdd > 0) {
            this.state.tasks[taskIndex].progress += progressToAdd;
        }
        
        // --- THIS IS THE MISSING NOTIFICATION LOGIC ---
        const currentTask = this.state.tasks[taskIndex];
        const progressPercentage = (currentTask.progress / currentTask.goalTarget) * 100;
        
        // Check for completion first
        if (progressPercentage >= 100 && currentTask.status !== 'completed') {
            currentTask.status = 'completed';
            if (currentTask.lastNotifiedProgress < 100) {
                this.sendTaskProgressNotification(currentTask, '100');
                currentTask.lastNotifiedProgress = 100;
            }
             NotificationSystem.success(`Task "${currentTask.title}" completed! Great job!`);
        } else if (progressPercentage >= 75 && currentTask.lastNotifiedProgress < 75) {
            this.sendTaskProgressNotification(currentTask, '75');
            currentTask.lastNotifiedProgress = 75;
        } else if (progressPercentage >= 50 && currentTask.lastNotifiedProgress < 50) {
            this.sendTaskProgressNotification(currentTask, '50');
            currentTask.lastNotifiedProgress = 50;
        } else if (progressPercentage >= 25 && currentTask.lastNotifiedProgress < 25) {
            this.sendTaskProgressNotification(currentTask, '25');
            currentTask.lastNotifiedProgress = 25;
        }
        // --- END OF MISSING LOGIC ---
    });
},
// PASTE THIS ENTIRE NEW FUNCTION

checkMainTaskCompletion(parentTaskId) {
    if (!parentTaskId) return;

    // Find all sub-tasks for the given main task
    const relatedSubTasks = this.state.tasks.filter(t => t.parentTaskId === parentTaskId);
    if (relatedSubTasks.length === 0) return; // No sub-tasks found

    // Check if EVERY single sub-task is marked as 'completed'
    const allSubTasksCompleted = relatedSubTasks.every(subTask => subTask.status === 'completed');

    if (allSubTasksCompleted) {
        const mainTaskIndex = this.state.tasks.findIndex(t => t.id === parentTaskId);
        if (mainTaskIndex !== -1) {
            this.state.tasks[mainTaskIndex].status = 'completed';
            const mainTask = this.state.tasks[mainTaskIndex];
            NotificationSystem.success(`Main Task Completed: "${mainTask.title}"! Great work, team!`);
            
            // Optional: Send a final report notification for the main task
            if (mainTask.accuraBotEnabled) {
                this.sendTaskProgressNotification(mainTask, '100');
            }
        }
    }
},

// REPLACE this entire function in your code
getTaskReportHtml(taskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return '<p>Report not found.</p>';

    // --- FIX: ESTABLISH THE TASK'S TIMEFRAME ---
    const taskStartDate = new Date(task.id); // The task ID is its creation timestamp
    const taskDueDate = new Date(task.dueDate);
    taskDueDate.setHours(23, 59, 59, 999); // Include the entire due day

    // --- FIX: FILTER SALES TO ONLY THOSE WITHIN THE TASK'S TIMEFRAME ---
    const relevantSales = this.state.sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= taskStartDate && saleDate <= taskDueDate;
    });

    const participantsDetails = task.participants.map(pId => {
        const user = this.state.users.find(u => u.id === pId);
        let contribution = 0;
        
        // Use the filtered 'relevantSales' instead of 'this.state.sales'
        relevantSales.forEach(sale => {
            if (sale.salesPersonId === pId) {
                if (task.goalType === 'sales') {
                    contribution += sale.total;
                } else if (task.goalType === 'profit') {
                    const totalCost = sale.items.reduce((sum, item) => {
                        const product = this.state.products.find(p => p.id === item.productId);
                        return sum + ((product?.cost || 0) * item.quantity);
                    }, 0);
                    const profit = sale.subtotal - totalCost;
                    contribution += Math.max(0, profit);
                } else if (task.goalType === 'count') {
                    contribution += 1;
                }
            }
        });
        return { name: user.name, contribution };
    }).sort((a, b) => b.contribution - a.contribution);

    // The rest of the function's HTML structure remains the same
    return `
    <div id="task-report-content" style="background-color: #ffffff; color: #111827; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; padding: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #00a46d; padding-bottom: 1rem; margin-bottom: 2rem;">
            <div>
                <h1 style="font-size: 2.25rem; font-weight: 700; margin: 0; color: #00a46d; line-height: 1;">Owlio</h1>
                <p style="margin: 0.25rem 0 0; color: #6b7280;">Task Performance Report</p>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; color: #6b7280;"><span style="font-weight: 500;">Generated by:</span> AccuraBot</p>
                <p style="margin: 0.25rem 0 0; color: #6b7280;"><span style="font-weight: 500;">Date:</span> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
            <tr>
                <td style="padding: 8px; background-color: #f3f4f6; font-weight: 600; width: 25%;">Task Title</td>
                <td style="padding: 8px; font-weight: 700; font-size: 1.125rem;">${task.title}</td>
            </tr>
            <tr>
                <td style="padding: 8px; background-color: #f3f4f6; font-weight: 600;">Description</td>
                <td style="padding: 8px;">${task.description}</td>
            </tr>
            <tr>
                <td style="padding: 8px; background-color: #f3f4f6; font-weight: 600;">Status</td>
                <td style="padding: 8px; color: ${task.status === 'completed' ? '#22c55e' : '#3b82f6'}; font-weight: 600;">${task.status.charAt(0).toUpperCase() + task.status.slice(1)}</td>
            </tr>
            <tr>
                <td style="padding: 8px; background-color: #f3f4f6; font-weight: 600;">Due Date</td>
                <td style="padding: 8px;">${task.dueDate}</td>
            </tr>
        </table>
        <h3 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Participant Leaderboard</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <thead style="background-color: #f3f4f6;">
                <tr>
                    <th style="padding: 10px; text-align: left;">Rank</th>
                    <th style="padding: 10px; text-align: left;">Employee Name</th>
                    <th style="padding: 10px; text-align: right;">Contribution</th>
                    <th style="padding: 10px; text-align: right;">% of Total</th>
                </tr>
            </thead>
            <tbody>
                ${participantsDetails.map((p, index) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; font-weight: 600;">#${index + 1}</td>
                    <td style="padding: 10px;">${p.name}</td>
                    <td style="padding: 10px; text-align: right;">${task.goalType === 'count' ? p.contribution + ' sales' : this.formatCurrency(p.contribution)}</td>
                    <td style="padding: 10px; text-align: right;">${task.progress > 0 ? ((p.contribution / task.progress) * 100).toFixed(1) + '%' : '0.0%'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `;
},
downloadTaskPdf(taskId) {
    const reportHtml = this.getTaskReportHtml(taskId);
    const task = this.state.tasks.find(t => t.id === taskId);
    const element = document.createElement('div');
    element.innerHTML = reportHtml;

    const opt = {
        margin: 0.5,
        filename: `Task_Report_${task.title.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
},

// REPLACE this entire function in your code
downloadTaskTxt(taskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // --- FIX: ESTABLISH THE TASK'S TIMEFRAME ---
    const taskStartDate = new Date(task.id);
    const taskDueDate = new Date(task.dueDate);
    taskDueDate.setHours(23, 59, 59, 999);

    // --- FIX: FILTER SALES TO ONLY THOSE WITHIN THE TASK'S TIMEFRAME ---
    const relevantSales = this.state.sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= taskStartDate && saleDate <= taskDueDate;
    });

    const participantsDetails = task.participants.map(pId => {
        const user = this.state.users.find(u => u.id === pId);
        let contribution = 0;
        
        // Use the filtered 'relevantSales'
        relevantSales.forEach(sale => {
            if (sale.salesPersonId === pId) {
                if (task.goalType === 'sales') {
                    contribution += sale.total;
                } else if (task.goalType === 'profit') {
                    const totalCost = sale.items.reduce((sum, item) => {
                        const product = this.state.products.find(p => p.id === item.productId);
                        return sum + ((product?.cost || 0) * item.quantity);
                    }, 0);
                    const profit = sale.subtotal - totalCost;
                    contribution += Math.max(0, profit);
                } else if (task.goalType === 'count') {
                    contribution += 1;
                }
            }
        });
        return { name: user.name, contribution };
    }).sort((a, b) => b.contribution - a.contribution);

    // The rest of the function's text generation remains the same
    let txtContent = `=================================\n`;
    txtContent += ` TASK PERFORMANCE REPORT\n`;
    txtContent += `=================================\n\n`;
    txtContent += `Task Title: ${task.title}\n`;
    txtContent += `Status:     ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}\n`;
    txtContent += `Due Date:   ${task.dueDate}\n\n`;
    txtContent += `---------------------------------\n`;
    txtContent += ` PERFORMANCE METRICS\n`;
    txtContent += `---------------------------------\n\n`;
    txtContent += `Goal Type:  ${task.goalType.charAt(0).toUpperCase() + task.goalType.slice(1)} Oriented\n`;
    txtContent += `Progress:   ${task.goalType === 'count' ? task.progress + ' sales' : this.formatCurrency(task.progress)} / ${task.goalType === 'count' ? task.goalTarget + ' sales' : this.formatCurrency(task.goalTarget)} (${task.goalTarget > 0 ? ((task.progress / task.goalTarget) * 100).toFixed(1) : '0.0'}%)\n`;
    txtContent += `Team Size:  ${task.participants.length} / ${task.participantLimit} Participants\n\n`;
    txtContent += `---------------------------------\n`;
    txtContent += ` PARTICIPANT LEADERBOARD\n`;
    txtContent += `---------------------------------\n\n`;
    participantsDetails.forEach((p, index) => {
        txtContent += `#${index + 1} | ${p.name}\n`;
        txtContent += `   - Contribution: ${task.goalType === 'count' ? p.contribution + ' sales' : this.formatCurrency(p.contribution)}\n`;
        txtContent += `   - Percentage:   ${task.progress > 0 ? ((p.contribution / task.progress) * 100).toFixed(1) : '0.0'}%\n\n`;
    });
    txtContent += `=================================\n`;
    txtContent += `Report Generated: ${new Date().toLocaleString()}\n`;

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Task_Report_${task.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
},

            generateInvoice(saleId) {
                const sale = this.state.sales.find(s => s.id === parseInt(saleId));
                if (!sale) return;

                const customer = this.state.customers.find(c => c.id === sale.customerId);
                const salesperson = this.state.users.find(u => u.id === sale.salesPersonId);
                const countryInfo = GCC_COUNTRIES[sale.country || this.state.selectedCountry];

                const invoice = {
                    id: Date.now(),
                    saleId: sale.id,
                    invoiceNumber: `INV-${String(Date.now()).slice(-6)}`,
                    date: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    customer: customer,
                    items: sale.items.map(item => {
                        const product = this.state.products.find(p => p.id === item.productId);
                        return { ...item, name: product?.name || 'Product' };
                    }),
                    subtotal: sale.subtotal,
                    taxRate: sale.taxRate || 0,
                    taxAmount: sale.taxAmount || 0,
                    total: sale.total,
                    status: 'pending',
                    salesperson: salesperson ? salesperson.name : 'Unknown',
                    country: countryInfo.name,
                    currency: countryInfo.currency,
                    currencySymbol: countryInfo.symbol,
                    taxName: countryInfo.taxName,
                    companyName: this.state.companyName,
                    discount: sale.discount || 0 // Include discount in invoice object
                };

                this.state.invoices = this.state.invoices || [];
                this.state.invoices.push(invoice);
                this.saveData();
                this.render();
                this.downloadInvoice(invoice.id);
                NotificationSystem.success('Professional invoice generated successfully!');
            },

            exportData() {
                const dataStr = JSON.stringify(this.state, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${this.state.companyName.replace(/\s+/g, '-').toLowerCase()}-data.json`;
                link.click();
                URL.revokeObjectURL(url);
                NotificationSystem.success('Business data exported successfully!');
            },

            markMessageRead(id) {
                const message = this.state.messages.find(m => m.id === parseInt(id));
                if (message) {
                    message.read = true;
                    this.saveData();
                    this.render();
                }
            },

            handleBotQuickAction(actionId) {
                const quickActions = {
                    'add-employee': () => this.showModal('add-employee'),
                    'view-reports': () => this.navigateToView('reports'),
                    'settings': () => this.navigateToView('settings'),
                    'add-product': () => this.showModal('add-product'),
                    'view-employees': () => this.navigateToView('employees'),
                    'add-sale': () => this.showModal('add-sale'),
                    'add-expense': () => this.showModal('add-expense'),
                    'add-customer': () => this.showModal('add-customer'),
                    'view-products': () => this.navigateToView('products')
                };

                if (quickActions[actionId]) {
                    quickActions[actionId]();
                }
            },

            handleBotChatCommand() {
                const chatInput = document.getElementById('bot-chat-input');
                const chatBox = document.getElementById('bot-chat-box');
                if (!chatInput || !chatBox) return;

                const command = chatInput.value.trim();
                if (!command) return;

                // Append user message
                const userMessageDiv = document.createElement('div');
                userMessageDiv.className = 'bot-chat-message user';
                userMessageDiv.innerHTML = `
                    <div class="message-bubble user">${command}</div>
                    <div class="message-avatar user">You</div>
                `;
                chatBox.appendChild(userMessageDiv);

                // Process command and append bot response
                const botResponseHtml = AccuraBot.processCommand(command, this.state);
                const botMessageDiv = document.createElement('div');
                botMessageDiv.className = 'bot-chat-message bot';
                botMessageDiv.innerHTML = `
                    <div class="message-avatar bot">Bot</div>
                    <div class="message-bubble bot">${botResponseHtml}</div>
                `;
                chatBox.appendChild(botMessageDiv);

                // Clear input and scroll to bottom
                chatInput.value = '';
                chatBox.scrollTop = chatBox.scrollHeight;
            },

            // Chart creation
            createChart(canvasId, type, data, options = {}) {
                const ctx = document.getElementById(canvasId);
                if (!ctx) return;

                if (this.charts[canvasId]) {
                    this.charts[canvasId].destroy();
                }

                const defaultOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#b4bcd0',
                                font: { size: 14 }
                            }
                        }
                    }
                };

                this.charts[canvasId] = new Chart(ctx, {
                    type: type,
                    data: data,
                    options: { ...defaultOptions, ...options }
                });
            },

            createDashboardCharts() {
                // Sales trend chart
                const salesByMonth = {};
                this.state.sales.forEach(sale => {
                    const month = sale.date.substring(0, 7);
                    salesByMonth[month] = (salesByMonth[month] || 0) + sale.total;
                });

                const salesData = {
                    labels: Object.keys(salesByMonth),
                    datasets: [{
                        label: `Monthly Sales (${GCC_COUNTRIES[this.state.selectedCountry].currency})`,
                        data: Object.values(salesByMonth),
                        borderColor: '#00d4aa',
                        backgroundColor: 'rgba(0, 212, 170, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };

                this.createChart('salesChart', 'line', salesData);

                // Revenue vs Expenses
                const totalRevenue = this.state.sales.reduce((sum, sale) => sum + sale.total, 0);
                const totalExpenses = this.state.expenses.reduce((sum, expense) => sum + expense.amount, 0);

                const financeData = {
                    labels: ['Revenue', 'Expenses', 'Net Profit'],
                    datasets: [{
                        data: [totalRevenue, totalExpenses, totalRevenue - totalExpenses],
                        backgroundColor: [
                            'rgba(0, 212, 170, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(59, 130, 246, 0.8)'
                        ],
                        borderColor: [
                            '#00d4aa',
                            '#ef4444',
                            '#3b82f6'
                        ]
                    }]
                };

                this.createChart('financeChart', 'doughnut', financeData);
            },

            // REPLACE your current downloadInvoice function with this one.
downloadInvoice(invoiceId) {
    const invoice = this.state.invoices.find(i => i.id === parseInt(invoiceId));
    if (!invoice) return;

    // The generateInvoiceHtml function creates the PREVIEW.
    // We need a CLEAN version for the PDF generator.
    const invoiceHTMLforPDF = this.generateInvoiceHtml(invoice);

    const element = document.createElement('div');
    element.innerHTML = invoiceHTMLforPDF;
    
    // --- THIS IS THE FIX ---
    // Hide the element from view, but add it to the page temporarily.
    // This allows the PDF generator to properly calculate its styles and layout.
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    // --- END OF FIX ---

    const opt = {
        margin: 0.5,
        filename: `Invoice_${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generate the PDF from the hidden element
    html2pdf().from(element).set(opt).save().then(() => {
        // IMPORTANT: Clean up by removing the hidden element after the PDF is saved.
        document.body.removeChild(element);
        NotificationSystem.success('Invoice downloaded!');
    }).catch(err => {
        document.body.removeChild(element); // Also remove on error
        NotificationSystem.error('Error generating PDF.');
        console.error('PDF Generation Error:', err);
    });
},

            generateInvoiceHtml(invoice) {
    const { companyName, currency, currencySymbol, taxName } = invoice;

    const tableRows = invoice.items.map(item => `
        <tr style="page-break-inside: avoid;">
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6; text-align: right;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6; text-align: right;">${item.unitPrice.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6; text-align: right;">${(item.unitPrice * item.quantity).toFixed(2)}</td>
        </tr>`
    ).join('');

    const subtotalBeforeDiscount = invoice.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const subtotalAfterDiscount = invoice.subtotal;

    // This is the new, corrected HTML with inline styles for a white background and dark text.
    return `
    <div style="background-color: #ffffff; color: #111827; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; margin: auto; max-width: 8.5in; padding: 2rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #00d4aa; padding-bottom: 1rem; margin-bottom: 2rem;">
            <div>
                <h1 style="font-size: 2.25rem; font-weight: 700; margin: 0; color: #00d4aa; line-height: 1;">${companyName}</h1>
                <p style="margin: 0.25rem 0 0; color: #6b7280;">Sales Division</p>
            </div>
            <div style="text-align: right;">
                <h2 style="font-size: 1.875rem; font-weight: 600; margin: 0; color: #374151;">INVOICE</h2>
                <p style="margin: 0.25rem 0 0; color: #6b7280;">#${invoice.invoiceNumber}</p>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2rem;">
            <div>
                <p style="margin: 0; color: #6b7280; font-weight: 500;">BILL TO</p>
                <p style="margin: 0.25rem 0 0; font-weight: 600; font-size: 1.125rem; color: #111827;">${invoice.customer.name}</p>
                <p style="margin: 0.25rem 0 0; color: #6b7280;">${invoice.customer.address}</p>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; color: #6b7280;"><span style="font-weight: 500;">Invoice Date:</span> ${new Date(invoice.date).toLocaleDateString()}</p>
                <p style="margin: 0.25rem 0 0; color: #6b7280;"><span style="font-weight: 500;">Due Date:</span> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; color: #111827;">
            <thead style="background-color: #f3f4f6; color: #374151;">
                <tr>
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; width: 60%;">ITEM DESCRIPTION</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">QTY</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">RATE</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">AMOUNT</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
        <div style="display: flex; justify-content: flex-end; margin-top: 2rem;">
            <div style="width: 100%; max-width: 300px; color: #374151;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>Subtotal</span><span>${subtotalBeforeDiscount.toFixed(2)}</span></div>
                ${invoice.discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>Discount</span><span>(${invoice.discount.toFixed(2)})</span></div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #e5e7eb;"><span>Subtotal After Discount</span><span>${subtotalAfterDiscount.toFixed(2)}</span></div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>${taxName} (${(invoice.taxRate * 100).toFixed(0)}%)</span><span>${invoice.taxAmount.toFixed(2)}</span></div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #00d4aa; margin-top: 8px; font-weight: 700; font-size: 1.25rem; color: #111827;"><span>Total Due</span><span>${currencySymbol} ${invoice.total.toFixed(2)}</span></div>
            </div>
        </div>
        <div style="margin-top: 3rem; text-align: center; color: #6b7280; font-size: 0.875rem;"><p>Thank you for your business!</p></div>
    </div>`;
},

   // =================================================================
// === START OF THE FINAL, COMPLETE REPLACEMENT CODE BLOCK       ===
// =================================================================

            // === NEW, EXPANDED QUICK SALE LOGIC ===

            startQuickSale() {
                // Reset or initialize the quick sale state
                this.state.quickSale = {
                    active: true,
                    currentStep: 1,
                    selectedProductIds: [],
                    productQuantities: {}, // { productId: quantity }
                    selectedCustomerId: null,
                };
                this.render(); 
            },

            cancelQuickSale() {
                // Set the active flag to false to exit the quick sale view
                this.state.quickSale.active = false;
                // Re-render the app to show the previous screen (e.g., Dashboard)
                this.render();
                // Show a confirmation message
                NotificationSystem.info('Quick Sale Cancelled.');
            },

            bindQuickSaleEvents() {
                // This function will set up all the interactivity for the new UI
                document.querySelectorAll('[data-action="qs-add-product"]').forEach(el => {
                    el.addEventListener('click', (e) => {
                        const id = parseInt(el.dataset.id);
                        el.classList.toggle('selected');
                        el.querySelector('.fa-check-circle').parentElement.classList.toggle('hidden');
                        
                        if (this.state.quickSale.selectedProductIds.includes(id)) {
                            this.state.quickSale.selectedProductIds = this.state.quickSale.selectedProductIds.filter(pid => pid !== id);
                        } else {
                            this.state.quickSale.selectedProductIds.push(id);
                        }
                    });
                });

                document.querySelectorAll('[data-action="qs-select-customer"]').forEach(el => {
                     el.addEventListener('click', (e) => {
                        this.state.quickSale.selectedCustomerId = parseInt(el.dataset.id);
                        // Visually mark selection
                        document.querySelectorAll('[data-action="qs-select-customer"]').forEach(btn => btn.classList.remove('selected'));
                        el.classList.add('selected');
                     });
                });

                document.querySelectorAll('[data-action="qs-next-step"]').forEach(el => {
                    el.addEventListener('click', () => this.navigateQuickSale(1));
                });
                 document.querySelectorAll('[data-action="qs-prev-step"]').forEach(el => {
                    el.addEventListener('click', () => this.navigateQuickSale(-1));
                });
            },

            navigateQuickSale(direction) {
                const { quickSale } = this.state;
                const nextStep = quickSale.currentStep + direction;

                // --- Validation before proceeding ---
                if (direction > 0) {
                    if (quickSale.currentStep === 1 && quickSale.selectedProductIds.length === 0) {
                        NotificationSystem.error("Please select at least one product.");
                        return;
                    }
                     if (quickSale.currentStep === 3 && !quickSale.selectedCustomerId) {
                        NotificationSystem.error("Please select a customer.");
                        return;
                    }
                }
                
                // --- Logic to run when entering a new step ---
                if (nextStep === 2) {
                    this.renderQuantitySliders();
                }
                if (nextStep === 4) {
                    this.renderSaleSummary();
                }

                // --- Update UI ---
                document.getElementById(`qs-step-${quickSale.currentStep}`).classList.remove('active');
                document.getElementById(`qs-step-${nextStep}`).classList.add('active');
                document.getElementById('quick-sale-progress-fill').style.width = `${nextStep * 25}%`;
                
                quickSale.currentStep = nextStep;
            },

            renderQuantitySliders() {
                const { selectedProductIds, productQuantities } = this.state.quickSale;
                const container = document.getElementById('qs-quantity-list');
                
                container.innerHTML = selectedProductIds.map(id => {
                    const product = this.state.products.find(p => p.id === id);
                    const currentQuantity = productQuantities[id] || 1; // Default to 1
                    // Set initial quantity if not already set
                    if (!productQuantities[id]) {
                        productQuantities[id] = 1;
                    }

                    return `
                    <div class="perplexity-card p-4">
                        <p class="font-bold text-lg text-white mb-3">${product.name}</p>
                        <div class="quantity-slider-container">
                           <input type="range" min="1" max="${product.stock}" value="${currentQuantity}" class="quantity-slider" data-id="${id}">
                           <input type="number" min="1" max="${product.stock}" value="${currentQuantity}" class="quantity-input" data-id="${id}">
                        </div>
                    </div>
                    `;
                }).join('');

                // Bind events for the newly created sliders and inputs
                container.querySelectorAll('.quantity-slider, .quantity-input').forEach(el => {
                    el.addEventListener('input', (e) => {
                        const id = parseInt(e.target.dataset.id);
                        let value = parseInt(e.target.value);
                        const product = this.state.products.find(p => p.id === id);

                        // Clamp the value to be within stock limits
                        if (value > product.stock) value = product.stock;
                        if (value < 1) value = 1;
                        
                        this.state.quickSale.productQuantities[id] = value;
                        // Sync the other input
                        container.querySelector(`.quantity-slider[data-id="${id}"]`).value = value;
                        container.querySelector(`.quantity-input[data-id="${id}"]`).value = value;
                    });
                });
            },

            renderSaleSummary() {
                 const { selectedProductIds, productQuantities, selectedCustomerId } = this.state.quickSale;
                 const container = document.getElementById('qs-summary');
                 const customer = this.state.customers.find(c => c.id === selectedCustomerId);

                 let subtotal = 0;
                 const itemsHtml = selectedProductIds.map(id => {
                     const product = this.state.products.find(p => p.id === id);
                     const quantity = productQuantities[id];
                     const total = product.price * quantity;
                     subtotal += total;
                     return `<div class="flex justify-between text-gray-300">
                                <span>${quantity} x ${product.name}</span>
                                <span>${this.formatCurrency(total)}</span>
                             </div>`;
                 }).join('');
                 
                 const taxInfo = this.getTaxInfo();
                 const taxAmount = subtotal * taxInfo.rate;
                 const total = subtotal + taxAmount;

                 container.innerHTML = `
                    <p class="text-lg font-bold text-white mb-4">For: ${customer.name}</p>
                    <div class="space-y-2 mb-4 pb-4 border-b border-gray-600">
                        ${itemsHtml}
                    </div>
                    <div class="space-y-2">
                         <div class="flex justify-between text-gray-300">
                            <span>Subtotal</span>
                            <span>${this.formatCurrency(subtotal)}</span>
                        </div>
                        <div class="flex justify-between text-gray-300">
                            <span>${taxInfo.name} (${taxInfo.rate * 100}%)</span>
                            <span>${this.formatCurrency(taxAmount)}</span>
                        </div>
                        <div class="flex justify-between text-white font-bold text-xl mt-2 pt-2 border-t border-gray-500">
                            <span>Total</span>
                            <span class="quick-sale-gradient-text">${this.formatCurrency(total)}</span>
                        </div>
                    </div>
                 `;
            },

      finalizeQuickSale() {
    const { productQuantities, selectedCustomerId } = this.state.quickSale;
    
    const saleItems = Object.entries(productQuantities).map(([productId, quantity]) => ({
        productId: parseInt(productId),
        quantity: quantity,
        unitPrice: this.state.products.find(p => p.id === parseInt(productId)).price
    }));

    let subtotal = saleItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxRate = this.getTaxInfo().rate;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // --- ACCURATE PROFIT CALCULATION ---
    const totalCost = saleItems.reduce((sum, item) => {
        const product = this.state.products.find(p => p.id === item.productId);
        return sum + ((product?.cost || 0) * item.quantity);
    }, 0);
    const totalProfit = subtotal - totalCost; // QuickSale has no discount, so subtotal is revenue
    // --- END ACCURATE PROFIT CALCULATION ---

    const sale = {
        id: Date.now(), customerId: selectedCustomerId, items: saleItems, subtotal, taxAmount, taxRate,
        total, date: new Date().toISOString().split('T')[0], salesPersonId: this.state.currentUser.id,
        saleType: 'Cash', discount: 0
    };
    
    // Update stock
    sale.items.forEach(item => {
        const productIndex = this.state.products.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) this.state.products[productIndex].stock -= item.quantity;
    });

    this.state.sales.push(sale);
    this.createSaleJournalEntry(sale);
    this.updateTaskProgress(sale, totalProfit);

    this.saveData();
    this.updateAIInsights();
    this.updateBotAnalysis();
    this.state.quickSale.active = false;
    this.render();
    NotificationSystem.success(`Quick Sale recorded! Total: ${this.formatCurrency(sale.total)}`);
    this.triggerStockAlertCheck();
},

            triggerStockAlertCheck() {
                const lowStockProducts = this.state.products.filter(p => p.stock <= p.reorderLevel);
                if (lowStockProducts.length > 0) {
                    const manager = this.state.users.find(u => u.role === 'manager');
                    if (!manager) return;

                    lowStockProducts.forEach(product => {
                        const existingTask = this.state.messages.find(m =>
                            m.type === 'task' &&
                            m.taskDetails?.productId === product.id &&
                            m.status !== 'completed' &&
                            m.status !== 'declined'
                        );

                        if (!existingTask) {
                            const message = {
                                id: Date.now() + product.id,
                                from: 1, to: manager.id,
                                subject: `URGENT: Low Stock Alert for ${product.name}`,
                                content: `Stock for ${product.name} (SKU: ${product.sku}) has fallen to ${product.stock}, which is at or below the reorder level of ${product.reorderLevel}. Please approve a new stock order.`,
                                type: 'task', category: 'emergency', status: 'pending_manager_approval',
                                timestamp: new Date().toISOString(), read: false,
                                requesterId: 1,
                                history: [{ user: 'AccuraBot', action: 'Automated Alert Sent', timestamp: new Date().toISOString() }],
                                taskDetails: { productId: product.id, requestedStock: (product.reorderLevel || 10) * 2 }
                            };
                            this.state.messages.push(message);
                            NotificationSystem.warning(`Low stock alert sent to manager for ${product.name}.`);
                        }
                    });
                    this.saveData();
                }
            },

            renderCharts() {
                const salesCtx = document.getElementById('salesChart')?.getContext('2d');
                // CORRECTED ID: Was 'productPerformanceChart', now correctly 'financeChart'
                const financeCtx = document.getElementById('financeChart')?.getContext('2d');

                if (window.salesChart instanceof Chart) {
                    window.salesChart.destroy();
                }
                if (window.financeChart instanceof Chart) {
                    window.financeChart.destroy();
                }

                if (salesCtx) {
                    const salesByMonth = this.state.sales.reduce((acc, sale) => {
                        const month = new Date(sale.date).toLocaleString('default', { month: 'short' });
                        acc[month] = (acc[month] || 0) + sale.total;
                        return acc;
                    }, {});

                    window.salesChart = new Chart(salesCtx, {
                        type: 'line',
                        data: {
                            labels: Object.keys(salesByMonth),
                            datasets: [{
                                label: 'Monthly Sales',
                                data: Object.values(salesByMonth),
                                borderColor: '#00d4aa',
                                backgroundColor: 'rgba(0, 212, 170, 0.1)',
                                tension: 0.4,
                                fill: true,
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: { y: { beginAtZero: true } }
                        }
                    });
                }

                if (financeCtx) { // CORRECTED CHECK
                    const totalRevenue = this.state.sales.reduce((sum, sale) => sum + sale.total, 0);
                    const totalExpenses = this.state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
                    const netProfit = totalRevenue - totalExpenses;

                    window.financeChart = new Chart(financeCtx, { // CORRECTED CHART VARIABLE
                        type: 'doughnut',
                        data: {
                            labels: ['Revenue', 'Expenses', 'Net Profit'],
                            datasets: [{
                                label: 'Financial Overview',
                                data: [totalRevenue, totalExpenses, netProfit],
                                backgroundColor: [
                                    'rgba(0, 212, 170, 0.8)',
                                    'rgba(239, 68, 68, 0.8)',
                                    'rgba(59, 130, 246, 0.8)'
                                ],
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                        }
                    });
                }
            },
            
            renderReportCharts() {
                // This is a placeholder for more detailed report charts
                console.log("Rendering report charts...");
            },

            getInboxEmptyStateHtml() {
                const filter = this.state.inboxFilter;
                const icon = filter === 'branch' ? 'fa-users' : 'fa-inbox';
                const title = filter === 'branch' ? 'No branches yet' : 'No messages yet';
                let subtitle = '';
                let button = '';

                if (filter === 'branch') {
                    if (['admin', 'manager'].includes(this.state.currentUser.role)) {
                        subtitle = 'Create a branch to start group conversations';
                        button = `
                            <button data-action="create-branch" class="ai-button px-6 py-2 rounded-xl">
                                <i class="fas fa-plus mr-2"></i>Create Branch
                            </button>
                        `;
                    } else {
                        subtitle = 'You are not a member of any branches yet';
                    }
                } else {
                    subtitle = 'Start a conversation or wait for new messages';
                    button = `
                        <button data-action="compose-message" class="perplexity-button px-6 py-2 rounded-xl">
                            <i class="fas fa-plus mr-2"></i>Start New Conversation
                        </button>
                    `;
                }

                return `
                    <div class="text-center py-16">
                        <div class="w-24 h-24 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                            <i class="fas ${icon} text-4xl text-gray-600"></i>
                        </div>
                        <p class="text-gray-400 text-lg font-medium mb-2">${title}</p>
                        <p class="text-gray-500 text-sm mb-4">${subtitle}</p>
                        ${button}
                    </div>
                `;
            },

            getInboxBranchHtml(branch) {
                const memberNames = branch.members.map(memberId => {
                    const user = this.state.users.find(u => u.id === memberId);
                    return user ? user.name : 'Unknown';
                }).slice(0, 3).join(', ');
                
                const unreadCount = this.state.messages.filter(m => 
                    m.type === 'branch' && 
                    m.branchId === branch.id && 
                    m.to === this.state.currentUser.id && 
                    !m.read
                ).length;
                
                return `
                    <div class="p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer"
                         onclick="app.openBranchChat(${branch.id})">
                        <div class="flex items-start space-x-4">
                            <div class="flex-shrink-0">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <i class="fas fa-users text-white"></i>
                                </div>
                                ${unreadCount > 0 ? `<div class="w-3 h-3 bg-blue-500 rounded-full absolute -mt-1 -ml-1 animate-pulse"></div>` : ''}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between mb-1">
                                    <h3 class="font-bold text-white text-lg">${branch.name}</h3>
                                    <span class="text-xs text-gray-400">${branch.members.length} members</span>
                                </div>
                                <p class="text-sm text-gray-400 mb-2">${memberNames}${branch.members.length > 3 ? '...' : ''}</p>
                                ${unreadCount > 0 ? `
                                    <span class="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                        <i class="fas fa-envelope mr-1"></i>${unreadCount} new messages
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            },

            // REPLACE this function
// REPLACE your current getInboxMessageHtml function with this redesigned version.
getInboxMessageHtml(message) {
    const fromUser = this.state.users.find(u => u.id === message.from);
    const toUser = this.state.users.find(u => u.id === message.to);
    const otherUser = message.from === this.state.currentUser.id ? toUser : fromUser;
    const isUnread = message.to === this.state.currentUser.id && !message.read;
    
    const isBotUpdate = message.from === 1 && message.category === 'bot_update' && message.taskDetails;

    // --- THIS IS THE NEW REDESIGNED BOT MESSAGE LAYOUT ---
    if (isBotUpdate) {
        const taskDetails = message.taskDetails;
        const isCompleted = taskDetails.status === 'completed';
        const progressPercentage = Math.min((taskDetails.progress / taskDetails.goalTarget) * 100, 100).toFixed(1);

        const statusBadge = `
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${
                isCompleted 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-blue-500/20 text-blue-400'
            }">
                ${isCompleted ? 'Completed' : 'In Progress'}
            </span>
        `;

        return `
            <div class="p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer ${isUnread ? 'bg-blue-900/10 border-l-4 border-blue-500' : ''}"
                 onclick="app.openMessage(${message.id})">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0 relative">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/20">
                            <i class="fas fa-robot text-green-400 text-xl"></i>
                        </div>
                        ${isUnread ? '<div class="w-3 h-3 bg-blue-500 rounded-full absolute top-0 right-0 animate-pulse"></div>' : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-white">AccuraBot</span>
                                ${statusBadge}
                            </div>
                            <span class="text-xs text-gray-400">${this.formatMessageTime(message.timestamp)}</span>
                        </div>
                        <div class="font-semibold text-gray-300 mb-2">${message.subject}</div>
                        
                        <div class="text-sm text-gray-400">
                           Progress: ${this.formatCurrency(taskDetails.progress)} / ${this.formatCurrency(taskDetails.goalTarget)} 
                           <span class="font-medium text-gray-300">(${progressPercentage}%)</span>
                        </div>

                        <div class="flex items-center space-x-4 mt-3">
                            <button onclick="event.stopPropagation(); app.deleteMessage(${message.id})" 
                                    class="text-xs text-red-400 hover:text-red-300 transition-colors">
                                <i class="fas fa-trash mr-1"></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- This is the original layout for all OTHER messages (user-to-user, alerts, etc.) ---
    const senderName = fromUser ? fromUser.name : 'System';
    const isSentByMe = message.from === this.state.currentUser.id;
    const isSystemAlert = message.from === 1 && message.category === 'emergency';
    
    return `
        <div class="p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer ${isUnread ? 'bg-blue-900/10 border-l-4 border-blue-500' : ''}"
             onclick="app.openMessage(${message.id})">
            <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 relative">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${isSystemAlert ? 'bg-red-500/20' : 'bg-gradient-to-br from-teal-500 to-blue-500'}">
                        ${isSystemAlert ? '<i class="fas fa-robot text-red-400"></i>' : `<span class="text-white font-bold">${otherUser ? otherUser.name.charAt(0) : 'S'}</span>`}
                    </div>
                    ${isUnread ? '<div class="w-3 h-3 bg-blue-500 rounded-full absolute top-0 right-0 animate-pulse"></div>' : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold ${isSystemAlert ? 'text-red-400' : 'text-white'}">${isSystemAlert ? 'AccuraBot Alert' : senderName}</span>
                        <span class="text-xs text-gray-400">${this.formatMessageTime(message.timestamp)}</span>
                    </div>
                    <div class="font-medium text-gray-300 mb-1">${message.subject}</div>
                    <div class="text-sm text-gray-400 line-clamp-2">${message.content}</div>
                </div>
            </div>
        </div>
    `;
},

// =================================================================
// === END: Corrected code block (renderInbox starts after this) ===
// =================================================================
            
            


renderInbox() {
    const inboxContainer = document.getElementById('inbox-list-container');
    if (!inboxContainer) return;

    // Get user's branches
    // --- THIS IS THE CORRECTED LINE ---
    // It now shows branches where the user is a member OR the one who created it.
    const userBranches = this.state.branches.filter(b => 
        b.members.includes(this.state.currentUser.id) || b.createdBy === this.state.currentUser.id
    );

    // Filter messages based on current filter
    let displayItems = [];
    
    if (this.state.inboxFilter === 'branch') {
        // Show branches when branch tab is selected
        // Using a Set to prevent duplicates if a creator is also a member
        const uniqueBranches = [...new Map(userBranches.map(item => [item['id'], item])).values()];
        displayItems = uniqueBranches.map(branch => ({
            type: 'branch',
            data: branch
        }));
    } else {
        // Show messages for other tabs
        const filteredMessages = this.state.messages.filter(m => {
            // Must involve current user
            if (m.to !== this.state.currentUser.id && m.from !== this.state.currentUser.id) return false;
            
            // Apply type filter
            if (this.state.inboxFilter !== 'all' && m.type !== this.state.inboxFilter) return false;
            
            // Apply search filter
            if (this.state.inboxSearchTerm) {
                const searchTerm = this.state.inboxSearchTerm.toLowerCase();
                const fromUser = this.state.users.find(u => u.id === m.from);
                const toUser = this.state.users.find(u => u.id === m.to);
                return m.subject.toLowerCase().includes(searchTerm) || 
                       m.content.toLowerCase().includes(searchTerm) ||
                       (fromUser && fromUser.name.toLowerCase().includes(searchTerm)) ||
                       (toUser && toUser.name.toLowerCase().includes(searchTerm));
            }
            return true;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        displayItems = filteredMessages.map(msg => ({
            type: 'message',
            data: msg
        }));
    }

    // Render the appropriate content
    if (displayItems.length === 0) {
        inboxContainer.innerHTML = `
            <div class="text-center py-16">
                <div class="w-24 h-24 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                    <i class="fas ${this.state.inboxFilter === 'branch' ? 'fa-users' : 'fa-inbox'} text-4xl text-gray-600"></i>
                </div>
                <p class="text-gray-400 text-lg font-medium mb-2">
                    ${this.state.inboxFilter === 'branch' ? 'No branches yet' : 'No messages yet'}
                </p>
                <p class="text-gray-500 text-sm mb-4">
                    ${this.state.inboxFilter === 'branch' ? 
                        ((['admin', 'manager'].includes(this.state.currentUser.role)) ? 
                            'Create a branch to start group conversations' : 
                            'You are not a member of any branches yet') : 
                        'Start a conversation or wait for new messages'}
                </p>
                ${this.state.inboxFilter === 'branch' && ['admin', 'manager'].includes(this.state.currentUser.role) ? `
                    <button data-action="create-branch" class="ai-button px-6 py-2 rounded-xl">
                        <i class="fas fa-plus mr-2"></i>Create Branch
                    </button>
                ` : this.state.inboxFilter !== 'branch' ? `
                    <button data-action="compose-message" class="perplexity-button px-6 py-2 rounded-xl">
                        <i class="fas fa-plus mr-2"></i>Start New Conversation
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    // Render items
    inboxContainer.innerHTML = displayItems.map(item => {
        if (item.type === 'branch') {
            // Render branch card
            const branch = item.data;
            const memberNames = branch.members.map(memberId => {
                const user = this.state.users.find(u => u.id === memberId);
                return user ? user.name : 'Unknown';
            }).slice(0, 3).join(', ');
            
            const unreadCount = this.state.messages.filter(m => 
                m.type === 'branch' && 
                m.branchId === branch.id && 
                m.to === this.state.currentUser.id && 
                !m.read
            ).length;
            
            return `
                <div class="p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer"
                     onclick="app.openBranchChat(${branch.id})">
                    <div class="flex items-start space-x-4">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <i class="fas fa-users text-white"></i>
                            </div>
                            ${unreadCount > 0 ? `<div class="w-3 h-3 bg-blue-500 rounded-full absolute -mt-1 -ml-1 animate-pulse"></div>` : ''}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-1">
                                <h3 class="font-bold text-white text-lg">${branch.name}</h3>
                                <span class="text-xs text-gray-400">${branch.members.length} members</span>
                            </div>
                            <p class="text-sm text-gray-400 mb-2">${memberNames}${branch.members.length > 3 ? '...' : ''}</p>
                            ${unreadCount > 0 ? `
                                <span class="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                    <i class="fas fa-envelope mr-1"></i>${unreadCount} new messages
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Render message
            const message = item.data;
            const fromUser = this.state.users.find(u => u.id === message.from);
            const toUser = this.state.users.find(u => u.id === message.to);
            const otherUser = message.from === this.state.currentUser.id ? toUser : fromUser;
            const senderName = fromUser ? fromUser.name : 'System';
            const isUnread = message.to === this.state.currentUser.id && !message.read;
            const isSentByMe = message.from === this.state.currentUser.id;
            const isSystemAlert = message.from === 1 && message.category === 'emergency';
            
            return `
                <div class="p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer ${isUnread ? 'bg-blue-900/10 border-l-4 border-blue-500' : ''}"
                     onclick="app.openMessage(${message.id})">
                    <div class="flex items-start space-x-4">
                        <div class="flex-shrink-0 relative">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center ${
                                isSystemAlert ? 'bg-red-500/20 animate-pulse' : 
                                'bg-gradient-to-br from-teal-500 to-blue-500'
                            }">
                                ${isSystemAlert ? 
                                    '<i class="fas fa-robot text-red-400"></i>' :
                                    `<span class="text-white font-bold">${otherUser ? otherUser.name.charAt(0) : 'S'}</span>`
                                }
                            </div>
                            ${isUnread ? '<div class="w-3 h-3 bg-blue-500 rounded-full absolute top-0 right-0 animate-pulse"></div>' : ''}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-1">
                                <div class="flex items-center space-x-2">
                                    <span class="font-semibold ${isSystemAlert ? 'text-red-400' : 'text-white'}">
                                        ${isSystemAlert ? 'AccuraBot Alert' : senderName}
                                    </span>
                                    ${isSentByMe ? '<span class="text-xs text-gray-500"><i class="fas fa-check-double text-blue-400"></i></span>' : ''}
                                    ${message.type === 'task' ? `
                                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${
                                            message.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            message.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                            message.status.includes('pending') ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-purple-500/20 text-purple-400'
                                        }">
                                            ${message.status.replace(/_/g, ' ')}
                                        </span>
                                    ` : ''}
                                </div>
                                <span class="text-xs text-gray-400">${this.formatMessageTime(message.timestamp)}</span>
                            </div>
                            <div class="font-medium text-gray-300 mb-1">${message.subject}</div>
                            <div class="text-sm text-gray-400 line-clamp-2">${message.content}</div>
                            
                            <div class="flex items-center space-x-4 mt-3">
                                ${!message.read && message.to === this.state.currentUser.id ? `
                                    <button onclick="event.stopPropagation(); app.markAsRead(${message.id})" 
                                            class="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                        <i class="fas fa-check mr-1"></i>Mark as read
                                    </button>
                                ` : ''}
                                ${message.type !== 'task' ? `
                                    <button onclick="event.stopPropagation(); app.quickReply(${message.id})" 
                                            class="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                                        <i class="fas fa-reply mr-1"></i>Quick Reply
                                    </button>
                                ` : ''}
                                <button onclick="event.stopPropagation(); app.deleteMessage(${message.id})" 
                                        class="text-xs text-red-400 hover:text-red-300 transition-colors">
                                    <i class="fas fa-trash mr-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
},

// Format message timestamp like WhatsApp
formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
},

// Handle inbox search with employee suggestions
handleInboxSearch(event) {
    this.state.inboxSearchTerm = event.target.value;
    const searchTerm = event.target.value.toLowerCase();
    const resultsContainer = document.getElementById('employee-search-results');
    
    if (searchTerm.length > 0) {
        const matchingUsers = this.state.users.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );
        
        if (matchingUsers.length > 0) {
            resultsContainer.innerHTML = matchingUsers.map(user => `
                <div class="p-3 hover:bg-gray-700 cursor-pointer flex items-center space-x-3 transition-colors"
                     onclick="app.startConversationWith(${user.id})">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
                        <span class="text-white font-bold">${user.name.charAt(0)}</span>
                    </div>
                    <div>
                        <div class="text-white font-medium">${user.name}</div>
                        <div class="text-gray-400 text-sm">${user.role}</div>
                    </div>
                </div>
            `).join('');
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.classList.add('hidden');
        }
    } else {
        resultsContainer.classList.add('hidden');
    }
    
    this.renderInbox();
},



// Set inbox filter
setInboxFilter(filter) {
    this.state.inboxFilter = filter;
    this.saveData();
    this.render();
},

// Mark message as read
markAsRead(messageId) {
    const message = this.state.messages.find(m => m.id === messageId);
    if (message) {
        message.read = true;
        this.saveData();
        this.renderInbox();
        NotificationSystem.success('Message marked as read');
    }
},

// Open message in modal
openMessage(messageId) {
    const message = this.state.messages.find(m => m.id === messageId);
    if (message && message.to === this.state.currentUser.id && !message.read) {
        message.read = true;
        this.saveData();
    }
    this.showModal('view-message', messageId);
},

// Quick reply function
quickReply(messageId) {
    const message = this.state.messages.find(m => m.id === messageId);
    if (message) {
        const replyContent = prompt('Type your quick reply:');
        if (replyContent) {
            const reply = {
                id: Date.now(),
                from: this.state.currentUser.id,
                to: message.from === this.state.currentUser.id ? message.to : message.from,
                subject: `Re: ${message.subject}`,
                content: replyContent,
                type: 'personal',
                category: 'reply',
                timestamp: new Date().toISOString(),
                read: false
            };
            this.state.messages.push(reply);
            this.saveData();
            this.renderInbox();
            NotificationSystem.success('Reply sent!');
        }
    }
},

openBranchChat(branchId) {
    const branch = this.state.branches.find(b => b.id === branchId);
    if (branch) {
        this.state.currentBranchId = branchId; // Store which branch we are viewing
        this.navigateToView('branch-hub');
    }
},

// Start conversation with specific user
startConversationWith(userId) {
    const user = this.state.users.find(u => u.id === userId);
    if (user) {
        document.getElementById('employee-search-results').classList.add('hidden');
        this.showModal('compose-message', userId);
    }
},

// Set inbox filter
setInboxFilter(filter) {
    this.state.inboxFilter = filter;
    this.saveData();
    this.render();
},



// Open message in modal
openMessage(messageId) {
    const message = this.state.messages.find(m => m.id === messageId);
    if (message && message.to === this.state.currentUser.id && !message.read) {
        message.read = true;
        this.saveData();
    }
    this.showModal('view-message', messageId);
},




            
            // Add this new function to the `app` object
            addJournalEntry(date, description, entries) {
                const newEntry = {
                    id: Date.now(),
                    date: date,
                    description: description,
                    entries: entries // an array of { accountCode, debit, credit }
                };
                this.state.journal.push(newEntry);
            },

            // Step 1: Create a Central Transaction Validator
            createTransaction(date, description, entries) {
                let totalDebits = 0;
                let totalCredits = 0;

                entries.forEach(entry => {
                    totalDebits += entry.debit || 0;
                    totalCredits += entry.credit || 0;
                });

                if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow for minor floating point inaccuracies
                    NotificationSystem.error('Transaction is unbalanced! Debits must equal Credits.');
                    console.error('Unbalanced transaction:', { date, description, entries, totalDebits, totalCredits });
                    return false;
                }

                this.addJournalEntry(date, description, entries);
                return true;
            },

            // Add this new function inside the `app` object:
            createSaleJournalEntry(sale) {
                const saleDescription = `Sale to ${this.state.customers.find(c => c.id === sale.customerId)?.name || 'customer'}. Invoice #${sale.id}.`;
                const journalEntries = [];

                // The subtotal for revenue purposes is the amount before the total discount is subtracted.
                const revenueAmount = sale.subtotal + (sale.discount || 0);
                journalEntries.push({ accountCode: '4110', debit: 0, credit: revenueAmount }); // Credit Sales Revenue

                if (sale.taxAmount > 0) {
                    journalEntries.push({ accountCode: '2210', debit: 0, credit: sale.taxAmount }); // Credit VAT Payable
                }
                if ((sale.discount || 0) > 0) {
                    journalEntries.push({ accountCode: '4120', debit: sale.discount, credit: 0 }); // Debit Sales Discount
                }

                if (sale.saleType === 'Credit') {
                    journalEntries.push({ accountCode: '1120', debit: sale.total, credit: 0 }); // Debit Accounts Receivable
                } else {
                    journalEntries.push({ accountCode: '1110', debit: sale.total, credit: 0 }); // Debit Cash on Hand
                }

                this.createTransaction(sale.date, saleDescription, journalEntries);

                // Create a separate journal entry for the Cost of Goods Sold (COGS)
                const cogsAmount = sale.items.reduce((sum, item) => {
                    const product = this.state.products.find(p => p.id === item.productId);
                    return sum + ((product?.cost || 0) * item.quantity);
                }, 0);

                if (cogsAmount > 0) {
                    const cogsDescription = `COGS for sale #${sale.id}.`;
                    this.createTransaction(sale.date, cogsDescription, [
                        { accountCode: '5110', debit: cogsAmount, credit: 0 }, // Debit COGS
                        { accountCode: '1210', debit: 0, credit: cogsAmount }  // Credit Inventory Asset
                    ]);
                }
            },

            // REPLACE the existing renderJournalEntryRow function with this:
            renderJournalEntryRow(entryRow) {
                const account = this.state.chartOfAccounts.find(acc => acc.code === entryRow.accountCode);
                return `
                    <td class="px-6 py-4 text-white">${account ? account.name : 'Unknown'} (${entryRow.accountCode})</td>
                    <td class="px-6 py-4 text-right font-mono text-blue-400">${entryRow.debit > 0 ? this.formatCurrency(entryRow.debit) : ''}</td>
                    <td class="px-6 py-4 text-right font-mono text-teal-400">${entryRow.credit > 0 ? this.formatCurrency(entryRow.credit) : ''}</td>
                `;
            },

            // REPLACE the existing getJournalView function with this:
            getJournalView() {
                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-2">General Journal</h2>
                                <p class="text-gray-400">The detailed record of all financial transactions.</p>
                            </div>
                            ${this.state.currentUser.role === 'admin' ? `
                                <button data-action="add-journal-entry" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                                    <i class="fas fa-plus mr-2"></i>Add Journal Entry
                                </button>
                            ` : ''}
                        </div>
                        <div class="perplexity-card overflow-hidden">
                            <div class="responsive-table">
                                <table class="w-full">
                                    <thead class="border-b border-gray-600">
                                        <tr>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Debit</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-700">
                                        ${this.state.journal.slice().reverse().map((entry, index) => {
                                            const firstLine = entry.entries[0];
                                            const otherLines = entry.entries.slice(1);
                                            const borderClass = index > 0 ? 'border-t-2 border-gray-700' : '';

                                            let entryHtml = `
                                                <tr class="${borderClass} hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                    <td class="px-6 py-4 align-top text-gray-300">${entry.date}</td>
                                                    <td class="px-6 py-4 align-top text-gray-400">${entry.description}</td>
                                                    ${this.renderJournalEntryRow(firstLine)}
                                                </tr>
                                            `;
                                            otherLines.forEach(line => {
                                                entryHtml += `
                                                    <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                        <td class="px-6 py-4"></td>
                                                        <td class="px-6 py-4"></td>
                                                        ${this.renderJournalEntryRow(line)}
                                                    </tr>
                                                `;
                                            });
                                            return entryHtml;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            },

            // Add this new function to the `app` object
            calculatePnL(startDate, endDate) {
                const results = {
                    totalRevenue: 0,
                    totalDiscounts: 0,
                    netRevenue: 0,
                    totalCOGS: 0,
                    grossProfit: 0,
                    operatingExpenses: {},
                    totalOperatingExpenses: 0,
                    netIncome: 0,
                };

                const filteredJournal = this.state.journal.filter(entry => {
                    const entryDate = new Date(entry.date);
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // Include the whole end day
                    return entryDate >= start && entryDate <= end;
                });

                filteredJournal.forEach(journalEntry => {
                    journalEntry.entries.forEach(line => {
                        const account = this.state.chartOfAccounts.find(acc => acc.code === line.accountCode);
                        if (!account) return;

                        if (account.type === 'Revenue') {
                            results.totalRevenue += line.credit;
                        } else if (account.type === 'Contra-Revenue') { // Sales Discount
                            results.totalDiscounts += line.debit;
                        } else if (account.type === 'COGS') {
                            results.totalCOGS += line.debit;
                        } else if (account.type === 'Expense') {
                            if (!results.operatingExpenses[account.name]) {
                                results.operatingExpenses[account.name] = 0;
                            }
                            results.operatingExpenses[account.name] += line.debit;
                        }
                    });
                });

                results.netRevenue = results.totalRevenue - results.totalDiscounts;
                results.grossProfit = results.netRevenue - results.totalCOGS;
                results.totalOperatingExpenses = Object.values(results.operatingExpenses).reduce((sum, val) => sum + val, 0);
                results.netIncome = results.grossProfit - results.totalOperatingExpenses;

                return results;
            },

// REPLACE your current getPnlView, renderPnlReport, and updatePnlView functions with these:

getPnlView() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Get initial dates, but check if elements exist first (for safety)
    const startDate = document.getElementById('pnlStartDate')?.value || firstDayOfMonth;
    const endDate = document.getElementById('pnlEndDate')?.value || today;

    return `
        <div class="space-y-6 fade-in">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Profit & Loss Statement</h2>
                <p class="text-gray-400">Analyze your revenue and expenses over a specific period.</p>
            </div>

            <div class="perplexity-card p-4">
                <div class="flex flex-col md:flex-row gap-4 items-center">
                    <div class="flex-1">
                        <label for="pnlStartDate" class="text-sm font-medium text-gray-300">Start Date</label>
                        <input type="date" id="pnlStartDate" value="${startDate}" onchange="app.updatePnlView()" class="form-input w-full mt-1">
                    </div>
                    <div class="flex-1">
                        <label for="pnlEndDate" class="text-sm font-medium text-gray-300">End Date</label>
                        <input type="date" id="pnlEndDate" value="${endDate}" onchange="app.updatePnlView()" class="form-input w-full mt-1">
                    </div>
                </div>
            </div>

            <div id="pnl-report-container">
                ${this.renderPnlReport(startDate, endDate)}
            </div>
        </div>
    `;
},

renderPnlReport(startDate, endDate) {
    // ** THE FIX IS HERE **
    // This function now receives dates as arguments instead of trying to find them in the DOM.
    const pnlData = this.calculatePnL(startDate, endDate);
    const isProfit = pnlData.netIncome >= 0;

    return `
        <div class="perplexity-card p-6 slide-up">
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-medium text-white">Revenue</span>
                </div>
                <div class="flex justify-between items-center pl-4 border-l-2 border-gray-700">
                    <span class="text-gray-300">Total Sales Revenue</span>
                    <span class="font-mono">${this.formatCurrency(pnlData.totalRevenue)}</span>
                </div>
                <div class="flex justify-between items-center pl-4 border-l-2 border-gray-700">
                    <span class="text-gray-300">Less: Sales Discounts</span>
                    <span class="font-mono">(${this.formatCurrency(pnlData.totalDiscounts)})</span>
                </div>
                <div class="flex justify-between items-center text-lg font-semibold border-t border-gray-600 pt-2">
                    <span class="text-white">Net Revenue</span>
                    <span class="font-mono text-white">${this.formatCurrency(pnlData.netRevenue)}</span>
                </div>

                <div class="flex justify-between items-center pt-4">
                    <span class="text-lg font-medium text-white">Cost of Goods Sold (COGS)</span>
                    <span class="font-mono">(${this.formatCurrency(pnlData.totalCOGS)})</span>
                </div>
                <div class="flex justify-between items-center text-xl font-semibold border-t-2 border-gray-500 pt-3 mt-2">
                    <span class="text-teal-400">Gross Profit</span>
                    <span class="font-mono text-teal-400">${this.formatCurrency(pnlData.grossProfit)}</span>
                </div>

                <div class="flex justify-between items-center pt-4">
                    <span class="text-lg font-medium text-white">Operating Expenses</span>
                </div>
                ${Object.keys(pnlData.operatingExpenses).map(expenseName => `
                    <div class="flex justify-between items-center pl-4 border-l-2 border-gray-700">
                        <span class="text-gray-300">${expenseName}</span>
                        <span class="font-mono">(${this.formatCurrency(pnlData.operatingExpenses[expenseName])})</span>
                    </div>
                `).join('')}
                <div class="flex justify-between items-center text-lg font-semibold border-t border-gray-600 pt-2">
                    <span class="text-white">Total Operating Expenses</span>
                    <span class="font-mono text-white">(${this.formatCurrency(pnlData.totalOperatingExpenses)})</span>
                </div>
                
                <div class="flex justify-between items-center text-2xl font-bold border-t-4 pt-4 mt-4 ${isProfit ? 'border-green-500' : 'border-red-500'}">
                    <span class="${isProfit ? 'text-green-400' : 'text-red-400'}">Net ${isProfit ? 'Income' : 'Loss'}</span>
                    <span class="font-mono ${isProfit ? 'text-green-400' : 'text-red-400'}">${this.formatCurrency(pnlData.netIncome)}</span>
                </div>
            </div>
        </div>
    `;
},

updatePnlView() {
    const container = document.getElementById('pnl-report-container');
    // ** THE FIX IS HERE **
    // This function now correctly reads the dates from the DOM and passes them to the render function.
    const startDate = document.getElementById('pnlStartDate').value;
    const endDate = document.getElementById('pnlEndDate').value;
    if (container) {
        container.innerHTML = this.renderPnlReport(startDate, endDate);
    }
},

            // Step 3: Create a "Ledger" (T-Accounts) View
            viewLedgerAccount(accountCode) {
                this.state.currentLedgerAccount = accountCode;
                this.state.currentView = 'ledger'; // FIX FOR TASK 1
                this.render(); // FIX FOR TASK 1
            },

            getLedgerView() {
                const selectedAccountCode = this.state.currentLedgerAccount;
                const selectedAccount = this.state.chartOfAccounts.find(acc => acc.code === selectedAccountCode);

                if (!selectedAccountCode || !selectedAccount) {
                    // Display list of accounts if no specific account is selected
                    return `
                        <div class="space-y-6 fade-in">
                            <h2 class="text-2xl font-bold text-white mb-2">General Ledger</h2>
                            <p class="text-gray-400">Select an account to view its detailed ledger (T-Account).</p>
                            <div class="perplexity-card overflow-hidden">
                                <div class="responsive-table">
                                    <table class="w-full">
                                        <thead class="border-b border-gray-600">
                                            <tr>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account Code</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account Name</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Normal Balance</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-600">
                                            ${this.state.chartOfAccounts.map((account, index) => `
                                                <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                    <td class="px-6 py-4 text-white">${account.code}</td>
                                                    <td class="px-6 py-4 text-white font-medium">${account.name}</td>
                                                    <td class="px-6 py-4 text-gray-400">${account.type}</td>
                                                    <td class="px-6 py-4 text-gray-400">${account.normalBalance}</td>
                                                    <td class="px-6 py-4">
                                                        <button data-action="view-ledger-account" data-id="${account.code}" class="text-blue-400 hover:text-blue-300 transition-colors">
                                                            <i class="fas fa-eye mr-1"></i>View Ledger
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // Calculate T-Account details
                let totalDebits = 0;
                let totalCredits = 0;
                const accountEntries = [];

                this.state.journal.forEach(journalEntry => {
                    journalEntry.entries.forEach(line => {
                        if (line.accountCode === selectedAccountCode) {
                            accountEntries.push({
                                date: journalEntry.date,
                                description: journalEntry.description,
                                debit: line.debit,
                                credit: line.credit
                            });
                            totalDebits += line.debit;
                            totalCredits += line.credit;
                        }
                    });
                });

                let finalBalance = 0;
                let balanceType = '';

                if (selectedAccount.normalBalance === 'Debit') {
                    finalBalance = totalDebits - totalCredits;
                    balanceType = finalBalance >= 0 ? 'Debit' : 'Credit';
                } else { // Normal balance is Credit
                    finalBalance = totalCredits - totalDebits;
                    balanceType = finalBalance >= 0 ? 'Credit' : 'Debit';
                }

                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-2">Ledger: ${selectedAccount.name} (${selectedAccount.code})</h2>
                                <p class="text-gray-400">Detailed transactions for this account.</p>
                            </div>
                            <button data-action="ledger" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                                <i class="fas fa-arrow-left mr-2"></i>Back to Accounts
                            </button>
                        </div>

                        <div class="perplexity-card p-6">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="text-center border-r border-gray-700 pr-4">
                                    <h3 class="text-xl font-bold text-blue-400 mb-4">Debits</h3>
                                    <div class="space-y-2">
                                        ${accountEntries.filter(e => e.debit > 0).map(e => `
                                            <div class="flex justify-between text-gray-300 text-sm">
                                                <span>${e.date} - ${e.description.substring(0, 30)}...</span>
                                                <span class="font-mono">${this.formatCurrency(e.debit)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="border-t border-gray-600 mt-4 pt-2 text-lg font-bold text-blue-400">
                                        Total Debits: ${this.formatCurrency(totalDebits)}
                                    </div>
                                </div>
                                <div class="text-center pl-4">
                                    <h3 class="text-xl font-bold text-teal-400 mb-4">Credits</h3>
                                    <div class="space-y-2">
                                        ${accountEntries.filter(e => e.credit > 0).map(e => `
                                            <div class="flex justify-between text-gray-300 text-sm">
                                                <span>${e.date} - ${e.description.substring(0, 30)}...</span>
                                                <span class="font-mono">${this.formatCurrency(e.credit)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="border-t border-gray-600 mt-4 pt-2 text-lg font-bold text-teal-400">
                                        Total Credits: ${this.formatCurrency(totalCredits)}
                                    </div>
                                </div>
                            </div>
                            <div class="border-t-2 border-gray-500 mt-6 pt-4 text-center">
                                <h3 class="text-2xl font-bold ${finalBalance >= 0 ? 'text-green-400' : 'text-red-400'}">
                                    Final Balance: ${this.formatCurrency(Math.abs(finalBalance))} ${balanceType}
                                </h3>
                            </div>
                        </div>
                    </div>
                `;
            },

            // Step 4: Create a "Trial Balance" Report View
            getTrialBalanceView() {
                const accountBalances = {};

                // Initialize all accounts with zero balance
                this.state.chartOfAccounts.forEach(account => {
                    accountBalances[account.code] = {
                        name: account.name,
                        type: account.type,
                        normalBalance: account.normalBalance,
                        debit: 0,
                        credit: 0,
                        finalBalance: 0
                    };
                });

                // Populate balances from journal entries
                this.state.journal.forEach(journalEntry => {
                    journalEntry.entries.forEach(line => {
                        if (accountBalances[line.accountCode]) {
                            accountBalances[line.accountCode].debit += line.debit;
                            accountBalances[line.accountCode].credit += line.credit;
                        }
                    });
                });

                let totalDebits = 0;
                let totalCredits = 0;

                // Calculate final balance for each account and sum totals
                Object.values(accountBalances).forEach(account => {
                    if (account.normalBalance === 'Debit') {
                        account.finalBalance = account.debit - account.credit;
                        if (account.finalBalance >= 0) {
                            totalDebits += account.finalBalance;
                        } else {
                            totalCredits += Math.abs(account.finalBalance);
                        }
                    } else { // Normal balance is Credit
                        account.finalBalance = account.credit - account.debit;
                        if (account.finalBalance >= 0) {
                            totalCredits += account.finalBalance;
                        } else {
                            totalDebits += Math.abs(account.finalBalance);
                        }
                    }
                });

                return `
                    <div class="space-y-6 fade-in">
                        <h2 class="text-2xl font-bold text-white mb-2">Trial Balance</h2>
                        <p class="text-gray-400">A summary of all account balances to verify the equality of debits and credits.</p>
                        <div class="perplexity-card overflow-hidden">
                            <div class="responsive-table">
                                <table class="w-full">
                                    <thead class="border-b border-gray-600">
                                        <tr>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Debit</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-600">
                                        ${Object.values(accountBalances).map((account, index) => `
                                            <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                <td class="px-6 py-4 text-white font-medium">${account.name} (${account.code})</td>
                                                <td class="px-6 py-4 text-right font-mono text-blue-400">
                                                    ${account.normalBalance === 'Debit' && account.finalBalance >= 0 ? this.formatCurrency(account.finalBalance) : ''}
                                                    ${account.normalBalance === 'Credit' && account.finalBalance < 0 ? this.formatCurrency(Math.abs(account.finalBalance)) : ''}
                                                </td>
                                                <td class="px-6 py-4 text-right font-mono text-teal-400">
                                                    ${account.normalBalance === 'Credit' && account.finalBalance >= 0 ? this.formatCurrency(account.finalBalance) : ''}
                                                    ${account.normalBalance === 'Debit' && account.finalBalance < 0 ? this.formatCurrency(Math.abs(account.finalBalance)) : ''}
                                                </td>
                                            </tr>
                                        `).join('')}
                                        <tr class="border-t-2 border-gray-500 font-bold text-lg">
                                            <td class="px-6 py-4 text-white">Total</td>
                                            <td class="px-6 py-4 text-right text-blue-400">${this.formatCurrency(totalDebits)}</td>
                                            <td class="px-6 py-4 text-right text-teal-400">${this.formatCurrency(totalCredits)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            ${Math.abs(totalDebits - totalCredits) < 0.01 ? `
                                <div class="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center text-green-400 font-medium">
                                    <i class="fas fa-check-circle mr-2"></i>Debits and Credits are balanced!
                                </div>
                            ` : `
                                <div class="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center text-red-400 font-medium">
                                    <i class="fas fa-exclamation-triangle mr-2"></i>Trial Balance is NOT balanced! Please check journal entries.
                                </div>
                            `}
                        </div>
                    </div>
                `;
            },

            // New: Balance Sheet Report
            getBalanceSheetView() {
                const accountBalances = {};

                // Initialize all accounts with zero balance
                this.state.chartOfAccounts.forEach(account => {
                    accountBalances[account.code] = {
                        name: account.name,
                        type: account.type,
                        normalBalance: account.normalBalance,
                        balance: 0
                    };
                });

                // Populate balances from journal entries
                this.state.journal.forEach(journalEntry => {
                    journalEntry.entries.forEach(line => {
                        if (accountBalances[line.accountCode]) {
                            if (accountBalances[line.accountCode].normalBalance === 'Debit') {
                                accountBalances[line.accountCode].balance += line.debit - line.credit;
                            } else { // Normal balance is Credit
                                accountBalances[line.accountCode].balance += line.credit - line.debit;
                            }
                        }
                    });
                });

                // Calculate Retained Earnings (Net Income from P&L for all time)
                const pnlAllTime = this.calculatePnL('1970-01-01', new Date().toISOString().split('T')[0]);
                const retainedEarnings = pnlAllTime.netIncome;
                
                // Ensure Retained Earnings account exists and update its balance
                if (accountBalances['3210']) {
                    accountBalances['3210'].balance += retainedEarnings;
                } else {
                    // Fallback if '3210' is somehow missing from chartOfAccounts
                    accountBalances['3210'] = {
                        code: '3210',
                        name: 'Retained Earnings',
                        type: 'Equity',
                        normalBalance: 'Credit',
                        balance: retainedEarnings
                    };
                }


                const assets = Object.values(accountBalances).filter(acc => acc.type === 'Asset' && acc.balance !== 0);
                const liabilities = Object.values(accountBalances).filter(acc => acc.type === 'Liability' && acc.balance !== 0);
                const equity = Object.values(accountBalances).filter(acc => acc.type === 'Equity' && acc.balance !== 0);

                const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
                const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
                const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
                const liabilitiesAndEquity = totalLiabilities + totalEquity;

                const isBalanced = Math.abs(totalAssets - liabilitiesAndEquity) < 0.01;

                return `
                    <div class="space-y-6 fade-in">
                        <h2 class="text-2xl font-bold text-white mb-2">Balance Sheet</h2>
                        <p class="text-gray-400">A snapshot of assets, liabilities, and equity at a specific point in time.</p>
                        <div class="perplexity-card p-6">
                            <h3 class="text-xl font-bold text-white mb-4">Assets</h3>
                            <div class="space-y-2 mb-6">
                                ${assets.map(acc => `
                                    <div class="flex justify-between items-center text-gray-300">
                                        <span>${acc.name}</span>
                                        <span class="font-mono">${this.formatCurrency(acc.balance)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="flex justify-between items-center text-lg font-bold text-teal-400 border-t border-gray-600 pt-2">
                                <span>Total Assets</span>
                                <span class="font-mono">${this.formatCurrency(totalAssets)}</span>
                            </div>
                        </div>

                        <div class="perplexity-card p-6">
                            <h3 class="text-xl font-bold text-white mb-4">Liabilities</h3>
                            <div class="space-y-2 mb-6">
                                ${liabilities.map(acc => `
                                    <div class="flex justify-between items-center text-gray-300">
                                        <span>${acc.name}</span>
                                        <span class="font-mono">${this.formatCurrency(acc.balance)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="flex justify-between items-center text-lg font-bold text-red-400 border-t border-gray-600 pt-2">
                                <span>Total Liabilities</span>
                                <span class="font-mono">${this.formatCurrency(totalLiabilities)}</span>
                            </div>
                        </div>

                        <div class="perplexity-card p-6">
                            <h3 class="text-xl font-bold text-white mb-4">Equity</h3>
                            <div class="space-y-2 mb-6">
                                ${equity.map(acc => `
                                    <div class="flex justify-between items-center text-gray-300">
                                        <span>${acc.name}</span>
                                        <span class="font-mono">${this.formatCurrency(acc.balance)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="flex justify-between items-center text-lg font-bold text-blue-400 border-t border-gray-600 pt-2">
                                <span>Total Equity</span>
                                <span class="font-mono">${this.formatCurrency(totalEquity)}</span>
                            </div>
                        </div>

                        <div class="perplexity-card p-6">
                            <div class="flex justify-between items-center text-xl font-bold text-white">
                                <span>Total Liabilities & Equity</span>
                                <span class="font-mono">${this.formatCurrency(liabilitiesAndEquity)}</span>
                            </div>
                            <div class="mt-4 p-4 rounded-xl text-center font-medium ${isBalanced ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}">
                                <i class="fas ${isBalanced ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2"></i>
                                ${isBalanced ? 'Balance Sheet is balanced!' : 'Balance Sheet is NOT balanced!'}
                            </div>
                        </div>
                    </div>
                `;
            },

           
            render() {
    const appContainer = document.getElementById('app');
    const currentView = this.state.currentView;

    // Step 1: Handle views that do NOT need the main layout (sidebar/navbar)
    if (currentView === 'login') {
        appContainer.className = 'app-container'; // Reset class
        appContainer.innerHTML = this.getLoginView();
        return; // Stop here
    }
    if (currentView === 'userSelection') {
        appContainer.className = 'app-container'; // Reset class
        appContainer.innerHTML = this.getUserSelectionView();
        return; // Stop here
    }
    if (this.state.quickSale.active) {
        appContainer.className = 'app-container'; // Reset class
        appContainer.innerHTML = this.getQuickSaleView();
        setTimeout(() => this.bindQuickSaleEvents(), 50);
        return; // Stop here
    }

    // Step 2: If we are past the special views, a user MUST be logged in.
    if (!this.state.currentUser) {
        this.logout();
        return;
    }

    // Step 3: Determine the main content for logged-in views using the viewMap
    const viewMap = {
        'dashboard': () => this.getDashboardView(),
        'accura-ai': () => this.getAIAssistantView(),
        'tasks': () => this.getTasksView(),
        'products': () => this.getProductsView(),
        'customers': () => this.getCustomersView(),
        'sales': () => this.getSalesView(),
        'expenses': () => this.getExpensesView(),
        'employees': () => this.getEmployeesView(),
        'invoices': () => this.getInvoicesView(),
        'reports': () => this.getReportsView(),
        'journal': () => this.getJournalView(),
        'pnl': () => this.getPnlView(),
        'ledger': () => this.getLedgerView(),
        'trial-balance': () => this.getTrialBalanceView(),
        'balance-sheet': () => this.getBalanceSheetView(),
        'inbox': () => this.getInboxView(),
        'branch-hub': () => this.getBranchHubView(),
        'settings': () => this.getSettingsView(),
        'bot': () => this.getAccuraBotView(),
    
    };

    const contentHTML = viewMap[currentView] ? viewMap[currentView]() : this.getDashboardView();

    // Step 4: Render the main application grid layout with the content
    appContainer.className = 'app-container app-container-grid';
    appContainer.innerHTML = `
        ${this.getSidebar()}
        ${this.getNavbar()}
        <main class="main-content">${contentHTML}</main>
    `;

    // Step 5: Run post-render scripts AND apply special classes
    this.postRenderSetup();

    // --- THIS IS THE NEW LOGIC ---
    const mainContent = appContainer.querySelector('.main-content');
    if (mainContent) {
        if (currentView === 'accura-ai') {
            mainContent.classList.add('ai-view-active');
        } else {
            mainContent.classList.remove('ai-view-active');
        }
    }
}, // <-- THIS IS THE FIX: The closing brace '}' for the render function and the comma were added here.

initializeHeaderAnimation() {
    // Clear any existing timer to prevent duplicates when re-rendering
    if (this.animationInterval) {
        clearInterval(this.animationInterval);
    }

    const headers = document.querySelectorAll('.animated-header-container');
    if (headers.length === 0) return;

    // A function to play the animation
    const playAnimation = () => {
        headers.forEach(header => {
            header.classList.remove('animate');
            // This is a browser trick to force the animation to restart
            void header.offsetWidth;
            header.classList.add('animate');
        });
    };

    // Play it once immediately
    playAnimation();

    // Then, set it to play again every 60 seconds
    this.animationInterval = setInterval(playAnimation, 15000);
},
// START: REPLACEMENT FOR setTheme
           setTheme(themeName) {
    document.body.className = themeName === 'default' ? '' : themeName;
    DataStorage.save('OwlioTheme', themeName);
    if (this.state.currentView === 'settings') {
        this.render(); // Re-render the settings view to update the selection border
    }
    NotificationSystem.success(`Theme changed successfully!`);
},
// END: REPLACEMENT FOR setTheme

           animateDashboardNumbers() {
                document.querySelectorAll('.animated-number').forEach(element => {
                    const targetValue = parseFloat(element.getAttribute('data-target'));
                    const formatType = element.dataset.format || 'integer'; // Default to integer if not specified
                    const startValue = 0;
                    const duration = 1200; // milliseconds
                    const frameDuration = 1000 / 60; // 60fps
                    const totalFrames = Math.round(duration / frameDuration);
                    let frame = 0;

                    const counter = setInterval(() => {
                        frame++;
                        const progress = frame / totalFrames;
                        // Use an easing function for smoother animation
                        const easeOutProgress = 1 - Math.pow(1 - progress, 3);
                        let currentValue = startValue + (targetValue - startValue) * easeOutProgress;

                        if (frame === totalFrames) {
                            currentValue = targetValue;
                            clearInterval(counter);
                        }
                        
                        // Apply formatting based on the data-format attribute
                        if (formatType === 'currency') {
                            element.textContent = this.formatCurrency(currentValue, false);
                        } else { // 'integer'
                            element.textContent = Math.round(currentValue).toLocaleString();
                        }

                    }, frameDuration);
                });
            },

            getLoginView() {
                return `
                    <div class="login-hero">
                        <div class="login-shell fade-in">
                            <div class="login-brand">
                                <span class="material-symbols-outlined owl-logo-icon">owl</span>
                                <div>
                                    <h1 class="login-brand-title">Owlio</h1>
                                    <p class="login-brand-subtitle">AI-Powered Business Command Center</p>
                                </div>
                            </div>
                            <p class="login-tagline">Choose your vantage point and jump into the data.</p>
                            <div class="login-pill-row">
                                <span class="login-pill">Bubble AI Insights</span>
                                <span class="login-pill">AccuraBot Automation</span>
                                <span class="login-pill">GCC Ready</span>
                            </div>
                            <div class="user-selection-grid">
                                <div class="user-selection-card user-selection-admin" data-action="login-admin" tabindex="0">
                                    <span class="material-symbols-outlined user-card-icon">verified_user</span>
                                    <h3 class="user-card-title">Admin</h3>
                                    <p class="user-card-description">Command every module, configure teams, and launch AI workflows.</p>
                                    <div class="user-card-tags">
                                        <span>Full Suite</span>
                                        <span>AI Control</span>
                                    </div>
                                </div>
                                <div class="user-selection-card user-selection-supervision" data-action="login-manager" tabindex="0">
                                    <span class="material-symbols-outlined user-card-icon">supervisor_account</span>
                                    <h3 class="user-card-title">Supervision</h3>
                                    <p class="user-card-description">Guide performance, approve insights, and keep operations on track.</p>
                                    <div class="user-card-tags">
                                        <span>Team Analytics</span>
                                        <span>Approvals</span>
                                    </div>
                                </div>
                                <div class="user-selection-card user-selection-sales" data-action="login-worker" tabindex="0">
                                    <span class="material-symbols-outlined user-card-icon">trending_up</span>
                                    <h3 class="user-card-title">Sales</h3>
                                    <p class="user-card-description">Close deals, record activity, and track live commissions effortlessly.</p>
                                    <div class="user-card-tags">
                                        <span>Sales Cockpit</span>
                                        <span>Live Earnings</span>
                                    </div>
                                </div>
                            </div>
                            <div class="login-footer-note">
                                Precision finance | Realtime intelligence | Human-friendly AI
                            </div>
                        </div>
                    </div>
                `;
            },
// START: REPLACEMENT FOR getNavbar

getNavbar() {
    const unreadCount = this.getUnreadMessageCount();
    const aiIcon = this.state.aiMode === 'ai' ? 'fas fa-crosshairs' : 'fas fa-robot';
    const aiIconShineClass = this.state.aiMode === 'ai' ? 'ai-icon-shine' : 'bot-icon-shine';
    const aiText = this.state.aiMode === 'ai' ? 'AccuraAI' : 'AccuraBot';
    const countryInfo = GCC_COUNTRIES[this.state.selectedCountry];

    return `
        <div class="navbar">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <div class="burger-menu" data-action="toggle-mobile-menu">
                        <i class="fas fa-bars text-white text-lg"></i>
                    </div>
                    <div class="flex items-center">
                        <div id="navbar-logo-container" class="animated-header-container">
                            <h1 class="animated-header text-2xl font-bold">
                                <span style="--i:1">O</span><span style="--i:2">w</span><span style="--i:3">l</span><span style="--i:4">i</span><span style="--i:5">o</span>
                            </h1>
                        </div>
                    </div>
                    <div class="hidden md:flex items-center space-x-4">
                        <span class="text-gray-500">|</span>
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <span class="text-white font-bold text-sm">${this.state.currentUser.name.charAt(0)}</span>
                            </div>
                            <div>
                                <p class="text-white font-medium text-sm">${this.state.currentUser.name}</p>
                                <p class="text-xs text-gray-400 capitalize">${this.state.currentUser.role}</p>
                            </div>
                        </div>
                        ${['admin', 'manager'].includes(this.state.currentUser.role) ? `
                            <div class="flex items-center space-x-2">
                                <span class="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs rounded-full font-medium">
                                    ${countryInfo.currency} - ${countryInfo.name.split(' ')[0]}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="flex items-center space-x-2">
                    <button data-action="start-quick-sale" class="quick-sale-button quick-sale-pulse px-3 py-2 rounded-lg text-sm font-medium" title="Quick Sale">
                        <i class="fas fa-bolt text-lg"></i>
                        <span class="hidden sm:inline ml-2">Quick Sale</span>
                    </button>

                    <button data-action="navigate-to-ai-or-bot" class="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50" title="${aiText}">
                      <span class="material-symbols-outlined text-2xl ${aiIconShineClass}">bubble_chart</span
                    </button>

                    <div class="relative">
                        <button data-action="inbox" class="text-gray-400 hover:text-teal-400 transition-colors p-2 rounded-lg hover:bg-gray-700/50" title="Messages">
                            <i class="fas fa-envelope text-lg"></i>
                            ${unreadCount > 0 ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${unreadCount}</span>` : ''}
                        </button>
                    </div>

                    <button data-action="export-data" class="text-gray-400 hover:text-teal-400 transition-colors p-2 rounded-lg hover:bg-gray-700/50 hidden sm:block" title="Export Data">
                        <i class="fas fa-download text-lg"></i>
                    </button>

                    <button data-action="logout" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all" title="Logout">
                        <i class="fas fa-sign-out-alt"></i>
                        <span class="hidden sm:inline ml-2">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    `;
},

// END: REPLACEMENT FOR getNavbar
            



getSidebar() {
    const menuItems = [
        { key: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard', roles: ['admin', 'manager', 'worker'] },
        { key: 'tasks', icon: 'fas fa-tasks', label: 'Tasks', roles: ['admin', 'manager', 'worker'] },
        { key: 'navigate-to-ai-or-bot', icon: this.state.aiMode === 'ai' ? 'fas fa-crosshairs' : 'fas fa-robot', label: this.state.aiMode === 'ai' ? 'Bubble AI' : 'AccuraBot', roles: ['admin', 'manager', 'worker'] },
        { key: 'products', icon: 'fas fa-box', label: 'Products', roles: ['admin', 'manager', 'worker'] },
        { key: 'customers', icon: 'fas fa-users', label: 'Customers', roles: ['admin', 'manager', 'worker'] },
        { key: 'sales', icon: 'fas fa-shopping-cart', label: 'Sales', roles: ['admin', 'manager', 'worker'] },
        { key: 'expenses', icon: 'fas fa-receipt', label: 'Expenses', roles: ['admin', 'manager', 'worker'] },
        { key: 'invoices', icon: 'fas fa-file-invoice', label: 'Invoices', roles: ['admin', 'manager', 'worker'] },
        { key: 'journal', icon: 'fas fa-book fa-fw', label: 'General Journal', roles: ['admin', 'worker'] },
        { key: 'ledger', icon: 'fas fa-book-open fa-fw', label: 'Ledger', roles: ['admin', 'manager'] },
        { key: 'trial-balance', icon: 'fas fa-balance-scale fa-fw', label: 'Trial Balance', roles: ['admin', 'manager'] },
        { key: 'pnl', icon: 'fas fa-chart-line fa-fw', label: 'Profit & Loss', roles: ['admin', 'manager'] },
        { key: 'balance-sheet', icon: 'fas fa-file-alt fa-fw', label: 'Balance Sheet', roles: ['admin', 'manager'] },
        { key: 'inbox', icon: 'fas fa-envelope', label: 'Inbox', roles: ['admin', 'manager', 'worker'] },
        { key: 'employees', icon: 'fas fa-user-tie', label: 'Employees', roles: ['admin', 'manager'] },
        { key: 'reports', icon: 'fas fa-chart-bar', label: 'Reports', roles: ['admin', 'manager'] },
        { key: 'settings', icon: 'fas fa-cog', label: 'Settings', roles: ['admin', 'manager', 'worker'] }
    ];

    const userRole = this.state.currentUser.role;
    const visibleItems = menuItems.filter(item => item.roles.includes(userRole));
    const unreadCount = this.getUnreadMessageCount();

    const sidebarContent = `
        <div class="p-6">
            <div class="flex items-center mb-8">
              <div id="sidebar-logo-container" class="animated-header-container">
                <span class="material-symbols-outlined owl-logo-icon">owl</span>
                <h1 class="animated-header text-2xl font-bold">
                    <span style="--i:1">O</span><span style="--i:2">w</span><span style="--i:3">l</span><span style="--i:4">i</span><span style="--i:5">o</span>
                </h1>
              </div>
            </div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</h3>
            <ul class="space-y-2">
               ${visibleItems.map(item => {
    
    const isAiBotLink = item.key === 'navigate-to-ai-or-bot';
    const shineClass = isAiBotLink 
        ? (this.state.aiMode === 'ai' ? 'ai-icon-shine' : 'bot-icon-shine') 
        : '';

   const iconHtml = isAiBotLink
    ? `<span class="material-symbols-outlined fa-fw ${shineClass}">bubble_chart</span>`
    : `<i class="${item.icon} fa-fw ${shineClass}"></i>`;

    return `
    <li>
        <button data-action="${item.key}" class="menu-item ${this.state.currentView === item.key || (isAiBotLink && ['accura-ai', 'bot'].includes(this.state.currentView)) ? 'active' : ''}">
            ${iconHtml}
            <span class="font-medium">${item.label}</span>
            ${item.key === 'inbox' && unreadCount > 0 ? `<span class="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${unreadCount}</span>` : ''}
        </button>
    </li>
    `}).join('')}
                    
            </ul>

            <div class="mt-8 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/50">
                <div class="text-center">
                    <h4 class="text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent mb-1">${this.state.companyName}</h4>
                    <p class="text-gray-400 text-xs">Powered by Bubble AI</p>
                    <div class="mt-2 text-xs text-gray-500">
                        ${GCC_COUNTRIES[this.state.selectedCountry].currency} - ${GCC_COUNTRIES[this.state.selectedCountry].name.split(' ')[0]}
                    </div>
                </div>
            </div>
        </div>
    `;

    return `
        <div id="mobile-sidebar" class="mobile-sidebar">
            ${sidebarContent}
        </div>

        <div class="desktop-sidebar">
            ${sidebarContent}
        </div>
    `;
},



         getDashboardView() {
                const { currentUser, users, sales, expenses, products, customers } = this.state;
                let filteredSales, filteredExpenses;

                // --- DATA SCOPING LOGIC ---
                if (currentUser.role === 'admin') {
                    filteredSales = sales;
                    filteredExpenses = expenses;
                } else if (currentUser.role === 'manager') {
                    const workerIds = users.filter(u => u.role === 'worker').map(u => u.id);
                    const managedUserIds = [currentUser.id, ...workerIds];
                    filteredSales = sales.filter(s => managedUserIds.includes(s.salesPersonId));
                    // Check for the new createdByUserId property, fallback to old addedBy
                    filteredExpenses = expenses.filter(e => managedUserIds.includes(e.createdByUserId || e.addedBy));
                } else { // worker
                    filteredSales = sales.filter(s => s.salesPersonId === currentUser.id);
                    // Check for the new createdByUserId property, fallback to old addedBy
                    filteredExpenses = expenses.filter(e => (e.createdByUserId || e.addedBy) === currentUser.id);
                }
                // --- END DATA SCOPING ---

                const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
                const totalExpensesVal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
                const netProfit = totalRevenue - totalExpensesVal;
                const lowStockProducts = products.filter(p => p.stock <= this.state.lowStockThreshold);
                const recentSales = filteredSales.slice(-5).reverse();

                const monthlySalary = (currentUser.salary / 12) || 0;
                const totalEarnings = monthlySalary + (currentUser.commission || 0);
                const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
                
                // Using the filtered data for calculations
                const totalProducts = this.state.products.length;
                const totalCustomers = this.state.customers.length;
                const totalSalesCount = filteredSales.length;

                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <h2 class="text-2xl lg:text-3xl font-bold text-white mb-2">AI-Powered Dashboard</h2>
                                <p class="text-gray-400">Welcome back, ${currentUser.name}!</p>
                            </div>
                            <div class="flex items-center space-x-3">
                                ${['admin', 'manager'].includes(this.state.currentUser.role) ? this.getCountrySelector() : ''}
                                <button data-action="refresh-ai" class="${this.state.aiMode === 'ai' ? 'ai-button' : 'bot-button'} px-4 py-2 rounded-xl font-medium">
                                    <i class="fas fa-sync-alt mr-2"></i>Refresh AI
                                </button>
                            </div>
                        </div>

                        ${['worker', 'manager'].includes(currentUser.role) ? `
                            <div class="perplexity-card p-6 slide-up">
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="text-xl font-bold text-white flex items-center">
                                        <i class="fas fa-coins text-teal-400 mr-2"></i>
                                        Live Earnings
                                    </h3>
                                    <div class="flex items-center space-x-2">
                                        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span class="text-sm text-green-400 font-medium">LIVE</span>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div class="text-center p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                                        <div class="text-green-400 text-2xl mb-2">SAL</div>
                                        <p class="text-gray-400 text-sm mb-2">Monthly Salary</p>
                                        <p class="text-lg font-bold text-green-400 animated-number" data-target="${monthlySalary}" data-format="currency">${this.formatCurrency(0)}</p>
                                    </div>
                                    <div class="text-center p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                                        <div class="text-blue-400 text-2xl mb-2">COM</div>
                                        <p class="text-gray-400 text-sm mb-2">Commission</p>
                                        <p class="text-lg font-bold text-blue-400 animated-number" data-target="${currentUser.commission || 0}" data-format="currency">${this.formatCurrency(0)}</p>
                                    </div>
                                    <div class="text-center p-4 bg-gradient-to-r from-teal-500/10 to-blue-500/10 rounded-xl border border-teal-500/20">
                                        <div class="text-teal-400 text-2xl mb-2">TOT</div>
                                        <p class="text-gray-400 text-sm mb-2">Total Earnings</p>
                                        <p class="text-xl font-bold text-teal-400 animated-number" data-target="${totalEarnings}" data-format="currency">${this.formatCurrency(0)}</p>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <div class="responsive-grid-6">
                            <div class="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Products</p>
                                        <p class="text-2xl font-bold text-white animated-number" data-target="${totalProducts}" data-format="integer">${0}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center"><i class="fas fa-box text-blue-400"></i></div>
                                </div>
                            </div>
                            
                            <div class="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Customers</p>
                                        <p class="text-2xl font-bold text-white animated-number" data-target="${totalCustomers}" data-format="integer">${0}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center"><i class="fas fa-users text-green-400"></i></div>
                                </div>
                            </div>
                            
                            <div class="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Sales</p>
                                        <p class="text-2xl font-bold text-white animated-number" data-target="${totalSalesCount}" data-format="integer">${0}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center"><i class="fas fa-shopping-cart text-purple-400"></i></div>
                                </div>
                            </div>
                            
                            <div class="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Revenue</p>
                                        <p class="text-lg font-bold text-green-400 animated-number" data-target="${totalRevenue}" data-format="currency">${this.formatCurrency(0, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center"><i class="fas fa-arrow-up text-green-400"></i></div>
                                </div>
                            </div>
                            
                            <div class="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Net Profit</p>
                                        <p class="text-xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'} animated-number" data-target="${netProfit}" data-format="currency">${this.formatCurrency(0, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 ${netProfit >= 0 ? 'bg-blue-500/20' : 'bg-red-500/20'} rounded-xl flex items-center justify-center"><i class="fas fa-chart-line ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}"></i></div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 hover:scale-105 transition-all duration-300 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Inventory Value</p>
                                        <p class="text-lg font-bold text-yellow-400 animated-number" data-target="${totalInventoryValue}" data-format="currency">${this.formatCurrency(0, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center"><i class="fas fa-boxes text-yellow-400"></i></div>
                                </div>
                            </div>
                        </div>

                        ${this.state.aiInsights.length > 0 ? `
                            <div class="${this.state.aiMode === 'ai' ? 'ai-card' : 'bot-card'} p-6 slide-up">
                                <div class="flex items-center justify-between mb-6">
                                    <h3 class="text-xl font-bold text-white flex items-center">
    <i class="fas ${this.state.aiMode === 'ai' ? 'fa-brain text-purple-400' : 'fa-robot text-green-400'} mr-2"></i>
    ${this.state.aiMode === 'ai' ? 'Bubble AI' : 'AccuraBot'} Business Insights
</h3>
                                    <div class="px-3 py-1 ${this.state.aiMode === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'} rounded-full text-sm font-medium">
                                        ${this.state.aiMode === 'ai' ? 'AI Powered' : 'Bot Analysis'}
                                    </div>
                                </div>
                                <div class="grid gap-4">
                                    ${this.state.aiInsights.map(insight => `
                                        <div class="bg-gray-800/60 backdrop-filter backdrop-blur-lg p-4 rounded-xl border border-gray-600/50 hover:border-${this.state.aiMode === 'ai' ? 'purple' : 'green'}-500/50 transition-all duration-300 slide-up">
                                            <div class="flex items-start space-x-4">
                                                <div class="text-2xl">${insight.icon}</div>
                                                <div class="flex-1">
                                                    <h4 class="font-bold text-white mb-2">${insight.title}</h4>
                                                    <p class="text-gray-300 mb-3 leading-relaxed">${insight.message}</p>
                                                    <div class="bg-${this.state.aiMode === 'ai' ? 'purple' : 'green'}-500/10 border-l-4 border-${this.state.aiMode === 'ai' ? 'purple' : 'green'}-500 p-3 rounded-r-lg">
                                                        <p class="text-sm text-${this.state.aiMode === 'ai' ? 'purple' : 'green'}-400 font-medium">Recommendation: ${insight.action}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="perplexity-card p-6 slide-up">
                                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                    <i class="fas fa-chart-line text-teal-400 mr-2"></i>
                                    Sales Performance
                                </h3>
                                <div class="chart-container">
                                    <canvas id="salesChart"></canvas>
                                </div>
                            </div>
                            
                            <div class="perplexity-card p-6 slide-up">
                                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                    <i class="fas fa-chart-pie text-blue-400 mr-2"></i>
                                    Financial Overview
                                    </h3>
                                <div class="chart-container">
                                    <canvas id="financeChart"></canvas>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="perplexity-card p-6 slide-up">
                                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                    <i class="fas fa-bolt text-yellow-400 mr-2"></i>
                                    Quick Actions
                                </h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <button data-action="add-sale" class="perplexity-button p-4 rounded-xl text-center hover:scale-105 transition-all duration-300">
                                        <i class="fas fa-plus text-xl mb-2"></i>
                                        <div class="font-medium">New Sale</div>
                                        <div class="text-xs opacity-80 mt-1">Multi-product</div>
                                    </button>
                                    <button data-action="add-expense" class="expenses-button p-4 rounded-xl text-center hover:scale-105 transition-all duration-300">
                                        <i class="fas fa-receipt text-xl mb-2"></i>
                                        <div class="font-medium">Add Expense</div>
                                        <div class="text-xs opacity-80 mt-1">Track costs</div>
                                    </button>
                                    ${this.canManageProducts() ? `
                                        <button data-action="add-product" class="ai-button p-4 rounded-xl text-center hover:scale-105 transition-all duration-300">
                                            <i class="fas fa-box text-xl mb-2"></i>
                                            <div class="font-medium">Add Product</div>
                                            <div class="text-xs opacity-80 mt-1">Expand inventory</div>
                                        </button>
                                    ` : ''}
                                    <button data-action="add-customer" class="bot-button p-4 rounded-xl text-center hover:scale-105 transition-all duration-300">
                                        <i class="fas fa-user-plus text-xl mb-2"></i>
                                        <div class="font-medium">New Customer</div>
                                        <div class="text-xs opacity-80 mt-1">Grow base</div>
                                    </button>
                                </div>
                            </div>

                            <div class="perplexity-card p-6 slide-up">
                                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                    <i class="fas fa-clock text-blue-400 mr-2"></i>
                                    Recent Activity
                                </h3>
                                ${recentSales.length > 0 ? `
                                    <div class="space-y-3">
                                        ${recentSales.map(sale => {
                                            const customer = this.state.customers.find(c => c.id === sale.customerId);
                                            const itemSummary = sale.items.length > 1 ? `${sale.items.length} items` : `${sale.items[0].quantity} x ${this.state.products.find(p => p.id === sale.items[0].productId)?.name}`;
                                            return `
                                                <div class="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-600/30 hover:border-teal-500/50 transition-all duration-300">
                                                    <div class="flex items-center space-x-3">
                                                        <div class="w-8 h-8 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg flex items-center justify-center">
                                                            <i class="fas fa-shopping-bag text-white text-sm"></i>
                                                        </div>
                                                        <div>
                                                            <p class="text-white font-medium text-sm">${itemSummary}</p>
                                                            <p class="text-gray-400 text-xs">${customer ? customer.name : 'Customer'}</p>
                                                        </div>
                                                    </div>
                                                    <div class="text-right">
                                                        <p class="text-white font-bold">${this.formatCurrency(sale.total)}</p>
                                                        <button data-action="generate-invoice" data-id="${sale.id}" class="text-teal-400 hover:text-teal-300 text-xs">
                                                            <i class="fas fa-file-invoice mr-1"></i>Invoice
                                                        </button>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                ` : `
                                    <div class="text-center py-8 text-gray-400">
                                        <i class="fas fa-chart-line text-3xl mb-3 opacity-50"></i>
                                        <p class="mb-2">No recent sales</p>
                                        <button data-action="add-sale" class="perplexity-button px-4 py-2 rounded-xl">
                                            <i class="fas fa-plus mr-2"></i>Record Sale
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>

                        ${lowStockProducts.length > 0 ? `
                            <div class="perplexity-card p-6 border-l-4 border-red-500 bg-gradient-to-r from-red-500/10 to-transparent slide-up">
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="text-xl font-bold text-white flex items-center">
                                        <i class="fas fa-exclamation-triangle text-red-400 mr-2 animate-pulse"></i>
                                        Stock Alert
                                    </h3>
                                    <span class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                                        ${lowStockProducts.length} Items
                                    </span>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    ${lowStockProducts.slice(0, 6).map(product => `
                                        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 hover:border-red-500/50 transition-all duration-300">
                                            <div class="flex items-center justify-between">
                                                <div>
                                                    <p class="text-white font-medium text-sm">${product.name}</p>
                                                    <p class="text-red-400 text-sm font-bold">${product.stock} left</p>
                                                </div>
                                                <div class="text-red-400 text-xl">
                                                    <i class="fas fa-exclamation-triangle"></i>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="mt-4 text-center">
                                    <button data-action="products" class="perplexity-button px-4 py-2 rounded-xl">
                                        <i class="fas fa-box mr-2"></i>Manage Inventory
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            },

            getCountrySelector() {
                return `
                    <div class="flex items-center space-x-2">
                        <label class="text-sm text-gray-400 font-medium hidden sm:inline">Country:</label>
                        <select onchange="app.changeCountry(this.value)" class="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-3 py-1 rounded-xl border-none outline-none font-medium text-sm">
                            ${Object.entries(GCC_COUNTRIES).map(([code, country]) => `
                                <option value="${code}" ${this.state.selectedCountry === code ? 'selected' : ''} style="background: #1a1f2e; color: white;">
                                    ${country.currency} - ${country.name.split(' ')[0]}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            },


// In script.js
// ==> REPLACE THIS FUNCTION <==
getAIAssistantView() {
    if (this.state.aiViewPhase === 'selection') {
        // --- PHASE 1: SHOW CATEGORY SELECTION CARDS ---
        const userRole = this.state.currentUser.role;
        const availableCategories = AI_CATEGORIES[userRole] || AI_CATEGORIES['worker'];
        return `
            <div class="space-y-6 fade-in">
                <div class="flex items-center justify-between flex-wrap gap-x-4 gap-y-2">
                    <div class="flex items-center space-x-4">
                        <div class="ai-header-icon ai-pulse">
                            <span class="material-symbols-outlined ai-icon-gradient">bubble_chart</span>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold ai-gradient-text">Bubble AI Assistant</h2>
                            <p class="text-gray-400">Select a category to begin.</p>
                        </div>
                    </div>
                </div>
                <div id="ai-category-grid" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${availableCategories.map((cat, index) => `
                        <div 
                            class="ai-category-card scale-in"
                            style="--bg-image: url(${cat.image}); animation-delay: ${index * 100}ms;"
                            onclick="app.startAIChatSession('${cat.key}', '${cat.text}')"
                        >
                            <div class="ai-category-icon-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    ${cat.icon}
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-white mt-4">${cat.text}</h3>
                            <p class="text-sm text-white/70 mt-1 mb-4 flex-grow">${cat.subtext}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        // --- PHASE 2: SHOW THE CONTINUOUS CHAT INTERFACE ---
        return `
            <div class="ai-chat-view-container fade-in">
                <div class="p-4 border-b border-gray-700 flex justify-end">
                    <button class="text-sm text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap" onclick="app.showAICategories()">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Categories
                    </button>
                </div>
                <div id="ai-chat-log" class="ai-chat-log">
                    </div>
                <div class="ai-chat-input-bar">
                    <div class="ai-input-row">
                        <input type="text" id="ai-chat-input" class="form-input flex-1" placeholder="Ask a follow-up question..." onkeypress="if(event.key === 'Enter') app.submitAIChatMessage()">
                        <button type="button" class="ai-send-button" onclick="app.submitAIChatMessage()" aria-label="Send message">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
},

// In script.js
// ==> REPLACE THE ENTIRE BLOCK OF AI HELPER FUNCTIONS WITH THIS FINAL VERSION <==

// --- FINAL TWO-PHASE CHAT & SETTINGS LOGIC ---

// In script.js
// ==> REPLACE THIS FUNCTION <==
startAIChatSession(categoryKey, categoryText) {
    this.state.aiViewPhase = 'chat';
    this.state.currentAICategory = categoryKey;
    this.state.currentAICategoryText = categoryText;
    this.state.aiChatHistory = [{
        sender: 'welcome', // Use a special sender type for the first message
        content: `<p>Great, how can I help you with <strong>${categoryText}</strong>?</p>`
    }];
    this.state.aiAudioPlayers = {};
    this.render();
},
// STEP 3 (or clicking back): This function returns to the category selection
showAICategories() {
    this.state.aiViewPhase = 'selection';
    this.state.aiChatHistory = [];
    this.state.aiAudioPlayers = {};
    this.render();
},

// In script.js

// REPLACE THE OLD renderAIChatHistory FUNCTION WITH THIS ONE

renderAIChatHistory() {
    const chatLog = document.getElementById('ai-chat-log');
    if (!chatLog) return;

    chatLog.innerHTML = this.state.aiChatHistory.map((msg, index) => {
        if (msg.sender === 'user') {
            return `<div class="user-question-bubble">${msg.content}</div>`;
        } else if (msg.sender === 'welcome') {
            return `<div class="ai-answer-body">${msg.content}</div>`;
        } else if (msg.sender === 'ai') {
            const direction = msg.language === 'Arabic' ? 'rtl' : 'ltr';
            const shouldAnimate = !!msg.animate;
            const player = this.state.aiAudioPlayers?.[index] || {};
            const isLoading = !!player.isLoading;
            const isPlaying = !!player.isPlaying;
            
            let ttsIcon = 'fa-volume-up';
            let ttsTitle = 'Listen to this answer';
            if (isLoading) {
                ttsIcon = 'fa-spinner fa-spin';
                ttsTitle = 'Generating voice...';
            } else if (isPlaying) {
                ttsIcon = 'fa-stop';
                ttsTitle = 'Stop narration';
            }
            
            const vizClass = isPlaying ? ' is-playing' : '';

            return `
                <div
                    data-highlight-keywords="${this.state.aiSettings.highlightKeywords}"
                    data-highlight-numbers="${this.state.aiSettings.highlightNumbers}"
                >
                    <div class="ai-answer-header fade-in" data-message-index="${index}">
                        <div class="accura-icon">
                            <span class="material-symbols-outlined ai-icon-shine-effect">bubble_chart</span>
                        </div>
                        <div class="audio-visualizer${vizClass}" aria-hidden="true">
                            <div class="visualizer-bar"></div>
                            <div class="visualizer-bar"></div>
                            <div class="visualizer-bar"></div>
                            <div class="visualizer-bar"></div>
                        </div>
                    </div>
                    <div class="ai-answer-wrapper" data-message-index="${index}">
                        <div class="ai-answer-body" dir="${direction}" data-message-index="${index}" ${shouldAnimate ? 'data-animate="true"' : ''}>
                            ${msg.content}
                        </div>
                        <div class="ai-answer-footer" data-message-index="${index}">
                            <button class="ai-action-btn" data-action="share-ai-response" data-id="${index}" title="Share response">
                                <i class="fas fa-share-alt"></i>
                            </button>
                            <button class="ai-action-btn" data-action="copy-ai-response" data-id="${index}" title="Copy response">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="ai-action-btn" data-action="like-ai-response" data-id="${index}" title="Like response">
                                <i class="fas fa-thumbs-up"></i>
                            </button>
                            <button class="ai-action-btn" data-action="dislike-ai-response" data-id="${index}" title="Dislike response">
                                <i class="fas fa-thumbs-down"></i>
                            </button>
                            <button class="ai-action-btn ai-tts-btn" data-action="tts-ai-response" data-id="${index}" title="${ttsTitle}" onclick="event.stopPropagation(); app.handleAiTtsClick(${index})">
                                <i class="fas ${ttsIcon}"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (msg.sender === 'thinking') {
            return `
                <div class="ai-answer-header fade-in">
                    <div class="accura-icon loading"><span class="material-symbols-outlined">bubble_chart</span></div>
                    <div class="clean-thinking-container">
                        <p class="thinking-text">Thinking</p>
                        <div class="thinking-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            `;
        }
        return '';
    }).join('');

    this.repositionAIFollowups();

    const lastMessage = this.state.aiChatHistory[this.state.aiChatHistory.length - 1];
    if (lastMessage && (lastMessage.sender !== 'ai' || !lastMessage.animate)) {
        this.scrollAIChatToBottom();
    }
    requestAnimationFrame(() => {
        this.applyAIResponseAnimation();
        this.repositionAIFollowups();
    });
},

// REPLACE THE OLD FUNCTION WITH THIS WORKING JAVASCRIPT VERSION

// REPLACE THE OLD handleAiTtsClick FUNCTION WITH THIS ONE
repositionAIFollowups() {
    const wrappers = document.querySelectorAll('.ai-answer-wrapper');
    wrappers.forEach(wrapper => {
        const body = wrapper.querySelector('.ai-answer-body');
        const footer = wrapper.querySelector('.ai-answer-footer');
        if (!body || !footer) {
            return;
        }

        if (body.hasAttribute('data-animate') || body.dataset.typing === 'true') {
            return;
        }

        const followupSections = body.querySelectorAll('.ai-followup-section');
        followupSections.forEach(section => {
            footer.insertAdjacentElement('afterend', section);
        });
    });
},

async handleAiTtsClick(index) {
    const headerEl = document.querySelector(`.ai-answer-header[data-message-index="${index}"]`);
    if (headerEl) {
        headerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    this.state.aiAudioPlayers = this.state.aiAudioPlayers || {};
    const players = this.state.aiAudioPlayers;
    let existing = players[index];
    const sessionId = `${Date.now()}-${Math.random()}`;

    const stopPlayback = () => {
        const player = players[index];
        if (!player) return;

        if (player.queue && Array.isArray(player.queue)) {
            player.queue.forEach(audio => {
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
            });
        }
        if (player.objectUrls && Array.isArray(player.objectUrls)) {
            player.objectUrls.forEach(url => { try { URL.revokeObjectURL(url); } catch(e) {} });
        }
        
        players[index] = { isPlaying: false, isLoading: false, queue: [], objectUrls: [] };
        this.renderAIChatHistory();
    };

    if (existing && (existing.isPlaying || existing.isLoading)) {
        stopPlayback();
        return;
    }
    
    if (existing) {
        stopPlayback();
    }

    try {
        const message = this.state.aiChatHistory[index];
        if (!message || message.sender !== 'ai') return;

        players[index] = { isPlaying: false, isLoading: true, sessionId: sessionId, queue: [], objectUrls: [] };
        this.renderAIChatHistory();

        const cleanText = this.extractPlainTextFromHtml(message.content);
        const sentences = (cleanText.match(/[^.!?]+[.!?]*|[^.!?]+$/g) || []).map(s => s.trim()).filter(Boolean);

        if (sentences.length === 0) {
            players[index].isLoading = false;
            this.renderAIChatHistory();
            return;
        }

        const audioPromises = sentences.map(async (sentence) => {
            const res = await fetch(`${this.serverUrl}/api/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: sentence, language: message.language || this.state.aiSettings.language }),
            });
            if (!res.ok) throw new Error(`TTS request failed.`);
            const data = await res.json();
            const byteString = atob(data.audioContent);
            const byteArray = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
                byteArray[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([byteArray.buffer], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            
            const currentPlayer = players[index];
            if (currentPlayer && currentPlayer.sessionId === sessionId) {
                 currentPlayer.objectUrls.push(url);
            }
            
            return new Audio(url);
        });

        const audioQueue = await Promise.all(audioPromises);
        
        const currentPlayer = players[index];
        if (!currentPlayer || currentPlayer.sessionId !== sessionId) {
             audioQueue.forEach(audio => URL.revokeObjectURL(audio.src));
             return;
        }

        currentPlayer.queue = audioQueue;
        currentPlayer.isLoading = false;

        const playFrom = (i) => {
            const currentPlayerState = players[index];
            if (!currentPlayerState || i >= currentPlayerState.queue.length || currentPlayerState.sessionId !== sessionId) {
                stopPlayback();
                return;
            }
            
            currentPlayerState.isPlaying = true;
            this.renderAIChatHistory();
            
            const audio = currentPlayerState.queue[i];
            audio.play();
            audio.onended = () => {
                playFrom(i + 1);
            };
        };

        playFrom(0);

    } catch (error) {
        console.error("TTS Error:", error);
        stopPlayback();
    }
}, 

extractPlainTextFromHtml(html = '') {
    if (!html) return '';
    const container = document.createElement('div');
    container.innerHTML = html;

    // Remove non-prose elements that should not be read aloud
    container.querySelectorAll('pre, code, table, canvas').forEach(el => el.remove());
    // Extra safety: strip elements that should never be read
    container.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());

    const text = container.textContent || container.innerText || '';
    return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
},

scrollAIChatToBottom() {
    const chatLog = document.getElementById('ai-chat-log');
    if (!chatLog) return;
    chatLog.scrollTop = chatLog.scrollHeight;
},

applyAIResponseAnimation() {
    const targets = document.querySelectorAll('.ai-answer-body[data-animate="true"]');
    if (!targets.length) return;

    targets.forEach(target => {
        if (target.dataset.animating === 'true') return;

        const wrapper = target.closest('.ai-answer-wrapper');
        const header = wrapper?.querySelector('.ai-answer-header');
        if (header && target.dataset.scrolledIntoView !== 'true') {
            header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.dataset.scrolledIntoView = 'true';
        }

        const originalHtml = target.innerHTML;
        target.dataset.animating = 'true';
        target.setAttribute('data-typing', 'true');
        target.innerHTML = '';

        this.typewriterRenderHTML(target, originalHtml).then(() => {
            target.removeAttribute('data-typing');
            delete target.dataset.animating;
            target.removeAttribute('data-animate');
            delete target.dataset.scrolledIntoView;
            this.repositionAIFollowups();

            const index = parseInt(target.getAttribute('data-message-index'), 10);
            if (!Number.isNaN(index) && this.state.aiChatHistory[index]) {
                this.state.aiChatHistory[index].animate = false;
            }
        }).catch(() => {
            target.innerHTML = originalHtml;
            target.removeAttribute('data-typing');
            delete target.dataset.animating;
            target.removeAttribute('data-animate');
            delete target.dataset.scrolledIntoView;
        });
    });
},

typewriterRenderHTML(target, html, onChunk) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;
    const textSpeed = 16;

    const animateText = (text, parent, onChunk) => new Promise(resolve => {
        if (!text) {
            resolve();
            return;
        }

        const textNode = document.createTextNode('');
        parent.appendChild(textNode);
        const chunkSize = text.length > 800 ? 6 : text.length > 400 ? 4 : text.length > 200 ? 3 : 2;
        let index = 0;

        const step = () => {
            textNode.textContent += text.slice(index, index + chunkSize);
            index += chunkSize;
            if (typeof onChunk === 'function') onChunk();
            if (index < text.length) {
                setTimeout(step, textSpeed);
            } else {
                resolve();
            }
        };

        step();
    });

    const processNodes = async (nodes, parent, onChunk) => {
        for (const node of nodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                await animateText(node.textContent, parent, onChunk);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const clone = node.cloneNode(false);
                parent.appendChild(clone);
                if (typeof onChunk === 'function') onChunk();
                await processNodes(Array.from(node.childNodes), clone, onChunk);
            }
        }
    };

    return processNodes(Array.from(tempContainer.childNodes), target, onChunk);
},

// In script.js

// In script.js - This function is already correct

// In script.js

async handleAiQuestion(questionText) {
    this.state.aiChatHistory.push({ sender: 'user', content: questionText });
    
    const thinkingMessageIndex = this.state.aiChatHistory.length;
    this.state.aiChatHistory.push({ sender: 'thinking' });
    this.renderAIChatHistory();

    const { sales, expenses, products, users, customers, selectedCountry } = this.state;
    const contextData = { sales, products, customers, expenses, users, currency: GCC_COUNTRIES[selectedCountry].currency, currentUser: { id: this.state.currentUser.id, name: this.state.currentUser.name, role: this.state.currentUser.role } };

    try {
        const res = await fetch(`${this.serverUrl}/api/ask-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userQuestion: questionText, contextData: contextData, targetLanguage: this.state.aiSettings.language, chatHistory: this.state.aiChatHistory.slice(0, -1) })
        });

        if (!res.ok) throw new Error(`AI server error: ${res.status}`);
        
        const data = await res.json();
        const cleanedHtml = (data.htmlResponse || '').replace(/^```html\s*|```$/g, '').trim();
    
        this.state.aiChatHistory[thinkingMessageIndex] = { sender: 'ai', content: cleanedHtml, language: this.state.aiSettings.language, animate: true };
        this.state.aiAudioPlayers = {
            ...this.state.aiAudioPlayers,
            [thinkingMessageIndex]: { status: 'idle', isVisible: false },
        };

    } catch (error) {
        console.error("Error fetching AI response:", error);
        this.state.aiChatHistory[thinkingMessageIndex] = { sender: 'ai', content: `<div class="ai-response-error"><h4><i class="fas fa-exclamation-triangle"></i>Connection Error</h4><p>I'm sorry, I couldn't connect to the AI service. Please check your connection and try again.</p></div>`, animate: true };
        if (this.state.aiAudioPlayers?.[thinkingMessageIndex]) {
            const players = { ...this.state.aiAudioPlayers };
            delete players[thinkingMessageIndex];
            this.state.aiAudioPlayers = players;
        }
    }

    this.renderAIChatHistory();
},

// Triggered by the send button in the chat view
submitAIChatMessage() {
    const input = document.getElementById('ai-chat-input');
    const questionText = input.value.trim();
    if (questionText) {
        this.handleAiQuestion(questionText);
        input.value = '';
    }
},

// --- SETTINGS MENU UI & LOGIC ---

// Generates the HTML for the slide-down menu
getAISettingsPanelHTML() {
    const { language, highlightKeywords, highlightNumbers } = this.state.aiSettings;
    return `
        <div class="ai-settings-panel-content">
            <div class="ai-settings-section">
                <div class="ai-settings-section-header">
                    <div class="ai-settings-section-icon">
                        <i class="fas fa-language"></i>
                    </div>
                    <div>
                        <h4>Language</h4>
                        <p>Select the language Bubble AI should respond with.</p>
                    </div>
                </div>
                <div class="ai-settings-chip-group">
                    <button type="button" class="ai-settings-chip ${language === 'English' ? 'active' : ''}" aria-pressed="${language === 'English'}" onclick="app.setAISetting('language', 'English')">English</button>
                    <button type="button" class="ai-settings-chip ${language === 'Arabic' ? 'active' : ''}" aria-pressed="${language === 'Arabic'}" onclick="app.setAISetting('language', 'Arabic')">Arabic</button>
                </div>
            </div>

            <div class="ai-settings-section">
                <div class="ai-settings-section-header">
                    <div class="ai-settings-section-icon">
                        <i class="fas fa-highlighter"></i>
                    </div>
                    <div>
                        <h4>Answer Styling</h4>
                        <p>Control how insights are highlighted inside responses.</p>
                    </div>
                </div>
                <div class="ai-settings-toggle-group">
                    <button type="button" class="ai-settings-toggle ${highlightKeywords ? 'active' : ''}" aria-pressed="${highlightKeywords}" onclick="app.setAISetting('highlightKeywords')">
                        <div class="ai-toggle-label">
                            <span>Highlight Keywords</span>
                            <small>Emphasize important terms and concepts.</small>
                        </div>
                        <div class="ai-toggle-switch"><span></span></div>
                        <span class="ai-toggle-status">${highlightKeywords ? 'On' : 'Off'}</span>
                    </button>
                    <button type="button" class="ai-settings-toggle ${highlightNumbers ? 'active' : ''}" aria-pressed="${highlightNumbers}" onclick="app.setAISetting('highlightNumbers')">
                        <div class="ai-toggle-label">
                            <span>Highlight Numbers</span>
                            <small>Spot KPIs and financial metrics quickly.</small>
                        </div>
                        <div class="ai-toggle-switch"><span></span></div>
                        <span class="ai-toggle-status">${highlightNumbers ? 'On' : 'Off'}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
},

// Sets a specific AI setting
setAISetting(key, value) {
    if (typeof value === 'undefined') {
        // This is a toggle (for booleans)
        this.state.aiSettings[key] = !this.state.aiSettings[key];
    } else {
        // This is a direct value set (for language)
        this.state.aiSettings[key] = value;
    }

    // Persist and refresh the settings panel if it is visible
    this.saveData();
    const settingsPanel = document.getElementById('ai-settings-panel');
    if (settingsPanel) {
        settingsPanel.innerHTML = this.getAISettingsPanelHTML();
    }

    let message = '';
    if (key === 'language') {
        message = `AI responses will now use ${this.state.aiSettings.language}.`;
    } else if (key === 'highlightKeywords') {
        message = `Keyword highlighting ${this.state.aiSettings.highlightKeywords ? 'enabled' : 'disabled'}.`;
    } else if (key === 'highlightNumbers') {
        message = `Number highlighting ${this.state.aiSettings.highlightNumbers ? 'enabled' : 'disabled'}.`;
    }

    if (message) {
        NotificationSystem.success(message);
    }
},








            getAccuraBotView() {
                const analysis = this.state.botAnalysis;
                const overview = analysis.overview || {};
                const alerts = analysis.alerts || [];
                const recommendations = analysis.recommendations || [];
                const quickActions = analysis.quickActions || [];

                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex items-center justify-between flex-wrap gap-x-4 gap-y-2">
                            <div class="flex items-center space-x-4">
                                <div class="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center bot-pulse">
                                    <i class="fas fa-robot fa-fw text-white text-2xl"></i>
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold bot-gradient-text">AccuraBot</h2>
                                    <p class="text-gray-400">Real-time business monitoring</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-4">
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm text-gray-400">AI</span>
                                    <div class="toggle-switch ${this.state.aiMode === 'bot' ? 'active' : ''}" data-action="toggle-ai-mode">
                                        <div class="toggle-knob"></div>
                                    </div>
                                    <span class="text-sm text-gray-400">Bot</span>
                                </div>
                                <button data-action="refresh-bot" class="bot-button px-4 py-2 rounded-xl">
                                    <i class="fas fa-sync-alt mr-2"></i>Refresh
                                </button>
                            </div>
                        </div>

                        <div class="bot-card p-6 slide-up">
                            <div class="flex items-start space-x-6">
                                <div class="w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <i class="fas fa-robot fa-fw text-white text-xl"></i>
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-xl font-bold text-white mb-3">AccuraBot Monitoring Active!</h3>
                                    <p class="text-gray-300 mb-4 leading-relaxed">I'm continuously monitoring your Owlio Sales application, tracking GCC currency fluctuations, analyzing sales performance, and providing real-time actionable business intelligence.</p>
                                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                                            <div class="text-xl mb-1">FX</div>
                                            <div class="text-green-400 font-semibold text-sm">Currency Monitor</div>
                                        </div>
                                        <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                                            <div class="text-xl mb-1">INV</div>
                                            <div class="text-green-400 font-semibold text-sm">Inventory</div>
                                        </div>
                                        <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                                            <div class="text-xl mb-1">ALR</div>
                                            <div class="text-green-400 font-semibold text-sm">Smart Alerts</div>
                                        </div>
                                        <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                                            <div class="text-xl mb-1">ANL</div>
                                            <div class="text-green-400 font-semibold text-sm">Live Analysis</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bot-card p-6 slide-up">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-white flex items-center">
                                    <i class="fas fa-heartbeat text-green-400 mr-2"></i>
                                    Business Health Score
                                </h3>
                                <div class="text-right">
                                    <div class="text-3xl font-bold text-green-400">${overview.healthScore || 0}/100</div>
                                    <div class="text-sm text-gray-400">Overall Performance</div>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div class="text-center p-3 bg-gray-800/50 rounded-xl">
                                    <div class="text-xl font-bold text-green-400">${this.formatCurrency(overview.revenue || 0, false)}</div>
                                    <div class="text-xs text-gray-400 mt-1">Revenue</div>
                                </div>
                                <div class="text-center p-3 bg-gray-800/50 rounded-xl">
                                    <div class="text-xl font-bold text-red-400">${this.formatCurrency(overview.expenses || 0, false)}</div>
                                    <div class="text-xs text-gray-400 mt-1">Expenses</div>
                                </div>
                                <div class="text-center p-3 bg-gray-800/50 rounded-xl">
                                    <div class="text-xl font-bold ${(overview.netProfit || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}">${this.formatCurrency(overview.netProfit || 0, false)}</div>
                                    <div class="text-xs text-gray-400 mt-1">Net Profit</div>
                                </div>
                                <div class="text-center p-3 bg-gray-800/50 rounded-xl">
                                    <div class="text-xl font-bold text-blue-400">${overview.products || 0}</div>
                                    <div class="text-xs text-gray-400 mt-1">Products</div>
                                </div>
                                <div class="text-center p-3 bg-gray-800/50 rounded-xl">
                                    <div class="text-xl font-bold text-purple-400">${overview.customers || 0}</div>
                                    <div class="text-xs text-gray-400 mt-1">Customers</div>
                                </div>
                                <div class="text-center p-3 bg-gray-800/50 rounded-xl">
                                    <div class="text-xl font-bold text-yellow-400">${overview.employees || 0}</div>
                                    <div class="text-xs text-gray-400 mt-1">Team</div>
                                </div>
                            </div>
                        </div>

                        ${alerts.length > 0 ? `
                            <div class="perplexity-card p-6 slide-up">
                                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                    <i class="fas fa-exclamation-circle text-red-400 mr-2 animate-pulse"></i>
                                    System Alerts
                                </h3>
                                <div class="space-y-3">
                                    ${alerts.map(alert => `
                                        <div class="flex items-center justify-between p-4 bg-${alert.type === 'urgent' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}-500/10 border border-${alert.type === 'urgent' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}-500/30 rounded-xl">
                                            <div class="flex items-center space-x-3">
                                                <div class="text-2xl">${alert.icon}</div>
                                                <div>
                                                    <h4 class="font-bold text-white">${alert.title}</h4>
                                                    <p class="text-gray-300 text-sm">${alert.message}</p>
                                                </div>
                                            </div>
                                            <button data-action="${alert.action}" class="bot-button px-3 py-1 rounded-lg text-sm">
                                                <i class="fas fa-arrow-right mr-1"></i>Action
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="perplexity-card p-6 slide-up">
                            <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                <i class="fas fa-bolt text-green-400 mr-2"></i>
                                Bot Quick Actions
                            </h3>
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                ${quickActions.map(action => `
                                    <button data-action="bot-quick-action" data-id="${action.id}" class="p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-${action.color}-500/50 rounded-xl transition-all duration-300 text-center group">
                                        <i class="${action.icon} text-${action.color}-400 text-2xl mb-3 group-hover:scale-110 transition-transform"></i>
                                        <div class="text-white font-medium text-sm">${action.label}</div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        ${recommendations.length > 0 ? `
                            <div class="perplexity-card p-6 slide-up">
                                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                    <i class="fas fa-lightbulb text-green-400 mr-2"></i>
                                    Bot Intelligence Recommendations
                                </h3>
                                <div class="space-y-4">
                                    ${recommendations.map(rec => `
                                        <div class="bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30 rounded-xl p-4">
                                            <div class="flex items-start space-x-4">
                                                <div class="text-2xl">${rec.icon}</div>
                                                <div class="flex-1">
                                                    <h4 class="font-bold text-white mb-2">${rec.title}</h4>
                                                    <p class="text-gray-300 mb-3 leading-relaxed">${rec.message}</p>
                                                    <div class="bg-green-500/10 border-l-4 border-green-500 p-3 rounded-r-xl">
                                                        <p class="text-green-400 font-medium text-sm">Bot Insight: ${rec.tip}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="perplexity-card p-6 slide-up">
                            <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                                <i class="fas fa-comments text-green-400 mr-2"></i>
                                AccuraBot Chat Helper
                            </h3>
                            <div id="bot-chat-box" class="bot-chat-box mb-4">
                                <div class="bot-chat-message bot">
                                    <div class="message-avatar bot">Bot</div>
                                    <div class="message-bubble bot">Hello! I'm your AccuraBot Chat Helper. Type a command to get instant insights. Try: <span class="font-bold">#credit</span>, <span class="font-bold">#sales</span>, or <span class="font-bold">#lowstock</span>.</div>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <input type="text" id="bot-chat-input" class="form-input flex-1" placeholder="Type your command (e.g., #sales)">
                                <button id="bot-chat-send" class="bot-button px-4 py-2">Send</button>
                            </div>
                        </div>
                    </div>
                `;
            },

            // REPLACE your existing getProductsView function with this:
getProductsView() {
    return `
        <div class="space-y-6 fade-in">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-white mb-2">Product Management</h2>
                    <p class="text-gray-400">Manage your inventory with advanced tracking</p>
                </div>
                ${this.canManageProducts() ? `
                    <button data-action="add-product" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                        <i class="fas fa-plus mr-2"></i>Add Product
                    </button>
                ` : ''}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="product-search" class="sr-only">Search Products</label>
                    <input type="text" id="product-search" placeholder="Search by name or SKU..." class="form-input w-full" onkeyup="app.updateProductListView()">
                </div>
                <div>
                    <label for="product-category-filter" class="sr-only">Filter by Category</label>
                    <select id="product-category-filter" class="form-input w-full" onchange="app.updateProductListView()">
                        <option value="">All Categories</option>
                        ${this.state.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="perplexity-card overflow-hidden" id="product-table-container">
                ${this.renderProductTable()}
            </div>
        </div>
    `;
},

// REPLACE your current renderProductTable function with this corrected version:

renderProductTable() {
    const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('product-category-filter')?.value || '';

    const filteredProducts = this.state.products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                              product.sku.toLowerCase().includes(searchTerm) ||
                              product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === '' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return `
        <div class="responsive-table">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-600">
                        <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Product</th>
                        <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Price</th>
                        <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Stock</th>
                        <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Category</th>
                        ${this.canManageProducts() ? '<th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-600">
                    ${filteredProducts.map((product, index) => {
                        // ** THE FIX IS HERE **
                        // This line checks if product.imageUrl exists. If it does, it creates an <img> tag.
                        // If not, it creates a fallback <div> with a generic box icon.
                        const imageOrIcon = product.imageUrl
                            ? `<img src="${product.imageUrl}" alt="${product.name}" class="w-10 h-10 rounded-lg object-cover flex-shrink-0">`
                            : `<div class="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-box text-gray-400"></i></div>`;

                        return `
                        <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center space-x-3">
                                    ${imageOrIcon}
                                    <div>
                                        <div class="text-white font-medium">${product.name}</div>
                                        <div class="text-gray-400 text-sm">SKU: ${product.sku}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-white font-medium">${this.formatCurrency(product.price)}</td>
                            <td class="px-6 py-4">
                                <span class="px-3 py-1 text-xs font-semibold rounded-full ${product.stock <= product.reorderLevel ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}">
                                    ${product.stock} units
                                </span>
                            </td>
                            <td class="px-6 py-4 text-gray-300">${product.category}</td>
                            ${this.canManageProducts() ? `
                                <td class="px-6 py-4">
                                    <div class="flex items-center space-x-3">
                                        <button data-action="edit-product" data-id="${product.id}" class="text-blue-400 hover:text-blue-300 transition-colors"><i class="fas fa-edit"></i></button>
                                        <button data-action="delete-product" data-id="${product.id}" class="text-red-400 hover:text-red-300 transition-colors"><i class="fas fa-trash"></i></button>
                                    </div>
                                </td>
                            ` : ''}
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
},

updateProductListView() {
    const container = document.getElementById('product-table-container');
    if (container) {
        container.innerHTML = this.renderProductTable();
    }
},

            getCustomersView() {
                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-2">Customer Management</h2>
                                <p class="text-gray-400">Build and maintain strong customer relationships</p>
                            </div>
                            <button data-action="add-customer" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                                <i class="fas fa-plus mr-2"></i>Add Customer
                            </button>
                        </div>

                        <div class="responsive-grid-4">
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Total</p>
                                        <p class="text-2xl font-bold text-white">${this.state.customers.length}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-users text-blue-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Business</p>
                                        <p class="text-2xl font-bold text-green-400">${this.state.customers.filter(c => c.type === 'Business').length}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-building text-green-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Individual</p>
                                        <p class="text-2xl font-bold text-purple-400">${this.state.customers.filter(c => c.type === 'Individual').length}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-user text-purple-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Credit</p>
                                        <p class="text-lg font-bold text-yellow-400">${this.formatCurrency(this.state.customers.reduce((sum, c) => sum + c.creditLimit, 0), false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-credit-card text-yellow-400"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="perplexity-card overflow-hidden">
                            <div class="responsive-table">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-gray-600">
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Customer</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Type</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Contact</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Credit Limit</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-600">
                                        ${this.state.customers.map((customer, index) => `
                                            <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                <td class="px-6 py-4">
                                                    <div class="flex items-center space-x-3">
                                                        <div class="w-10 h-10 bg-gradient-to-r ${customer.type === 'Business' ? 'from-green-500 to-emerald-500' : 'from-purple-500 to-pink-500'} rounded-lg flex items-center justify-center">
                                                            <i class="fas ${customer.type === 'Business' ? 'fa-building' : 'fa-user'} text-white"></i>
                                                        </div>
                                                        <div>
                                                            <div class="text-white font-medium">${customer.name}</div>
                                                            <div class="text-gray-400 text-sm">${customer.address}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4">
                                                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${customer.type === 'Business' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}">
                                                        ${customer.type}
                                                    </span>
                                                </td>
                                                <td class="px-6 py-4">
                                                    <div class="text-white">${customer.email}</div>
                                                    <div class="text-gray-400 text-sm">${customer.phone}</div>
                                                </td>
                                                <td class="px-6 py-4 text-white font-medium">${this.formatCurrency(customer.creditLimit)}</td>
                                                <td class="px-6 py-4">
                                                    <div class="flex items-center space-x-3">
                                                        <button data-action="edit-customer" data-id="${customer.id}" class="text-blue-400 hover:text-blue-300 transition-colors">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button data-action="delete-customer" data-id="${customer.id}" class="text-red-400 hover:text-red-300 transition-colors">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            },
getSalesView() {
                const { currentUser, users, sales } = this.state;
                let filteredSales;

                // --- DATA SCOPING LOGIC ---
                if (currentUser.role === 'admin') {
                    filteredSales = sales;
                } else if (currentUser.role === 'manager') {
                    const workerIds = users.filter(u => u.role === 'worker').map(u => u.id);
                    const managedUserIds = [currentUser.id, ...workerIds];
                    filteredSales = sales.filter(s => managedUserIds.includes(s.salesPersonId));
                } else { // worker
                    filteredSales = sales.filter(sale => sale.salesPersonId === currentUser.id);
                }
                // --- END DATA SCOPING ---
                
                const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
                const avgSale = totalRevenue / (filteredSales.length || 1);

                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-2">Sales Management</h2>
                                <p class="text-gray-400">Track and analyze your sales performance</p>
                            </div>
                            <div class="flex space-x-3">
                                <button data-action="start-quick-sale" class="quick-sale-button px-4 py-2 rounded-xl font-medium">
                                    <i class="fas fa-bolt mr-2"></i>Quick Sale
                                </button>
                                <button data-action="add-sale" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                                    <i class="fas fa-plus mr-2"></i>Add Sale
                                </button>
                            </div>
                        </div>

                        <div class="responsive-grid-4">
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Total Sales</p>
                                        <p class="text-2xl font-bold text-white">${filteredSales.length}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-shopping-cart text-blue-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Revenue</p>
                                        <p class="text-lg font-bold text-green-400">${this.formatCurrency(totalRevenue, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-dollar-sign text-green-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Avg Sale</p>
                                        <p class="text-lg font-bold text-purple-400">${this.formatCurrency(avgSale, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-chart-line text-purple-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Commission</p>
                                        <p class="text-lg font-bold text-yellow-400">${this.formatCurrency(this.state.currentUser.commission || 0, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-coins text-yellow-400"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="perplexity-card overflow-hidden">
                            <div class="responsive-table">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-gray-600">
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Sale ID</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Customer</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Items</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Total</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Date</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-600">
                                        ${filteredSales.slice().reverse().map((sale, index) => {
                                            const customer = this.state.customers.find(c => c.id === sale.customerId);
                                            const salesperson = this.state.users.find(u => u.id === sale.salesPersonId);
                                            return `
                                                <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                    <td class="px-6 py-4">
                                                        <div class="text-white font-medium">#${sale.id}</div>
                                                        <div class="text-gray-400 text-sm">by ${salesperson ? salesperson.name : 'Unknown'}</div>
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <div class="text-white font-medium">${customer ? customer.name : 'Unknown Customer'}</div>
                                                        <div class="text-gray-400 text-sm">${sale.saleType}</div>
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <td class="px-6 py-4">
    <div class="text-white">${sale.items.length} item${sale.items.length > 1 ? 's' : ''}</div>
    <div class="text-gray-400 text-sm">
        ${sale.items.map(item => { // <-- REMOVED .slice(0, 2)
            const product = this.state.products.find(p => p.id === item.productId);
            return `${item.quantity}x ${product ? product.name : 'Product'}`;
        }).join(', ')}
        
    </div>
</td>
                                                    <td class="px-6 py-4">
                                                        <div class="text-white font-bold">${this.formatCurrency(sale.total)}</div>
                                                        ${sale.discount > 0 ? `<div class="text-gray-400 text-sm">Discount: ${this.formatCurrency(sale.discount)}</div>` : ''}
                                                    </td>
                                                    <td class="px-6 py-4 text-gray-300">${new Date(sale.date).toLocaleDateString()}</td>
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center space-x-3">
                                                            <button data-action="generate-invoice" data-id="${sale.id}" class="text-blue-400 hover:text-blue-300 transition-colors" title="Generate Invoice">
                                                                <i class="fas fa-file-invoice"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            },

            getExpensesView() {
                const { currentUser, users, expenses } = this.state;
                let filteredExpenses;

                // --- DATA SCOPING LOGIC ---
                if (currentUser.role === 'admin') {
                   filteredExpenses = expenses;
                } else if (currentUser.role === 'manager') {
                   const workerIds = users.filter(u => u.role === 'worker').map(u => u.id);
                   const managedUserIds = [currentUser.id, ...workerIds];
                   filteredExpenses = expenses.filter(e => managedUserIds.includes(e.createdByUserId || e.addedBy));
                } else { // worker
                   filteredExpenses = expenses.filter(expense => (expense.createdByUserId || expense.addedBy) === currentUser.id);
                }
                // --- END DATA SCOPING ---

                const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                const avgExpense = totalExpenses / (filteredExpenses.length || 1);

                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-2">Expense Management</h2>
                                <p class="text-gray-400">Track and categorize business expenses</p>
                            </div>
                            <button data-action="add-expense" class="expenses-button px-4 py-2 rounded-xl font-medium">
                                <i class="fas fa-plus mr-2"></i>Add Expense
                            </button>
                        </div>

                        <div class="responsive-grid-4">
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Total</p>
                                        <p class="text-2xl font-bold text-white">${filteredExpenses.length}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-receipt text-red-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Amount</p>
                                        <p class="text-lg font-bold text-red-400">${this.formatCurrency(totalExpenses, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-dollar-sign text-red-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Average</p>
                                        <p class="text-lg font-bold text-yellow-400">${this.formatCurrency(avgExpense, false)}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-chart-line text-yellow-400"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="perplexity-card p-4 slide-up">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-gray-400 text-sm mb-1">Categories</p>
                                        <p class="text-2xl font-bold text-purple-400">${[...new Set(filteredExpenses.map(e => e.category))].length}</p>
                                    </div>
                                    <div class="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                        <i class="fas fa-tags text-purple-400"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="perplexity-card overflow-hidden">
                            <div class="responsive-table">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-gray-600">
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Description</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Category</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Amount</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Date</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Added By</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-600">
                                        ${filteredExpenses.slice().reverse().map((expense, index) => {
                                            const addedBy = this.state.users.find(u => u.id === (expense.createdByUserId || expense.addedBy));
                                            const account = this.state.chartOfAccounts.find(acc => acc.code === expense.category);
                                            return `
                                                <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                    <td class="px-6 py-4">
                                                        <div class="text-white font-medium">${expense.description}</div>
                                                        ${expense.notes ? `<div class="text-gray-400 text-sm">${expense.notes}</div>` : ''}
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                                            ${account ? account.name : expense.category}
                                                        </span>
                                                    </td>
                                                    <td class="px-6 py-4 text-red-400 font-bold">${this.formatCurrency(expense.amount)}</td>
                                                    <td class="px-6 py-4 text-gray-300">${new Date(expense.date).toLocaleDateString()}</td>
                                                    <td class="px-6 py-4 text-gray-300">${addedBy ? addedBy.name : 'Unknown'}</td>
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center space-x-3">
                                                            <button data-action="edit-expense" data-id="${expense.id}" class="text-blue-400 hover:text-blue-300 transition-colors">
                                                                <i class="fas fa-edit"></i>
                                                            </button>
                                                            <button data-action="delete-expense" data-id="${expense.id}" class="text-red-400 hover:text-red-300 transition-colors">
                                                                <i class="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            },

            getEmployeesView() {
                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-2">Employee Management</h2>
                                <p class="text-gray-400">Manage your team and their roles</p>
                            </div>
                            <button data-action="add-employee" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                                <i class="fas fa-plus mr-2"></i>Add Employee
                            </button>
                        </div>

                        <div class="perplexity-card overflow-hidden">
                            <div class="responsive-table">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-gray-600">
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Name</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Role</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Email</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Phone</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-600">
                                        ${this.state.users.map((user, index) => `
                                            <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                <td class="px-6 py-4">
                                                    <div class="text-white font-medium">${user.name}</div>
                                                </td>
                                                <td class="px-6 py-4">
                                                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}">
                                                        ${user.role}
                                                    </span>
                                                </td>
                                                <td class="px-6 py-4 text-gray-300">${user.email}</td>
                                                <td class="px-6 py-4 text-gray-300">${user.phone}</td>
                                                <td class="px-6 py-4">
                                                    <div class="flex items-center space-x-3">
                                                        <button data-action="edit-employee" data-id="${user.id}" class="text-blue-400 hover:text-blue-300 transition-colors">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button data-action="delete-employee" data-id="${user.id}" class="text-red-400 hover:text-red-300 transition-colors">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            },

            getInvoicesView() {
                const filteredInvoices = this.state.invoices;

                return `
                    <div class="space-y-6 fade-in">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-2">Invoice Management</h2>
                                <p class="text-gray-400">Manage and track your invoices</p>
                            </div>
                            <button data-action="add-invoice" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                                <i class="fas fa-plus mr-2"></i>Add Invoice
                            </button>
                        </div>

                        <div class="perplexity-card overflow-hidden">
                            <div class="responsive-table">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-gray-600">
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Invoice Number</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Customer</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Total</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Status</th>
                                            <th class="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-600">
                                        ${filteredInvoices.map((invoice, index) => {
                                            const customer = this.state.customers.find(c => c.id === invoice.customer.id);
                                            return `
                                                <tr class="hover:bg-gray-800/50 ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''} transition-colors">
                                                    <td class="px-6 py-4">
                                                        <div class="text-white font-medium">${invoice.invoiceNumber}</div>
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <div class="text-white font-medium">${customer ? customer.name : 'Unknown'}</div>
                                                    </td>
                                                    <td class="px-6 py-4 text-green-400 font-bold">${this.formatCurrency(invoice.total)}</td>
                                                    <td class="px-6 py-4">
                                                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                                                            ${invoice.status}
                                                        </span>
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center space-x-3">
                                                            <button data-action="view-invoice" data-id="${invoice.id}" class="text-blue-400 hover:text-blue-300 transition-colors">
                                                                <i class="fas fa-eye"></i>
                                                            </button>
                                                            <button data-action="delete-invoice" data-id="${invoice.id}" class="text-red-400 hover:text-red-300 transition-colors">
                                                                <i class="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            },

      
getReportsView() {
    const totalRevenue = this.state.sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = this.state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalProducts = this.state.products.length;
    const totalCustomers = this.state.customers.length;
    const totalEmployees = this.state.users.length;
    
    // Sales by month
    const salesByMonth = {};
    this.state.sales.forEach(sale => {
        const month = sale.date.substring(0, 7);
        salesByMonth[month] = (salesByMonth[month] || 0) + sale.total;
    });
    
    // Top selling products
    const productSales = {};
    this.state.sales.forEach(sale => {
        sale.items.forEach(item => {
            const product = this.state.products.find(p => p.id === item.productId);
            if (product) {
                productSales[product.name] = (productSales[product.name] || 0) + item.quantity;
            }
        });
    });
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Top customers by revenue
    const customerRevenue = {};
    this.state.sales.forEach(sale => {
        const customer = this.state.customers.find(c => c.id === sale.customerId);
        if (customer) {
            customerRevenue[customer.name] = (customerRevenue[customer.name] || 0) + sale.total;
        }
    });
    const topCustomers = Object.entries(customerRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return `
        <div class="space-y-6 fade-in">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-white mb-2">Business Reports</h2>
                    <p class="text-gray-400">Comprehensive business analytics and insights</p>
                </div>
                <div class="flex space-x-3">
                    <button data-action="export-data" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                        <i class="fas fa-download mr-2"></i>Export Data
                    </button>
                </div>
            </div>

            <!-- Key Metrics -->
            <div class="responsive-grid-6">
                <div class="perplexity-card p-4 text-center">
                    <div class="text-3xl font-bold text-green-400">${this.formatCurrency(totalRevenue, false)}</div>
                    <div class="text-sm text-gray-400 mt-1">Total Revenue</div>
                </div>
                <div class="perplexity-card p-4 text-center">
                    <div class="text-3xl font-bold text-red-400">${this.formatCurrency(totalExpenses, false)}</div>
                    <div class="text-sm text-gray-400 mt-1">Total Expenses</div>
                </div>
                <div class="perplexity-card p-4 text-center">
                    <div class="text-3xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}">${this.formatCurrency(netProfit, false)}</div>
                    <div class="text-sm text-gray-400 mt-1">Net Profit</div>
                </div>
                <div class="perplexity-card p-4 text-center">
                    <div class="text-3xl font-bold text-purple-400">${totalProducts}</div>
                    <div class="text-sm text-gray-400 mt-1">Products</div>
                </div>
                <div class="perplexity-card p-4 text-center">
                    <div class="text-3xl font-bold text-yellow-400">${totalCustomers}</div>
                    <div class="text-sm text-gray-400 mt-1">Customers</div>
                </div>
                <div class="perplexity-card p-4 text-center">
                    <div class="text-3xl font-bold text-teal-400">${totalEmployees}</div>
                    <div class="text-sm text-gray-400 mt-1">Employees</div>
                </div>
            </div>

            <!-- Financial Reports Section -->
            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fas fa-file-invoice-dollar text-green-400 mr-2"></i>
                    Financial Reports
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button data-action="pnl" class="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl hover:border-green-500/50 transition-all text-center">
                        <i class="fas fa-chart-line text-green-400 text-2xl mb-2"></i>
                        <div class="text-white font-medium">Profit & Loss</div>
                        <div class="text-xs text-gray-400 mt-1">Income Statement</div>
                    </button>
                    <button data-action="balance-sheet" class="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-all text-center">
                        <i class="fas fa-balance-scale text-blue-400 text-2xl mb-2"></i>
                        <div class="text-white font-medium">Balance Sheet</div>
                        <div class="text-xs text-gray-400 mt-1">Financial Position</div>
                    </button>
                    <button data-action="trial-balance" class="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition-all text-center">
                        <i class="fas fa-equals text-purple-400 text-2xl mb-2"></i>
                        <div class="text-white font-medium">Trial Balance</div>
                        <div class="text-xs text-gray-400 mt-1">Account Balances</div>
                    </button>
                    <button data-action="journal" class="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl hover:border-yellow-500/50 transition-all text-center">
                        <i class="fas fa-book text-yellow-400 text-2xl mb-2"></i>
                        <div class="text-white font-medium">General Journal</div>
                        <div class="text-xs text-gray-400 mt-1">All Transactions</div>
                    </button>
                </div>
            </div>

            <!-- Sales by Month -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="perplexity-card p-6">
                    <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                        <i class="fas fa-calendar-alt text-blue-400 mr-2"></i>
                        Monthly Sales Trend
                    </h3>
                    <div class="space-y-3">
                        ${Object.entries(salesByMonth).slice(-6).map(([month, amount]) => `
                            <div class="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl">
                                <span class="text-gray-300">${month}</span>
                                <span class="text-white font-bold">${this.formatCurrency(amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Top Products -->
                <div class="perplexity-card p-6">
                    <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                        <i class="fas fa-trophy text-yellow-400 mr-2"></i>
                        Top Selling Products
                    </h3>
                    <div class="space-y-3">
                        ${topProducts.map(([name, quantity], index) => `
                            <div class="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl">
                                <div class="flex items-center space-x-3">
                                    <span class="text-yellow-400 font-bold">#${index + 1}</span>
                                    <span class="text-gray-300">${name}</span>
                                </div>
                                <span class="text-white font-bold">${quantity} units</span>
                            </div>
                        `).join('')}
                        ${topProducts.length === 0 ? '<p class="text-gray-400 text-center py-4">No sales data available</p>' : ''}
                    </div>
                </div>
            </div>

            <!-- Top Customers -->
            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fas fa-star text-purple-400 mr-2"></i>
                    Top Customers by Revenue
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${topCustomers.map(([name, revenue], index) => `
                        <div class="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-purple-400 font-bold text-lg">#${index + 1}</span>
                                <i class="fas fa-user-circle text-purple-400 text-xl"></i>
                            </div>
                            <div class="text-white font-medium">${name}</div>
                            <div class="text-green-400 font-bold text-lg mt-1">${this.formatCurrency(revenue)}</div>
                        </div>
                    `).join('')}
                    ${topCustomers.length === 0 ? '<p class="text-gray-400 text-center py-4">No customer data available</p>' : ''}
                </div>
            </div>

            <!-- Inventory Report -->
            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fas fa-warehouse text-teal-400 mr-2"></i>
                    Inventory Status
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <div class="text-green-400 text-2xl mb-2">OK</div>
                        <div class="text-2xl font-bold text-white">${this.state.products.filter(p => p.stock > this.state.lowStockThreshold).length}</div>
                        <div class="text-gray-400 text-sm">In Stock</div>
                    </div>
                    <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <div class="text-yellow-400 text-2xl mb-2">LOW</div>
                        <div class="text-2xl font-bold text-white">${this.state.products.filter(p => p.stock <= this.state.lowStockThreshold && p.stock > 0).length}</div>
                        <div class="text-gray-400 text-sm">Low Stock</div>
                    </div>
                    <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div class="text-red-400 text-2xl mb-2">OUT</div>
                        <div class="text-2xl font-bold text-white">${this.state.products.filter(p => p.stock === 0).length}</div>
                        <div class="text-gray-400 text-sm">Out of Stock</div>
                    </div>
                </div>
            </div>
        </div>
    `;
},

// START: REPLACEMENT FOR getSettingsView
getSettingsView() {
    const currentUserRole = this.state.currentUser.role;
    const currentTheme = document.body.className || 'default';

    return `
        <div class="space-y-6 fade-in">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Settings</h2>
                <p class="text-gray-400">Configure your application preferences</p>
            </div>

            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fas fa-paint-brush text-teal-400 mr-2"></i>
                    Appearance
                </h3>
                <p class="text-gray-400 mb-4">Choose a theme that suits your style.</p>
                <div id="theme-selector" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div data-action="set-theme" data-theme="default" class="p-4 rounded-xl cursor-pointer border-2 ${currentTheme === 'default' ? 'border-accent-primary' : 'border-gray-700'} hover:border-accent-primary transition-all text-center" style="background-color: #0f1419;">
                        <div class="w-full h-16 rounded-lg mb-3 flex items-center justify-center" style="background: linear-gradient(135deg, #0f1419, #1a1f2e);"><span class="text-white font-bold">Aa</span></div>
                        <h4 class="font-semibold text-white">Default Dark</h4>
                    </div>
                   <div data-action="set-theme" data-theme="theme-light" class="p-4 rounded-xl cursor-pointer border-2 ${currentTheme === 'theme-light' ? 'border-accent-primary' : 'border-gray-700'} hover:border-accent-primary transition-all text-center" style="background-color: #ffffff;">
                 <div class="w-full h-16 rounded-lg mb-3 flex items-center justify-center" style="background: #f8f9fa;"><span class="font-bold" style="color: #212529;">Aa</span></div>
                <h4 class="font-semibold" style="color: #212529;">Clear White</h4>
            </div>
                    <div data-action="set-theme" data-theme="theme-black" class="p-4 rounded-xl cursor-pointer border-2 ${currentTheme === 'theme-black' ? 'border-accent-primary' : 'border-gray-700'} hover:border-accent-primary transition-all text-center" style="background-color: #000000;">
                         <div class="w-full h-16 rounded-lg mb-3 flex items-center justify-center" style="background: linear-gradient(135deg, #000000, #0c0c0c);"><span class="text-white font-bold">Aa</span></div>
                        <h4 class="font-semibold text-white">Pitch Black</h4>
                    </div>
                </div>
            </div>

            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fas fa-robot text-purple-400 mr-2"></i>
                    AI Preferences
                </h3>
                <p class="text-gray-400 mb-4">Tune how Bubble AI responds and formats information.</p>
                <div id="ai-settings-panel" class="ai-settings-panel">
                    ${this.getAISettingsPanelHTML()}
                </div>
            </div>

            ${['admin', 'manager'].includes(currentUserRole) ? `
            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fas fa-building text-blue-400 mr-2"></i>
                    Company Information
                </h3>
                <form id="company-settings-form" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="companyName" class="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                            <input type="text" id="companyName" name="companyName" class="form-input w-full" value="${this.state.companyName}" required>
                        </div>
                        <div>
                            <label for="lowStockThreshold" class="block text-sm font-medium text-gray-300 mb-2">Low Stock Threshold</label>
                            <input type="number" id="lowStockThreshold" name="lowStockThreshold" min="0" class="form-input w-full" value="${this.state.lowStockThreshold}" required>
                        </div>
                    </div>
                    <div class="flex justify-start pt-4">
                        <button type="submit" class="perplexity-button">Save Changes</button>
                    </div>
                </form>
            </div>
            ` : ''}

            ${currentUserRole === 'admin' ? `
            <div class="perplexity-card p-6 border-l-4 border-red-500">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fas fa-shield-alt text-red-400 mr-2"></i>
                    Advanced Settings (Admin Only)
                </h3>
                <div class="space-y-4">
                    <p class="text-gray-400">Manage security and critical data. Changes here are permanent.</p>
                    <button data-action="export-data" class="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-xl w-full text-left">
                        <i class="fas fa-download mr-2"></i> Export All Business Data
                    </button>
                    <button class="bg-red-800 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl w-full text-left">
                        <i class="fas fa-trash mr-2"></i> Clear All Data (Reset Application)
                    </button>
                </div>
            </div>
            ` : ''}
        </div>
    `;
},
// END: REPLACEMENT FOR getSettingsView
          // REPLACE your old getBranchHubView function with this new one.

// REPLACE your old getBranchHubView function with this final version.

getBranchHubView() {
    const branch = this.state.branches.find(b => b.id === this.state.currentBranchId);
    if (!branch) {
        return `<p class="text-red-400">Error: Branch not found.</p>`;
    }

    const assignedTasks = this.state.tasks.filter(task => !task.isSubTask && task.branchId === branch.id);
    const branchAnnouncements = this.state.announcements
        .filter(a => a.branchId === branch.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Show newest first
    
    // Check if the current user is the creator of this branch
    const isBranchCreator = this.state.currentUser.id === branch.createdBy;

    return `
        <div class="space-y-6 fade-in">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-white mb-2 flex items-center">
                        <i class="fas fa-users text-purple-400 mr-3"></i>
                        ${branch.name} Hub
                    </h2>
                    <div class="flex items-center space-x-2">
                        ${branch.members.map(memberId => {
                            const user = this.state.users.find(u => u.id === memberId);
                            return user ? `<span class="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">${user.name}</span>` : '';
                        }).join('')}
                    </div>
                </div>
                <button data-action="inbox" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                    <i class="fas fa-arrow-left mr-2"></i>Back to Inbox
                </button>
            </div>

            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4">Branch Announcements</h3>
                
                ${isBranchCreator ? `
                <div class="mb-6">
                    <form id="announcement-form" class="bg-gray-800/50 p-4 rounded-xl">
                        <input type="hidden" name="branchId" value="${branch.id}">
                        <textarea name="content" rows="3" class="form-input w-full mb-3" placeholder="Post an announcement for the team..." required></textarea>
                        <div class="flex justify-between items-center">
                            <div>
                                <label class="text-sm text-gray-400 mr-3">Label:</label>
                                <input type="radio" id="label-green" name="labelColor" value="green" class="hidden" checked>
                                <label for="label-green" class="w-6 h-6 bg-green-500 inline-block rounded-full cursor-pointer border-2 border-transparent ring-2 ring-green-500"></label>
                                
                                <input type="radio" id="label-yellow" name="labelColor" value="yellow" class="hidden">
                                <label for="label-yellow" class="w-6 h-6 bg-yellow-500 inline-block rounded-full cursor-pointer border-2 border-transparent ml-2"></label>
                                
                                <input type="radio" id="label-red" name="labelColor" value="red" class="hidden">
                                <label for="label-red" class="w-6 h-6 bg-red-500 inline-block rounded-full cursor-pointer border-2 border-transparent ml-2"></label>
                            </div>
                            <button type="submit" class="perplexity-button py-2 px-4 rounded-lg">Post</button>
                        </div>
                    </form>
                </div>
                ` : ''}
                
                <div class="space-y-4">
                    ${branchAnnouncements.length > 0 ? branchAnnouncements.map(ann => {
                        const creator = this.state.users.find(u => u.id === ann.createdBy);
                        const labelClasses = {
                            green: 'border-green-500 bg-green-500/10',
                            yellow: 'border-yellow-500 bg-yellow-500/10',
                            red: 'border-red-500 bg-red-500/10'
                        };
                        return `
                        <div class="p-4 rounded-xl border-l-4 ${labelClasses[ann.labelColor] || 'border-gray-500'}">
                            <div class="flex justify-between items-center text-xs text-gray-400 mb-2">
                                <span>By: ${creator ? creator.name : 'Unknown'}</span>
                                <span>${this.formatMessageTime(ann.timestamp)}</span>
                            </div>
                            <p class="text-gray-200">${ann.content}</p>
                        </div>
                        `;
                    }).join('') : `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-bullhorn text-4xl mb-3"></i>
                            <p>No announcements have been posted here yet.</p>
                        </div>
                    `}
                </div>
            </div>

            <div class="perplexity-card p-6">
                <h3 class="text-xl font-bold text-white mb-4">Assigned Team Tasks</h3>
                 ${assignedTasks.length > 0 ? `
                    <div class="space-y-4">
                        ${assignedTasks.map(task => {
                            const progressPercentage = Math.min((task.progress / task.goalTarget) * 100, 100);
                            return `
                            <div class="task-card !bg-gray-800/50">
                                <div class="flex justify-between items-start mb-3">
                                    <h3 class="text-lg font-bold text-white">${task.title}</h3>                                  
                                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${task.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">
                                        ${task.status}
                                    </span>
                                </div>
                                <p class="text-sm text-gray-400 mb-4">${task.description}</p>
                                <div class="mb-4">
                                    <div class="flex justify-between text-sm text-gray-300 mb-1">
                                        <span>Overall Progress</span>
                                        <span>${this.formatCurrency(task.progress)} / ${this.formatCurrency(task.goalTarget)}</span>
                                    </div>
                                    <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${progressPercentage}%;"></div></div>
                                </div>
                                <div class="flex justify-between items-center text-sm text-gray-400 border-t border-gray-700 pt-3">
                                    <div><i class="fas fa-users mr-1"></i> ${task.participants.length} / ${task.participantLimit} Participants</div>
                                    <div><i class="fas fa-clock mr-1"></i> Due: ${task.dueDate}</div>
                                </div>
                            </div>
                            `
                        }).join('')}
                    </div>
                ` : `
                    <div class="text-center py-16 text-gray-500">
                        <i class="fas fa-tasks text-4xl mb-3"></i>
                        <p>No main tasks have been assigned to this branch yet.</p>
                    </div>
                `}
            </div>
        </div>
    `;
},

// REPLACE your old getTasksView function with this new one.

// REPLACE this entire function
getTasksView() {
    const { tasks, currentUser, taskFilter, branches } = this.state;
    const canCreateTasks = ['admin', 'manager'].includes(currentUser.role);

    let visibleTasks = [];
    if (currentUser.role === 'worker') {
        // --- NEW WORKER LOGIC ---
        // 1. Find tasks the worker has already joined (their sub-tasks)
        const joinedTasks = tasks.filter(task => task.isSubTask && task.participants.includes(currentUser.id));
        
        // 2. Find branches the worker is a member of
        const myBranchIds = branches.filter(b => b.members.includes(currentUser.id)).map(b => b.id);
        
        // 3. Find main tasks assigned to their branches that they HAVEN'T joined yet
        const availableTasks = tasks.filter(task => 
            !task.isSubTask && // It must be a main task
            task.branchId && myBranchIds.includes(task.branchId) && // It must be assigned to one of their branches
            !task.participants.includes(currentUser.id) // They must NOT already be a participant
        );
        visibleTasks = [...joinedTasks, ...availableTasks];

    } else {
        // Admins/Managers see the MAIN TASKS they created. This logic remains the same.
        visibleTasks = tasks.filter(task => !task.isSubTask && task.createdBy === currentUser.id);
    }

    const filteredVisibleTasks = visibleTasks.filter(task => {
        if (taskFilter === 'live') return task.status === 'active';
        if (taskFilter === 'completed') return task.status === 'completed';
        return true; // for 'all'
    }).sort((a,b) => (a.isSubTask ? 1 : -1)); // Always show available tasks first

    return `
        <div class="space-y-6 fade-in">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-white mb-2">${currentUser.role === 'worker' ? 'My Tasks & Goals' : 'Task Dashboard'}</h2>
                    <p class="text-gray-400">${currentUser.role === 'worker' ? 'Track your goals and join new team tasks.' : 'Create and manage collaborative goals.'}</p>
                </div>
                ${canCreateTasks ? `
                    <button data-action="create-task" class="ai-button px-4 py-2 rounded-xl font-medium">
                        <i class="fas fa-plus mr-2"></i>Create New Task
                    </button>
                ` : ''}
            </div>

            <div class="flex space-x-1 bg-gray-800/50 p-1 rounded-xl">
                <button data-action="filter-tasks" data-id="all" class="flex-1 px-4 py-2 rounded-lg font-medium transition-all ${taskFilter === 'all' ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}">All</button>
                <button data-action="filter-tasks" data-id="live" class="flex-1 px-4 py-2 rounded-lg font-medium transition-all ${taskFilter === 'live' ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}">Live</button>
                <button data-action="filter-tasks" data-id="completed" class="flex-1 px-4 py-2 rounded-lg font-medium transition-all ${taskFilter === 'completed' ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}">Completed</button>
            </div>

            ${filteredVisibleTasks.length === 0 ? `
                <div class="perplexity-card p-6">
                    <div class="text-center py-16 text-gray-500">
                        <i class="fas fa-tasks text-5xl mb-4"></i>
                        <h3 class="text-xl font-bold text-white">All Clear!</h3>
                        <p>You have no active or available tasks right now.</p>
                    </div>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${filteredVisibleTasks.map(task => {
                        if (task.isSubTask) {
                            // RENDER PERSONAL SUB-TASK CARD (Already joined)
                            const mainTask = this.state.tasks.find(t => t.id === task.parentTaskId);
                            const myProgress = Math.min((task.progress / task.goalTarget) * 100, 100);
                            const teamProgress = mainTask ? Math.min((mainTask.progress / mainTask.goalTarget) * 100, 100) : 0;
                            return `
                            <div class="task-card flex flex-col border-l-4 border-yellow-500">
                                <h3 class="text-lg font-bold text-white mb-1">${task.title}</h3>
                                <p class="text-sm text-gray-400 mb-4">${task.description}</p>
                                
                                <div class="space-y-3 flex-grow">
                                    <div>
                                        <div class="flex justify-between text-sm text-yellow-400 font-semibold mb-1">
                                            <span>My Progress</span>
                                            <span>${task.goalType === 'count' ? task.progress : this.formatCurrency(task.progress)} / ${task.goalType === 'count' ? task.goalTarget : this.formatCurrency(task.goalTarget)}</span>
                                        </div>
                                        <div class="progress-bar-container bg-yellow-500/10"><div class="progress-bar-fill bg-gradient-to-r from-yellow-500 to-orange-500" style="width: ${myProgress}%;"></div></div>
                                    </div>
                                    ${mainTask ? `
                                    <div>
                                        <div class="flex justify-between text-sm text-gray-300 mb-1"><span>Overall Team Progress</span></div>
                                        <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${teamProgress}%;"></div></div>
                                    </div>` : ''}
                                </div>
                                <div class="border-t border-gray-700 pt-3 mt-4 text-sm text-gray-400"><i class="fas fa-clock mr-1"></i><span>Due: ${task.dueDate}</span></div>
                            </div>`;
                        } else if (currentUser.role === 'worker') {
                            // --- NEW: RENDER AVAILABLE TEAM TASK CARD (For Workers) ---
                            const branch = branches.find(b => b.id === task.branchId);
                            return `
                            <div class="task-card flex flex-col border-l-4 border-blue-500">
                                <div class="flex-grow">
                                    <div class="mb-2"><span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">New Team Task</span></div>
                                    <h3 class="text-lg font-bold text-white mb-2">${task.title}</h3>
                                    <p class="text-sm text-gray-400 mb-4">${task.description}</p>
                                    <div class="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg space-y-2">
                                        <div class="flex justify-between"><span>Branch:</span> <span class="font-semibold text-white">${branch.name}</span></div>
                                        <div class="flex justify-between"><span>Overall Goal:</span> <span class="font-semibold text-white">${task.goalType === 'count' ? task.goalTarget : this.formatCurrency(task.goalTarget)}</span></div>
                                        <div class="flex justify-between"><span>Participants:</span> <span class="font-semibold text-white">${task.participants.length} / ${task.participantLimit}</span></div>
                                    </div>
                                </div>
                                <div class="mt-4 pt-4 border-t border-gray-700">
                                    <button data-action="join-task" data-id="${task.id}" class="w-full bot-button py-2 rounded-lg font-semibold">
                                        <i class="fas fa-plus-circle mr-2"></i>Join Task
                                    </button>
                                </div>
                            </div>`;
                        } else {
                            // RENDER MAIN TASK CARD (For Admins/Managers)
                            const progressPercentage = Math.min((task.progress / task.goalTarget) * 100, 100);
                            const branch = task.branchId ? this.state.branches.find(b => b.id === task.branchId) : null;
                            return `
                            <div class="task-card flex flex-col">
                                <div class="flex-grow">
                                    <div class="flex justify-between items-start mb-3">
                                        <h3 class="text-lg font-bold text-white flex items-center">
                                            ${task.status === 'completed' ? '<span class="task-status-dot dot-completed"></span>' : '<span class="task-status-dot dot-live"></span>'}
                                            ${task.title}
                                        </h3>   
                                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${task.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">${task.status}</span>
                                    </div>
                                    <p class="text-sm text-gray-400 mb-4">${task.description}</p>
                                    <div class="mb-4">
                                        <div class="flex justify-between text-sm text-gray-300 mb-1">
                                            <span>Overall Progress</span>
                                            <span>${task.goalType === 'count' ? task.progress : this.formatCurrency(task.progress)} / ${task.goalType === 'count' ? task.goalTarget : this.formatCurrency(task.goalTarget)}</span>
                                        </div>
                                        <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${progressPercentage}%;"></div></div>
                                    </div>
                                </div>
                                <div class="space-y-3 border-t border-gray-700 pt-3 text-sm text-gray-400">
                                    <div class="flex justify-between items-center">
                                        <div><i class="fas fa-users mr-1"></i> ${task.participants.length} / ${task.participantLimit} Participants</div>
                                        <div><i class="fas fa-clock mr-1"></i> Due: ${task.dueDate}</div>
                                    </div>
                                    <div class="pt-2 flex items-center space-x-2">
                                        ${!task.branchId ? `
                                            <button data-action="send-task-to-branch" data-id="${task.id}" class="flex-grow perplexity-button py-2 rounded-lg text-sm"><i class="fas fa-paper-plane mr-1"></i>Assign to Branch</button>
                                        ` : task.status === 'completed' ? `
                                            <button data-action="view-task-report" data-id="${task.id}" class="flex-grow bot-button py-2 rounded-lg text-sm"><i class="fas fa-chart-bar mr-1"></i>View Report</button>
                                        ` : `
                                            <div class="flex-grow text-center py-2 px-3 bg-green-500/10 text-green-400 rounded-lg text-sm"><i class="fas fa-check-circle mr-1"></i> Assigned to ${branch.name}</div>
                                        `}
                                        <div class="task-actions-container">
                                            <button data-action="toggle-task-dropdown" data-id="${task.id}" class="flex-shrink-0 w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"><i class="fas fa-ellipsis-v text-gray-400"></i></button>
                                            <div id="task-dropdown-${task.id}" class="task-actions-dropdown">
                                                <button data-action="edit-task" data-id="${task.id}" class="task-actions-dropdown-item"><i class="fas fa-edit text-blue-400"></i>Edit</button>
                                                <button data-action="delete-task" data-id="${task.id}" class="task-actions-dropdown-item"><i class="fas fa-trash text-red-400"></i>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                        }
                    }).join('')}
                </div>
            `}
        </div>
    `;
},
            // In script.js
// ==> REPLACE BOTH of the old postRenderSetup functions with this single, correct version <==

postRenderSetup() {
    // This function runs after the main HTML is on the page
    this.animateDashboardNumbers();
    this.initializeHeaderAnimation();
            
    if (this.state.currentView === 'dashboard') {
        this.createDashboardCharts();
    }
    if (this.state.currentView === 'reports') {
        this.renderReportCharts();
    }
    if (this.state.currentView === 'inbox') {
        this.renderInbox();
        this.startInboxNotifications();
    }
    if (this.state.currentView === 'accura-ai') {
        // This is the new line to render the chat history
        this.renderAIChatHistory();
    }
},

            getQuickSaleView() {
                // Define the SVG path for the gradient tracing animation
                const svgPath = "M1-4.5l71,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l92,118.5l92-118.5l71,118.5";

                return `
                <div id="quick-sale-container" class="quick-sale-container">
                    <button data-action="cancel-quick-sale" class="quick-sale-cancel-button">&times;</button>
                    <div class="quick-sale-progress-bar">
                        <div id="quick-sale-progress-fill" class="quick-sale-progress-fill" style="width: 25%;"></div>
                    </div>

                    <div id="qs-step-1" class="quick-sale-step-container active">
                        <div class="quick-sale-step-content">
                            <h2 class="text-3xl font-bold mb-2 quick-sale-gradient-text">Select Products</h2>
                            <p class="text-lg text-gray-300 mb-8">Choose items to add to the sale.</p>
                            <div class="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
                                ${this.state.products.map(p => `
                                    <div class="quick-sale-grid-item" data-action="qs-add-product" data-id="${p.id}">
                                        <div class="gradient-tracing-container">
                                             <svg class="gradient-tracing-svg" width="800" height="120" viewBox="0 0 800 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="${svgPath}" stroke="rgba(4, 25, 248, 0.2)" stroke-width="2"/>
                                                <path class="animated-trace-path" d="${svgPath}" stroke-width="2"/>
                                                <defs>
                                                    <linearGradient id="quick-sale-gradient" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
                                                        <stop stop-color="#0419f8" stop-opacity="0" />
                                                        <stop stop-color="#0419f8" />
                                                        <stop offset="1" stop-color="#0419f8" stop-opacity="0" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                        </div>
                                        <i class="fas fa-box text-3xl mb-3 text-white"></i>
                                        <p class="font-semibold text-white">${p.name}</p>
                                        <p class="text-sm text-gray-400">${this.formatCurrency(p.price)}</p>
                                        <div class="absolute top-2 right-2 hidden"><i class="fas fa-check-circle text-green-400"></i></div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="mt-8 text-center">
                            <button data-action="qs-next-step" class="quick-sale-button px-8 py-3">Next: Adjust Quantities</button>
                        </div>
                    </div>

                    <div id="qs-step-2" class="quick-sale-step-container">
                         <div class="quick-sale-step-content">
                            <h2 class="text-3xl font-bold mb-2 quick-sale-gradient-text">Adjust Quantities</h2>
                            <p class="text-lg text-gray-300 mb-8">Use the sliders to set the quantity for each item.</p>
                            <div id="qs-quantity-list" class="w-full max-w-2xl space-y-6">
                                </div>
                        </div>
                        <div class="mt-8 text-center">
                            <button data-action="qs-prev-step" class="bg-gray-600 text-white px-8 py-3 rounded-xl mr-4">Back</button>
                            <button data-action="qs-next-step" class="quick-sale-button px-8 py-3">Next: Select Customer</button>
                        </div>
                    </div>

                    <div id="qs-step-3" class="quick-sale-step-container">
                        <div class="quick-sale-step-content">
                            <h2 class="text-3xl font-bold mb-2 quick-sale-gradient-text">Select Customer</h2>
                            <p class="text-lg text-gray-300 mb-8">Who is this sale for?</p>
                            <div class="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
                                 ${this.state.customers.map(c => `
                                    <div class="quick-sale-grid-item" data-action="qs-select-customer" data-id="${c.id}">
                                        <div class="gradient-tracing-container">
                                             <svg class="gradient-tracing-svg" width="800" height="120" viewBox="0 0 800 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="${svgPath}" stroke="rgba(4, 25, 248, 0.2)" stroke-width="2"/>
                                                <path class="animated-trace-path" d="${svgPath}" stroke-width="2"/>
                                            </svg>
                                        </div>
                                        <i class="fas fa-user-circle text-3xl mb-3 text-white"></i>
                                        <p class="font-semibold text-white">${c.name}</p>
                                        <div class="absolute top-2 right-2 hidden"><i class="fas fa-check-circle text-green-400"></i></div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="mt-8 text-center">
                            <button data-action="qs-prev-step" class="bg-gray-600 text-white px-8 py-3 rounded-xl mr-4">Back</button>
                            <button data-action="qs-next-step" class="quick-sale-button px-8 py-3">Next: Confirm Sale</button>
                        </div>
                    </div>

                    <div id="qs-step-4" class="quick-sale-step-container">
                         <div class="quick-sale-step-content">
                            <h2 class="text-3xl font-bold mb-2 quick-sale-gradient-text">Confirm Sale</h2>
                            <p class="text-lg text-gray-300 mb-8">Review the details and finalize the transaction.</p>
                            <div id="qs-summary" class="w-full max-w-md bg-black bg-opacity-30 p-6 rounded-2xl border border-blue-500">
                                </div>
                        </div>
                        <div class="mt-8 text-center">
                            <button data-action="qs-prev-step" class="bg-gray-600 text-white px-8 py-3 rounded-xl mr-4">Back</button>
                            <button data-action="finalize-quick-sale" class="bot-button px-8 py-3">Finalize & Record Sale</button>
                        </div>
                    </div>
                </div>
                `;
            }, 

           // REPLACE your old getInboxView function with this one

getInboxView() {
    const unreadCount = this.state.messages.filter(m => m.to === this.state.currentUser.id && !m.read).length;
    const userBranches = this.state.branches.filter(b => b.members.includes(this.state.currentUser.id));
    
    // The "fade-in" class has been removed from the main div below to stop the refresh animation.
    return `
        <div class="space-y-6 fade-in">
        
            <div id="inbox-notification-wrapper" class="inbox-notification-wrapper">
                <div class="inbox-notification-bar">
                    <div id="inbox-notification-content" class="w-full">
                        </div>
                </div>
            </div>
            <button id="notification-toggle-btn" data-action="toggle-notification-bar" class="notification-toggle-btn">
                <i class="fas fa-chevron-up"></i>
            </button>
            
            <!-- The header text has been removed, but the buttons are kept for functionality. -->
            <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
                <div class="flex space-x-3">
                    ${['admin', 'manager'].includes(this.state.currentUser.role) ? `
                        <button data-action="create-branch" class="ai-button px-4 py-2 rounded-xl font-medium">
                            <i class="fas fa-users mr-2"></i>Create Branch
                        </button>
                    ` : ''}
                    <button data-action="compose-message" class="perplexity-button px-4 py-2 rounded-xl font-medium">
                        <i class="fas fa-edit mr-2"></i>New Message
                    </button>
                </div>
            </div>

            <div class="perplexity-card p-4">
                <div class="relative">
                    <input 
                        type="text" 
                        id="inbox-search" 
                        placeholder="Search messages, employees, or branches..." 
                        class="form-input w-full pl-10 pr-4" 
                        oninput="app.handleInboxSearch(event)"
                        value="${this.state.inboxSearchTerm || ''}"
                    >
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    
                    <div id="employee-search-results" class="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 hidden z-50 max-h-60 overflow-y-auto">
                        </div>
                </div>
            </div>

            <div class="flex space-x-1 bg-gray-800/50 p-1 rounded-xl">
                <button 
                    onclick="app.setInboxFilter('all')" 
                    class="flex-1 px-4 py-2 rounded-lg font-medium transition-all ${this.state.inboxFilter === 'all' ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}"
                >
                    <i class="fas fa-inbox mr-2"></i>All
                </button>
                <button 
                    onclick="app.setInboxFilter('personal')" 
                    class="flex-1 px-4 py-2 rounded-lg font-medium transition-all ${this.state.inboxFilter === 'personal' ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}"
                >
                    <i class="fas fa-user mr-2"></i>Personal
                </button>
                <button 
                    onclick="app.setInboxFilter('branch')" 
                    class="flex-1 px-4 py-2 rounded-lg font-medium transition-all ${this.state.inboxFilter === 'branch' ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}"
                >
                    <i class="fas fa-users mr-2"></i>Branches
                </button>
                <button 
                    onclick="app.setInboxFilter('task')" 
                    class="flex-1 px-4 py-2 rounded-lg font-medium transition-all ${this.state.inboxFilter === 'task' ? 'inbox-tab-active' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}"
                >
                    <i class="fas fa-tasks mr-2"></i>Tasks
                </button>
            </div>

            <div class="perplexity-card overflow-hidden">
                <div id="inbox-list-container" class="divide-y divide-gray-700">
                    </div>
            </div>
        </div>
    `;
},
 
toggleNotificationBar() {
    const wrapper = document.getElementById('inbox-notification-wrapper');
    const button = document.getElementById('notification-toggle-btn');
    const icon = button.querySelector('i');

    wrapper.classList.toggle('collapsed');
    if (wrapper.classList.contains('collapsed')) {
        icon.className = 'fas fa-chevron-down';
    } else {
        icon.className = 'fas fa-chevron-up';
    }
},

startInboxNotifications() {
    this.stopInboxNotifications(); // Stop any previous timers
    const contentArea = document.getElementById('inbox-notification-content');
    if (!contentArea) return;

    let currentIndex = 0;

    const showNextNotification = () => {
        const notification = inboxNotifications[currentIndex];

        contentArea.innerHTML = `
            <div class="notification-message animate-notification-appear">
                <div class="avatar ${notification.avatarBackground}">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="content">
                    <div class="username ${notification.color}">${notification.username}</div>
                    <div class="text">${notification.content}</div>
                </div>
            </div>
        `;

        currentIndex = (currentIndex + 1) % inboxNotifications.length;
        this.state.inboxNotificationInterval = setTimeout(showNextNotification, notification.duration);
    };

    showNextNotification();
},

stopInboxNotifications() {
    if (this.state.inboxNotificationInterval) {
        clearTimeout(this.state.inboxNotificationInterval);
        this.state.inboxNotificationInterval = null;
    }
},

    handleBotStockAlertAction(lowStockProducts) {
        const manager = this.state.users.find(u => u.role === 'manager');
        if (!manager) {
            NotificationSystem.error("No manager found to send stock alert.");
            return;
        }

        lowStockProducts.forEach(product => {
            const neededStock = (product.reorderLevel || 10) * 2; // Request double the reorder level
            const message = {
                id: Date.now() + product.id,
                from: 1, // System ID
                to: this.state.currentUser.id,
                subject: `Stock Request: ${product.name}`,
                content: `Automated request for ${neededStock} units of ${product.name} (SKU: ${product.sku}). Manager approval required.`,
                type: 'task',
                category: 'emergency',
                status: 'pending_worker_approval',
                timestamp: new Date().toISOString(),
                read: false,
                requesterId: manager.id,
                history: [{ user: 'AccuraBot', action: 'Automated Request Created', timestamp: new Date().toISOString() }],
                taskDetails: {
                    productId: product.id,
                    requestedStock: neededStock
                }
            };
            this.state.messages.push(message);
        });

        this.saveData();
        this.render();
        NotificationSystem.info(`New stock request task(s) created for your review.`);
    },

    handleTaskAction(messageId, action, reason = '') {
        const messageIndex = this.state.messages.findIndex(m => m.id === parseInt(messageId));
        if (messageIndex === -1) return;

        const message = this.state.messages[messageIndex];
        const currentUser = this.state.currentUser;
        const manager = this.state.users.find(u => u.role === 'manager');

        const historyEntry = {
            user: currentUser.name,
            action: '',
            timestamp: new Date().toISOString(),
            reason: reason
        };

        switch (action) {
            case 'send-stock-request':
                message.status = 'pending_manager_approval';
                message.to = manager.id; // Send to manager
                historyEntry.action = 'Request sent for manager approval';
                NotificationSystem.success('Request sent to manager.');
                break;
            case 'approve-stock-request':
                message.status = 'approved_pending_acceptance';
                message.to = message.from; // Send back to worker
                historyEntry.action = 'Request Approved';
                NotificationSystem.success('Stock request approved.');
                break;
            case 'accept-stock':
                message.status = 'completed';
                const product = this.state.products.find(p => p.id === message.taskDetails.productId);
                if (product) {
                    product.stock += message.taskDetails.requestedStock;
                }
                historyEntry.action = 'Stock Accepted and Inventory Updated';
                NotificationSystem.success('Stock accepted and added to inventory.');
                break;
            case 'decline-request':
                message.status = 'declined';
                historyEntry.action = 'Request Declined';
                NotificationSystem.warning('Request has been declined.');
                break;
        }

        message.history.push(historyEntry);
        this.saveData();
        this.render();
    },

    // REPLACE your old handleBranchForm function with this new one.

handleBranchForm(data, form) {
    const memberIds = Array.from(form.querySelectorAll('input[name="members"]:checked')).map(cb => parseInt(cb.value));
    if (!data.name || memberIds.length === 0) {
        NotificationSystem.error('Branch name and at least one member are required.');
        return;
    }
    const newBranch = {
        id: Date.now(),
        name: data.name,
        members: memberIds,
        createdBy: this.state.currentUser.id // <-- THIS IS THE NEW LINE
    };
    this.state.branches.push(newBranch);
    this.closeModal();
    this.saveData();
    this.render();
    NotificationSystem.success(`Branch "${newBranch.name}" created successfully!`);
},
// PASTE THIS NEW FUNCTION

handleAnnouncementForm(data) {
    const newAnnouncement = {
        id: Date.now(),
        branchId: parseInt(data.branchId),
        content: data.content,
        labelColor: data.labelColor,
        createdBy: this.state.currentUser.id,
        timestamp: new Date().toISOString()
    };
    this.state.announcements.push(newAnnouncement);
    this.saveData();
    this.render(); // Re-render the view to show the new announcement
    NotificationSystem.success('Announcement posted!');
},

    deleteMessage(id) {
        if (confirm('Are you sure you want to delete this message?')) {
            this.state.messages = this.state.messages.filter(m => m.id !== parseInt(id));
            this.saveData();
            this.render();
            NotificationSystem.success('Message deleted.');
        }
    },

    handleReplyForm(data) {
        // This can re-use the existing message form logic
        this.handleMessageForm(data);
    },

 // REPLACE your existing sendBranchMessage function with this:
sendBranchMessage(event, branchId) {
    event.preventDefault();
    const input = document.getElementById('branch-message-input');
    const content = input.value.trim();
    if (!content) return;

    const newMessage = {
        id: Date.now(),
        from: this.state.currentUser.id,
        branchId: branchId,
        content: content,
        type: 'branch',
        timestamp: new Date().toISOString(),
        readBy: [this.state.currentUser.id]
    };
    
    this.state.messages.push(newMessage);
    this.saveData();
    input.value = '';
    
    // Smoothly add the new message without a full re-render
    const container = document.getElementById('branch-messages-container');
    if (container) {
        const messageEl = document.createElement('div');
        // This is a more complex way to add an element, but it's much smoother for a chat.
        // It creates a temporary container to parse the HTML string into a real element.
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = this.renderBranchMessageBubbleHTML(newMessage);
        messageEl.appendChild(tempContainer.firstElementChild);
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }
},

// ADD this new helper function for the chat:
renderBranchMessageBubbleHTML(msg) {
    const sender = this.state.users.find(u => u.id === msg.from);
    const isSentByMe = msg.from === this.state.currentUser.id;
    return `
        <div class="message-bubble-container ${isSentByMe ? 'sent' : 'received'}">
            ${!isSentByMe ? `
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <span class="text-white text-xs font-bold">${sender ? sender.name.charAt(0) : 'U'}</span>
                </div>
            ` : ''}
            <div class="message-bubble ${isSentByMe ? 'sent' : 'received'}">
                ${!isSentByMe ? `<div class="text-xs text-gray-400 mb-1">${sender ? sender.name : 'Unknown'}</div>` : ''}
                <div>${msg.content}</div>
                <div class="text-xs ${isSentByMe ? 'text-gray-200' : 'text-gray-400'} mt-1">
                    ${this.formatMessageTime(msg.timestamp)}
                </div>
            </div>
        </div>
    `;
},


      

}


  // Initialize the application
    app.init(); 




































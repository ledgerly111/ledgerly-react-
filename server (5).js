// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// Create the app
const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares to handle JSON and CORS
app.use(cors());
app.use(express.json());

// Enhanced context summary with more detailed insights
function createContextSummary(data) {
    const sales = data.sales || [];
    const expenses = data.expenses || [];
    const products = data.products || [];
    const customers = data.customers || [];
    const users = data.users || [];

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // Calculate sales per product with profit margins
    const productPerformance = {};
    products.forEach(p => { 
        productPerformance[p.name] = { 
            units_sold: 0, 
            total_revenue: 0,
            stock_level: p.stock || 0,
            price: p.price || 0
        }; 
    });
    
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product && productPerformance[product.name]) {
                productPerformance[product.name].units_sold += item.quantity;
                productPerformance[product.name].total_revenue += item.quantity * item.unitPrice;
            }
        });
    });

    const product_sales_summary = Object.entries(productPerformance)
        .map(([name, data]) => ({ 
            name, 
            units_sold: data.units_sold, 
            total_revenue: parseFloat(data.total_revenue.toFixed(2)),
            stock_level: data.stock_level,
            price: data.price
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

    // Enhanced employee performance with metrics
    const employeePerformance = {};
    users.forEach(u => { 
        employeePerformance[u.name] = { 
            total_sales_value: 0,
            number_of_sales: 0,
            role: u.role
        }; 
    });
    
    sales.forEach(sale => {
        const employee = users.find(u => u.id === sale.salesPersonId);
        if (employee && employeePerformance[employee.name]) {
            employeePerformance[employee.name].total_sales_value += sale.total;
            employeePerformance[employee.name].number_of_sales += 1;
        }
    });
    
    const employee_sales_summary = Object.entries(employeePerformance)
        .map(([name, data]) => ({ 
            name, 
            total_sales_value: parseFloat(data.total_sales_value.toFixed(2)),
            number_of_sales: data.number_of_sales,
            average_sale_value: data.number_of_sales > 0 ? parseFloat((data.total_sales_value / data.number_of_sales).toFixed(2)) : 0,
            role: data.role
        }))
        .sort((a, b) => b.total_sales_value - a.total_sales_value);

    // Customer insights
    const customerInsights = customers.map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        total_purchases: sales.filter(s => s.customerId === c.id).length,
        total_spent: sales.filter(s => s.customerId === c.id).reduce((sum, s) => sum + s.total, 0)
    })).sort((a, b) => b.total_spent - a.total_spent);

    // Expense breakdown
    const expensesByCategory = {};
    expenses.forEach(exp => {
        const category = exp.category || 'Uncategorized';
        if (!expensesByCategory[category]) {
            expensesByCategory[category] = 0;
        }
        expensesByCategory[category] += exp.amount;
    });

    const expense_breakdown = Object.entries(expensesByCategory)
        .map(([category, amount]) => ({ 
            category, 
            amount: parseFloat(amount.toFixed(2)),
            percentage: totalExpenses > 0 ? parseFloat(((amount / totalExpenses) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.amount - a.amount);

    return {
        business_overview: {
            appName: "Owlio",
            aiName: "Benka AI",
            currency: data.currency || 'AED',
            total_revenue: parseFloat(totalRevenue.toFixed(2)),
            total_expenses: parseFloat(totalExpenses.toFixed(2)),
            net_profit: parseFloat(netProfit.toFixed(2)),
            profit_margin: totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(2)) : 0,
            total_sales: sales.length,
            total_customers: customers.length,
            total_products: products.length,
            total_employees: users.length
        },
        inventory_details: {
            product_count: products.length,
            low_stock_products: products.filter(p => p.stock < 10).map(p => ({ name: p.name, stock: p.stock })),
            out_of_stock: products.filter(p => p.stock === 0).map(p => p.name),
            products_stock_list: products.map(p => ({ name: p.name, stock: p.stock, price: p.price }))
        },
        product_sales_summary,
        employee_performance_summary: employee_sales_summary,
        customer_insights: customerInsights.slice(0, 10),
        expense_breakdown
    };
}

// =================================================================
// === IMPROVED AI TEXT MODEL ENDPOINT ===
// =================================================================
app.post('/api/ask-ai', async (req, res) => {
    const { userQuestion, contextData, targetLanguage = 'English', chatHistory } = req.body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI API key not configured on the server.' });
    }

    // Keep the same model as requested
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    const summary = createContextSummary(contextData);

    const system_prompt = `
You are Benka AI, an expert business intelligence assistant integrated into the Owlio business management platform.

**Core Identity:**
- Name: Benka AI
- Personality: Professional, insightful, data-driven, and conversational
- Expertise: Business analysis, financial insights, performance metrics, inventory management, and strategic recommendations

**Communication Style:**
1. **For casual conversations** (greetings, thanks, small talk): Respond warmly and naturally as a friendly AI assistant
2. **For business questions**: Provide comprehensive, data-backed analysis with actionable insights

**Response Format Rules:**
✓ Always respond in valid, semantic HTML
✓ Use appropriate tags: <h2> for main headings, <h3> for subheadings, <p> for paragraphs, <strong> for emphasis
✓ For data comparisons: ALWAYS wrap tables in a scrollable container like this:
  <div class="ai-table-wrapper">
    <table class="ai-data-table">
      <thead>
        <tr><th>Column 1</th><th>Column 2</th></tr>
      </thead>
      <tbody>
        <tr><td>Data 1</td><td>Data 2</td></tr>
      </tbody>
    </table>
  </div>
✓ Use <ul> and <li> for lists of recommendations or key points
✓ Keep responses well-structured and scannable
✓ CRITICAL: When presenting data, ALWAYS organize it clearly:
  - Use bullet points (<ul><li>) for key insights and recommendations
  - Use numbered lists (<ol><li>) for step-by-step actions
  - Use tables (wrapped in ai-table-wrapper) ONLY for comparative data
  - Never present information in a scrambled or unstructured way
✓ Structure complex answers with clear sections using headings

**Emoji Usage for Better Understanding:**
✓ Use relevant emojis throughout your responses to enhance visual understanding and engagement
✓ Add emojis to headings, key metrics, and important points
✓ Examples of appropriate emojis:
  - 📈 for revenue, growth, positive trends
  - 📉 for losses, declining trends
  - 💰 for profit, money, financial topics
  - 📊 for data, charts, analytics
  - 🎯 for goals, targets, objectives
  - ⚠️ for warnings, alerts, concerns
  - ✅ for success, completed tasks, positive outcomes
  - ❌ for problems, failures, negative outcomes
  - 💡 for ideas, recommendations, insights
  - 🔍 for analysis, deep dives, investigations
  - 📦 for inventory, products, stock
  - 👥 for customers, employees, teams
  - 🏆 for top performers, achievements
  - 🚀 for improvements, growth opportunities
  - ⏰ for time-sensitive matters, deadlines
  - 💸 for expenses, spending
  - 🎉 for celebrations, milestones
✓ Don't overuse emojis - use them purposefully to highlight key information

**Analysis Guidelines:**
- **Be specific**: Reference actual numbers, percentages, and trends from the data
- **Be insightful**: Don't just report data—explain what it means and why it matters
- **Be actionable**: Provide practical recommendations based on the analysis
- **Be comparative**: Highlight best/worst performers, trends, and patterns
- **Be contextual**: Consider the business as a whole when analyzing specific aspects

**CRITICAL - Response Structure Requirements:**
1. **Always start with a clear heading** using <h2> or <h3> with emojis
2. **NEVER write long paragraphs** - Always break information into bullet points or numbered lists
3. **For ALL responses (even simple ones), use this structure:**
   - Brief intro sentence (1 line max)
   - Key points as <ul><li> bullet points with emojis
   - Each bullet point should be concise and scannable
   - Use <strong> to highlight important metrics/numbers
4. **For complex analysis, structure as:**
   - <h3>Overview</h3> + 1-2 sentence summary
   - <h3>📊 Key Findings</h3> + bullet points
   - <h3>📈 Detailed Data</h3> + table (ALWAYS wrapped in <div class="ai-table-wrapper">)
   - <h3>💡 Recommendations</h3> + numbered list
5. **Tables MUST:**
   - Be wrapped in <div class="ai-table-wrapper">
   - Have clear <thead> with column headers
   - Use proper <tbody> structure
   - Keep columns to max 4-5 for readability
   - Never use white backgrounds (styling is handled by CSS)
6. **Professional formatting:**
   - Use bullet points (<ul><li>) for insights, findings, observations
   - Use numbered lists (<ol><li>) for steps, recommendations, actions
   - Never write multi-sentence paragraphs
   - Each point should be one clear statement

**Data Interpretation:**
- Identify high-performing areas and explain why they're succeeding
- Flag concerning trends or underperforming areas with specific improvement suggestions
- Calculate and explain key metrics like profit margins, ROI, customer lifetime value
- Recognize patterns in sales, expenses, or employee performance
- Provide strategic recommendations based on data insights

**Current Business Context:**
${JSON.stringify(summary, null, 2)}

**Important Notes:**
- Currency amounts are in ${summary.business_overview.currency}
- All financial figures are based on actual transaction data
- Employee and product performance metrics are calculated from real sales records
- Respond in ${targetLanguage} language

When analyzing data, always consider:
1. What the numbers actually mean for the business
2. How different metrics relate to each other
3. What actions the user should take based on insights
4. Potential risks or opportunities revealed by the data
`;

    const conversationContents = [];
    
    // Include chat history for context
    if (chatHistory && chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            const role = msg.sender === 'user' ? 'user' : 'model';
            // Clean HTML from previous responses for better context
            const cleanContent = typeof msg.content === 'string' ? msg.content.replace(/<[^>]*>?/gm, '') : '';
            if (cleanContent.trim()) {
                conversationContents.push({ role: role, parts: [{ text: cleanContent }] });
            }
        });
    }

    // Add the current user question
    conversationContents.push({
        role: 'user',
        parts: [{ text: `${system_prompt}\n\nUser Question: "${userQuestion}"` }]
    });

    try {
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: conversationContents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        });
        
        if (!geminiResponse.data.candidates || geminiResponse.data.candidates.length === 0) {
            return res.status(500).json({ error: 'AI service returned an empty response.' });
        }

        const geminiHtmlResponse = geminiResponse.data.candidates[0].content.parts[0].text;
        res.json({ htmlResponse: geminiHtmlResponse });
        
    } catch (error) {
        console.error('Error in AI backend:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: 'Failed to get a response from the AI service.',
            details: error.response?.data || error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'Owlio AI Backend', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Benka AI server is running on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});

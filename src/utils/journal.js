const EPSILON = 0.01;

function generateJournalId(prefix = 'journal') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEntry(entry) {
  if (!entry) {
    return { accountCode: '', debit: 0, credit: 0 };
  }
  const accountCode = String(entry.accountCode ?? '').trim();
  const debit = Number(entry.debit) || 0;
  const credit = Number(entry.credit) || 0;
  return { accountCode, debit, credit };
}

function sumEntries(entries, key) {
  return entries.reduce((sum, entry) => sum + (Number(entry?.[key]) || 0), 0);
}

export function entriesAreBalanced(entries) {
  const normalized = entries.map(normalizeEntry);
  const totalDebit = sumEntries(normalized, 'debit');
  const totalCredit = sumEntries(normalized, 'credit');
  return Math.abs(totalDebit - totalCredit) <= EPSILON;
}

export function sortJournalEntries(journal) {
  return [...journal].sort((a, b) => {
    const aDate = new Date(a?.date ?? 0).getTime();
    const bDate = new Date(b?.date ?? 0).getTime();
    if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) {
      return aDate - bDate;
    }
    const aCreated = new Date(a?.createdAt ?? 0).getTime();
    const bCreated = new Date(b?.createdAt ?? 0).getTime();
    if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
      return aCreated - bCreated;
    }
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

export function createJournalEntry({
  date,
  description,
  entries,
  reference = null,
  metadata = null,
  id,
}) {
  const normalizedEntries = (entries ?? []).map(normalizeEntry);
  if (!normalizedEntries.length) {
    throw new Error('Journal entry requires at least one line item.');
  }
  if (!entriesAreBalanced(normalizedEntries)) {
    throw new Error('Journal entry is not balanced.');
  }
  const createdAt = new Date().toISOString();
  const entryId = id ?? generateJournalId();
  return {
    id: entryId,
    date: date ?? createdAt.slice(0, 10),
    description: description ?? '',
    entries: normalizedEntries,
    reference,
    metadata,
    createdAt,
  };
}

export function buildExpenseJournalEntry(expense) {
  if (!expense) {
    return null;
  }
  const amount = Number(expense.amount) || 0;
  if (amount <= 0) {
    return null;
  }
  const debitAccount = String(expense.category ?? '').trim() || '6200';
  try {
    return createJournalEntry({
      date: expense.date,
      description: expense.description ? `Expense: ${expense.description}` : 'Expense recorded',
      entries: [
        { accountCode: debitAccount, debit: amount, credit: 0 },
        { accountCode: '1110', debit: 0, credit: amount },
      ],
      reference: `expense:${expense.id ?? 'unsaved'}`,
      metadata: {
        source: 'expense',
        expenseId: expense.id ?? null,
        category: debitAccount,
      },
    });
  } catch (error) {
    console.error('Failed to build expense journal entry', error);
    return null;
  }
}

export function buildPurchaseOrderJournalEntry(purchaseOrder) {

  if (!purchaseOrder) {
    return null;
  }
  const totalCost = (purchaseOrder.items ?? []).reduce((sum, item) => {
    const quantity = Number(item?.quantity) || 0;
    const cost = Number(item?.cost) || 0;
    return sum + quantity * cost;
  }, 0);
  if (totalCost <= 0) {
    return null;
  }
  const identifier = purchaseOrder.id ?? `pending-${Date.now()}`;
  const supplierName = purchaseOrder.supplierName ?? 'supplier';
  const description = `Receipt of goods from ${supplierName}${purchaseOrder.id ? ` (PO #${purchaseOrder.id})` : ''}`;
  const date = purchaseOrder.receivedAt
    ?? purchaseOrder.expectedDate
    ?? purchaseOrder.orderDate
    ?? new Date().toISOString().slice(0, 10);

  try {
    return createJournalEntry({
      date,
      description,
      entries: [
        { accountCode: '1210', debit: totalCost, credit: 0 },
        { accountCode: '2110', debit: 0, credit: totalCost },
      ],
      reference: `po:${identifier}`,
      metadata: {
        source: 'purchase-order',
        purchaseOrderId: purchaseOrder.id ?? null,
        supplierName,
      },
    });
  } catch (error) {
    console.error('Failed to build purchase order journal entry', error);
    return null;
  }
}

function getProductCost(productId, products) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    return 0;
  }
  return Number(product.cost) || 0;
}

export function buildSaleJournalEntries(sale, { products = [], customers = [] } = {}) {
  if (!sale) {
    return [];
  }
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount) || 0;
  const taxAmount = Number(sale.taxAmount) || 0;
  const total = Number(sale.total) || subtotal - discount + taxAmount;
  const customer = customers.find((item) => item.id === sale.customerId);
  const customerName = customer?.name ?? 'customer';
  const identifier = sale.id ?? 'unsaved';
  const saleDescription = `Sale to ${customerName}${sale.id ? ` (Invoice #${sale.id})` : ''}`;
  const debitAccount = (sale.saleType ?? '').toLowerCase() === 'credit' ? '1120' : '1110';
  const entries = [
    { accountCode: debitAccount, debit: total, credit: 0 },
  ];
  if (discount > 0) {
    entries.push({ accountCode: '4120', debit: discount, credit: 0 });
  }
  entries.push({ accountCode: '4110', debit: 0, credit: subtotal });
  if (taxAmount > 0) {
    entries.push({ accountCode: '2210', debit: 0, credit: taxAmount });
  }

  const journalEntries = [];
  try {
    journalEntries.push(
      createJournalEntry({
        date: sale.date,
        description: saleDescription,
        entries,
        reference: `sale:${identifier}:revenue`,
        metadata: {
          source: 'sale',
          saleId: sale.id ?? null,
          subtype: 'revenue',
        },
      }),
    );
  } catch (error) {
    console.error('Failed to build sale revenue journal entry', error);
  }

  const cogsAmount = (sale.items ?? []).reduce((sum, item) => {
    const baseQuantity = Number(item.baseQuantity);
    const quantity = Number(item.quantity) || 0;
    const conversion = Number(item.conversion) || 1;
    const totalBaseUnits = Number.isFinite(baseQuantity) && baseQuantity > 0
      ? baseQuantity
      : quantity * conversion;
    if (totalBaseUnits <= 0) {
      return sum;
    }
    const cost = getProductCost(item.productId, products);
    return sum + cost * totalBaseUnits;
  }, 0);

  if (cogsAmount > 0) {
    try {
      journalEntries.push(
        createJournalEntry({
          date: sale.date,
          description: sale.id ? `COGS for sale #${sale.id}` : 'COGS for sale',
          entries: [
            { accountCode: '5110', debit: cogsAmount, credit: 0 },
            { accountCode: '1210', debit: 0, credit: cogsAmount },
          ],
          reference: `sale:${identifier}:cogs`,
          metadata: {
            source: 'sale',
            saleId: sale.id ?? null,
            subtype: 'cogs',
          },
        }),
      );
    } catch (error) {
      console.error('Failed to build sale COGS journal entry', error);
    }
  }

  return journalEntries.filter(Boolean);
}

export function replaceJournalEntries(journal, newEntries) {
  if (!Array.isArray(newEntries) || !newEntries.length) {
    return journal;
  }
  const referencesToReplace = new Set(
    newEntries
      .map((entry) => entry?.reference)
      .filter((reference) => reference != null),
  );
  const filtered = journal.filter((entry) => !referencesToReplace.has(entry.reference));
  return sortJournalEntries([...filtered, ...newEntries]);
}

export function removeJournalEntriesByReference(journal, references) {
  const referenceSet = new Set((references ?? []).filter((reference) => reference != null));
  if (!referenceSet.size) {
    return journal;
  }
  return journal.filter((entry) => !referenceSet.has(entry.reference));
}

export function buildInitialJournal({ sales = [], expenses = [], products = [], customers = [], chartOfAccounts = [] } = {}) {
  const seedEntries = [];
  sales.forEach((sale) => {
    seedEntries.push(...buildSaleJournalEntries(sale, { products, customers }));
  });
  expenses.forEach((expense) => {
    const entry = buildExpenseJournalEntry(expense);
    if (entry) {
      seedEntries.push(entry);
    }
  });
  return sortJournalEntries(seedEntries);
}
const ZERO_THRESHOLD = 0.005;

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(dateString, startDate, endDate) {
  if (!startDate && !endDate) {
    return true;
  }
  const date = normalizeDate(dateString);
  if (!date) {
    return false;
  }
  if (startDate) {
    const start = normalizeDate(startDate);
    if (start && date < start) {
      return false;
    }
  }
  if (endDate) {
    const end = normalizeDate(endDate);
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (date > end) {
        return false;
      }
    }
  }
  return true;
}

export function buildAccountBalanceIndex(journal, chartOfAccounts) {
  const index = new Map();
  chartOfAccounts.forEach((account) => {
    index.set(account.code, {
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: account.normalBalance,
      debit: 0,
      credit: 0,
      balance: 0,
    });
  });

  journal.forEach((entry) => {
    (entry.entries ?? []).forEach((line) => {
      const holder = index.get(line.accountCode);
      if (!holder) {
        return;
      }
      holder.debit += Number(line.debit) || 0;
      holder.credit += Number(line.credit) || 0;
    });
  });

  index.forEach((holder) => {
    if (holder.normalBalance === 'Debit') {
      holder.balance = holder.debit - holder.credit;
    } else {
      holder.balance = holder.credit - holder.debit;
    }
    if (Math.abs(holder.balance) < ZERO_THRESHOLD) {
      holder.balance = 0;
    }
  });

  return index;
}

export function calculateLedgerAccount(journal, chartOfAccounts, accountCode) {
  if (!accountCode) {
    return null;
  }
  const account = chartOfAccounts.find((candidate) => candidate.code === accountCode);
  if (!account) {
    return null;
  }
  const sortedEntries = sortJournalEntries(journal);
  let runningBalance = 0;
  const transactions = [];
  let totalDebit = 0;
  let totalCredit = 0;

  sortedEntries.forEach((entry) => {
    (entry.entries ?? []).forEach((line) => {
      if (line.accountCode !== accountCode) {
        return;
      }
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      totalDebit += debit;
      totalCredit += credit;
      if (account.normalBalance === 'Debit') {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }
      if (Math.abs(runningBalance) < ZERO_THRESHOLD) {
        runningBalance = 0;
      }
      transactions.push({
        date: entry.date,
        description: entry.description,
        debit,
        credit,
        balance: runningBalance,
      });
    });
  });

  const endingBalance = account.normalBalance === 'Debit'
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
  const balanceType = endingBalance >= 0 ? account.normalBalance : account.normalBalance === 'Debit' ? 'Credit' : 'Debit';

  return {
    account,
    transactions,
    totalDebit,
    totalCredit,
    endingBalance: Math.abs(endingBalance) < ZERO_THRESHOLD ? 0 : endingBalance,
    balanceType,
  };
}

export function calculateTrialBalance(journal, chartOfAccounts) {
  const accountIndex = buildAccountBalanceIndex(journal, chartOfAccounts);
  const rows = [];
  let totalDebit = 0;
  let totalCredit = 0;

  accountIndex.forEach((account) => {
    if (Math.abs(account.balance) < ZERO_THRESHOLD) {
      return;
    }
    const isDebitNormal = account.normalBalance === 'Debit';
    const debitAmount = isDebitNormal && account.balance >= 0
      ? account.balance
      : !isDebitNormal && account.balance < 0
        ? Math.abs(account.balance)
        : 0;
    const creditAmount = !isDebitNormal && account.balance >= 0
      ? account.balance
      : isDebitNormal && account.balance < 0
        ? Math.abs(account.balance)
        : 0;
    totalDebit += debitAmount;
    totalCredit += creditAmount;
    rows.push({
      code: account.code,
      name: account.name,
      debit: debitAmount,
      credit: creditAmount,
      type: account.type,
    });
  });

  rows.sort((a, b) => a.code.localeCompare(b.code));

  return {
    rows,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < ZERO_THRESHOLD,
  };
}

export function calculateProfitAndLoss(journal, chartOfAccounts, { startDate = null, endDate = null } = {}) {
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

  journal.forEach((entry) => {
    if (!isWithinRange(entry.date, startDate, endDate)) {
      return;
    }
    (entry.entries ?? []).forEach((line) => {
      const account = chartOfAccounts.find((candidate) => candidate.code === line.accountCode);
      if (!account) {
        return;
      }
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      switch (account.type) {
        case 'Revenue':
          results.totalRevenue += credit;
          break;
        case 'Contra-Revenue':
          results.totalDiscounts += debit;
          break;
        case 'COGS':
          results.totalCOGS += debit;
          break;
        case 'Expense':
          results.operatingExpenses[account.name] = (results.operatingExpenses[account.name] || 0) + debit;
          break;
        default:
          break;
      }
    });
  });

  results.netRevenue = results.totalRevenue - results.totalDiscounts;
  results.grossProfit = results.netRevenue - results.totalCOGS;
  results.totalOperatingExpenses = Object.values(results.operatingExpenses).reduce((sum, value) => sum + value, 0);
  results.netIncome = results.grossProfit - results.totalOperatingExpenses;
  return results;
}

export function calculateBalanceSheet(journal, chartOfAccounts) {
  const accountIndex = buildAccountBalanceIndex(journal, chartOfAccounts);
  const today = new Date().toISOString().slice(0, 10);
  const pnl = calculateProfitAndLoss(journal, chartOfAccounts, { startDate: '1970-01-01', endDate: today });
  const retainedEarningsCode = '3210';
  if (accountIndex.has(retainedEarningsCode)) {
    const retained = accountIndex.get(retainedEarningsCode);
    retained.balance += pnl.netIncome;
  }

  const assets = [];
  const liabilities = [];
  const equity = [];

  accountIndex.forEach((account) => {
    if (Math.abs(account.balance) < ZERO_THRESHOLD) {
      return;
    }
    const entry = {
      code: account.code,
      name: account.name,
      balance: account.balance,
    };
    if (account.type === 'Asset') {
      assets.push(entry);
    } else if (account.type === 'Liability') {
      liabilities.push(entry);
    } else if (account.type === 'Equity') {
      equity.push(entry);
    }
  });

  const sumBalances = (list) => list.reduce((sum, item) => sum + item.balance, 0);
  const totalAssets = sumBalances(assets);
  const totalLiabilities = sumBalances(liabilities);
  const totalEquity = sumBalances(equity);
  const liabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    assets,
    liabilities,
    equity,
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      liabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - liabilitiesAndEquity) < ZERO_THRESHOLD,
    },
  };
}

export function buildPurchaseOrderPaymentJournalEntry(purchaseOrder, paymentDate, paymentAccountCode = '1110') {
  if (!purchaseOrder) {
    return null;
  }
  const totalCost = (purchaseOrder.items ?? []).reduce((sum, item) => {
    const quantity = Number(item?.quantity) || 0;
    const cost = Number(item?.cost) || 0;
    return sum + quantity * cost;
  }, 0);
  if (totalCost <= 0) {
    return null;
  }
  const identifier = purchaseOrder.id ?? `pending-${Date.now()}`;
  const supplierName = purchaseOrder.supplierName ?? 'supplier';
  const description = `Payment for PO #${purchaseOrder.id ?? 'pending'} to ${supplierName}`;
  const date = paymentDate ?? new Date().toISOString().slice(0, 10);

  try {
    return createJournalEntry({
      date,
      description,
      entries: [
        { accountCode: '2110', debit: totalCost, credit: 0 },
        { accountCode: paymentAccountCode, debit: 0, credit: totalCost },
      ],
      reference: `po-payment:${identifier}`,
      metadata: {
        source: 'purchase-order-payment',
        purchaseOrderId: purchaseOrder.id ?? null,
        supplierName,
      },
    });
  } catch (error) {
    console.error('Failed to build purchase order payment journal entry', error);
    return null;
  }
}

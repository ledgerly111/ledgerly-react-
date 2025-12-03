/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { defaultCountryCode } from '../constants/gccCountries.js';
import { computeEffectivePermissions } from '../constants/featurePermissions.js';
import { createNotification } from '../utils/notifications.js';
import { createLogEntry } from '../utils/logs.js';
import { buildExpenseJournalEntry, buildInitialJournal, buildSaleJournalEntries, buildPurchaseOrderJournalEntry, buildPurchaseOrderPaymentJournalEntry, removeJournalEntriesByReference, replaceJournalEntries, createJournalEntry as buildManualJournalEntry } from '../utils/journal.js';
import { invoiceTemplateDesigns, getInvoiceTemplateById, defaultInvoiceTemplateId } from '../constants/invoiceTemplateDesigns.js';
import { getPurchaseOrderTemplateById, defaultPurchaseOrderTemplateId } from '../constants/purchaseOrderTemplateDesigns.js';
import { createBarcodeDataUrl } from '../utils/barcode.js';

const LOCAL_STORAGE_KEY = 'OwlioData';
const THEME_STORAGE_KEY = 'OwlioTheme';

const INVOICE_TEMPLATE_SCOPE_GLOBAL = 'global';
const INVOICE_TEMPLATE_SCOPE_MANAGER_PREFIX = 'manager:';

const COMPANY_LINE_SOURCES = new Set(['companyName', 'custom']);
const CUSTOMER_LINE_SOURCES = new Set(['customerName', 'customerAddress', 'customerEmail', 'customerPhone', 'custom']);
const TEMPLATE_BODY_VARIANTS = new Set(['classic', 'column', 'minimal']);

function createTemplateLineId(prefix = 'line') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config ?? {}));
}

const DEFAULT_TEMPLATE_ID = defaultInvoiceTemplateId;
const DEFAULT_TEMPLATE_BASE = cloneConfig(getInvoiceTemplateById(DEFAULT_TEMPLATE_ID)?.baseConfig ?? {});
const DEFAULT_TEMPLATE_COMPANY_LINES = cloneConfig(DEFAULT_TEMPLATE_BASE.companyLines ?? []);
const DEFAULT_TEMPLATE_CUSTOMER_LINES = cloneConfig(DEFAULT_TEMPLATE_BASE.customerLines ?? []);
const DEFAULT_INVOICE_TEMPLATE = {
  ...DEFAULT_TEMPLATE_BASE,
  companyLines: DEFAULT_TEMPLATE_COMPANY_LINES,
  customerLines: DEFAULT_TEMPLATE_CUSTOMER_LINES,
};

const DEFAULT_PO_TEMPLATE_ID = defaultPurchaseOrderTemplateId;
const DEFAULT_PO_TEMPLATE_BASE = cloneConfig(getPurchaseOrderTemplateById(DEFAULT_PO_TEMPLATE_ID)?.baseConfig ?? {});
const DEFAULT_PURCHASE_ORDER_TEMPLATE = {
  ...DEFAULT_PO_TEMPLATE_BASE,
};

function sanitizePurchaseOrderTemplate(template) {
  const source = template && typeof template === 'object' ? template : {};
  const next = { ...DEFAULT_PURCHASE_ORDER_TEMPLATE };

  if (typeof source.headerColor === 'string' && /^#([0-9a-fA-F]{6})$/.test(source.headerColor.trim())) {
    next.headerColor = source.headerColor.trim();
  }
  if (typeof source.highlightColor === 'string' && /^#([0-9a-fA-F]{6})$/.test(source.highlightColor.trim())) {
    next.highlightColor = source.highlightColor.trim();
  }
  const summaryLayout = typeof source.summaryLayout === 'string' ? source.summaryLayout.toLowerCase() : '';
  if (summaryLayout === 'split' || summaryLayout === 'stacked') {
    next.summaryLayout = summaryLayout;
  }
  const bodyVariant = typeof source.bodyVariant === 'string' ? source.bodyVariant.toLowerCase() : '';
  if (bodyVariant === 'classic' || bodyVariant === 'minimal') {
    next.bodyVariant = bodyVariant;
  }
  if (typeof source.noteText === 'string') {
    next.noteText = source.noteText.trim();
  }
  if (typeof source.includeTotals === 'boolean') {
    next.includeTotals = source.includeTotals;
  }
  if (typeof source.includeRequestedBy === 'boolean') {
    next.includeRequestedBy = source.includeRequestedBy;
  }
  if (typeof source.showBrandAccent === 'boolean') {
    next.showBrandAccent = source.showBrandAccent;
  }
  return next;
}

function computePurchaseOrderTemplateOverrides(baseConfig, mergedConfig) {
  const overrides = {};
  const trackedKeys = [
    'headerColor',
    'highlightColor',
    'summaryLayout',
    'bodyVariant',
    'noteText',
    'includeTotals',
    'includeRequestedBy',
    'showBrandAccent',
  ];
  trackedKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(mergedConfig, key)) {
      return;
    }
    const baseValue = baseConfig[key];
    const mergedValue = mergedConfig[key];
    if (Array.isArray(baseValue) || Array.isArray(mergedValue)) {
      if (JSON.stringify(baseValue) !== JSON.stringify(mergedValue)) {
        overrides[key] = mergedValue;
      }
      return;
    }
    if (baseValue !== mergedValue) {
      overrides[key] = mergedValue;
    }
  });
  return overrides;
}

function areLineArraysEqual(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? {};
    const right = b[index] ?? {};
    if ((left.source ?? '') !== (right.source ?? '')
      || (left.label ?? '') !== (right.label ?? '')
      || (left.text ?? '') !== (right.text ?? '')) {
      return false;
    }
  }
  return true;
}

const createTimestamp = () => new Date().toISOString();
function computeConversationId(message) {
  if (!message) {
    return null;
  }
  if (message.conversationId) {
    return message.conversationId;
  }
  if (message.threadId) {
    return message.threadId;
  }
  if (message.branchId != null) {
    return `branch-${message.branchId}`;
  }
  if (message.type === 'task') {
    if (message.taskId != null) {
      return `task-${message.taskId}`;
    }
    if (message.rootMessageId != null) {
      return `task-${message.rootMessageId}`;
    }
    if (message.id != null) {
      return `task-${message.id}`;
    }
  }
  const sender = message.senderId ?? message.from;
  const recipient = message.recipientId ?? message.to;
  if (sender != null && recipient != null) {
    return [sender, recipient].sort().join(':');
  }
  return `message-${message.id ?? Date.now()}`;
}

function normalizeReactions(reactions) {
  if (!Array.isArray(reactions)) {
    return [];
  }
  return reactions
    .map((reaction) => {
      if (!reaction || !reaction.emoji) {
        return null;
      }
      const users = Array.isArray(reaction.users)
        ? Array.from(new Set(reaction.users.filter((id) => id != null)))
        : [];
      return {
        emoji: reaction.emoji,
        users,
      };
    })
    .filter(Boolean);
}

function normalizeStoredMessage(message) {
  if (!message) {
    return null;
  }
  const timestamp = message.timestamp ?? new Date().toISOString();
  const senderId = message.senderId ?? message.from ?? null;
  const recipientId = message.recipientId ?? message.to ?? null;
  const conversationId = computeConversationId({ ...message, senderId, recipientId });
  const baseType = message.type ?? 'direct';
  const conversationType = message.conversationType
    ?? (message.teamId != null
      ? 'team'
      : message.branchId != null
        ? 'team'
        : baseType === 'stock'
          ? 'stock'
          : baseType === 'task'
            ? 'task'
            : 'direct');
  const replyToId = message.replyToId
    ?? (message.replyTo && typeof message.replyTo === 'object' ? message.replyTo.id : message.replyTo)
    ?? null;
  const readBy = Array.isArray(message.readBy)
    ? Array.from(new Set(message.readBy.filter((id) => id != null)))
    : [];
  const taskStatus = message.taskStatus ?? message.status ?? null;

  return {
    ...message,
    id: message.id ?? Date.now(),
    from: senderId,
    senderId,
    to: recipientId,
    recipientId,
    conversationId,
    conversationType,
    timestamp,
    reactions: normalizeReactions(message.reactions),
    replyToId,
    readBy,
    read: message.read === true,
    taskStatus,
  };
}

function getUserDisplayName(user) {
  if (!user) {
    return null;
  }
  return user.name ?? user.username ?? null;
}

function deriveTaskActions(status) {
  switch (status) {
    case 'pending_review':
      return [
        { value: 'approve-stock-request', label: 'Approve Stock Request' },
        { value: 'decline-request', label: 'Decline' },
      ];
    case 'issue_reported':
      return [
        { value: 'approve-stock-request', label: 'Approve Adjustment' },
        { value: 'decline-request', label: 'Close Request' },
      ];
    case 'approved':
      return [
        { value: 'confirm-stock-received', label: 'Mark Stock Received' },
        { value: 'report-stock-issue', label: 'Report Issue' },
      ];
    default:
      return [];
  }
}

function buildSupervisionDirectory(links) {
  if (!Array.isArray(links) || links.length === 0) {
    return { byManager: {}, byEmployee: {} };
  }
  const byManager = {};
  const byEmployee = {};
  links.forEach((link) => {
    if (!link || link.managerId == null || link.employeeId == null) {
      return;
    }
    const managerKey = String(link.managerId);
    const employeeKey = String(link.employeeId);
    if (!byManager[managerKey]) {
      byManager[managerKey] = [];
    }
    if (!byEmployee[employeeKey]) {
      byEmployee[employeeKey] = [];
    }
    byManager[managerKey].push(link);
    byEmployee[employeeKey].push(link);
  });
  return { byManager, byEmployee };
}

function buildActiveSupervisionDirectory(links) {
  if (!Array.isArray(links) || links.length === 0) {
    return { byManager: {}, byEmployee: {} };
  }
  const byManager = {};
  const byEmployee = {};
  links.forEach((link) => {
    if (!link || link.managerId == null || link.employeeId == null || link.status !== 'active') {
      return;
    }
    const managerKey = String(link.managerId);
    const employeeKey = String(link.employeeId);
    if (!byManager[managerKey]) {
      byManager[managerKey] = [];
    }
    if (!byEmployee[employeeKey]) {
      byEmployee[employeeKey] = [];
    }
    byManager[managerKey].push(link);
    byEmployee[employeeKey].push(link);
  });
  return { byManager, byEmployee };
}

function normalizePermissionList(candidate) {
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return [];
  }
  const unique = new Set();
  candidate.forEach((permission) => {
    if (typeof permission === 'string' && permission.trim()) {
      unique.add(permission.trim());
    }
  });
  return Array.from(unique);
}

function buildFeatureGrantMatrix(grants) {
  if (!Array.isArray(grants) || grants.length === 0) {
    return {};
  }
  const matrix = {};
  grants.forEach((grant) => {
    if (!grant || grant.employeeId == null) {
      return;
    }
    const key = String(grant.employeeId);
    const grantedList = normalizePermissionList(grant.grantedPermissions ?? grant.permissions);
    const revokedList = normalizePermissionList(grant.revokedPermissions);
    if (!matrix[key]) {
      matrix[key] = {
        grantedPermissions: grantedList,
        revokedPermissions: revokedList,
        grantedBy: grant.grantedBy ?? null,
        updatedAt: grant.updatedAt ?? grant.createdAt ?? null,
        createdAt: grant.createdAt ?? null,
      };
    } else {
      const mergedGranted = new Set(matrix[key].grantedPermissions);
      grantedList.forEach((permission) => mergedGranted.add(permission));
      const mergedRevoked = new Set(matrix[key].revokedPermissions);
      revokedList.forEach((permission) => mergedRevoked.add(permission));
      matrix[key] = {
        grantedPermissions: Array.from(mergedGranted),
        revokedPermissions: Array.from(mergedRevoked),
        grantedBy: grant.grantedBy ?? matrix[key].grantedBy ?? null,
        updatedAt: grant.updatedAt ?? grant.createdAt ?? matrix[key].updatedAt ?? null,
        createdAt: matrix[key].createdAt ?? grant.createdAt ?? null,
      };
    }
  });
  return matrix;
}

function computeAccessibleUserIds(currentUser, users, activeSupervisionDirectory) {
  if (!currentUser) {
    return [];
  }
  const extractId = (candidate) => {
    const value = Number(candidate?.id);
    return Number.isFinite(value) ? value : null;
  };
  const userIds = users
    .map((user) => extractId(user))
    .filter((value) => value != null);

  if (currentUser.role === 'admin') {
    return userIds;
  }

  const currentId = extractId(currentUser);
  if (currentId == null) {
    return [];
  }

  if (currentUser.role === 'manager') {
    const activeLinks = activeSupervisionDirectory?.byManager?.[String(currentId)] ?? [];
    const supervisedIds = activeLinks
      .map((link) => Number(link?.employeeId))
      .filter((value) => Number.isFinite(value));
    return Array.from(new Set([currentId, ...supervisedIds]));
  }

  return [currentId];
}

function buildStockHistoryEntry(users, actorId, action, reason) {
  const actor = actorId != null ? users.find((user) => user.id === actorId) ?? null : null;
  const entry = {
    timestamp: new Date().toISOString(),
    userId: actor?.id ?? null,
    userName: actor?.name ?? actor?.username ?? (actorId != null ? 'User' : 'System'),
    action,
  };
  if (reason) {
    entry.reason = reason;
  }
  return entry;
}

function computeLowStockItems(products, threshold) {
  if (!Array.isArray(products)) {
    return [];
  }
  const fallback = Number.isFinite(Number(threshold)) ? Number(threshold) : 0;
  return products
    .filter((product) => {
      if (!product) {
        return false;
      }
      const stock = Number(product.stock ?? 0);
      const reorderLevel = Number.isFinite(Number(product.reorderLevel))
        ? Number(product.reorderLevel)
        : fallback;
      const compareLevel = reorderLevel > 0 ? reorderLevel : fallback;
      return stock <= compareLevel;
    })
    .map((product) => {
      const stock = Number(product.stock ?? 0);
      const reorderLevel = Number.isFinite(Number(product.reorderLevel)) ? Number(product.reorderLevel) : fallback;
      const suggestedRestockBase = reorderLevel > 0 ? reorderLevel : fallback;
      const suggestedRestock = Math.max(suggestedRestockBase - stock + suggestedRestockBase, suggestedRestockBase, fallback);
      return {
        productId: product.id,
        name: product.name ?? 'Product',
        sku: product.sku ?? '',
        currentStock: stock,
        reorderLevel,
        suggestedRestock,
        requestedQuantity: 0,
      };
    });
}

function mergeRequestedStockItems(existingItems, requestedItems, products, threshold) {
  const items = Array.isArray(existingItems) ? existingItems : [];
  const requests = new Map(
    Array.isArray(requestedItems)
      ? requestedItems
        .filter((item) => item && item.productId != null)
        .map((item) => [Number(item.productId), Math.max(0, Number(item.quantity ?? item.requestedQuantity ?? 0))])
      : [],
  );
  const productLookup = new Map(Array.isArray(products) ? products.map((product) => [product.id, product]) : []);
  const fallback = Number.isFinite(Number(threshold)) ? Number(threshold) : 0;

  return items.map((item) => {
    const productId = Number(item.productId ?? item.id);
    const product = productLookup.get(productId) ?? null;
    const reorderLevel = Number.isFinite(Number(item.reorderLevel))
      ? Number(item.reorderLevel)
      : Number.isFinite(Number(product?.reorderLevel))
        ? Number(product.reorderLevel)
        : fallback;
    const stock = Number.isFinite(Number(product?.stock)) ? Number(product.stock) : Number.isFinite(Number(item.currentStock)) ? Number(item.currentStock) : 0;
    const requestedQuantity = requests.has(productId)
      ? requests.get(productId)
      : Math.max(0, Number(item.requestedQuantity ?? 0));
    const suggestedRestock = Number.isFinite(Number(item.suggestedRestock))
      ? Number(item.suggestedRestock)
      : Math.max(reorderLevel, fallback);
    return {
      productId,
      name: item.name ?? product?.name ?? 'Product',
      sku: item.sku ?? product?.sku ?? '',
      currentStock: stock,
      reorderLevel,
      suggestedRestock,
      requestedQuantity,
    };
  });
}

function applySaleReduction(products, sale) {
  if (!Array.isArray(products) || !sale || !Array.isArray(sale.items)) {
    return { products, changed: false, impacted: [] };
  }
  const quantityMap = new Map();
  sale.items.forEach((item) => {
    if (!item || item.productId == null) {
      return;
    }
    const productId = Number(item.productId);
    if (!Number.isFinite(productId)) {
      return;
    }
    const quantity = getSaleItemBaseQuantity(item);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }
    quantityMap.set(productId, (quantityMap.get(productId) ?? 0) + quantity);
  });
  if (quantityMap.size === 0) {
    return { products, changed: false, impacted: [] };
  }
  let changed = false;
  const impacted = [];
  const updated = Array.isArray(products)
    ? products.map((product) => {
      if (!product) {
        return product;
      }
      const productId = Number(product.id);
      if (!Number.isFinite(productId) || !quantityMap.has(productId)) {
        return product;
      }
      const decrement = quantityMap.get(productId);
      if (!Number.isFinite(decrement) || decrement <= 0) {
        return product;
      }
      const currentStock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
      const nextStock = Math.max(0, currentStock - decrement);
      if (nextStock === currentStock) {
        return product;
      }
      changed = true;
      impacted.push({
        productId,
        previousStock: currentStock,
        nextStock,
        decrement,
      });
      return {
        ...product,
        stock: nextStock,
      };
    })
    : products;
  return { products: changed ? updated : products, changed, impacted };
}

function upsertLowStockAlert(state, workerId, lowStockItems, options = {}) {
  if (!Number.isFinite(workerId) || !Array.isArray(lowStockItems) || lowStockItems.length === 0) {
    return { messages: state.messages, changed: false };
  }
  const openStatuses = options.openStatuses ?? new Set(['alert', 'pending_review', 'approved', 'issue_reported']);
  const timestamp = new Date().toISOString();
  const existingIndex = Array.isArray(state.messages)
    ? state.messages.findIndex((message) => {
      if (!message || message.type !== 'stock') {
        return false;
      }
      const stockDetails = message.stockDetails ?? {};
      const messageWorkerId = stockDetails.workerId ?? message.to ?? null;
      if (messageWorkerId !== workerId) {
        return false;
      }
      if (message.category !== 'system-alert') {
        return false;
      }
      const status = message.stockStatus ?? message.status ?? '';
      return openStatuses.has(status);
    })
    : -1;
  const historyAction = options.historyAction
    ?? (options.trigger === 'sale' ? 'Low stock detected after sale' : 'Low stock alert generated');
  const historyEntry = buildStockHistoryEntry(state.users, options.actorId ?? null, historyAction, options.reason);
  if (existingIndex !== -1) {
    const existing = state.messages[existingIndex];
    const currentStatus = existing.stockStatus ?? existing.status ?? '';
    if (currentStatus !== 'alert') {
      return { messages: state.messages, changed: false };
    }
    const updatedMessage = {
      ...existing,
      stockDetails: {
        ...(existing.stockDetails ?? {}),
        workerId,
        lowStockItems,
        trigger: options.trigger ?? (existing.stockDetails?.trigger ?? 'system'),
        contextSaleId: options.saleId ?? existing.stockDetails?.contextSaleId ?? null,
      },
      history: [
        ...(Array.isArray(existing.history) ? existing.history : []),
        historyEntry,
      ],
      timestamp,
    };
    const nextMessages = state.messages.slice();
    nextMessages[existingIndex] = updatedMessage;
    return { messages: nextMessages, changed: true };
  }
  const team = Array.isArray(state.branches)
    ? state.branches.find((branch) => Array.isArray(branch.members) && branch.members.includes(workerId))
    : null;
  const message = normalizeStoredMessage({
    id: Date.now(),
    from: null,
    to: workerId,
    type: 'stock',
    category: 'system-alert',
    stockStatus: 'alert',
    status: 'alert',
    subject: 'Stock Alert: Items running low',
    content: 'Inventory thresholds were crossed. Review and submit a stock request.',
    stockDetails: {
      workerId,
      teamId: team?.id ?? null,
      teamName: team?.name ?? null,
      lowStockItems,
      requestNote: options.note ?? '',
      trigger: options.trigger ?? 'system',
      contextSaleId: options.saleId ?? null,
    },
    history: [historyEntry],
    timestamp,
    teamId: team?.id ?? null,
    teamName: team?.name ?? null,
  });
  return {
    messages: [...(Array.isArray(state.messages) ? state.messages : []), message],
    changed: true,
  };
}

function applyStockReceipt(products, items) {
  if (!Array.isArray(products) || !Array.isArray(items)) {
    return products;
  }
  let changed = false;
  const quantityMap = new Map(
    items
      .filter((item) => item && item.productId != null)
      .map((item) => [Number(item.productId), Math.max(0, Number(item.requestedQuantity ?? item.quantity ?? 0))]),
  );
  const updated = products.map((product) => {
    const productId = Number(product.id);
    if (!quantityMap.has(productId)) {
      return product;
    }
    const increment = quantityMap.get(productId);
    if (!Number.isFinite(increment) || increment <= 0) {
      return product;
    }
    changed = true;
    const currentStock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
    return {
      ...product,
      stock: currentStock + increment,
    };
  });
  return changed ? updated : products;
}

function findReviewRecipient(users, workerId) {
  if (!Array.isArray(users)) {
    return null;
  }
  return users.find((user) => (user.role === 'manager' || user.role === 'admin') && user.id !== workerId) ?? null;
}

function selectConversations(state) {
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const users = Array.isArray(state.users) ? state.users : [];
  const currentUserId = state.currentUser?.id ?? null;
  const userById = new Map(users.map((user) => [user.id, user]));
  const conversationMap = new Map();

  messages.forEach((rawMessage) => {
    const normalized = normalizeStoredMessage(rawMessage);
    if (!normalized) {
      return;
    }
    const conversationId = normalized.conversationId;
    if (!conversationMap.has(conversationId)) {
      conversationMap.set(conversationId, {
        id: conversationId,
        type: normalized.conversationType,
        branchId: normalized.branchId ?? null,
        branchName: normalized.branchName ?? null,
        title: normalized.conversationTitle ?? normalized.subject ?? normalized.taskTitle ?? null,
        participantIds: new Set(),
        lastMessageAt: null,
        lastMessageTs: 0,
        previewText: '',
        unreadCount: 0,
        taskStatus: normalized.taskStatus ?? null,
        messages: [],
      });
    }
    const bucket = conversationMap.get(conversationId);
    bucket.messages.push(normalized);
    if (normalized.from != null) {
      bucket.participantIds.add(normalized.from);
    }
    if (normalized.to != null) {
      bucket.participantIds.add(normalized.to);
    }
    if (Array.isArray(normalized.participantIds)) {
      normalized.participantIds.forEach((id) => {
        if (id != null) {
          bucket.participantIds.add(id);
        }
      });
    }
    if (!bucket.branchName && normalized.branchName) {
      bucket.branchName = normalized.branchName;
    }
    if (!bucket.title) {
      bucket.title = normalized.conversationTitle ?? normalized.subject ?? normalized.taskTitle ?? null;
    }
    if (normalized.taskStatus) {
      bucket.taskStatus = normalized.taskStatus;
    }
    const timestamp = new Date(normalized.timestamp).getTime();
    if (Number.isFinite(timestamp) && (bucket.lastMessageTs === 0 || timestamp >= bucket.lastMessageTs)) {
      bucket.lastMessageTs = timestamp;
      bucket.lastMessageAt = new Date(timestamp).toISOString();
      bucket.previewText = normalized.type === 'task' && normalized.taskDescription
        ? normalized.taskDescription
        : normalized.content ?? '';
    }
    const readers = Array.isArray(normalized.readBy) ? normalized.readBy : [];
    const isReadByCurrentUser = normalized.read === true
      || (currentUserId != null && (readers.includes(currentUserId) || normalized.from === currentUserId));
    if (!isReadByCurrentUser && currentUserId != null) {
      bucket.unreadCount += 1;
    }
  });

  return Array.from(conversationMap.values()).map((bucket) => {
    const sortedMessages = bucket.messages
      .map((message) => ({ ...message }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const messageLookup = new Map(sortedMessages.map((message) => [message.id, message]));

    const enrichedMessages = sortedMessages.map((message) => {
      const replySource = message.replyToId ? messageLookup.get(message.replyToId) : null;
      const replyTo = replySource
        ? {
          id: replySource.id,
          content: replySource.content,
          senderId: replySource.senderId ?? replySource.from ?? null,
          senderName: getUserDisplayName(userById.get(replySource.senderId ?? replySource.from)),
        }
        : null;
      return {
        ...message,
        replyTo,
        taskActions: deriveTaskActions(message.taskStatus),
      };
    });

    const participantIds = Array.from(bucket.participantIds);
    const participantNames = participantIds
      .map((id) => getUserDisplayName(userById.get(id)))
      .filter(Boolean);

    const title = bucket.title
      ?? (bucket.type === 'branch'
        ? bucket.branchName ?? 'Branch conversation'
        : bucket.type === 'task'
          ? enrichedMessages[0]?.subject ?? enrichedMessages[0]?.taskTitle ?? 'Task conversation'
          : participantNames.length > 1
            ? participantNames.join(', ')
            : participantNames[0] ?? 'Conversation');

    return {
      id: bucket.id,
      type: bucket.type,
      title,
      branchId: bucket.branchId,
      branchName: bucket.branchName,
      participantIds,
      participantNames,
      previewText: bucket.previewText,
      lastMessageAt: bucket.lastMessageAt,
      unreadCount: bucket.unreadCount,
      taskStatus: bucket.taskStatus,
      messages: enrichedMessages,
    };
  });
}

const defaultUsers = [
  { id: 1, username: 'admin', role: 'admin', name: 'Administrator', email: 'admin@company.com', phone: '+971501234567', address: 'Business Bay, Dubai', hireDate: '2023-01-01', salary: 75000, commission: 0 },
  { id: 2, username: 'manager', role: 'manager', name: 'John Manager', email: 'manager@company.com', phone: '+971501234568', address: 'Downtown Dubai', hireDate: '2023-02-01', salary: 60000, commission: 0 },
  { id: 3, username: 'worker', role: 'worker', name: 'Jane Worker', email: 'worker@company.com', phone: '+971501234569', address: 'Dubai Marina', hireDate: '2023-03-01', salary: 45000, commission: 250 },
  { id: 4, username: 'worker2', role: 'worker', name: 'Bob Worker', email: 'worker2@company.com', phone: '+971501234570', address: 'Dubai Marina', hireDate: '2023-03-02', salary: 45000, commission: 0 },
  { id: 5, username: 'manager2', role: 'manager', name: 'Sarah Manager', email: 'manager2@company.com', phone: '+971501234571', address: 'Downtown Dubai', hireDate: '2023-02-02', salary: 60000, commission: 0 },
];

const defaultSupervisionLinks = [
  {
    id: 'sup-1001',
    managerId: 2,
    employeeId: 3,
    createdBy: 2,
    requestedAt: '2024-02-12T08:00:00.000Z',
    acceptedAt: '2024-02-13T10:15:00.000Z',
    status: 'active',
    notes: 'Onboard and monitor opening quarter processes.',
  },
  {
    id: 'sup-1002',
    managerId: 5,
    employeeId: 4,
    createdBy: 5,
    requestedAt: '2024-04-05T09:30:00.000Z',
    status: 'pending',
    notes: 'Inventory cycle supervision request.',
  },
];

const defaultMessages = [
  {
    id: 1,
    from: null,
    to: 3,
    subject: 'System Alert: Low Stock Detected',
    content: 'Inventory thresholds were crossed. Review the items below and submit a stock request.',
    type: 'stock',
    category: 'system-alert',
    stockStatus: 'alert',
    status: 'alert',
    stockDetails: {
      workerId: 3,
      teamId: 2,
      teamName: 'Sales Floor',
      lowStockItems: [
        {
          productId: 3,
          name: 'USB-C Hub',
          sku: 'HUB003',
          currentStock: 8,
          reorderLevel: 10,
          suggestedRestock: 20,
          requestedQuantity: 0,
        },
      ],
      requestNote: '',
    },
    history: [
      {
        user: 'System',
        action: 'Low stock alert generated',
        timestamp: createTimestamp(),
      },
    ],
    timestamp: createTimestamp(),
    read: false,
    readBy: [],
  },
];

const defaultProducts = [
  {
    id: 1,
    name: 'Premium Laptop',
    baseUnit: 'unit',
    cost: 800,
    stock: 25,
    sellingUnits: [
      { name: 'unit', conversion: 1, price: 1299.99 },
    ],
    category: 'Electronics',
    description: 'High-performance business laptop',
    sku: 'LAP001',
    supplier: 'TechCorp',
    reorderLevel: 5,
    imageUrl: '',
  },
  {
    id: 2,
    name: 'Wireless Mouse',
    baseUnit: 'piece',
    cost: 25,
    stock: 100,
    sellingUnits: [
      { name: 'piece', conversion: 1, price: 49.99 },
      { name: 'box (10 pcs)', conversion: 10, price: 479.9 },
    ],
    category: 'Accessories',
    description: 'Ergonomic wireless mouse',
    sku: 'MOU002',
    supplier: 'AccessoryPlus',
    reorderLevel: 20,
    imageUrl: '',
  },
  {
    id: 3,
    name: 'USB-C Hub',
    baseUnit: 'piece',
    cost: 40,
    stock: 8,
    sellingUnits: [
      { name: 'piece', conversion: 1, price: 79.99 },
      { name: 'pack (5 pcs)', conversion: 5, price: 379.95 },
    ],
    category: 'Accessories',
    description: '7-in-1 USB-C hub',
    sku: 'HUB003',
    supplier: 'ConnectTech',
    reorderLevel: 10,
    imageUrl: '',
  },
  {
    id: 4,
    name: 'External SSD 1TB',
    baseUnit: 'unit',
    cost: 90,
    stock: 15,
    sellingUnits: [
      { name: 'unit', conversion: 1, price: 150.0 },
      { name: 'bundle (2 units)', conversion: 2, price: 290.0 },
    ],
    category: 'Storage',
    description: 'Fast and portable SSD',
    sku: 'SSD004',
    supplier: 'DataSolutions',
    reorderLevel: 5,
    imageUrl: '',
  },
  {
    id: 5,
    name: 'Ergonomic Keyboard',
    baseUnit: 'piece',
    cost: 50,
    stock: 30,
    sellingUnits: [
      { name: 'piece', conversion: 1, price: 99.99 },
      { name: 'duo pack', conversion: 2, price: 189.99 },
    ],
    category: 'Peripherals',
    description: 'Comfortable typing experience',
    sku: 'KEY005',
    supplier: 'ErgoGear',
    reorderLevel: 10,
    imageUrl: '',
  },
  {
    id: 6,
    name: '4K Monitor 27-inch',
    baseUnit: 'unit',
    cost: 250,
    stock: 12,
    sellingUnits: [
      { name: 'unit', conversion: 1, price: 399.99 },
    ],
    category: 'Displays',
    description: 'Vivid 4K resolution monitor',
    sku: 'MON006',
    supplier: 'ViewTech',
    reorderLevel: 3,
    imageUrl: '',
  },
];

const defaultCustomers = [
  { id: 1, name: 'Emirates Tech Solutions', email: 'contact@emirates-tech.com', phone: '+971501234570', address: 'DIFC, Dubai, UAE', type: 'Business', taxId: 'TRN100123456789012', creditLimit: 50000, balance: 0, accountOwnerId: 3 },
  { id: 2, name: 'Ahmed Al Rashid', email: 'ahmed.alrashid@email.com', phone: '+971501234571', address: 'Jumeirah, Dubai, UAE', type: 'Individual', taxId: '', creditLimit: 5000, balance: 0, accountOwnerId: 2 },
  { id: 3, name: 'Global Innovations LLC', email: 'info@globalinnovations.com', phone: '+971501234572', address: 'Business Bay, Dubai, UAE', type: 'Business', taxId: 'TRN100123456789013', creditLimit: 75000, balance: 0, accountOwnerId: 1 },
  { id: 4, name: 'Fatima Khan', email: 'fatima.k@email.com', phone: '+971501234573', address: 'Al Barsha, Dubai, UAE', type: 'Individual', taxId: '', creditLimit: 10000, balance: 0, accountOwnerId: 5 },
];

const defaultSales = [
  {
    id: 1,
    customerId: 1,
    items: [{ productId: 1, quantity: 2, unitPrice: 1299.99 }],
    total: 2599.98,
    date: '2024-01-15',
    salesPersonId: 3,
    subtotal: 2599.98,
    taxAmount: 0,
    taxRate: 0,
    saleType: 'Credit',
    discount: 0,
    branchId: 2,
  },
];
const defaultInvoices = [
  {
    id: 1,
    invoiceNumber: 'INV-1001',
    customerId: 1,
    issuedBy: 3,
    date: '2024-01-18',
    dueDate: '2024-02-02',
    status: 'sent',
    currencyCode: 'AED',
    subtotal: 2599.98,
    discount: 0,
    taxRate: 0.05,
    taxAmount: 130,
    total: 2729.98,
    balanceDue: 2729.98,
    notes: 'Payment due within 15 days of invoice date.',
    items: [
      { description: 'Premium Laptop', quantity: 2, unitPrice: 1299.99 },
    ],
    companyName: 'Your Company',
  },
  {
    id: 2,
    invoiceNumber: 'INV-1002',
    customerId: 2,
    issuedBy: 2,
    date: '2024-02-05',
    dueDate: '2024-02-20',
    status: 'paid',
    currencyCode: 'AED',
    subtotal: 1499.99,
    discount: 50,
    taxRate: 0.05,
    taxAmount: 72.5,
    total: 1522.49,
    balanceDue: 0,
    notes: 'Settled via bank transfer.',
    items: [
      { description: '4K Monitor 27-inch', quantity: 1, unitPrice: 399.99 },
      { description: 'Wireless Mouse', quantity: 2, unitPrice: 49.99 },
      { description: 'USB-C Hub', quantity: 1, unitPrice: 79.99 },
    ],
    companyName: 'Your Company',
  },
  {
    id: 3,
    invoiceNumber: 'INV-1003',
    customerId: 3,
    issuedBy: 1,
    date: '2024-02-10',
    dueDate: '2024-02-25',
    status: 'overdue',
    currencyCode: 'AED',
    subtotal: 3250,
    discount: 0,
    taxRate: 0.05,
    taxAmount: 162.5,
    total: 3412.5,
    balanceDue: 3412.5,
    notes: 'Reminder sent on 2024-02-20.',
    items: [
      { description: 'Enterprise Support Package', quantity: 1, unitPrice: 1800 },
      { description: 'On-site Training', quantity: 1, unitPrice: 1450 },
    ],
    companyName: 'Your Company',
  },
];

const defaultExpenses = [
  { id: 1, description: 'Office Rent', amount: 5000, category: '6110', date: '2024-01-01', addedBy: 1, notes: 'Monthly office rent payment' },
];


function getNextInvoiceId(invoices) {
  if (!Array.isArray(invoices) || !invoices.length) {
    return 1;
  }
  const numericIds = invoices
    .map((invoice) => Number(invoice?.id))
    .filter((value) => Number.isFinite(value));
  if (!numericIds.length) {
    return invoices.length + 1;
  }
  return Math.max(...numericIds) + 1;
}

function normalizeDateInput(value, offsetDays = 0) {
  const base = value ? new Date(value) : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    if (offsetDays) {
      fallback.setDate(fallback.getDate() + offsetDays);
    }
    return fallback.toISOString().slice(0, 10);
  }
  if (offsetDays) {
    base.setDate(base.getDate() + offsetDays);
  }
  return base.toISOString().slice(0, 10);
}

function createManagerTemplateScope(managerId) {
  return managerId != null ? `${INVOICE_TEMPLATE_SCOPE_MANAGER_PREFIX}${managerId}` : null;
}

function normalizeTemplateLines(lines, defaults, allowedSources) {
  const sourceLines = Array.isArray(lines) ? lines : [];
  const seen = new Set();
  const normalized = sourceLines
    .map((line) => {
      const source = typeof line?.source === 'string' ? line.source : 'custom';
      if (!allowedSources.has(source)) {
        return null;
      }
      const label = typeof line?.label === 'string' ? line.label.trim() : '';
      const text = typeof line?.text === 'string' ? line.text.trim() : '';
      const id = line?.id ? String(line.id) : createTemplateLineId(source);
      const signature = `${source}:${label}:${text}`;
      if (seen.has(signature)) {
        return null;
      }
      seen.add(signature);
      return { id, source, label, text };
    })
    .filter(Boolean);
  if (normalized.length === 0) {
    const fallbackSeen = new Set();
    return defaults
      .map((line) => ({
        ...line,
        id: createTemplateLineId(line.source ?? 'line'),
      }))
      .filter((line) => {
        const signature = `${line.source}:${line.label}:${line.text}`;
        if (fallbackSeen.has(signature)) {
          return false;
        }
        fallbackSeen.add(signature);
        return true;
      });
  }
  return normalized.slice(0, 20);
}

function sanitizeInvoiceTemplate(template) {
  const source = template && typeof template === 'object' ? template : {};
  const sanitized = { ...DEFAULT_INVOICE_TEMPLATE };
  if (typeof source.headerColor === 'string' && /^#([0-9a-fA-F]{6})$/.test(source.headerColor.trim())) {
    sanitized.headerColor = source.headerColor.trim();
  }
  const position = typeof source.companyBlockPosition === 'string' ? source.companyBlockPosition.toLowerCase() : '';
  if (position === 'left' || position === 'right') {
    sanitized.companyBlockPosition = position;
  }
  const detailLayout = typeof source.detailLayout === 'string' ? source.detailLayout.toLowerCase() : '';
  if (detailLayout === 'stacked' || detailLayout === 'two-column') {
    sanitized.detailLayout = detailLayout;
  }
  const variantRaw = typeof source.bodyVariant === 'string' ? source.bodyVariant.toLowerCase() : '';
  const variant = variantRaw === 'modern' ? 'column' : variantRaw;
  if (TEMPLATE_BODY_VARIANTS.has(variant)) {
    sanitized.bodyVariant = variant;
  }
  sanitized.showInvoiceStatus = source.showInvoiceStatus !== false;
  sanitized.showNotes = source.showNotes !== false;
  sanitized.showFooterCompanyDetails = source.showFooterCompanyDetails !== false;
  sanitized.showBarcode = source.showBarcode !== false;
  if (typeof source.noteText === 'string') {
    sanitized.noteText = source.noteText.trim();
  }
  sanitized.companyLines = normalizeTemplateLines(
    source.companyLines,
    DEFAULT_TEMPLATE_COMPANY_LINES,
    COMPANY_LINE_SOURCES,
  );
  sanitized.customerLines = normalizeTemplateLines(
    source.customerLines,
    DEFAULT_TEMPLATE_CUSTOMER_LINES,
    CUSTOMER_LINE_SOURCES,
  );
  // Backwards compatibility with legacy templates
  if ((!source.companyLines || !source.companyLines.length) && Array.isArray(source.companyDetails)) {
    sanitized.companyLines = normalizeTemplateLines(
      source.companyDetails.map((detail) => ({
        id: detail?.id,
        source: 'custom',
        label: detail?.label,
        text: detail?.value,
      })),
      DEFAULT_TEMPLATE_COMPANY_LINES,
      COMPANY_LINE_SOURCES,
    );
  }
  if ((!source.customerLines || !source.customerLines.length) && Array.isArray(source.billToDetails)) {
    sanitized.customerLines = normalizeTemplateLines(
      source.billToDetails.map((detail) => ({
        id: detail?.id,
        source: 'custom',
        label: detail?.label,
        text: detail?.value,
      })),
      DEFAULT_TEMPLATE_CUSTOMER_LINES,
      CUSTOMER_LINE_SOURCES,
    );
  }
  return sanitized;
}

function computeTemplateOverrides(baseConfig, mergedConfig) {
  const overrides = {};
  const trackedKeys = [
    'headerColor',
    'companyBlockPosition',
    'detailLayout',
    'bodyVariant',
    'showInvoiceStatus',
    'showNotes',
    'showFooterCompanyDetails',
    'showBarcode',
    'noteText',
  ];
  trackedKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(mergedConfig, key)) {
      return;
    }
    const baseValue = baseConfig[key];
    const mergedValue = mergedConfig[key];
    const isEqual = (() => {
      if (Array.isArray(baseValue) || Array.isArray(mergedValue)) {
        return JSON.stringify(baseValue) === JSON.stringify(mergedValue);
      }
      return baseValue === mergedValue;
    })();
    if (!isEqual) {
      overrides[key] = mergedValue;
    }
  });
  if (!areLineArraysEqual(baseConfig.companyLines ?? [], mergedConfig.companyLines ?? [])) {
    overrides.companyLines = mergedConfig.companyLines;
  }
  if (!areLineArraysEqual(baseConfig.customerLines ?? [], mergedConfig.customerLines ?? [])) {
    overrides.customerLines = mergedConfig.customerLines;
  }
  return overrides;
}

function mergeTemplateConfig(templateId, overrides) {
  const baseConfig = cloneConfig(getInvoiceTemplateById(templateId)?.baseConfig ?? DEFAULT_INVOICE_TEMPLATE);
  const nextConfig = {
    ...baseConfig,
    ...(overrides ?? {}),
  };
  nextConfig.companyLines = Array.isArray(overrides?.companyLines)
    ? overrides.companyLines
    : baseConfig.companyLines ?? [];
  nextConfig.customerLines = Array.isArray(overrides?.customerLines)
    ? overrides.customerLines
    : baseConfig.customerLines ?? [];
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, 'noteText')) {
    nextConfig.noteText = overrides.noteText;
  }
  return sanitizeInvoiceTemplate(nextConfig);
}

function mergePurchaseOrderTemplateConfig(templateId, overrides) {
  const baseConfig = cloneConfig(getPurchaseOrderTemplateById(templateId)?.baseConfig ?? DEFAULT_PURCHASE_ORDER_TEMPLATE);
  return sanitizePurchaseOrderTemplate({
    ...baseConfig,
    ...(overrides ?? {}),
  });
}

function normalizeTemplateStateEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  if (entry.templateId) {
    return {
      templateId: entry.templateId,
      overrides: entry.overrides ?? {},
      updatedAt: entry.updatedAt ?? null,
      updatedBy: entry.updatedBy ?? null,
    };
  }
  const templateId = entry.templateId && typeof entry.templateId === 'string'
    ? entry.templateId
    : DEFAULT_TEMPLATE_ID;
  const baseConfig = cloneConfig(getInvoiceTemplateById(templateId)?.baseConfig ?? DEFAULT_INVOICE_TEMPLATE);
  const mergedConfig = sanitizeInvoiceTemplate({ ...baseConfig, ...entry });
  return {
    templateId,
    overrides: computeTemplateOverrides(baseConfig, mergedConfig),
    updatedAt: entry.updatedAt ?? null,
    updatedBy: entry.updatedBy ?? null,
  };
}

function normalizePurchaseOrderTemplateEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const templateId = typeof entry.templateId === 'string' ? entry.templateId : DEFAULT_PO_TEMPLATE_ID;
  const baseConfig = cloneConfig(getPurchaseOrderTemplateById(templateId)?.baseConfig ?? DEFAULT_PURCHASE_ORDER_TEMPLATE);
  let overrides = entry.overrides && typeof entry.overrides === 'object' ? entry.overrides : {};
  if (!entry.overrides) {
    const mergedConfig = sanitizePurchaseOrderTemplate({ ...baseConfig, ...entry });
    overrides = computePurchaseOrderTemplateOverrides(baseConfig, mergedConfig);
  } else {
    const mergedConfig = sanitizePurchaseOrderTemplate({ ...baseConfig, ...entry.overrides });
    overrides = computePurchaseOrderTemplateOverrides(baseConfig, mergedConfig);
  }
  return {
    templateId,
    overrides,
    updatedAt: entry.updatedAt ?? null,
    updatedBy: entry.updatedBy ?? null,
  };
}

function resolveTemplateEntryForScope(state, scope) {
  if (!scope) {
    return null;
  }
  const rawEntry = state.invoiceTemplates?.[scope];
  const normalized = normalizeTemplateStateEntry(rawEntry);
  if (!normalized) {
    return null;
  }
  const config = mergeTemplateConfig(normalized.templateId, normalized.overrides);
  return {
    ...normalized,
    config,
  };
}

function resolvePurchaseOrderTemplateEntryForScope(state, scope) {
  if (!scope) {
    return null;
  }
  const rawEntry = state.purchaseOrderTemplates?.[scope];
  const normalized = normalizePurchaseOrderTemplateEntry(rawEntry);
  if (!normalized) {
    return null;
  }
  const config = mergePurchaseOrderTemplateConfig(normalized.templateId, normalized.overrides);
  return {
    ...normalized,
    config,
  };
}

function buildInvoiceShareUrl(state, invoice, overrideBase) {
  if (!invoice) {
    return null;
  }
  const identifier = invoice.shareSlug ?? invoice.publicId ?? invoice.id ?? invoice.invoiceNumber;
  if (!identifier) {
    return null;
  }
  const baseCandidate = overrideBase
    ?? (typeof state.invoiceShareBaseUrl === 'string' && state.invoiceShareBaseUrl.trim()
      ? state.invoiceShareBaseUrl.trim()
      : null)
    ?? (typeof state.serverUrl === 'string' && state.serverUrl.trim() ? state.serverUrl.trim() : null)
    ?? (typeof window !== 'undefined' ? window.location.origin : null);
  if (!baseCandidate) {
    return null;
  }
  const normalizedBase = baseCandidate.replace(/\/$/, '');
  return `${normalizedBase}/invoices/${encodeURIComponent(String(identifier))}`;
}

function findActiveManagerId(supervisionLinks, employeeId) {
  if (!Array.isArray(supervisionLinks)) {
    return null;
  }
  const targetId = String(employeeId ?? '');
  const link = supervisionLinks.find((entry) => (
    entry
    && entry.status === 'active'
    && String(entry.employeeId) === targetId
    && entry.managerId != null
  ));
  return link ? Number(link.managerId) : null;
}

function resolveInvoiceTemplateConfigForIssuer(state, issuerId) {
  const issuer = state.users.find((user) => Number(user?.id) === Number(issuerId)) ?? null;
  if (issuer?.role === 'manager') {
    const managerScope = createManagerTemplateScope(issuerId);
    const managerEntry = resolveTemplateEntryForScope(state, managerScope);
    if (managerEntry) {
      return managerEntry.config;
    }
    const globalEntry = resolveTemplateEntryForScope(state, INVOICE_TEMPLATE_SCOPE_GLOBAL);
    return globalEntry?.config ?? mergeTemplateConfig(DEFAULT_TEMPLATE_ID, {});
  }
  if (issuer?.role === 'admin') {
    const globalEntry = resolveTemplateEntryForScope(state, INVOICE_TEMPLATE_SCOPE_GLOBAL);
    return globalEntry?.config ?? mergeTemplateConfig(DEFAULT_TEMPLATE_ID, {});
  }
  const managerId = findActiveManagerId(state.supervisionLinks, issuerId);
  if (managerId != null) {
    const managerScope = createManagerTemplateScope(managerId);
    const managerEntry = resolveTemplateEntryForScope(state, managerScope);
    if (managerEntry) {
      return managerEntry.config;
    }
  }
  const globalEntry = resolveTemplateEntryForScope(state, INVOICE_TEMPLATE_SCOPE_GLOBAL);
  return globalEntry?.config ?? mergeTemplateConfig(DEFAULT_TEMPLATE_ID, {});
}

function deriveTemplateDisplayLines(template, invoice, companyNameFallback) {
  const customer = invoice.customer ?? {};
  const companyLines = template.companyLines
    .map((line) => {
      let value = '';
      switch (line.source) {
        case 'companyName':
          value = invoice.companyName ?? companyNameFallback;
          break;
        case 'custom':
        default:
          value = line.text ?? '';
          break;
      }
      if (!value) {
        return null;
      }
      return {
        id: line.id ?? createTemplateLineId('company'),
        label: line.label ?? '',
        value,
        source: line.source ?? 'custom',
      };
    })
    .filter(Boolean);
  const customerLines = template.customerLines
    .map((line) => {
      let value = '';
      switch (line.source) {
        case 'customerName':
          value = customer.name ?? '';
          break;
        case 'customerAddress':
          value = customer.address ?? '';
          break;
        case 'customerEmail':
          value = customer.email ?? '';
          break;
        case 'customerPhone':
          value = customer.phone ?? '';
          break;
        case 'custom':
        default:
          value = line.text ?? '';
          break;
      }
      if (!value) {
        return null;
      }
      return {
        id: line.id ?? createTemplateLineId('customer'),
        label: line.label ?? '',
        value,
        source: line.source ?? 'custom',
      };
    })
    .filter(Boolean);
  return {
    company: companyLines,
    customer: customerLines,
  };
}

function applyInvoiceTemplateToInvoice(invoice, template, companyNameFallback = 'Your Company') {
  if (!template) {
    return invoice;
  }
  const sanitized = sanitizeInvoiceTemplate(template);
  const nextInvoice = {
    ...invoice,
    companyName: invoice.companyName ?? companyNameFallback,
    appearance: {
      ...(invoice.appearance ?? {}),
      headerColor: sanitized.headerColor ?? invoice.appearance?.headerColor ?? DEFAULT_INVOICE_TEMPLATE.headerColor,
    },
    layoutOptions: {
      headerColor: sanitized.headerColor,
      companyBlockPosition: sanitized.companyBlockPosition,
      detailLayout: sanitized.detailLayout,
      bodyVariant: sanitized.bodyVariant ?? DEFAULT_INVOICE_TEMPLATE.bodyVariant ?? 'classic',
      showInvoiceStatus: sanitized.showInvoiceStatus,
      showNotes: sanitized.showNotes,
      showFooterCompanyDetails: sanitized.showFooterCompanyDetails,
      showBarcode: sanitized.showBarcode,
    },
    displayLines: deriveTemplateDisplayLines(sanitized, {
      ...invoice,
      companyName: invoice.companyName ?? companyNameFallback,
    }, companyNameFallback),
  };
  if ((!nextInvoice.notes || !nextInvoice.notes.length) && sanitized.showNotes !== false && sanitized.noteText) {
    nextInvoice.notes = sanitized.noteText;
  }
  if (sanitized.showBarcode === false) {
    nextInvoice.barcodeDataUrl = null;
  }
  return nextInvoice;
}

function createInvoiceFromSale(sale, state) {
  if (!sale) return null;
  const invoiceId = getNextInvoiceId(state.invoices);
  const customer = state.customers.find((entry) => entry.id === sale.customerId) ?? null;
  const items = (sale.items ?? []).map((item) => {
    const product = state.products.find((productItem) => productItem.id === item.productId);
    return {
      description: product?.name ?? item.description ?? 'Line item',
      quantity: item.quantity ?? 0,
      unitPrice: item.unitPrice ?? 0,
    };
  });
  const subtotal = sale.subtotal ?? items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
  const discount = sale.discount ?? 0;
  const taxRate = sale.taxRate ?? 0;
  const taxAmount = sale.taxAmount ?? subtotal * taxRate;
  const total = sale.total ?? subtotal - discount + taxAmount;
  const status = (sale.saleType ?? 'credit').toLowerCase() === 'cash' ? 'paid' : 'sent';
  const balanceDue = status === 'paid' ? 0 : total;
  const invoiceNumber = sale.invoiceNumber ?? `INV-${String(invoiceId).padStart(4, '0')}`;
  let invoice = {
    id: invoiceId,
    invoiceNumber,
    customerId: sale.customerId ?? null,
    customer: customer ? { ...customer } : undefined,
    issuedBy: sale.salesPersonId ?? state.currentUser?.id ?? null,
    issuedByUser: state.users.find((user) => user.id === (sale.salesPersonId ?? state.currentUser?.id ?? null)) ?? null,
    date: normalizeDateInput(sale.date),
    dueDate: sale.dueDate ?? normalizeDateInput(sale.date, 14),
    status,
    currencyCode: state.selectedCountry,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    total,
    balanceDue,
    notes: sale.notes ?? `Invoice generated from sale #${sale.id ?? invoiceId}.`,
    items,
    companyName: state.companyName ?? 'Your Company',
  };
  const template = resolveInvoiceTemplateConfigForIssuer(state, invoice.issuedBy);
  invoice = applyInvoiceTemplateToInvoice(invoice, template, state.companyName ?? 'Your Company');
  return invoice;
}

function createInvoiceFromExpense(expense, state) {
  if (!expense || typeof expense.amount !== 'number') return null;
  const invoiceId = getNextInvoiceId(state.invoices);
  const amount = expense.amount ?? 0;
  const issuedByUser = state.users.find((user) => user.id === expense.addedBy) ?? null;
  let invoice = {
    id: invoiceId,
    invoiceNumber: `EXP-${String(invoiceId).padStart(4, '0')}`,
    customerId: null,
    customer: { name: `Expense - ${expense.description ?? 'General'}` },
    issuedBy: expense.addedBy ?? state.currentUser?.id ?? null,
    issuedByUser,
    date: normalizeDateInput(expense.date),
    dueDate: normalizeDateInput(expense.date),
    status: 'paid',
    currencyCode: state.selectedCountry,
    subtotal: amount,
    discount: 0,
    taxRate: 0,
    taxAmount: 0,
    total: amount,
    balanceDue: 0,
    notes: expense.notes ?? `Expense recorded under ${expense.category ?? 'general ledger'}.`,
    items: [
      { description: expense.description ?? 'Expense', quantity: 1, unitPrice: amount },
    ],
    companyName: state.companyName ?? 'Your Company',
  };
  const template = resolveInvoiceTemplateConfigForIssuer(state, invoice.issuedBy);
  invoice = applyInvoiceTemplateToInvoice(invoice, template, state.companyName ?? 'Your Company');
  return invoice;
}
const defaultBranches = [
  { id: 1, name: 'Management Team', members: [1, 2] },
  { id: 2, name: 'Sales Floor', members: [3] },
];

const defaultTasks = [
  {
    id: 1704445200000,
    title: 'Q1 Revenue Sprint',
    description: 'Drive AED 120,000 in revenue before the quarter closes.',
    dueDate: '2024-03-31',
    createdBy: 2,
    goalType: 'sales',
    goalTarget: 120000,
    participantLimit: 4,
    accuraBotEnabled: true,
    accuraBotReportFrequency: 'weekly',
    branchId: 2,
    progress: 64000,
    participants: [2, 3],
    status: 'active',
    isSubTask: false,
    parentTaskId: null,
    lastNotifiedProgress: 50,
    createdAt: '2024-01-05T09:00:00.000Z',
  },
  {
    id: 1704445260000,
    title: 'Q1 Revenue Sprint (Personal Goal)',
    description: 'Personal contribution plan for John Manager on "Q1 Revenue Sprint".',
    dueDate: '2024-03-31',
    createdBy: 2,
    goalType: 'sales',
    goalTarget: 40000,
    participantLimit: 1,
    accuraBotEnabled: false,
    accuraBotReportFrequency: null,
    branchId: 2,
    progress: 36000,
    participants: [2],
    status: 'active',
    isSubTask: true,
    parentTaskId: 1704445200000,
    lastNotifiedProgress: 75,
    createdAt: '2024-01-05T09:01:00.000Z',
  },
  {
    id: 1704445320000,
    title: 'Q1 Revenue Sprint (Personal Goal)',
    description: 'Personal contribution plan for Jane Worker on "Q1 Revenue Sprint".',
    dueDate: '2024-03-31',
    createdBy: 2,
    goalType: 'sales',
    goalTarget: 30000,
    participantLimit: 1,
    accuraBotEnabled: false,
    accuraBotReportFrequency: null,
    branchId: 2,
    progress: 24000,
    participants: [3],
    status: 'active',
    isSubTask: true,
    parentTaskId: 1704445200000,
    lastNotifiedProgress: 50,
    createdAt: '2024-01-05T09:02:00.000Z',
  },
  {
    id: 1706778000000,
    title: 'Flagship Launch Playbook',
    description: 'Coordinate the new flagship product launch across management and sales teams.',
    dueDate: '2024-04-15',
    createdBy: 1,
    goalType: 'count',
    goalTarget: 10,
    participantLimit: 3,
    accuraBotEnabled: true,
    accuraBotReportFrequency: 'end_of_task',
    branchId: 1,
    progress: 4,
    participants: [1, 2],
    status: 'active',
    isSubTask: false,
    parentTaskId: null,
    lastNotifiedProgress: 25,
    createdAt: '2024-02-01T09:00:00.000Z',
  },
  {
    id: 1706778060000,
    title: 'Flagship Launch (Personal Goal)',
    description: 'Personal checklist for Administrator on "Flagship Launch Playbook".',
    dueDate: '2024-04-15',
    createdBy: 1,
    goalType: 'count',
    goalTarget: 5,
    participantLimit: 1,
    accuraBotEnabled: false,
    accuraBotReportFrequency: null,
    branchId: 1,
    progress: 2,
    participants: [1],
    status: 'active',
    isSubTask: true,
    parentTaskId: 1706778000000,
    lastNotifiedProgress: 0,
    createdAt: '2024-02-01T09:01:00.000Z',
  },
  {
    id: 1706778120000,
    title: 'Flagship Launch (Personal Goal)',
    description: 'Personal checklist for John Manager on "Flagship Launch Playbook".',
    dueDate: '2024-04-15',
    createdBy: 1,
    goalType: 'count',
    goalTarget: 5,
    participantLimit: 1,
    accuraBotEnabled: false,
    accuraBotReportFrequency: null,
    branchId: 1,
    progress: 2,
    participants: [2],
    status: 'active',
    isSubTask: true,
    parentTaskId: 1706778000000,
    lastNotifiedProgress: 0,
    createdAt: '2024-02-01T09:02:00.000Z',
  },
  {
    id: 1709370000000,
    title: 'Margin Mission',
    description: 'Improve profit margin by AED 40,000 through upsells and services.',
    dueDate: '2024-05-31',
    createdBy: 2,
    goalType: 'profit',
    goalTarget: 40000,
    participantLimit: 2,
    accuraBotEnabled: true,
    accuraBotReportFrequency: 'weekly',
    branchId: 2,
    progress: 15000,
    participants: [2],
    status: 'active',
    isSubTask: false,
    parentTaskId: null,
    lastNotifiedProgress: 0,
    createdAt: '2024-03-02T09:00:00.000Z',
  },
  {
    id: 1709370060000,
    title: 'Margin Mission (Personal Goal)',
    description: 'Personal profit contribution goal for John Manager on "Margin Mission".',
    dueDate: '2024-05-31',
    createdBy: 2,
    goalType: 'profit',
    goalTarget: 20000,
    participantLimit: 1,
    accuraBotEnabled: false,
    accuraBotReportFrequency: null,
    branchId: 2,
    progress: 15000,
    participants: [2],
    status: 'active',
    isSubTask: true,
    parentTaskId: 1709370000000,
    lastNotifiedProgress: 0,
    createdAt: '2024-03-02T09:01:00.000Z',
  },
];

const TASK_PROGRESS_MILESTONES = [25, 50, 75, 100];

function getPerParticipantTarget(goalType, goalTarget, participantLimit) {
  if (!Number.isFinite(goalTarget) || goalTarget <= 0) {
    return 0;
  }
  if (!Number.isFinite(participantLimit) || participantLimit <= 0) {
    return goalTarget;
  }
  if (goalType === 'count') {
    return Math.max(1, Math.ceil(goalTarget / participantLimit));
  }
  return goalTarget / participantLimit;
}

function createPersonalTask(mainTask, userId, users, timestamp = Date.now()) {
  const personalGoalTarget = getPerParticipantTarget(mainTask.goalType, mainTask.goalTarget, mainTask.participantLimit);
  const user = Array.isArray(users) ? users.find((candidate) => candidate.id === userId) : null;
  const userName = user?.name?.split(' ')[0] ?? 'Team member';
  return {
    id: timestamp + userId,
    title: `${mainTask.title} (Personal Goal)`,
    description: `Personal contribution plan for ${userName} on "${mainTask.title}".`,
    dueDate: mainTask.dueDate,
    createdBy: mainTask.createdBy,
    goalType: mainTask.goalType,
    goalTarget: personalGoalTarget,
    participantLimit: 1,
    accuraBotEnabled: false,
    accuraBotReportFrequency: null,
    branchId: mainTask.branchId ?? null,
    progress: 0,
    participants: [userId],
    status: 'active',
    isSubTask: true,
    parentTaskId: mainTask.id,
    lastNotifiedProgress: 0,
    createdAt: new Date(timestamp).toISOString(),
  };
}

function recalculatePersonalTargets(tasks, mainTask) {
  const perParticipantTarget = getPerParticipantTarget(mainTask.goalType, mainTask.goalTarget, mainTask.participantLimit);
  return tasks.map((task) => {
    if (task.parentTaskId !== mainTask.id) {
      return task;
    }
    const next = {
      ...task,
      goalType: mainTask.goalType,
      goalTarget: perParticipantTarget,
      dueDate: mainTask.dueDate,
      branchId: mainTask.branchId ?? null,
    };
    if (next.progress >= next.goalTarget && next.status !== 'completed') {
      next.status = 'completed';
    }
    return next;
  });
}

function computeSaleProfit(sale, products) {
  if (!sale || !Array.isArray(sale.items)) {
    return 0;
  }
  const totalCost = sale.items.reduce((sum, item) => {
    const product = Array.isArray(products) ? products.find((candidate) => candidate.id === item.productId) : null;
    const productCost = Number(product?.cost) || 0;
    const quantity = Number(item?.quantity) || 0;
    return sum + productCost * quantity;
  }, 0);
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount) || 0;
  const revenue = subtotal - discount;
  const profit = revenue - totalCost;
  return profit > 0 ? profit : 0;
}

function computeProgressDelta(goalType, sale, profit) {
  if (goalType === 'sales') {
    return Number(sale?.total) || 0;
  }
  if (goalType === 'profit') {
    return profit;
  }
  if (goalType === 'count') {
    return 1;
  }
  return 0;
}

function buildTaskMilestoneNotification(task, milestone) {
  const completed = milestone >= 100;
  return createNotification({
    message: completed ? `Task completed: ${task.title}` : `${task.title} reached ${milestone}% progress`,
    description: completed
      ? 'AccuraBot closed out this objective.'
      : 'AccuraBot milestone update.',
    type: completed ? 'success' : 'info',
    duration: 6000,
  });
}

function ensureNotificationId(notification) {
  if (notification.id != null) {
    return notification;
  }
  return {
    ...notification,
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

function applySaleToTasks(state, sale) {
  const salespersonId = Number(sale?.salesPersonId);
  if (!Number.isFinite(salespersonId)) {
    return { tasks: state.tasks, notifications: [] };
  }

  const activeSubTasks = state.tasks.filter(
    (task) => task.isSubTask && task.status === 'active' && task.participants.includes(salespersonId),
  );
  if (!activeSubTasks.length) {
    return { tasks: state.tasks, notifications: [] };
  }

  const profit = computeSaleProfit(sale, state.products);
  const nextTasks = state.tasks.map((task) => ({ ...task }));
  const notifications = [];

  activeSubTasks.forEach((subTask) => {
    const subIndex = nextTasks.findIndex((task) => task.id === subTask.id);
    if (subIndex === -1) {
      return;
    }

    const progressDelta = computeProgressDelta(subTask.goalType, sale, profit);
    if (progressDelta <= 0) {
      return;
    }

    const updatedSub = nextTasks[subIndex];
    updatedSub.progress += progressDelta;

    if (updatedSub.progress >= updatedSub.goalTarget && updatedSub.status !== 'completed') {
      updatedSub.status = 'completed';
    }

    if (!updatedSub.parentTaskId) {
      return;
    }

    const parentIndex = nextTasks.findIndex((task) => task.id === updatedSub.parentTaskId);
    if (parentIndex === -1) {
      return;
    }

    const updatedMain = nextTasks[parentIndex];
    updatedMain.progress += progressDelta;

    const progressPercentage = updatedMain.goalTarget > 0
      ? (updatedMain.progress / updatedMain.goalTarget) * 100
      : 0;

    if (progressPercentage >= 100 && updatedMain.status !== 'completed') {
      updatedMain.status = 'completed';
      if (updatedMain.accuraBotEnabled) {
        notifications.push(buildTaskMilestoneNotification(updatedMain, 100));
        updatedMain.lastNotifiedProgress = 100;
      }
    } else if (updatedMain.accuraBotEnabled) {
      const milestone = TASK_PROGRESS_MILESTONES.find(
        (mark) => mark < 100
          && progressPercentage >= mark
          && (updatedMain.lastNotifiedProgress ?? 0) < mark,
      );
      if (milestone != null) {
        notifications.push(buildTaskMilestoneNotification(updatedMain, milestone));
        updatedMain.lastNotifiedProgress = milestone;
      }
    }

    if (updatedSub.status === 'completed') {
      const siblingSubTasks = nextTasks.filter(
        (task) => task.parentTaskId === updatedSub.parentTaskId,
      );
      if (siblingSubTasks.length > 0 && siblingSubTasks.every((task) => task.status === 'completed')) {
        if (updatedMain.status !== 'completed') {
          updatedMain.status = 'completed';
          if (updatedMain.accuraBotEnabled && updatedMain.lastNotifiedProgress !== 100) {
            notifications.push(buildTaskMilestoneNotification(updatedMain, 100));
            updatedMain.lastNotifiedProgress = 100;
          }
        }
      }
    }
  });

  return {
    tasks: nextTasks,
    notifications,
  };
}

const defaultChartOfAccounts = [
  { code: '1110', name: 'Cash on Hand', type: 'Asset', normalBalance: 'Debit' },
  { code: '1120', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'Debit' },
  { code: '1210', name: 'Inventory Asset', type: 'Asset', normalBalance: 'Debit' },
  { code: '1310', name: 'Prepaid Expenses', type: 'Asset', normalBalance: 'Debit' },
  { code: '1410', name: 'Property, Plant, & Equipment', type: 'Asset', normalBalance: 'Debit' },
  { code: '2110', name: 'Accounts Payable', type: 'Liability', normalBalance: 'Credit' },
  { code: '2210', name: 'VAT Payable', type: 'Liability', normalBalance: 'Credit' },
  { code: '2310', name: 'Salaries Payable', type: 'Liability', normalBalance: 'Credit' },
  { code: '3110', name: "Owner's Equity", type: 'Equity', normalBalance: 'Credit' },
  { code: '3210', name: 'Retained Earnings', type: 'Equity', normalBalance: 'Credit' },
  { code: '4110', name: 'Sales Revenue', type: 'Revenue', normalBalance: 'Credit' },
  { code: '4120', name: 'Sales Discount', type: 'Contra-Revenue', normalBalance: 'Debit' },
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
];
const defaultJournal = buildInitialJournal({
  sales: defaultSales,
  expenses: defaultExpenses,
  products: defaultProducts,
  customers: defaultCustomers,
  chartOfAccounts: defaultChartOfAccounts,
});

const AppStateContext = createContext(null);
const AppActionsContext = createContext(null);

const quickSaleInitialState = {
  active: false,
  currentStep: 1,
  selectedProductIds: [],
  productQuantities: {},
  productUnits: {},
  selectedCustomerId: null,
  paymentType: 'Cash',
  paymentTerms: 'Due on Receipt',
  notes: '',
  discount: 0,
  discountMode: 'none',
  globalDiscountAmount: 0,
  discountsByProduct: {},
  subtotalBeforeDiscount: 0,
  subtotal: 0,
  taxAmount: 0,
  total: 0,
};

const STOCK_BATCH_LOCKED_STATUSES = new Set(['damaged', 'written_off']);
const STOCK_BATCH_VALID_STATUSES = new Set([
  'active',
  'near_expiry',
  'expired',
  'damaged',
  'written_off',
]);
const SELLABLE_BATCH_STATUSES = new Set([
  'active',
  'near_expiry',
]);

function normalizeIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function computeBatchStatus(expiryDate, currentStatus, nearExpiryDays = 30, today = new Date()) {
  const normalizedStatus = typeof currentStatus === 'string' ? currentStatus.toLowerCase() : null;
  if (normalizedStatus && STOCK_BATCH_LOCKED_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }
  const safeNearExpiryDays = Number.isFinite(Number(nearExpiryDays)) ? Number(nearExpiryDays) : 30;
  const midnightToday = new Date(today);
  midnightToday.setHours(0, 0, 0, 0);
  const normalizedExpiry = normalizeIsoDate(expiryDate);
  if (!normalizedExpiry) {
    return normalizedStatus && STOCK_BATCH_VALID_STATUSES.has(normalizedStatus) ? normalizedStatus : 'active';
  }
  const expiryDateObj = new Date(normalizedExpiry);
  if (expiryDateObj < midnightToday) {
    return 'expired';
  }
  const nearExpiryThreshold = new Date(midnightToday);
  nearExpiryThreshold.setDate(nearExpiryThreshold.getDate() + safeNearExpiryDays);
  if (expiryDateObj <= nearExpiryThreshold) {
    return 'near_expiry';
  }
  return 'active';
}

function createStockBatch(payload = {}, options = {}) {
  const nearExpiryDays = options.nearExpiryDays ?? 30;
  const now = new Date();
  const baseId = payload.id ?? `batch-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const normalizedQuantity = Number.isFinite(Number(payload.quantity)) ? Number(payload.quantity) : 0;
  return {
    id: baseId,
    productId: payload.productId ?? null,
    vanId: payload.vanId ?? payload.branchId ?? null,
    expiryDate: normalizeIsoDate(payload.expiryDate),
    status: computeBatchStatus(payload.expiryDate, payload.status, nearExpiryDays, now),
    quantity: normalizedQuantity,
    lotNumber: payload.lotNumber ?? null,
    unitCost: Number.isFinite(Number(payload.unitCost)) ? Number(payload.unitCost) : null,
    receivedAt: normalizeIsoDate(payload.receivedAt) ?? now.toISOString(),
    notes: payload.notes ?? null,
  };
}

function updateStockBatch(existingBatch, updates = {}, options = {}) {
  if (!existingBatch) {
    return null;
  }
  const nearExpiryDays = options.nearExpiryDays ?? 30;
  const merged = {
    ...existingBatch,
    ...updates,
  };
  merged.expiryDate = normalizeIsoDate(merged.expiryDate);
  merged.status = computeBatchStatus(merged.expiryDate, merged.status, nearExpiryDays);
  merged.quantity = Number.isFinite(Number(merged.quantity)) ? Number(merged.quantity) : 0;
  return merged;
}

function createStockMovement(payload = {}) {
  const movementId = payload.id ?? `movement-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const quantityChange = Number(payload.quantityChange) || 0;
  return {
    id: movementId,
    batchId: payload.batchId ?? null,
    type: payload.type ?? 'adjustment',
    quantityChange,
    referenceType: payload.referenceType ?? null,
    referenceId: payload.referenceId ?? null,
    createdBy: payload.createdBy ?? null,
    createdAt: normalizeIsoDate(payload.createdAt) ?? new Date().toISOString(),
    notes: payload.notes ?? null,
  };
}

function summarizeBatchStatusChanges(previousBatches = [], nextBatches = []) {
  const changes = [];
  const prevMap = new Map(previousBatches.map((batch) => [batch.id, batch]));
  nextBatches.forEach((batch) => {
    const prev = prevMap.get(batch.id);
    if (prev && prev.status !== batch.status) {
      changes.push({
        batchId: batch.id,
        productId: batch.productId,
        from: prev.status,
        to: batch.status,
      });
    }
  });
  return changes;
}

function getSaleItemBaseQuantity(item) {
  if (!item) {
    return 0;
  }
  const baseQuantity = Number(item.baseQuantity);
  if (Number.isFinite(baseQuantity) && baseQuantity > 0) {
    return baseQuantity;
  }
  const quantity = Number(item.quantity);
  const conversion = Number(item.conversion);
  const resolvedQuantity = Number.isFinite(quantity) ? quantity : 0;
  const resolvedConversion = Number.isFinite(conversion) && conversion > 0 ? conversion : 1;
  const total = resolvedQuantity * resolvedConversion;
  return Number.isFinite(total) && total > 0 ? total : 0;
}

function consumeStockForSale(currentBatches, sale, options = {}) {
  if (!Array.isArray(currentBatches) || !currentBatches.length) {
    return {
      batches: currentBatches ?? [],
      movements: [],
      shortages: [],
      impacted: [],
      changed: false,
    };
  }
  const saleItems = Array.isArray(sale?.items) ? sale.items : [];
  if (!saleItems.length) {
    return {
      batches: currentBatches,
      movements: [],
      shortages: [],
      impacted: [],
      changed: false,
    };
  }
  const vanId = options.vanId ?? sale?.vanId ?? sale?.branchId ?? null;
  const clonedBatches = currentBatches.map((batch) => ({ ...batch }));
  const batchMap = new Map(clonedBatches.map((batch) => [batch.id, batch]));
  const movements = [];
  const shortages = [];
  const impactedTotals = new Map();
  let changed = false;

  const sortByExpiry = (list) => list.slice().sort((a, b) => {
    const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
    if (aTime === bTime) {
      const aReceived = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
      const bReceived = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
      return aReceived - bReceived;
    }
    return aTime - bTime;
  });

  const getCandidates = (productId, predicate) => {
    const list = [];
    batchMap.forEach((batch) => {
      if (Number(batch.productId) !== productId) {
        return;
      }
      const status = (batch.status ?? 'active').toLowerCase();
      if (!SELLABLE_BATCH_STATUSES.has(status)) {
        return;
      }
      if (!Number.isFinite(batch.quantity) || batch.quantity <= 0) {
        return;
      }
      if (!predicate(batch)) {
        return;
      }
      list.push(batch);
    });
    return sortByExpiry(list);
  };

  saleItems.forEach((item) => {
    const productId = Number(item?.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      return;
    }
    const requestedQuantity = getSaleItemBaseQuantity(item);
    if (!requestedQuantity) {
      return;
    }
    let remaining = requestedQuantity;

    const exactMatches = getCandidates(productId, (batch) => {
      if (vanId == null) {
        return true;
      }
      return batch.vanId === vanId;
    });

    const neutralMatches = vanId == null
      ? []
      : getCandidates(productId, (batch) => batch.vanId == null);

    const consumeFromList = (list) => {
      list.forEach((batch) => {
        if (remaining <= 0) {
          return;
        }
        const take = Math.min(remaining, batch.quantity);
        if (take <= 0) {
          return;
        }
        batch.quantity -= take;
        remaining -= take;
        changed = true;
        impactedTotals.set(productId, (impactedTotals.get(productId) ?? 0) + take);
        movements.push(createStockMovement({
          batchId: batch.id,
          type: 'sale',
          quantityChange: -take,
          referenceType: 'sale',
          referenceId: sale?.id ?? sale?.saleId ?? null,
          createdBy: sale?.salesPersonId ?? null,
        }));
      });
    };

    consumeFromList(exactMatches);
    if (remaining > 0) {
      consumeFromList(neutralMatches);
    }

    if (remaining > 0) {
      shortages.push({
        productId,
        requestedQuantity,
        fulfilledQuantity: requestedQuantity - remaining,
        missingQuantity: remaining,
        vanId,
      });
    }
  });

  const impacted = Array.from(impactedTotals.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));

  return {
    batches: changed ? clonedBatches : currentBatches,
    movements,
    shortages,
    impacted,
    changed,
  };
}
const initialAppState = {
  serverUrl: 'https://ledgerly-backend-e8au.onrender.com',
  charts: {},
  currentSaleCart: [],
  theme: 'dark-theme',
  currentView: 'login',
  pendingRole: null,
  currentUser: null,
  mobileMenuOpen: false,
  aiMode: 'ai',
  aiLoading: false,
  aiAnswer: null,
  pixelAnimation: null,
  aiChatHistory: [],
  aiAudioPlayers: {},
  aiSettings: {
    language: 'English',
    highlightKeywords: false,
    highlightNumbers: false,
  },
  stockBatches: [],
  stockMovements: [],
  nearExpiryDays: 30,
  selectedCountry: defaultCountryCode,
  companyName: 'Your Company',
  lowStockThreshold: 10,
  users: defaultUsers,
  products: defaultProducts,
  customers: defaultCustomers,
  sales: defaultSales,
  expenses: defaultExpenses,
  invoices: defaultInvoices,
  messages: defaultMessages,
  branches: defaultBranches,
  activeConversationId: null,
  inboxFilter: 'all',
  taskFilter: 'all',
  inboxSearchTerm: '',
  categories: ['Electronics', 'Accessories', 'Software', 'Services', 'Storage', 'Peripherals', 'Displays', 'Other'],
  expenseCategories: ['Office Supplies', 'Marketing', 'Utilities', 'Rent', 'Transportation', 'Meals & Entertainment', 'Equipment', 'Professional Services', 'Other'],
  aiInsights: [],
  botAnalysis: {},
  lastAIUpdate: null,
  quickSale: { ...quickSaleInitialState },
  purchaseOrders: [],
  aiViewPhase: 'selection',
  currentAICategory: null,
  currentAICategoryText: null,
  journal: defaultJournal,
  currentBranchId: null,
  tasks: defaultTasks,
  announcements: [],
  chartOfAccounts: defaultChartOfAccounts,
  supervisionLinks: defaultSupervisionLinks,
  featureGrants: [],
  featureLayouts: [],
  invoiceTemplates: {},
  purchaseOrderTemplates: {},
  notifications: [],
  logs: [],
  nextLogNumber: 1,
  modal: { open: false, content: null, props: null },
};

function withLog(state, baseState, logPayload) {
  if (!logPayload) {
    return baseState;
  }
  const logEntry = createLogEntry({
    ...logPayload,
    logNumber: state.nextLogNumber ?? 1,
  });
  const currentLogs = baseState.logs ?? state.logs ?? [];
  return {
    ...baseState,
    logs: [logEntry, ...currentLogs],
    nextLogNumber: (state.nextLogNumber ?? 1) + 1,
  };
}

function appReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE_STATE': {
      const payload = action.payload ?? {};
      const mergedQuickSale = {
        ...quickSaleInitialState,
        ...(payload.quickSale ?? {}),
        active: false,
      };
      const mergedState = {
        ...state,
        ...payload,
        quickSale: mergedQuickSale,
        mobileMenuOpen: false,
        aiLoading: false,
        aiAnswer: null,
        pixelAnimation: null,
        notifications: state.notifications,
        modal: state.modal,
        featureLayouts: Array.isArray(payload.featureLayouts) ? payload.featureLayouts : state.featureLayouts,
        invoiceTemplates: payload.invoiceTemplates && typeof payload.invoiceTemplates === 'object'
          ? payload.invoiceTemplates
          : state.invoiceTemplates,
        purchaseOrderTemplates: payload.purchaseOrderTemplates && typeof payload.purchaseOrderTemplates === 'object'
          ? payload.purchaseOrderTemplates
          : state.purchaseOrderTemplates,
      };
      const normalizedTemplates = {};
      Object.entries(mergedState.invoiceTemplates ?? {}).forEach(([scope, entry]) => {
        const normalized = normalizeTemplateStateEntry(entry);
        if (normalized) {
          normalizedTemplates[scope] = normalized;
        }
      });
      mergedState.invoiceTemplates = normalizedTemplates;
      const normalizedPurchaseOrderTemplates = {};
      Object.entries(mergedState.purchaseOrderTemplates ?? {}).forEach(([scope, entry]) => {
        const normalized = normalizePurchaseOrderTemplateEntry(entry);
        if (normalized) {
          normalizedPurchaseOrderTemplates[scope] = normalized;
        }
      });
      mergedState.purchaseOrderTemplates = normalizedPurchaseOrderTemplates;
      mergedState.invoices = (Array.isArray(mergedState.invoices) ? mergedState.invoices : state.invoices ?? []).map((invoice) => {
        const issuerId = invoice.issuedBy ?? invoice.issuedByUser?.id ?? mergedState.currentUser?.id ?? null;
        const templateForInvoice = resolveInvoiceTemplateConfigForIssuer(mergedState, issuerId);
        return applyInvoiceTemplateToInvoice(
          { ...invoice, companyName: mergedState.companyName ?? 'Your Company' },
          templateForInvoice,
          mergedState.companyName ?? 'Your Company',
        );
      });
      mergedState.nextLogNumber = Number.isFinite(Number(payload.nextLogNumber))
        ? Number(payload.nextLogNumber)
        : state.nextLogNumber ?? initialAppState.nextLogNumber;
      return mergedState;
    }
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_PENDING_ROLE':
      return { ...state, pendingRole: action.payload };
    case 'LOGIN':
      return {
        ...state,
        currentUser: action.payload.user,
        currentView: action.payload.nextView ?? 'dashboard',
        pendingRole: null,
        mobileMenuOpen: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        currentUser: null,
        currentView: 'login',
        pendingRole: null,
        mobileMenuOpen: false,
        quickSale: { ...quickSaleInitialState },
      };
    case 'SET_USERS':
      return { ...state, users: Array.isArray(action.payload) ? action.payload : state.users };
    case 'ADD_EMPLOYEE': {
      const employee = action.payload;
      if (!employee || employee.id == null) {
        return state;
      }
      const identifier = String(employee.id);
      if (state.users.some((user) => String(user?.id) === identifier)) {
        return state;
      }
      return { ...state, users: [...state.users, employee] };
    }
    case 'UPDATE_EMPLOYEE': {
      const employee = action.payload;
      if (!employee || employee.id == null) {
        return state;
      }
      const identifier = String(employee.id);
      const index = state.users.findIndex((user) => String(user?.id) === identifier);
      if (index === -1) {
        return state;
      }
      const previous = state.users[index];
      const preservedCommission = employee.commission != null ? employee.commission : previous.commission ?? 0;
      const updatedEmployee = {
        ...previous,
        ...employee,
        commission: preservedCommission,
      };
      const nextUsers = state.users.slice();
      nextUsers[index] = updatedEmployee;
      const isCurrentUser = String(state.currentUser?.id ?? '') === identifier;
      return {
        ...state,
        users: nextUsers,
        currentUser: isCurrentUser ? { ...state.currentUser, ...updatedEmployee } : state.currentUser,
      };
    }
    case 'DELETE_EMPLOYEE': {
      const targetId = action.payload;
      if (targetId == null) {
        return state;
      }
      const identifier = String(targetId);
      const nextUsers = state.users.filter((user) => String(user?.id) !== identifier);
      if (nextUsers.length === state.users.length) {
        return state;
      }
      const isCurrentUser = String(state.currentUser?.id ?? '') === identifier;
      const baseState = {
        ...state,
        users: nextUsers,
      };
      if (!isCurrentUser) {
        return baseState;
      }
      return {
        ...baseState,
        currentUser: null,
        currentView: 'login',
        pendingRole: null,
        mobileMenuOpen: false,
        quickSale: { ...quickSaleInitialState },
      };
    }
    case 'CREATE_SUPERVISION_REQUEST': {
      const payload = action.payload ?? {};
      const managerId = Number(payload.managerId);
      const employeeId = Number(payload.employeeId);
      if (!Number.isFinite(managerId) || !Number.isFinite(employeeId)) {
        return state;
      }
      const normalizedManagerId = managerId;
      const normalizedEmployeeId = employeeId;
      const existingActiveLink = state.supervisionLinks.find((link) => (
        Number(link?.managerId) === normalizedManagerId
        && Number(link?.employeeId) === normalizedEmployeeId
        && (link?.status === 'pending' || link?.status === 'active')
      ));
      if (existingActiveLink) {
        return state;
      }
      const now = new Date().toISOString();
      const status = typeof payload.status === 'string' ? payload.status : 'pending';
      const link = {
        id: payload.id ?? `sup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        managerId: normalizedManagerId,
        employeeId: normalizedEmployeeId,
        createdBy: Number.isFinite(Number(payload.createdBy)) ? Number(payload.createdBy) : normalizedManagerId,
        requestedAt: payload.requestedAt ?? now,
        status,
        notes: payload.notes ?? '',
        acceptedAt: status === 'active' ? (payload.acceptedAt ?? now) : payload.acceptedAt ?? null,
        respondedBy: payload.respondedBy ?? null,
        respondedAt: payload.respondedAt ?? (status === 'active' ? now : null),
        responseNote: payload.responseNote ?? null,
      };
      const manager = state.users.find((user) => Number(user?.id) === normalizedManagerId);
      const employee = state.users.find((user) => Number(user?.id) === normalizedEmployeeId);
      const managerName = manager?.name ?? manager?.username ?? 'Your supervisor';
      const employeeName = employee?.name ?? employee?.username ?? 'team member';
      let nextMessages = state.messages;
      if (status === 'pending') {
        const inviteMessage = normalizeStoredMessage({
          id: payload.messageId ?? Date.now(),
          from: normalizedManagerId,
          to: normalizedEmployeeId,
          subject: `${managerName} invited you to supervision`,
          content: `${managerName} wants to supervise your work in Owlio. Accept this invitation so they can assist you with tasks and insights.`,
          type: 'supervision',
          status: 'pending',
          timestamp: payload.requestedAt ?? now,
          supervisionLinkId: link.id,
          supervisionManagerId: normalizedManagerId,
          supervisionEmployeeId: normalizedEmployeeId,
          supervisionStatus: 'pending',
          notes: link.notes ?? '',
          meta: {
            managerName,
            employeeName,
          },
        });
        nextMessages = [...state.messages, inviteMessage];
      }
      return withLog(
        state,
        {
          ...state,
          supervisionLinks: [link, ...state.supervisionLinks],
          messages: nextMessages,
        },
        {
          actor: state.currentUser,
          actionType: 'CREATE_SUPERVISION_REQUEST',
          entity: {
            id: link.id,
            managerName,
            employeeName,
            status,
          },
        },
      );
    }
    case 'SET_SUPERVISION_STATUS': {
      const payload = action.payload ?? {};
      const linkId = payload.linkId ?? payload.id;
      const status = typeof payload.status === 'string' ? payload.status : null;
      if (!linkId || !status) {
        return state;
      }
      const index = state.supervisionLinks.findIndex((link) => String(link?.id) === String(linkId));
      if (index === -1) {
        return state;
      }
      const now = new Date().toISOString();
      const existing = state.supervisionLinks[index];
      const updatedLink = {
        ...existing,
        status,
        respondedBy: Number.isFinite(Number(payload.responderId))
          ? Number(payload.responderId)
          : existing.respondedBy ?? null,
        respondedAt: payload.respondedAt ?? now,
        responseNote: payload.responseNote ?? existing.responseNote ?? null,
        updatedAt: now,
      };
      if (status === 'active') {
        updatedLink.acceptedAt = payload.acceptedAt ?? now;
        updatedLink.declinedAt = existing.declinedAt ?? null;
        updatedLink.revokedAt = existing.revokedAt ?? null;
      } else if (status === 'declined') {
        updatedLink.declinedAt = payload.declinedAt ?? now;
      } else if (status === 'revoked') {
        updatedLink.revokedAt = payload.revokedAt ?? now;
      }
      const nextLinks = state.supervisionLinks.slice();
      nextLinks[index] = updatedLink;
      const updatedMessages = state.messages.map((message) => {
        if (String(message?.supervisionLinkId) !== String(linkId)) {
          return message;
        }
        const nextStatus = status === 'active' ? 'accepted' : status === 'declined' ? 'declined' : status;
        return {
          ...message,
          supervisionStatus: nextStatus,
          status: nextStatus,
          read: status !== 'pending' ? true : message.read,
          respondedAt: payload.respondedAt ?? now,
        };
      });
      const employee = state.users.find((user) => Number(user?.id) === Number(updatedLink.employeeId));
      const employeeName = employee?.name ?? employee?.username ?? 'team member';
      const normalizedStatus = status.toLowerCase();
      const shouldLog = ['active', 'declined', 'revoked'].includes(normalizedStatus);
      return withLog(
        state,
        {
          ...state,
          supervisionLinks: nextLinks,
          messages: updatedMessages,
        },
        shouldLog
          ? {
            actor: state.currentUser,
            actionType: 'SET_SUPERVISION_STATUS',
            entity: {
              id: updatedLink.id,
              employeeName,
              status: normalizedStatus,
            },
          }
          : null,
      );
    }
    case 'REMOVE_SUPERVISION_LINK': {
      const targetId = action.payload;
      if (!targetId) {
        return state;
      }
      const nextLinks = state.supervisionLinks.filter((link) => String(link?.id) !== String(targetId));
      if (nextLinks.length === state.supervisionLinks.length) {
        return state;
      }
      return {
        ...state,
        supervisionLinks: nextLinks,
      };
    }
    case 'UPSERT_FEATURE_GRANT': {
      const payload = action.payload ?? {};
      const employeeId = Number(payload.employeeId);
      if (!Number.isFinite(employeeId)) {
        return state;
      }
      const grantedPermissions = normalizePermissionList(
        Array.isArray(payload.grantedPermissions) ? payload.grantedPermissions : payload.permissions,
      );
      const revokedPermissions = normalizePermissionList(payload.revokedPermissions);
      const grantedBy = Number.isFinite(Number(payload.grantedBy))
        ? Number(payload.grantedBy)
        : state.currentUser?.id ?? null;
      const timestamp = payload.updatedAt ?? new Date().toISOString();
      const entry = {
        employeeId,
        grantedPermissions,
        revokedPermissions,
        grantedBy,
        updatedAt: timestamp,
        createdAt: payload.createdAt ?? timestamp,
      };
      const nextGrants = state.featureGrants.filter((grant) => Number(grant?.employeeId) !== employeeId);
      if (grantedPermissions.length > 0 || revokedPermissions.length > 0) {
        nextGrants.push(entry);
      }
      const employee = state.users.find((user) => Number(user?.id) === employeeId);
      const employeeName = employee?.name ?? employee?.fullName ?? employee?.username ?? `Employee ${employeeId}`;
      const featureGrantLogPayload = {
        actor: state.currentUser,
        actionType: 'UPSERT_FEATURE_GRANT',
        entity: {
          id: employeeId,
          employeeName,
          grantedCount: grantedPermissions.length,
          revokedCount: revokedPermissions.length,
        },
        changes: {
          granted: grantedPermissions,
          revoked: revokedPermissions,
        },
      };
      return withLog(
        state,
        {
          ...state,
          featureGrants: nextGrants,
        },
        featureGrantLogPayload,
      );
    }
    case 'REMOVE_FEATURE_GRANT': {
      const employeeId = Number(action.payload?.employeeId ?? action.payload);
      if (!Number.isFinite(employeeId)) {
        return state;
      }
      const nextGrants = state.featureGrants.filter((grant) => Number(grant?.employeeId) !== employeeId);
      if (nextGrants.length === state.featureGrants.length) {
        return state;
      }
      return {
        ...state,
        featureGrants: nextGrants,
      };
    }
    case 'CREATE_FEATURE_LAYOUT': {
      const payload = action.payload ?? {};
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (!name) {
        return state;
      }
      const grantedPermissions = Array.isArray(payload.grantedPermissions)
        ? Array.from(new Set(payload.grantedPermissions.filter((permission) => typeof permission === 'string' && permission)))
        : [];
      const revokedPermissions = Array.isArray(payload.revokedPermissions)
        ? Array.from(new Set(payload.revokedPermissions.filter((permission) => typeof permission === 'string' && permission)))
        : [];
      const layoutId = payload.id ?? `layout-${Date.now()}`;
      const timestamp = new Date().toISOString();
      const layout = {
        id: layoutId,
        name,
        description: typeof payload.description === 'string' ? payload.description.trim() : '',
        grantedPermissions,
        revokedPermissions,
        createdAt: payload.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      const existingLayouts = Array.isArray(state.featureLayouts) ? state.featureLayouts : [];
      const nextLayouts = existingLayouts.filter((existing) => existing?.id !== layoutId);
      nextLayouts.push(layout);
      return {
        ...state,
        featureLayouts: nextLayouts,
      };
    }
    case 'DELETE_FEATURE_LAYOUT': {
      const layoutId = action.payload?.id ?? action.payload;
      if (!layoutId) {
        return state;
      }
      const existingLayouts = Array.isArray(state.featureLayouts) ? state.featureLayouts : [];
      const nextLayouts = existingLayouts.filter((layout) => String(layout?.id) !== String(layoutId));
      if (nextLayouts.length === existingLayouts.length) {
        return state;
      }
      return {
        ...state,
        featureLayouts: nextLayouts,
      };
    }
    case 'SAVE_INVOICE_TEMPLATE': {
      const payload = action.payload ?? {};
      const scope = typeof payload.scope === 'string' ? payload.scope : null;
      const templateId = typeof payload.templateId === 'string' ? payload.templateId : DEFAULT_TEMPLATE_ID;
      if (!scope) {
        return state;
      }
      const baseConfig = cloneConfig(getInvoiceTemplateById(templateId)?.baseConfig ?? DEFAULT_INVOICE_TEMPLATE);
      const mergedConfig = sanitizeInvoiceTemplate({ ...baseConfig, ...(payload.customConfig ?? {}) });
      const overrides = computeTemplateOverrides(baseConfig, mergedConfig);
      const timestamp = payload.updatedAt ?? new Date().toISOString();
      const entry = {
        templateId,
        overrides,
        updatedAt: timestamp,
        updatedBy: payload.updatedBy ?? state.currentUser?.id ?? null,
      };
      const nextTemplates = {
        ...(state.invoiceTemplates ?? {}),
        [scope]: entry,
      };
      const nextState = {
        ...state,
        invoiceTemplates: nextTemplates,
      };
      const updatedInvoices = (state.invoices ?? []).map((invoice) => {
        const issuerId = invoice.issuedBy ?? invoice.issuedByUser?.id ?? state.currentUser?.id ?? null;
        const templateConfig = resolveInvoiceTemplateConfigForIssuer(nextState, issuerId);
        return applyInvoiceTemplateToInvoice(
          { ...invoice, companyName: nextState.companyName ?? 'Your Company' },
          templateConfig,
          nextState.companyName ?? 'Your Company',
        );
      });
      const logPayload = {
        actor: state.currentUser,
        actionType: 'SAVE_INVOICE_TEMPLATE',
        entity: {
          scope,
          templateId,
        },
      };
      return withLog(
        state,
        {
          ...nextState,
          invoices: updatedInvoices,
        },
        logPayload,
      );
    }
    case 'DELETE_INVOICE_TEMPLATE': {
      const scope = typeof action.payload === 'string' ? action.payload : null;
      if (!scope) {
        return state;
      }
      const nextTemplates = { ...(state.invoiceTemplates ?? {}) };
      if (!(scope in nextTemplates)) {
        return state;
      }
      delete nextTemplates[scope];
      const nextState = {
        ...state,
        invoiceTemplates: nextTemplates,
      };
      const updatedInvoices = (state.invoices ?? []).map((invoice) => {
        const issuerId = invoice.issuedBy ?? invoice.issuedByUser?.id ?? state.currentUser?.id ?? null;
        const templateConfig = resolveInvoiceTemplateConfigForIssuer(nextState, issuerId);
        return applyInvoiceTemplateToInvoice(
          { ...invoice, companyName: nextState.companyName ?? 'Your Company' },
          templateConfig,
          nextState.companyName ?? 'Your Company',
        );
      });
      return {
        ...nextState,
        invoices: updatedInvoices,
      };
    }
    case 'SAVE_PO_TEMPLATE': {
      const payload = action.payload ?? {};
      const scope = typeof payload.scope === 'string' ? payload.scope : null;
      const templateId = typeof payload.templateId === 'string' ? payload.templateId : DEFAULT_PO_TEMPLATE_ID;
      if (!scope) {
        return state;
      }
      const timestamp = payload.updatedAt ?? new Date().toISOString();
      const baseConfig = cloneConfig(getPurchaseOrderTemplateById(templateId)?.baseConfig ?? DEFAULT_PURCHASE_ORDER_TEMPLATE);
      const mergedConfig = sanitizePurchaseOrderTemplate({
        ...baseConfig,
        ...(payload.customConfig ?? {}),
      });
      const overrides = computePurchaseOrderTemplateOverrides(baseConfig, mergedConfig);
      const entry = {
        templateId,
        overrides,
        updatedAt: timestamp,
        updatedBy: payload.updatedBy ?? state.currentUser?.id ?? null,
      };
      const nextTemplates = {
        ...(state.purchaseOrderTemplates ?? {}),
        [scope]: entry,
      };
      return withLog(
        state,
        {
          ...state,
          purchaseOrderTemplates: nextTemplates,
        },
        {
          actor: state.currentUser,
          actionType: 'SAVE_PO_TEMPLATE',
          entity: {
            scope,
            templateId,
          },
        },
      );
    }
    case 'TOGGLE_MOBILE_MENU':
      return { ...state, mobileMenuOpen: !state.mobileMenuOpen };
    case 'SET_MOBILE_MENU':
      return { ...state, mobileMenuOpen: Boolean(action.payload) };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_AI_MODE':
      return { ...state, aiMode: action.payload };
    case 'SET_BOT_ANALYSIS':
      return { ...state, botAnalysis: action.payload ?? {} };
    case 'SET_SELECTED_COUNTRY':
      return { ...state, selectedCountry: action.payload };
    case 'SET_COMPANY_NAME': {
      const nextCompanyName = action.payload;
      const nextState = { ...state, companyName: nextCompanyName };
      const updatedInvoices = (state.invoices ?? []).map((invoice) => {
        const issuerId = invoice.issuedBy ?? invoice.issuedByUser?.id ?? state.currentUser?.id ?? null;
        const templateForInvoice = resolveInvoiceTemplateConfigForIssuer(nextState, issuerId);
        return applyInvoiceTemplateToInvoice(
          { ...invoice, companyName: nextCompanyName ?? invoice.companyName },
          templateForInvoice,
          nextCompanyName ?? 'Your Company',
        );
      });
      return {
        ...nextState,
        invoices: updatedInvoices,
      };
    }
    case 'SET_LOW_STOCK_THRESHOLD':
      return {
        ...state,
        lowStockThreshold: Number.isFinite(action.payload) ? action.payload : state.lowStockThreshold,
      };
    case 'SET_TASK_FILTER':
      return { ...state, taskFilter: action.payload ?? state.taskFilter };
    case 'CREATE_TASK': {
      const payload = action.payload ?? {};
      const taskInput = payload.task ?? null;
      const creatorId = Number(payload.creatorId);
      if (!taskInput || !Number.isFinite(creatorId)) {
        return state;
      }
      const timestamp = Number.isFinite(taskInput.id) ? taskInput.id : Date.now();
      const createdAt = taskInput.createdAt ?? new Date(timestamp).toISOString();
      const normalizedGoalTarget = Number.isFinite(Number(taskInput.goalTarget))
        ? Number(taskInput.goalTarget)
        : 0;
      const normalizedParticipantLimit = Number.isFinite(Number(taskInput.participantLimit))
        && Number(taskInput.participantLimit) > 0
        ? Number(taskInput.participantLimit)
        : 1;
      const normalizedMainTask = {
        ...taskInput,
        id: timestamp,
        createdAt,
        createdBy: creatorId,
        goalTarget: normalizedGoalTarget,
        participantLimit: normalizedParticipantLimit,
        branchId: taskInput.branchId ?? null,
        accuraBotEnabled: Boolean(taskInput.accuraBotEnabled),
        accuraBotReportFrequency: taskInput.accuraBotEnabled
          ? taskInput.accuraBotReportFrequency ?? 'weekly'
          : null,
        progress: 0,
        status: 'active',
        isSubTask: false,
        parentTaskId: null,
        lastNotifiedProgress: 0,
        participants: [creatorId],
      };
      const personalTask = createPersonalTask(normalizedMainTask, creatorId, state.users, timestamp + 1);
      return withLog(
        state,
        {
          ...state,
          tasks: [...state.tasks, normalizedMainTask, personalTask],
        },
        {
          actor: state.currentUser,
          actionType: 'CREATE_TASK',
          entity: {
            id: normalizedMainTask.id,
            title: normalizedMainTask.title ?? 'Task',
          },
        },
      );
    }
    case 'UPDATE_TASK': {
      const payload = action.payload ?? {};
      if (payload.id == null) {
        return state;
      }
      const index = state.tasks.findIndex((task) => task.id === payload.id);
      if (index === -1) {
        return state;
      }
      const existingTask = state.tasks[index];
      const updatedTask = {
        ...existingTask,
        ...payload,
      };
      let nextTasks = state.tasks.slice();
      if (!updatedTask.isSubTask) {
        const goalTarget = Number(updatedTask.goalTarget);
        const participantLimit = Number(updatedTask.participantLimit);
        updatedTask.goalTarget = Number.isFinite(goalTarget) ? goalTarget : existingTask.goalTarget;
        updatedTask.participantLimit = Number.isFinite(participantLimit) && participantLimit > 0
          ? participantLimit
          : existingTask.participantLimit;
        updatedTask.accuraBotEnabled = Boolean(updatedTask.accuraBotEnabled);
        updatedTask.accuraBotReportFrequency = updatedTask.accuraBotEnabled
          ? updatedTask.accuraBotReportFrequency ?? 'weekly'
          : null;
        if (!updatedTask.accuraBotEnabled) {
          updatedTask.lastNotifiedProgress = 0;
        }
      }
      nextTasks[index] = updatedTask;
      if (!updatedTask.isSubTask) {
        nextTasks = recalculatePersonalTargets(nextTasks, updatedTask);
      }
      const wasCompleted = String(existingTask.status ?? '').toLowerCase() === 'completed';
      const isCompleted = String(updatedTask.status ?? existingTask.status ?? '').toLowerCase() === 'completed';
      const logPayload = !wasCompleted && isCompleted
        ? {
          actor: state.currentUser,
          actionType: 'COMPLETE_TASK',
          entity: {
            id: updatedTask.id,
            title: updatedTask.title ?? existingTask.title ?? 'Task',
          },
        }
        : null;
      return withLog(
        state,
        {
          ...state,
          tasks: nextTasks,
        },
        logPayload,
      );
    }
    case 'DELETE_TASK': {
      const taskId = Number(action.payload);
      if (!Number.isFinite(taskId)) {
        return state;
      }
      const targetTask = state.tasks.find((task) => task.id === taskId);
      if (!targetTask) {
        return state;
      }
      let nextTasks = state.tasks.filter(
        (task) => task.id !== taskId && task.parentTaskId !== taskId,
      );
      if (targetTask.isSubTask && targetTask.parentTaskId != null) {
        const mainIndex = nextTasks.findIndex((task) => task.id === targetTask.parentTaskId);
        if (mainIndex !== -1) {
          const mainTask = { ...nextTasks[mainIndex] };
          if (Array.isArray(mainTask.participants)) {
            const participantId = Array.isArray(targetTask.participants) ? targetTask.participants[0] : null;
            if (participantId != null) {
              mainTask.participants = mainTask.participants.filter((id) => id !== participantId);
            }
          }
          nextTasks = [
            ...nextTasks.slice(0, mainIndex),
            mainTask,
            ...nextTasks.slice(mainIndex + 1),
          ];
        }
      }
      return {
        ...state,
        tasks: nextTasks,
      };
    }
    case 'JOIN_TASK': {
      const numericTaskId = Number(action.payload?.taskId);
      const numericUserId = Number(action.payload?.userId);
      if (!Number.isFinite(numericTaskId) || !Number.isFinite(numericUserId)) {
        return state;
      }
      const taskIndex = state.tasks.findIndex((task) => task.id === numericTaskId && !task.isSubTask);
      if (taskIndex === -1) {
        return state;
      }
      const mainTask = state.tasks[taskIndex];
      if (mainTask.participants.includes(numericUserId) || mainTask.participants.length >= mainTask.participantLimit) {
        return state;
      }
      const updatedMain = {
        ...mainTask,
        participants: [...mainTask.participants, numericUserId],
      };
      const timestamp = Date.now();
      const personalTask = createPersonalTask(updatedMain, numericUserId, state.users, timestamp);
      let nextTasks = state.tasks.slice();
      nextTasks[taskIndex] = updatedMain;
      nextTasks = [...nextTasks, personalTask];
      nextTasks = recalculatePersonalTargets(nextTasks, updatedMain);
      return {
        ...state,
        tasks: nextTasks,
      };
    }
    case 'ASSIGN_TASK_TO_BRANCH': {
      const numericTaskId = Number(action.payload?.taskId);
      const branchIdRaw = action.payload?.branchId;
      const normalizedBranchId = branchIdRaw == null ? null : Number(branchIdRaw);
      if (!Number.isFinite(numericTaskId)) {
        return state;
      }
      let changed = false;
      const nextTasks = state.tasks.map((task) => {
        if (task.id === numericTaskId) {
          changed = true;
          return { ...task, branchId: normalizedBranchId };
        }
        if (task.parentTaskId === numericTaskId) {
          changed = true;
          return { ...task, branchId: normalizedBranchId };
        }
        return task;
      });
      if (!changed) {
        return state;
      }
      return {
        ...state,
        tasks: nextTasks,
      };
    }


    case 'SET_QUICK_SALE_ACTIVE': {
      if (action.payload) {
        return { ...state, quickSale: { ...quickSaleInitialState, active: true } };
      }
      return { ...state, quickSale: { ...quickSaleInitialState } };
    }
    case 'UPDATE_QUICK_SALE':
      return {
        ...state,
        quickSale: { ...state.quickSale, ...(action.payload ?? {}) },
      };
    case 'ADD_PURCHASE_ORDER': {
      const purchaseOrder = action.payload;
      if (!purchaseOrder || purchaseOrder.id == null) {
        return state;
      }
      const supplierName = purchaseOrder.supplierName ?? purchaseOrder.vendorName ?? 'Supplier';
      const totalRaw = purchaseOrder.totalCost ?? purchaseOrder.total ?? 0;
      const totalNumber = Number(totalRaw);
      return withLog(
        state,
        {
          ...state,
          purchaseOrders: [
            ...state.purchaseOrders,
            { paymentStatus: 'Unpaid', ...purchaseOrder },
          ],
        },
        {
          actor: state.currentUser,
          actionType: 'ADD_PURCHASE_ORDER',
          entity: {
            id: purchaseOrder.id,
            supplierName,
            total: totalNumber,
          },
        },
      );
    }
    case 'UPDATE_PURCHASE_ORDER': {
      const purchaseOrder = action.payload;
      if (!purchaseOrder || purchaseOrder.id == null) {
        return state;
      }
      const existingOrder = state.purchaseOrders.find((entry) => entry.id === purchaseOrder.id);
      const supplierName =
        purchaseOrder.supplierName ?? existingOrder?.supplierName ?? purchaseOrder.vendorName ?? 'Supplier';
      const changes = {};
      if (existingOrder) {
        const prevTotal = Number(existingOrder.totalCost ?? existingOrder.total);
        const nextTotal = Number(purchaseOrder.totalCost ?? purchaseOrder.total);
        if (Number.isFinite(prevTotal) && Number.isFinite(nextTotal) && prevTotal !== nextTotal) {
          changes.total = { from: prevTotal, to: nextTotal };
        }
        if ((existingOrder.status ?? '').toLowerCase() !== (purchaseOrder.status ?? existingOrder?.status ?? '').toLowerCase()) {
          changes.status = { from: existingOrder.status ?? 'pending', to: purchaseOrder.status ?? existingOrder?.status ?? 'pending' };
        }
      }
      return withLog(
        state,
        {
          ...state,
          purchaseOrders: state.purchaseOrders.map((existing) => (
            existing.id === purchaseOrder.id
              ? {
                ...existing,
                ...purchaseOrder,
              }
              : existing
          )),
        },
        {
          actor: state.currentUser,
          actionType: 'UPDATE_PURCHASE_ORDER',
          entity: {
            id: purchaseOrder.id,
            supplierName,
          },
          changes,
        },
      );
    }
    case 'DELETE_PURCHASE_ORDER': {
      const purchaseOrderId = action.payload;
      if (purchaseOrderId == null) {
        return state;
      }
      const purchaseOrder = state.purchaseOrders.find((order) => order.id === purchaseOrderId);
      return withLog(
        state,
        {
          ...state,
          purchaseOrders: state.purchaseOrders.filter((order) => order.id !== purchaseOrderId),
        },
        purchaseOrder
          ? {
            actor: state.currentUser,
            actionType: 'DELETE_PURCHASE_ORDER',
            entity: {
              id: purchaseOrder.id,
              supplierName: purchaseOrder.supplierName ?? purchaseOrder.vendorName ?? 'Supplier',
            },
          }
          : null,
      );
    }
    case 'UPDATE_PO_PAYMENT_STATUS': {
      const { purchaseOrderId, paymentStatus } = action.payload ?? {};
      if (purchaseOrderId == null) {
        return state;
      }
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map((purchaseOrder) => (
          purchaseOrder.id === purchaseOrderId
            ? { ...purchaseOrder, paymentStatus: paymentStatus ?? purchaseOrder.paymentStatus ?? 'Unpaid' }
            : purchaseOrder
        )),
      };
    }
    case 'RECEIVE_PURCHASE_ORDER': {
      const rawPayload = action.payload;
      let purchaseOrderId = null;
      if (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
        purchaseOrderId = rawPayload.purchaseOrderId ?? rawPayload.id ?? rawPayload.orderId ?? null;
      } else {
        purchaseOrderId = rawPayload;
      }
      if (purchaseOrderId == null) {
        return state;
      }
      const targetOrder = state.purchaseOrders.find((order) => order.id === purchaseOrderId);
      if (!targetOrder || String(targetOrder.status ?? '').toLowerCase() === 'received') {
        return state;
      }

      const updatedProducts = state.products.map((product) => {
        const relevantItems = (targetOrder.items ?? []).filter((item) => item?.productId === product.id);
        if (!relevantItems.length) {
          return product;
        }
        const additionalStock = relevantItems.reduce((sum, item) => {
          const quantity = Number(item?.quantity) || 0;
          const conversion = Number(item?.conversion) || 1;
          return sum + quantity * conversion;
        }, 0);
        if (additionalStock <= 0) {
          return product;
        }
        const currentStock = Number(product.stock) || 0;
        return {
          ...product,
          stock: currentStock + additionalStock,
        };
      });

      const updatedPurchaseOrders = state.purchaseOrders.map((order) => (
        order.id === purchaseOrderId
          ? {
            ...order,
            status: 'Received',
            receivedAt: new Date().toISOString(),
            paymentStatus: order.paymentStatus ?? 'Unpaid',
          }
          : order
      ));
      const receiptBatches = Array.isArray(rawPayload?.batches) ? rawPayload.batches : [];
      const resolvedReceivedAt = rawPayload?.receivedAt ?? new Date().toISOString();
      const newBatches = [];
      const newMovements = [];
      if (receiptBatches.length) {
        receiptBatches.forEach((entry) => {
          if (!entry || entry.quantity == null || !entry.productId) {
            return;
          }
          const quantity = Number(entry.quantity);
          if (!Number.isFinite(quantity) || quantity <= 0) {
            return;
          }
          const batch = createStockBatch(
            {
              productId: entry.productId,
              quantity,
              expiryDate: entry.expiryDate,
              lotNumber: entry.lotNumber,
              vanId: entry.vanId ?? rawPayload?.vanId ?? null,
              receivedAt: resolvedReceivedAt,
              notes: entry.notes,
            },
            { nearExpiryDays: state.nearExpiryDays },
          );
          newBatches.push(batch);
          newMovements.push(createStockMovement({
            batchId: batch.id,
            type: 'load_van',
            quantityChange: quantity,
            referenceType: 'purchase_order',
            referenceId: purchaseOrderId,
            createdBy: state.currentUser?.id ?? null,
            notes: entry.notes ?? null,
          }));
        });
      }

      const receivedOrder = updatedPurchaseOrders.find((order) => order.id === purchaseOrderId) ?? targetOrder;
      const poJournalEntry = buildPurchaseOrderJournalEntry(receivedOrder);
      const nextJournal = poJournalEntry
        ? replaceJournalEntries(state.journal, [poJournalEntry])
        : state.journal;

      return withLog(
        state,
        {
          ...state,
          products: updatedProducts,
          purchaseOrders: updatedPurchaseOrders,
          stockBatches: newBatches.length ? [...(state.stockBatches ?? []), ...newBatches] : state.stockBatches,
          stockMovements: newMovements.length ? [...(state.stockMovements ?? []), ...newMovements] : state.stockMovements,
          journal: nextJournal,
        },
        {
          actor: state.currentUser,
          actionType: 'RECEIVE_PURCHASE_ORDER',
          entity: {
            id: receivedOrder?.id ?? purchaseOrderId,
            supplierName: receivedOrder?.supplierName ?? targetOrder?.supplierName ?? 'Supplier',
          },
          changes: newBatches.length
            ? {
              batchesReceived: newBatches.map((batch) => ({
                id: batch.id,
                productId: batch.productId,
                vanId: batch.vanId,
                expiryDate: batch.expiryDate,
                quantity: batch.quantity,
                status: batch.status,
              })),
            }
            : undefined,
        },
      );
    }
    case 'RECORD_PO_PAYMENT': {
      const { purchaseOrderId, paymentDate, paymentAccountCode } = action.payload ?? {};
      if (purchaseOrderId == null) {
        return state;
      }
      const targetOrder = state.purchaseOrders.find((order) => order.id === purchaseOrderId);
      if (!targetOrder || String(targetOrder.paymentStatus ?? 'unpaid').toLowerCase() === 'paid') {
        return state;
      }
      const resolvedDate = paymentDate ?? new Date().toISOString().slice(0, 10);
      const updatedPurchaseOrders = state.purchaseOrders.map((order) => (
        order.id === purchaseOrderId
          ? {
            ...order,
            paymentStatus: 'Paid',
            paidAt: resolvedDate,
          }
          : order
      ));
      const paidOrder = updatedPurchaseOrders.find((order) => order.id === purchaseOrderId) ?? targetOrder;
      const paymentAccount = String(paymentAccountCode ?? '').trim() || '1110';
      const poPaymentEntry = buildPurchaseOrderPaymentJournalEntry(paidOrder, resolvedDate, paymentAccount);
      const nextJournal = poPaymentEntry
        ? replaceJournalEntries(state.journal, [poPaymentEntry])
        : state.journal;
      const paymentAmountRaw = action.payload?.paymentAmount ?? paidOrder?.totalCost ?? paidOrder?.total ?? 0;
      const paymentAmountNumber = Number(paymentAmountRaw);

      return withLog(
        state,
        {
          ...state,
          purchaseOrders: updatedPurchaseOrders,
          journal: nextJournal,
        },
        {
          actor: state.currentUser,
          actionType: 'RECORD_PO_PAYMENT',
          entity: {
            id: paidOrder?.id ?? purchaseOrderId,
            supplierName: paidOrder?.supplierName ?? 'Supplier',
            amount: paymentAmountNumber,
            paymentAccount,
          },
        },
      );
    }
    case 'FINALIZE_QUICK_SALE':
      return {
        ...state,
        quickSale: { ...quickSaleInitialState },
      };
    case 'ADD_ACCOUNT': {
      const account = action.payload;
      if (!account || !account.code) {
        return state;
      }
      const normalizedCode = String(account.code).trim();
      if (!normalizedCode) {
        return state;
      }
      const existingIndex = state.chartOfAccounts.findIndex((item) => item.code === normalizedCode);
      let nextAccounts;
      if (existingIndex >= 0) {
        nextAccounts = state.chartOfAccounts.map((item, index) => (index === existingIndex ? { ...item, ...account, code: normalizedCode } : item));
      } else {
        nextAccounts = [...state.chartOfAccounts, { ...account, code: normalizedCode }];
      }
      nextAccounts.sort((a, b) => a.code.localeCompare(b.code));
      return {
        ...state,
        chartOfAccounts: nextAccounts,
      };
    }
    case 'UPDATE_ACCOUNT': {
      const account = action.payload;
      if (!account || !account.code) {
        return state;
      }
      const normalizedCode = String(account.code).trim();
      if (!normalizedCode) {
        return state;
      }
      const existingIndex = state.chartOfAccounts.findIndex((item) => item.code === normalizedCode);
      if (existingIndex === -1) {
        return state;
      }
      const nextAccounts = state.chartOfAccounts
        .map((item, index) => (index === existingIndex ? { ...item, ...account, code: normalizedCode } : item))
        .sort((a, b) => a.code.localeCompare(b.code));
      return {
        ...state,
        chartOfAccounts: nextAccounts,
      };
    }
    case 'DELETE_ACCOUNT': {
      const accountCode = typeof action.payload === 'string' ? action.payload : null;
      if (!accountCode) {
        return state;
      }
      const nextAccounts = state.chartOfAccounts.filter((item) => item.code !== accountCode);
      if (nextAccounts.length === state.chartOfAccounts.length) {
        return state;
      }
      return {
        ...state,
        chartOfAccounts: nextAccounts,
      };
    }
    case 'ADD_PRODUCT': {
      const newProduct = action.payload;
      if (!newProduct) {
        return state;
      }
      const categories = newProduct.category && !state.categories.includes(newProduct.category)
        ? [...state.categories, newProduct.category]
        : state.categories;
      return withLog(
        state,
        {
          ...state,
          products: [...state.products, newProduct],
          categories,
        },
        {
          actor: state.currentUser,
          actionType: 'ADD_PRODUCT',
          entity: {
            id: newProduct?.id ?? null,
            name: newProduct?.name ?? 'Product',
            sku: newProduct?.sku ?? null,
          },
        },
      );
    }
    case 'UPDATE_PRODUCT': {
      const updatedProduct = action.payload;
      if (!updatedProduct) {
        return state;
      }
      const existingProduct = state.products.find((product) => product.id === updatedProduct.id);
      if (!existingProduct) {
        return state;
      }
      const categories = updatedProduct.category && !state.categories.includes(updatedProduct.category)
        ? [...state.categories, updatedProduct.category]
        : state.categories;
      const nextProducts = state.products.map((product) => (product.id === updatedProduct.id ? updatedProduct : product));
      const changes = {};
      if ((existingProduct.category ?? '') !== (updatedProduct.category ?? existingProduct.category ?? '')) {
        changes.category = { from: existingProduct.category ?? 'Uncategorized', to: updatedProduct.category ?? 'Uncategorized' };
      }
      const prevStock = Number(existingProduct.stock);
      const nextStock = Number(updatedProduct.stock);
      if (Number.isFinite(prevStock) && Number.isFinite(nextStock) && prevStock !== nextStock) {
        changes.stock = { from: prevStock, to: nextStock };
      }
      const prevPrice = Number(existingProduct.price ?? existingProduct.sellingPrice ?? existingProduct.unitPrice);
      const nextPrice = Number(updatedProduct.price ?? updatedProduct.sellingPrice ?? updatedProduct.unitPrice);
      if (Number.isFinite(prevPrice) && Number.isFinite(nextPrice) && prevPrice !== nextPrice) {
        changes.price = { from: prevPrice, to: nextPrice };
      }
      return withLog(
        state,
        {
          ...state,
          products: nextProducts,
          categories,
        },
        {
          actor: state.currentUser,
          actionType: 'UPDATE_PRODUCT',
          entity: {
            id: updatedProduct?.id ?? existingProduct?.id ?? null,
            name: updatedProduct?.name ?? existingProduct?.name ?? 'Product',
            sku: updatedProduct?.sku ?? existingProduct?.sku ?? null,
          },
          changes,
        },
      );
    }
    case 'DELETE_PRODUCT': {
      const productId = action.payload;
      const productToRemove = state.products.find((product) => product.id === productId);
      return withLog(
        state,
        {
          ...state,
          products: state.products.filter((product) => product.id !== productId),
        },
        productToRemove
          ? {
            actor: state.currentUser,
            actionType: 'DELETE_PRODUCT',
            entity: {
              id: productToRemove.id,
              name: productToRemove.name ?? 'Product',
              sku: productToRemove.sku ?? null,
            },
          }
          : null,
      );
    }
    case 'ADD_STOCK_BATCH': {
      const batchPayload = action.payload;
      if (!batchPayload || !batchPayload.productId) {
        return state;
      }
      const newBatch = createStockBatch(batchPayload, { nearExpiryDays: state.nearExpiryDays });
      const product = state.products.find((p) => p.id === newBatch.productId);
      return withLog(
        state,
        {
          ...state,
          stockBatches: [...(state.stockBatches ?? []), newBatch],
        },
        {
          actor: state.currentUser,
          actionType: 'ADD_STOCK_BATCH',
          entity: {
            id: newBatch.id,
            productId: newBatch.productId,
            productName: product?.name ?? 'Product',
            vanId: newBatch.vanId,
          },
          changes: {
            quantity: { from: 0, to: newBatch.quantity },
            expiryDate: newBatch.expiryDate,
            status: newBatch.status,
          },
        },
      );
    }
    case 'UPDATE_STOCK_BATCH': {
      const updates = action.payload ?? {};
      const batchId = updates.id ?? updates.batchId;
      if (!batchId) {
        return state;
      }
      const existingBatch = (state.stockBatches ?? []).find((batch) => batch.id === batchId);
      if (!existingBatch) {
        return state;
      }
      const nextBatch = updateStockBatch(existingBatch, updates, { nearExpiryDays: state.nearExpiryDays });
      const nextBatches = state.stockBatches.map((batch) => (batch.id === batchId ? nextBatch : batch));
      const product = state.products.find((p) => p.id === nextBatch.productId);
      const changes = {};
      if (existingBatch.quantity !== nextBatch.quantity) {
        changes.quantity = { from: existingBatch.quantity, to: nextBatch.quantity };
      }
      if (existingBatch.status !== nextBatch.status) {
        changes.status = { from: existingBatch.status, to: nextBatch.status };
      }
      if (existingBatch.expiryDate !== nextBatch.expiryDate) {
        changes.expiryDate = { from: existingBatch.expiryDate, to: nextBatch.expiryDate };
      }
      const logPayload = Object.keys(changes).length
        ? {
          actor: state.currentUser,
          actionType: 'UPDATE_STOCK_BATCH',
          entity: {
            id: nextBatch.id,
            productId: nextBatch.productId,
            productName: product?.name ?? 'Product',
            vanId: nextBatch.vanId,
          },
          changes,
        }
        : null;
      return withLog(
        state,
        {
          ...state,
          stockBatches: nextBatches,
        },
        logPayload,
      );
    }
    case 'ADD_STOCK_MOVEMENT': {
      const movement = createStockMovement(action.payload);
      return withLog(
        state,
        {
          ...state,
          stockMovements: [...(state.stockMovements ?? []), movement],
        },
        {
          actor: state.currentUser,
          actionType: 'ADD_STOCK_MOVEMENT',
          entity: {
            id: movement.id,
            batchId: movement.batchId,
            type: movement.type,
          },
          changes: {
            quantityChange: movement.quantityChange,
          },
        },
      );
    }
    case 'SET_NEAR_EXPIRY_WINDOW': {
      const days = Number(action.payload);
      if (!Number.isFinite(days) || days <= 0) {
        return state;
      }
      return withLog(
        state,
        {
          ...state,
          nearExpiryDays: days,
        },
        {
          actor: state.currentUser,
          actionType: 'SET_NEAR_EXPIRY_WINDOW',
          entity: { nearExpiryDays: days },
        },
      );
    }
    case 'RECOMPUTE_BATCH_STATUSES': {
      const batches = state.stockBatches ?? [];
      if (!batches.length) {
        return state;
      }
      const todayValue = action.payload?.today ?? new Date();
      const today = todayValue instanceof Date ? todayValue : new Date(todayValue);
      const nextBatches = batches.map((batch) => {
        if (!batch) return batch;
        const nextStatus = computeBatchStatus(batch.expiryDate, batch.status, state.nearExpiryDays, today);
        if (nextStatus === batch.status) {
          return batch;
        }
        return { ...batch, status: nextStatus };
      });
      const changes = summarizeBatchStatusChanges(batches, nextBatches);
      if (!changes.length) {
        return state;
      }
      return withLog(
        state,
        {
          ...state,
          stockBatches: nextBatches,
        },
        {
          actor: state.currentUser ?? { id: 'system', name: 'System' },
          actionType: 'RECOMPUTE_BATCH_STATUSES',
          entity: { updated: changes.length },
          changes: { batches: changes },
        },
      );
    }
    case 'ADD_CUSTOMER': {
      const newCustomer = action.payload;
      if (!newCustomer) {
        return state;
      }
      return withLog(
        state,
        {
          ...state,
          customers: [...state.customers, newCustomer],
        },
        {
          actor: state.currentUser,
          actionType: 'ADD_CUSTOMER',
          entity: {
            id: newCustomer?.id ?? null,
            name: newCustomer?.name ?? newCustomer?.companyName ?? 'Customer',
          },
        },
      );
    }
    case 'UPDATE_CUSTOMER': {
      const updatedCustomer = action.payload;
      if (!updatedCustomer) {
        return state;
      }
      const existingCustomer = state.customers.find((customer) => customer.id === updatedCustomer.id);
      if (!existingCustomer) {
        return state;
      }
      const nextCustomers = state.customers.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer));
      const changes = {};
      if ((existingCustomer.email ?? '') !== (updatedCustomer.email ?? existingCustomer.email ?? '')) {
        changes.email = { from: existingCustomer.email ?? 'N/A', to: updatedCustomer.email ?? 'N/A' };
      }
      if ((existingCustomer.phone ?? '') !== (updatedCustomer.phone ?? existingCustomer.phone ?? '')) {
        changes.phone = { from: existingCustomer.phone ?? 'N/A', to: updatedCustomer.phone ?? 'N/A' };
      }
      return withLog(
        state,
        {
          ...state,
          customers: nextCustomers,
        },
        {
          actor: state.currentUser,
          actionType: 'UPDATE_CUSTOMER',
          entity: {
            id: updatedCustomer?.id ?? existingCustomer?.id ?? null,
            name: updatedCustomer?.name ?? updatedCustomer?.companyName ?? existingCustomer?.name ?? 'Customer',
          },
          changes,
        },
      );
    }
    case 'DELETE_CUSTOMER': {
      const customerId = action.payload;
      const customer = state.customers.find((entry) => entry.id === customerId);
      return withLog(
        state,
        {
          ...state,
          customers: state.customers.filter((entry) => entry.id !== customerId),
        },
        customer
          ? {
            actor: state.currentUser,
            actionType: 'DELETE_CUSTOMER',
            entity: {
              id: customer.id,
              name: customer.name ?? customer.companyName ?? 'Customer',
            },
          }
          : null,
      );
    }
    case 'ADD_INVOICE':
      return {
        ...state,
        invoices: [...state.invoices, action.payload],
      };
    case 'UPDATE_INVOICE': {
      const updatedInvoice = action.payload;
      const previousInvoice = state.invoices.find((invoice) => invoice.id === updatedInvoice?.id);
      const statusChanged =
        previousInvoice &&
        updatedInvoice?.status &&
        String(updatedInvoice.status).toLowerCase() !== String(previousInvoice.status ?? '').toLowerCase();
      const baseState = {
        ...state,
        invoices: state.invoices.map((invoice) => (invoice.id === updatedInvoice.id ? { ...invoice, ...updatedInvoice } : invoice)),
      };
      const logPayload = statusChanged
        ? {
          actor: state.currentUser,
          actionType: 'UPDATE_INVOICE_STATUS',
          entity: {
            id: updatedInvoice?.id ?? previousInvoice?.id ?? null,
            invoiceNumber: updatedInvoice?.invoiceNumber ?? previousInvoice?.invoiceNumber ?? updatedInvoice?.id,
            status: updatedInvoice?.status,
          },
          changes: {
            status: {
              from: previousInvoice?.status ?? 'unknown',
              to: updatedInvoice?.status ?? 'unknown',
            },
          },
        }
        : null;
      return withLog(state, baseState, logPayload);
    }
    case 'DELETE_INVOICE': {
      const invoiceId = action.payload;
      const invoice = state.invoices.find((entry) => entry.id === invoiceId);
      return withLog(
        state,
        {
          ...state,
          invoices: state.invoices.filter((entry) => entry.id !== invoiceId),
        },
        invoice
          ? {
            actor: state.currentUser,
            actionType: 'DELETE_INVOICE',
            entity: {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber ?? invoice.id,
              status: invoice.status ?? 'Unknown',
            },
          }
          : null,
      );
    }
    case 'ADD_EXPENSE': {
      const newExpense = action.payload;
      if (!newExpense) {
        return state;
      }
      const categories = newExpense?.category && !state.expenseCategories.includes(newExpense.category)
        ? [...state.expenseCategories, newExpense.category]
        : state.expenseCategories;
      const expenseInvoice = createInvoiceFromExpense(newExpense, state);
      const expenseJournalEntry = buildExpenseJournalEntry(newExpense);
      const journal = expenseJournalEntry
        ? replaceJournalEntries(state.journal, [expenseJournalEntry])
        : state.journal;
      return withLog(
        state,
        {
          ...state,
          expenses: [...state.expenses, newExpense],
          expenseCategories: categories,
          invoices: expenseInvoice ? [...state.invoices, expenseInvoice] : state.invoices,
          journal,
        },
        {
          actor: state.currentUser,
          actionType: 'CREATE_EXPENSE',
          entity: {
            id: newExpense?.id ?? null,
            description: newExpense?.description ?? 'Expense',
            category: newExpense?.category ?? 'Uncategorized',
            amount: Number(newExpense?.amount ?? 0),
          },
        },
      );
    }
    case 'UPDATE_EXPENSE': {
      const updatedExpense = action.payload;
      if (!updatedExpense) {
        return state;
      }
      const existingExpense = state.expenses.find((expense) => expense.id === updatedExpense.id);
      if (!existingExpense) {
        return state;
      }
      const categories = updatedExpense?.category && !state.expenseCategories.includes(updatedExpense.category)
        ? [...state.expenseCategories, updatedExpense.category]
        : state.expenseCategories;
      const expenseJournalEntry = buildExpenseJournalEntry(updatedExpense);
      const reference = `expense:${updatedExpense?.id}`;
      const journal = expenseJournalEntry
        ? replaceJournalEntries(state.journal, [expenseJournalEntry])
        : removeJournalEntriesByReference(state.journal, [reference]);
      const changes = {};
      const prevAmount = Number(existingExpense.amount);
      const nextAmount = Number(updatedExpense.amount);
      if (Number.isFinite(prevAmount) && Number.isFinite(nextAmount) && prevAmount !== nextAmount) {
        changes.amount = { from: prevAmount, to: nextAmount };
      }
      if ((existingExpense.category ?? '') !== (updatedExpense.category ?? existingExpense.category ?? '')) {
        changes.category = { from: existingExpense.category ?? 'Uncategorized', to: updatedExpense.category ?? 'Uncategorized' };
      }
      return withLog(
        state,
        {
          ...state,
          expenses: state.expenses.map((expense) => (expense.id === updatedExpense.id ? updatedExpense : expense)),
          expenseCategories: categories,
          journal,
        },
        {
          actor: state.currentUser,
          actionType: 'UPDATE_EXPENSE',
          entity: {
            id: updatedExpense?.id ?? null,
            description: updatedExpense?.description ?? existingExpense.description ?? 'Expense',
            category: updatedExpense?.category ?? 'Uncategorized',
          },
          changes,
        },
      );
    }
    case 'DELETE_EXPENSE': {
      const expenseId = action.payload;
      const expense = state.expenses.find((entry) => entry.id === expenseId);
      return withLog(
        state,
        {
          ...state,
          expenses: state.expenses.filter((entry) => entry.id !== expenseId),
          journal: removeJournalEntriesByReference(state.journal, [`expense:${expenseId}`]),
        },
        expense
          ? {
            actor: state.currentUser,
            actionType: 'DELETE_EXPENSE',
            entity: {
              id: expense.id,
              description: expense.description ?? 'Expense',
              category: expense.category ?? 'Uncategorized',
              amount: Number(expense.amount ?? 0),
            },
          }
          : null,
      );
    }
    case 'ADD_SALE': {
      const { sale } = action.payload ?? {};
      if (!sale) {
        return state;
      }
      const saleLocationId = sale.vanId ?? sale.branchId ?? state.currentBranchId ?? null;
      const stockConsumption = consumeStockForSale(state.stockBatches ?? [], sale, { vanId: saleLocationId });
      const nextStockBatches = stockConsumption.changed ? stockConsumption.batches : state.stockBatches;
      const nextStockMovements = stockConsumption.movements.length
        ? [...(state.stockMovements ?? []), ...stockConsumption.movements]
        : state.stockMovements;
      const providedProducts = Array.isArray(action.payload?.updatedProducts) ? action.payload.updatedProducts : null;
      const saleReduction = providedProducts
        ? { products: providedProducts, changed: true, impacted: [] }
        : applySaleReduction(state.products, sale);
      const nextProducts = saleReduction.products ?? state.products;
      const saleInvoice = createInvoiceFromSale(sale, state);
      const { tasks: nextTasks, notifications: taskNotifications } = applySaleToTasks(state, sale);
      const journalEntries = buildSaleJournalEntries(sale, { products: state.products, customers: state.customers });
      const journal = journalEntries.length
        ? replaceJournalEntries(state.journal, journalEntries)
        : state.journal;
      const notifications = taskNotifications.length
        ? [...state.notifications, ...taskNotifications.map(ensureNotificationId)]
        : state.notifications;
      let nextMessages = state.messages;
      const salespersonId = Number(sale.salesPersonId ?? sale.salespersonId);
      if (Number.isFinite(salespersonId)) {
        const baseLowStock = computeLowStockItems(nextProducts, state.lowStockThreshold);
        const impactedIds = new Set((saleReduction.impacted ?? []).map((item) => item.productId));
        let relevantItems = baseLowStock;
        if (impactedIds.size > 0) {
          relevantItems = baseLowStock.filter((item) => impactedIds.has(Number(item.productId ?? item.id)));
        }
        if (!relevantItems.length && impactedIds.size > 0) {
          relevantItems = baseLowStock;
        }
        if (relevantItems.length > 0) {
          const alertState = {
            ...state,
            messages: nextMessages,
            products: nextProducts,
          };
          const saleHistoryAction = sale.id != null
            ? `Low stock detected after sale #${sale.id}`
            : 'Low stock detected after new sale';
          const alertResult = upsertLowStockAlert(alertState, salespersonId, relevantItems, {
            trigger: 'sale',
            saleId: sale.id ?? null,
            actorId: salespersonId,
            historyAction: saleHistoryAction,
          });
          if (alertResult.changed) {
            nextMessages = alertResult.messages;
          }
        }
      }
      const saleType = String(sale.saleType ?? sale.sale_type ?? 'Sale');
      const saleTotalNumber = Number(sale.total ?? sale.amount ?? sale.grandTotal ?? 0);
      const logChanges = {};
      if (saleReduction.impacted?.length) {
        logChanges.inventory = saleReduction.impacted;
      }
      if (stockConsumption.movements.length) {
        logChanges.stockBatches = stockConsumption.movements.map((movement) => ({
          batchId: movement.batchId,
          quantityChange: movement.quantityChange,
        }));
      }
      if (stockConsumption.shortages.length) {
        logChanges.stockShortages = stockConsumption.shortages;
      }
      return withLog(
        state,
        {
          ...state,
          sales: [...state.sales, sale],
          products: nextProducts,
          invoices: saleInvoice ? [...state.invoices, saleInvoice] : state.invoices,
          tasks: nextTasks,
          notifications,
          journal,
          messages: nextMessages,
          stockBatches: nextStockBatches,
          stockMovements: nextStockMovements,
        },
        {
          actor: state.currentUser,
          actionType: 'ADD_SALE',
          entity: {
            id: sale.id ?? sale.saleId ?? null,
            saleType,
            total: saleTotalNumber,
          },
          changes: Object.keys(logChanges).length ? logChanges : undefined,
        },
      );
    }
    case 'UPDATE_SALE': {
      const updatedSale = action.payload;
      const journalEntries = buildSaleJournalEntries(updatedSale, { products: state.products, customers: state.customers });
      const referencesToRemove = [`sale:${updatedSale?.id}:revenue`, `sale:${updatedSale?.id}:cogs`];
      let journal = removeJournalEntriesByReference(state.journal, referencesToRemove);
      if (journalEntries.length) {
        journal = replaceJournalEntries(journal, journalEntries);
      }
      const existingSale = state.sales.find((sale) => sale.id === updatedSale?.id);
      if (!existingSale) {
        return state;
      }
      const customerId = updatedSale?.customerId ?? existingSale?.customerId ?? updatedSale?.customer?.id ?? null;
      const customer =
        customerId != null ? state.customers.find((candidate) => candidate.id === customerId) : null;
      const customerName =
        customer?.name ??
        updatedSale?.customerName ??
        updatedSale?.customer?.name ??
        existingSale?.customerName ??
        existingSale?.customer?.name ??
        'Unknown Customer';
      const changes = {};
      const prevTotal = Number(existingSale.total ?? existingSale.amount ?? existingSale.grandTotal);
      const nextTotal = Number(updatedSale.total ?? updatedSale.amount ?? updatedSale.grandTotal);
      if (Number.isFinite(prevTotal) && Number.isFinite(nextTotal) && prevTotal !== nextTotal) {
        changes.total = { from: prevTotal, to: nextTotal };
      }
      const prevType = String(existingSale.saleType ?? existingSale.sale_type ?? '').toLowerCase();
      const nextTypeRaw = String(updatedSale.saleType ?? updatedSale.sale_type ?? prevType ?? 'sale');
      if (prevType && nextTypeRaw && prevType !== nextTypeRaw.toLowerCase()) {
        changes.saleType = {
          from: existingSale.saleType ?? existingSale.sale_type ?? 'Sale',
          to: updatedSale.saleType ?? updatedSale.sale_type ?? 'Sale',
        };
      }
      return withLog(
        state,
        {
          ...state,
          sales: state.sales.map((sale) => (sale.id === updatedSale.id ? { ...sale, ...updatedSale } : sale)),
          journal,
        },
        {
          actor: state.currentUser,
          actionType: 'UPDATE_SALE',
          entity: {
            id: updatedSale?.id ?? existingSale?.id ?? null,
            saleType: updatedSale.saleType ?? updatedSale.sale_type ?? existingSale.saleType ?? 'Sale',
            total: nextTotal,
          },
          changes,
        },
      );
    }
    case 'DELETE_SALE': {
      const saleId = action.payload;
      const sale = state.sales.find((entry) => entry.id === saleId);
      const customer = sale ? state.customers.find((candidate) => candidate.id === sale.customerId) : null;
      const references = [`sale:${saleId}:revenue`, `sale:${saleId}:cogs`];
      return withLog(
        state,
        {
          ...state,
          sales: state.sales.filter((entry) => entry.id !== saleId),
          journal: removeJournalEntriesByReference(state.journal, references),
        },
        sale
          ? {
            actor: state.currentUser,
            actionType: 'DELETE_SALE',
            entity: {
              id: sale.id,
              customerName: customer?.name ?? sale.customerName ?? 'Unknown Customer',
              total: Number(sale.total ?? sale.amount ?? sale.grandTotal ?? 0),
            },
          }
          : null,
      );
    }

    case 'CREATE_JOURNAL_ENTRY': {
      try {
        const entry = buildManualJournalEntry(action.payload ?? {});
        return {
          ...state,
          journal: replaceJournalEntries(state.journal, [entry]),
        };
      } catch (error) {
        console.error('Failed to create journal entry', error);
        return state;
      }
    }
    case 'DELETE_JOURNAL_ENTRY': {
      const target = action.payload;
      if (target == null) {
        return state;
      }

      // Simple deletion for string/number ID (backwards compatibility)
      if (typeof target === 'string' || typeof target === 'number') {
        return {
          ...state,
          journal: state.journal.filter((entry) => entry.id !== target && entry.reference !== target),
        };
      }

      // Get the entry to delete
      const { id: entryId, reference, metadata } = target;
      const entryToDelete = state.journal.find((entry) =>
        (entryId != null && entry.id === entryId) ||
        (reference != null && entry.reference === reference)
      );

      if (!entryToDelete) {
        return state;
      }

      let nextState = { ...state };
      const logs = [];
      const timestamp = new Date().toISOString();
      const userName = state.currentUser?.name || 'User';

      // Create base log for journal entry deletion
      logs.push(createLogEntry({
        actor: { id: state.currentUser?.id || null, name: userName },
        actionType: 'DELETE_JOURNAL',
        entity: {
          id: entryToDelete.id,
          date: entryToDelete.date,
          reference: entryToDelete.reference,
          description: entryToDelete.description,
        },
        message: `Journal entry deleted: ${entryToDelete.description || 'Untitled'}`,
      }));

      // Handle reversal based on entry source
      const source = metadata?.source || entryToDelete?.metadata?.source;
      const saleId = metadata?.saleId || entryToDelete?.metadata?.saleId;
      const expenseId = metadata?.expenseId || entryToDelete?.metadata?.expenseId;
      const purchaseOrderId = metadata?.purchaseOrderId || entryToDelete?.metadata?.purchaseOrderId;

      // Reverse SALE entry
      if (source === 'sale' && saleId) {
        const sale = state.sales.find((s) => s.id === saleId);
        if (sale) {
          // Restore product inventory
          const updatedProducts = state.products.map((product) => {
            const saleItem = (sale.items || []).find((item) => item.productId === product.id);
            if (!saleItem) {
              return product;
            }

            const baseQuantity = getSaleItemBaseQuantity(saleItem);
            if (baseQuantity <= 0) {
              return product;
            }

            const currentStock = Number(product.stock) || 0;
            const restoredStock = currentStock + baseQuantity;

            // Log inventory restoration
            logs.push(createLogEntry({
              actor: { id: state.currentUser?.id || null, name: userName },
              actionType: 'UPDATE_PRODUCT',
              entity: {
                name: product.name,
                id: product.id,
              },
              changes: {
                stock: { from: currentStock, to: restoredStock },
              },
              message: `Inventory restored for "${product.name}": +${baseQuantity} units (Sale #${saleId} reversed)`,
            }));

            return {
              ...product,
              stock: restoredStock,
            };
          });

          nextState.products = updatedProducts;

          // Delete the sale
          nextState.sales = state.sales.filter((s) => s.id !== saleId);

          // Log sale reversal
          logs.push(createLogEntry({
            actor: { id: state.currentUser?.id || null, name: userName },
            actionType: 'DELETE_SALE',
            entity: {
              id: saleId,
              customerName: sale.customer?.name || 'Customer',
            },
            message: `Sale #${saleId} reversed due to journal entry deletion`,
          }));
        } else {
          logs.push(createLogEntry({
            actor: { id: state.currentUser?.id || null, name: userName },
            actionType: 'DELETE_JOURNAL',
            entity: { id: saleId },
            message: `Warning: Sale #${saleId} not found for reversal (already deleted or missing)`,
          }));
        }
      }

      // Reverse EXPENSE entry
      if (source === 'expense' && expenseId) {
        const expense = state.expenses.find((e) => e.id === expenseId);
        if (expense) {
          // Delete the expense
          nextState.expenses = state.expenses.filter((e) => e.id !== expenseId);

          // Log expense reversal
          logs.push(createLogEntry({
            actor: { id: state.currentUser?.id || null, name: userName },
            actionType: 'DELETE_EXPENSE',
            entity: {
              id: expenseId,
              description: expense.description || 'Untitled',
            },
            message: `Expense #${expenseId} reversed due to journal entry deletion`,
          }));
        } else {
          logs.push(createLogEntry({
            actor: { id: state.currentUser?.id || null, name: userName },
            actionType: 'DELETE_JOURNAL',
            entity: { id: expenseId },
            message: `Warning: Expense #${expenseId} not found for reversal (already deleted or missing)`,
          }));
        }
      }

      // Reverse PURCHASE ORDER entry
      if ((source === 'purchase-order' || source === 'purchase-order-payment') && purchaseOrderId) {
        logs.push(createLogEntry({
          actor: { id: state.currentUser?.id || null, name: userName },
          actionType: 'DELETE_JOURNAL',
          entity: { id: purchaseOrderId },
          message: `Purchase order #${purchaseOrderId} journal entry reversed${source === 'purchase-order-payment' ? ' (payment)' : ''}`,
        }));

        // Note: We don't automatically delete PO or reduce inventory since
        // the user might want to keep the PO record. They can manually adjust if needed.
      }

      // LOG MANUAL ENTRY (no reversal needed)
      if (!source || source === 'manual') {
        logs.push(createLogEntry({
          actor: { id: state.currentUser?.id || null, name: userName },
          actionType: 'DELETE_JOURNAL',
          entity: { id: entryToDelete.id, description: entryToDelete.description },
          message: 'Manual journal entry deleted (no reversals needed)',
        }));
      }

      // Delete the journal entry (and related entries like COGS for sales)
      nextState.journal = state.journal.filter((entry) => {
        // Delete by ID or reference
        if (entryId != null && entry.id === entryId) {
          return false;
        }
        if (reference != null && entry.reference === reference) {
          return false;
        }

        // For sales, also delete related  COGS entry
        if (source === 'sale' && saleId) {
          const entryMetadata = entry.metadata || {};
          if (entryMetadata.source === 'sale' && entryMetadata.saleId === saleId) {
            return false; // Delete both revenue and COGS entries
          }
        }

        return true;
      });

      // Add all logs to state
      nextState.logs = [...(state.logs || []), ...logs];

      return nextState;
    }
    case 'CREATE_BRANCH': {
      const { name, memberIds, createdBy } = action.payload ?? {};
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      const normalizedMembers = Array.isArray(memberIds)
        ? Array.from(new Set(memberIds.map((id) => Number(id)).filter((value) => Number.isFinite(value))))
        : [];
      if (!trimmedName || !normalizedMembers.length) {
        return state;
      }
      const creatorId = Number.isFinite(Number(createdBy))
        ? Number(createdBy)
        : state.currentUser?.id ?? null;
      if (creatorId != null && !normalizedMembers.includes(creatorId)) {
        normalizedMembers.push(creatorId);
      }
      const branch = {
        id: Date.now(),
        name: trimmedName,
        members: normalizedMembers,
        createdBy: creatorId,
      };
      return {
        ...state,
        branches: [...state.branches, branch],
        currentBranchId: branch.id,
      };
    }
    case 'SET_CURRENT_BRANCH':
      return { ...state, currentBranchId: action.payload ?? null };
    case 'POST_BRANCH_ANNOUNCEMENT': {
      const payload = action.payload ?? {};
      const branchId = Number(payload.branchId);
      const content = typeof payload.content === 'string' ? payload.content.trim() : '';
      if (!Number.isFinite(branchId) || !content) {
        return state;
      }
      const labelColor = typeof payload.labelColor === 'string' ? payload.labelColor : 'green';
      const createdBy = Number.isFinite(Number(payload.createdBy))
        ? Number(payload.createdBy)
        : state.currentUser?.id ?? null;
      const announcement = {
        id: Date.now(),
        branchId,
        content,
        labelColor,
        createdBy,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        announcements: [...state.announcements, announcement],
      };
    }
    case 'ADD_BRANCH_MESSAGE': {
      const payload = action.payload ?? {};
      const branchId = Number(payload.branchId);
      const content = typeof payload.content === 'string' ? payload.content.trim() : '';
      const authorId = Number.isFinite(Number(payload.from))
        ? Number(payload.from)
        : state.currentUser?.id ?? null;
      if (!Number.isFinite(branchId) || !content || authorId == null) {
        return state;
      }
      const message = {
        id: Date.now(),
        from: authorId,
        to: null,
        branchId,
        content,
        type: 'branch',
        timestamp: new Date().toISOString(),
        readBy: Array.isArray(payload.readBy) ? payload.readBy : [authorId],
      };
      return {
        ...state,
        messages: [...state.messages, message],
      };
    }
    case 'SET_INBOX_FILTER':
      return { ...state, inboxFilter: action.payload ?? 'all' };
    case 'SET_INBOX_SEARCH_TERM':
      return { ...state, inboxSearchTerm: typeof action.payload === 'string' ? action.payload : '' };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload ?? null };
    case 'MARK_CONVERSATION_READ': {
      const conversationId = action.payload ?? null;
      if (!conversationId) {
        return state;
      }
      const currentUserId = state.currentUser?.id ?? null;
      let updated = false;
      const messages = state.messages.map((message) => {
        const normalized = normalizeStoredMessage(message);
        if (normalized.conversationId !== conversationId) {
          return message;
        }
        updated = true;
        const readSet = new Set(normalized.readBy ?? []);
        if (currentUserId != null) {
          readSet.add(currentUserId);
        }
        return {
          ...normalized,
          read: true,
          readBy: Array.from(readSet),
        };
      });
      return updated ? { ...state, messages } : state;
    }
    case 'SEND_MESSAGE': {
      const payload = action.payload ?? {};
      const conversationId = payload.conversationId ?? null;
      const content = typeof payload.content === 'string' ? payload.content.trim() : '';
      if (!conversationId || !content) {
        return state;
      }
      const senderId = state.currentUser?.id ?? null;
      if (senderId == null) {
        return state;
      }
      const baseMessageEntry = state.messages.find((message) => {
        const normalized = normalizeStoredMessage(message);
        return normalized.conversationId === conversationId;
      });
      const normalizedBase = baseMessageEntry ? normalizeStoredMessage(baseMessageEntry) : null;
      const conversationType = payload.conversationType ?? normalizedBase?.conversationType ?? 'direct';
      const branchId = normalizedBase?.branchId ?? payload.branchId ?? null;
      const branchName = normalizedBase?.branchName ?? payload.branchName ?? null;
      const participantIds = Array.isArray(payload.participantIds)
        ? payload.participantIds
        : Array.isArray(normalizedBase?.participantIds)
          ? normalizedBase.participantIds
          : [];
      const derivedRecipient = participantIds.find((id) => id != null && id !== senderId) ?? normalizedBase?.to ?? null;
      const message = normalizeStoredMessage({
        id: Date.now(),
        conversationId,
        conversationType,
        branchId,
        branchName,
        participantIds,
        from: senderId,
        to: payload.to ?? payload.recipientId ?? derivedRecipient ?? null,
        content,
        type: conversationType === 'branch' ? 'branch' : conversationType === 'task' ? 'task' : 'personal',
        timestamp: new Date().toISOString(),
        replyToId: payload.replyTo ?? payload.replyToId ?? null,
        read: true,
        readBy: [senderId],
      });
      return {
        ...state,
        messages: [...state.messages, message],
      };
    }
    case 'ADD_REACTION': {
      const payload = action.payload ?? {};
      const messageId = Number(payload.messageId);
      const emoji = payload.emoji;
      if (!Number.isFinite(messageId) || !emoji) {
        return state;
      }
      const userId = state.currentUser?.id ?? null;
      if (userId == null) {
        return state;
      }
      let updated = false;
      const messages = state.messages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }
        const normalized = normalizeStoredMessage(message);
        const reactions = normalizeReactions(normalized.reactions);
        const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
        if (index === -1) {
          reactions.push({ emoji, users: [userId] });
          updated = true;
        } else if (!reactions[index].users.includes(userId)) {
          reactions[index] = {
            ...reactions[index],
            users: [...reactions[index].users, userId],
          };
          updated = true;
        } else {
          return message;
        }
        return {
          ...normalized,
          reactions,
        };
      });
      return updated ? { ...state, messages } : state;
    }
    case 'TOGGLE_REACTION': {
      const payload = action.payload ?? {};
      const messageId = Number(payload.messageId);
      const emoji = payload.emoji;
      if (!Number.isFinite(messageId) || !emoji) {
        return state;
      }
      const userId = state.currentUser?.id ?? null;
      if (userId == null) {
        return state;
      }
      let updated = false;
      const messages = state.messages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }
        const normalized = normalizeStoredMessage(message);
        const reactions = normalizeReactions(normalized.reactions);
        const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
        if (index === -1) {
          reactions.push({ emoji, users: [userId] });
          updated = true;
        } else if (reactions[index].users.includes(userId)) {
          const filteredUsers = reactions[index].users.filter((id) => id !== userId);
          if (filteredUsers.length === 0) {
            reactions.splice(index, 1);
          } else {
            reactions[index] = { ...reactions[index], users: filteredUsers };
          }
          updated = true;
        } else {
          reactions[index] = {
            ...reactions[index],
            users: [...reactions[index].users, userId],
          };
          updated = true;
        }
        return {
          ...normalized,
          reactions,
        };
      });
      return updated ? { ...state, messages } : state;
    } case 'MARK_MESSAGE_READ': {
      const messageId = Number(action.payload);
      if (!Number.isFinite(messageId)) {
        return state;
      }
      const currentUserId = state.currentUser?.id ?? null;
      let updated = false;
      const messages = state.messages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }
        const normalized = normalizeStoredMessage(message);
        const readBy = new Set(normalized.readBy ?? []);
        if (currentUserId != null) {
          readBy.add(currentUserId);
        }
        updated = true;
        return {
          ...normalized,
          read: true,
          readBy: Array.from(readBy),
        };
      });
      return updated ? { ...state, messages } : state;
    }
    case 'ENSURE_LOW_STOCK_ALERT': {
      const workerIdRaw = action.payload?.workerId;
      const workerId = Number(workerIdRaw);
      if (!Number.isFinite(workerId)) {
        return state;
      }
      const lowStockItems = computeLowStockItems(state.products, state.lowStockThreshold);
      if (!lowStockItems.length) {
        return state;
      }
      const { messages, changed } = upsertLowStockAlert(state, workerId, lowStockItems, {
        trigger: action.payload?.trigger,
        note: action.payload?.note,
        reason: action.payload?.reason,
        saleId: action.payload?.saleId ?? null,
        actorId: action.payload?.actorId ?? null,
      });
      if (!changed) {
        return state;
      }
      return {
        ...state,
        messages,
      };
    }
    case 'SUBMIT_STOCK_REQUEST': {
      const payload = action.payload ?? {};
      const messageId = Number(payload.messageId);
      if (!Number.isFinite(messageId)) {
        return state;
      }
      const index = state.messages.findIndex((message) => message.id === messageId);
      if (index === -1) {
        return state;
      }
      const actorId = Number.isFinite(Number(payload.actorId)) ? Number(payload.actorId) : state.currentUser?.id ?? null;
      const timestamp = new Date().toISOString();
      const message = state.messages[index];
      const stockDetails = message.stockDetails ?? {};
      const baseItems = Array.isArray(stockDetails.lowStockItems)
        ? stockDetails.lowStockItems
        : computeLowStockItems(state.products, state.lowStockThreshold);
      const updatedItems = mergeRequestedStockItems(baseItems, payload.requestedItems, state.products, state.lowStockThreshold);
      const requestedRecipient = Number(payload.recipientId ?? payload.approverId ?? payload.to);
      const fallbackRecipient = findReviewRecipient(state.users, actorId);
      const recipientId = Number.isFinite(requestedRecipient) ? requestedRecipient : fallbackRecipient?.id ?? null;
      const recipientUser = Array.isArray(state.users) ? state.users.find((user) => user.id === recipientId) ?? null : null;
      const recipientName = getUserDisplayName(recipientUser);
      const normalizedRecipientId = Number.isFinite(Number(recipientId)) ? Number(recipientId) : null;
      const historyLabel = recipientName
        ? `Submitted stock request to ${recipientName}`
        : 'Submitted stock request';
      const historyEntry = buildStockHistoryEntry(state.users, actorId, historyLabel, payload.requestNote);
      const updatedMessage = {
        ...message,
        from: actorId ?? message.from,
        to: recipientId ?? message.to ?? null,
        stockStatus: 'pending_review',
        status: 'pending_review',
        read: false,
        readBy: Array.isArray(message.readBy)
          ? message.readBy
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id !== normalizedRecipientId)
          : [],
        stockDetails: {
          ...stockDetails,
          workerId: stockDetails.workerId ?? actorId ?? message.to ?? null,
          teamId: stockDetails.teamId ?? message.teamId ?? message.branchId ?? null,
          teamName: stockDetails.teamName ?? message.teamName ?? message.branchName ?? null,
          lowStockItems: updatedItems,
          requestNote: payload.requestNote ?? stockDetails.requestNote ?? '',
          requestedBy: actorId,
          requestedAt: timestamp,
          recipientId,
          recipientName,
          reviewedAt: null,
          reviewedBy: null,
          reviewNote: null,
          approvedAt: null,
          approvedBy: null,
          issueType: null,
          issueNote: null,
          issueReportedAt: null,
          issueReportedBy: null,
        },
        history: [
          ...(Array.isArray(message.history) ? message.history : []),
          historyEntry,
        ],
      };
      const updatedMessages = state.messages.slice();
      updatedMessages[index] = updatedMessage;
      return {
        ...state,
        messages: updatedMessages,
      };
    }
    case 'ADD_MESSAGE': {
      const message = normalizeStoredMessage(action.payload);
      if (!message) {
        return state;
      }
      return {
        ...state,
        messages: [...state.messages, message],
      };
    }
    case 'DELETE_MESSAGE': {
      const messageId = Number(action.payload);
      if (!Number.isFinite(messageId)) {
        return state;
      }
      const messages = state.messages.filter((message) => message.id !== messageId);
      return messages.length === state.messages.length ? state : { ...state, messages };
    }
    case 'HANDLE_STOCK_REQUEST_ACTION': {
      const payload = action.payload ?? {};
      const messageId = Number(payload.messageId);
      if (!Number.isFinite(messageId)) {
        return state;
      }
      const index = state.messages.findIndex((message) => message.id === messageId);
      if (index === -1) {
        return state;
      }
      const actorId = Number.isFinite(Number(payload.actorId)) ? Number(payload.actorId) : state.currentUser?.id ?? null;
      const timestamp = new Date().toISOString();
      const message = state.messages[index];
      const stockDetails = message.stockDetails ?? {};
      const rawWorkerId = stockDetails.workerId ?? (message.from === actorId ? message.to : message.from);
      const normalizeUserId = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      };
      const workerId = normalizeUserId(rawWorkerId) ?? rawWorkerId;
      const items = Array.isArray(stockDetails.lowStockItems) ? stockDetails.lowStockItems : [];
      const actorUser = Array.isArray(state.users) ? state.users.find((user) => user.id === actorId) ?? null : null;

      let historyAction;
      let historyReason = payload.reason ?? payload.issueNote ?? payload.issueReason ?? '';
      let updatedProducts = state.products;
      const updatedDetails = {
        ...stockDetails,
        lastUpdatedAt: timestamp,
        lastActorId: actorId,
      };
      let nextTo = message.to;
      let nextStatus = message.status ?? null;
      let nextStockStatus = message.stockStatus ?? null;
      let nextRead = message.read ?? false;
      let nextSubject = message.subject ?? 'Stock Request';
      let nextReadBy = Array.isArray(message.readBy) ? [...message.readBy] : [];
      const removeReader = (userId) => {
        const normalized = normalizeUserId(userId);
        if (!Number.isFinite(normalized)) {
          return;
        }
        nextReadBy = nextReadBy.filter((id) => normalizeUserId(id) !== normalized);
      };
      const addReader = (userId) => {
        const normalized = normalizeUserId(userId);
        if (!Number.isFinite(normalized)) {
          return;
        }
        if (!nextReadBy.some((id) => normalizeUserId(id) === normalized)) {
          nextReadBy.push(normalized);
        }
      };

      switch (payload.actionType) {
        case 'approve-stock-request': {
          const wasIssue = !!stockDetails.issueType;
          historyAction = wasIssue ? 'Approved updated stock request' : 'Approved stock request';
          nextStatus = 'approved';
          nextStockStatus = 'approved';
          const workerTarget = normalizeUserId(workerId ?? message.to);
          nextTo = workerTarget ?? workerId ?? message.to;
          nextRead = false;
          removeReader(nextTo);
          updatedDetails.reviewedAt = timestamp;
          updatedDetails.reviewedBy = actorId;
          updatedDetails.reviewNote = payload.reason ?? '';
          updatedDetails.approvedAt = timestamp;
          updatedDetails.approvedBy = actorId;
          updatedDetails.recipientId = actorId;
          updatedDetails.recipientName = getUserDisplayName(actorUser) ?? updatedDetails.recipientName ?? null;
          updatedDetails.issueType = null;
          updatedDetails.issueNote = null;
          updatedDetails.issueReportedAt = null;
          updatedDetails.issueReportedBy = null;
          if (wasIssue) {
            updatedDetails.issueResolvedAt = timestamp;
          }
          break;
        }
        case 'decline-request': {
          historyAction = 'Declined stock request';
          nextStatus = 'manager_declined';
          nextStockStatus = 'manager_declined';
          const workerTarget = normalizeUserId(workerId ?? message.to);
          nextTo = workerTarget ?? workerId ?? message.to;
          nextRead = false;
          removeReader(nextTo);
          updatedDetails.reviewedAt = timestamp;
          updatedDetails.reviewedBy = actorId;
          updatedDetails.reviewNote = payload.reason ?? '';
          updatedDetails.closedAt = timestamp;
          updatedDetails.closedBy = actorId;
          updatedDetails.issueResolvedAt = timestamp;
          break;
        }
        case 'confirm-stock-received': {
          historyAction = 'Stock transaction completed';
          nextStatus = 'fulfilled';
          nextStockStatus = 'fulfilled';
          nextRead = true;
          addReader(actorId);
          nextSubject = 'Stock transaction completed';
          updatedDetails.receivedAt = timestamp;
          updatedDetails.receivedBy = actorId;
          updatedDetails.completionNote = payload.reason ?? '';
          updatedDetails.issueType = null;
          updatedDetails.issueNote = null;
          updatedDetails.issueReportedAt = null;
          updatedDetails.issueReportedBy = null;
          updatedDetails.issueResolvedAt = timestamp;
          updatedProducts = applyStockReceipt(state.products, items);
          break;
        }
        case 'report-stock-issue': {
          const rawIssueType = typeof payload.issueType === 'string'
            ? payload.issueType
            : typeof payload.issueCode === 'string'
              ? payload.issueCode
              : '';
          const normalizedIssueType = rawIssueType.trim().length ? rawIssueType.trim() : 'custom';
          historyAction = normalizedIssueType === 'damaged_goods'
            ? 'Reported issue: damaged goods'
            : normalizedIssueType === 'missing_goods'
              ? 'Reported issue: missing goods'
              : 'Reported stock issue';
          historyReason = payload.reason ?? payload.issueNote ?? payload.issueReason ?? historyReason;
          nextStatus = 'issue_reported';
          nextStockStatus = 'issue_reported';
          const reviewerTarget = stockDetails.reviewedBy ?? stockDetails.approvedBy ?? stockDetails.recipientId ?? message.from ?? null;
          const reviewerId = normalizeUserId(reviewerTarget);
          nextTo = reviewerId ?? reviewerTarget;
          nextRead = false;
          removeReader(nextTo);
          updatedDetails.issueType = normalizedIssueType;
          updatedDetails.issueNote = historyReason ?? '';
          updatedDetails.issueReportedAt = timestamp;
          updatedDetails.issueReportedBy = actorId;
          delete updatedDetails.receivedAt;
          delete updatedDetails.receivedBy;
          delete updatedDetails.completionNote;
          break;
        }
        default:
          return state;
      }

      const historyEntry = buildStockHistoryEntry(state.users, actorId, historyAction ?? 'Updated stock request', historyReason);
      const normalizedReadBy = Array.from(new Set(nextReadBy.map((id) => normalizeUserId(id)).filter((id) => Number.isFinite(id))));
      const updatedMessage = {
        ...message,
        to: nextTo,
        stockStatus: nextStockStatus,
        status: nextStatus,
        read: nextRead,
        subject: nextSubject,
        history: [
          ...(Array.isArray(message.history) ? message.history : []),
          historyEntry,
        ],
        stockDetails: updatedDetails,
        readBy: normalizedReadBy,
      };
      const updatedMessages = state.messages.slice();
      updatedMessages[index] = updatedMessage;
      return {
        ...state,
        messages: updatedMessages,
        products: updatedProducts,
      };
    }
    case 'REPORT_DAMAGED_STOCK': {
      const { productId, quantity, reason, notes } = action.payload ?? {};
      const product = state.products.find((p) => p.id === productId);
      if (!product) {
        return state;
      }
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return state;
      }
      const currentStock = Number(product.stock ?? 0);
      const currentDamaged = Number(product.damagedStock ?? 0);

      // Ensure we don't reduce stock below 0
      const reduction = Math.min(currentStock, qty);
      const nextStock = currentStock - reduction;
      const nextDamaged = currentDamaged + reduction;

      const updatedProduct = {
        ...product,
        stock: nextStock,
        damagedStock: nextDamaged,
      };

      return withLog(
        state,
        {
          ...state,
          products: state.products.map((p) => (p.id === productId ? updatedProduct : p)),
        },
        {
          actor: state.currentUser,
          actionType: 'REPORT_DAMAGED_STOCK',
          entity: {
            id: Date.now(), // Log ID
            productId: product.id,
            productName: product.name,
            quantity: reduction,
            reason,
            notes,
          },
          changes: {
            stock: { from: currentStock, to: nextStock },
            damagedStock: { from: currentDamaged, to: nextDamaged },
          },
        }
      );
    }
    case 'START_AI_SESSION':
      return {
        ...state,
        aiViewPhase: 'chat',
        currentAICategory: action.payload.categoryKey,
        currentAICategoryText: action.payload.categoryText,
        aiChatHistory: action.payload.history ?? [],
        aiAudioPlayers: {},
      };
    case 'SHOW_AI_CATEGORIES':
      return {
        ...state,
        aiViewPhase: 'selection',
        currentAICategory: null,
        currentAICategoryText: null,
        aiChatHistory: [],
        aiAudioPlayers: {},
      };
    case 'APPEND_AI_MESSAGE':
      return {
        ...state,
        aiChatHistory: [...state.aiChatHistory, action.payload],
      };
    case 'SET_AI_CHAT_HISTORY':
      return {
        ...state,
        aiChatHistory: Array.isArray(action.payload) ? action.payload : [],
      };
    case 'SET_AI_SETTINGS':
      return {
        ...state,
        aiSettings: { ...state.aiSettings, ...(action.payload ?? {}) },
      };
    case 'OPEN_MODAL':
      return {
        ...state,
        modal: {
          open: true,
          content: action.payload.content,
          props: action.payload.props ?? null,
        },
      };
    case 'CLOSE_MODAL':
      return { ...state, modal: { open: false, content: null, props: null } };
    case 'ADD_LOG': {
      const logPayload = action.payload;
      if (!logPayload) {
        return state;
      }
      const logEntry = createLogEntry({
        ...logPayload,
        logNumber: state.nextLogNumber ?? 1,
      });
      return {
        ...state,
        logs: [logEntry, ...(state.logs ?? [])],
        nextLogNumber: (state.nextLogNumber ?? 1) + 1,
      };
    }
    case 'PUSH_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((note) => note.id !== action.payload),
      };
    default:
      return state;
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const hasHydratedFromStorage = useRef(false);
  const skipFirstPersist = useRef(true);
  const lastExpiryWindowRef = useRef(initialAppState.nearExpiryDays);

  useEffect(() => {
    if (hasHydratedFromStorage.current) return;
    hasHydratedFromStorage.current = true;

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          dispatch({ type: 'HYDRATE_STATE', payload: parsed });
        }
      }
    } catch (error) {
      console.error('Failed to load stored Owlio data', error);
    }

    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        dispatch({ type: 'SET_THEME', payload: storedTheme });
      }
    } catch (error) {
      console.error('Failed to load stored theme', error);
    }
  }, []);

  useEffect(() => {
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }

    try {
      const persistable = {
        ...state,
        notifications: [],
        modal: { open: false, content: null, props: null },
        mobileMenuOpen: false,
        aiLoading: false,
        aiAnswer: null,
        pixelAnimation: null,
        quickSale: { ...quickSaleInitialState },
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(persistable));
      localStorage.setItem(THEME_STORAGE_KEY, state.theme ?? 'dark-theme');
    } catch (error) {
      console.error('Failed to persist Owlio data', error);
    }
  }, [state]);

  useEffect(() => {
    dispatch({ type: 'RECOMPUTE_BATCH_STATUSES', payload: { today: new Date().toISOString() } });
    const intervalId = setInterval(() => {
      dispatch({ type: 'RECOMPUTE_BATCH_STATUSES', payload: { today: new Date().toISOString() } });
    }, 1000 * 60 * 60);
    return () => clearInterval(intervalId);
  }, [dispatch]);

  useEffect(() => {
    if (lastExpiryWindowRef.current !== state.nearExpiryDays) {
      lastExpiryWindowRef.current = state.nearExpiryDays;
      dispatch({ type: 'RECOMPUTE_BATCH_STATUSES', payload: { today: new Date().toISOString() } });
    }
  }, [state.nearExpiryDays, dispatch]);

  const actions = useMemo(
    () => ({
      setView(view) {
        if (view === 'accura-ai') {
          dispatch({ type: 'SHOW_AI_CATEGORIES' });
        }
        dispatch({ type: 'SET_VIEW', payload: view });
      },
      setPendingRole(role) {
        dispatch({ type: 'SET_PENDING_ROLE', payload: role });
      },
      login(user, nextView) {
        dispatch({ type: 'LOGIN', payload: { user, nextView } });
      },
      logout() {
        dispatch({ type: 'LOGOUT' });
      },
      setUsers(users) {
        dispatch({ type: 'SET_USERS', payload: users });
      },
      addEmployee(employee) {
        dispatch({ type: 'ADD_EMPLOYEE', payload: employee });
      },
      updateEmployee(employee) {
        dispatch({ type: 'UPDATE_EMPLOYEE', payload: employee });
      },
      deleteEmployee(employeeId) {
        dispatch({ type: 'DELETE_EMPLOYEE', payload: employeeId });
      },
      createSupervisionRequest(payload) {
        dispatch({ type: 'CREATE_SUPERVISION_REQUEST', payload });
      },
      setSupervisionStatus(payload) {
        dispatch({ type: 'SET_SUPERVISION_STATUS', payload });
      },
      removeSupervisionLink(linkId) {
        dispatch({ type: 'REMOVE_SUPERVISION_LINK', payload: linkId });
      },
      assignFeaturePermissions(employeeId, grantedInput, revokedInput, grantedByInput) {
        const grantedPermissions = Array.isArray(grantedInput) ? grantedInput : [];
        const revokedPermissions = Array.isArray(revokedInput) ? revokedInput : null;
        const grantedBy = Array.isArray(revokedInput) ? grantedByInput : revokedInput;
        dispatch({
          type: 'UPSERT_FEATURE_GRANT',
          payload: {
            employeeId,
            grantedPermissions,
            revokedPermissions: Array.isArray(revokedPermissions) ? revokedPermissions : [],
            grantedBy,
          },
        });
      },
      clearFeaturePermissions(employeeId) {
        dispatch({ type: 'REMOVE_FEATURE_GRANT', payload: { employeeId } });
      },
      createFeatureLayout(layout) {
        dispatch({ type: 'CREATE_FEATURE_LAYOUT', payload: layout });
      },
      deleteFeatureLayout(layoutId) {
        dispatch({ type: 'DELETE_FEATURE_LAYOUT', payload: layoutId });
      },
      saveInvoiceTemplate(scope, templateId, customConfig, metadata = {}) {
        dispatch({
          type: 'SAVE_INVOICE_TEMPLATE',
          payload: {
            scope,
            templateId,
            customConfig,
            updatedAt: metadata.updatedAt,
            updatedBy: metadata.updatedBy,
          },
        });
      },
      savePurchaseOrderTemplate(scope, templateId, customConfig, metadata = {}) {
        dispatch({
          type: 'SAVE_PO_TEMPLATE',
          payload: {
            scope,
            templateId,
            customConfig,
            updatedAt: metadata.updatedAt,
            updatedBy: metadata.updatedBy,
          },
        });
      },
      deleteInvoiceTemplate(scope) {
        dispatch({ type: 'DELETE_INVOICE_TEMPLATE', payload: scope });
      },
      addAccount(account) {
        dispatch({ type: 'ADD_ACCOUNT', payload: account });
      },
      updateAccount(account) {
        dispatch({ type: 'UPDATE_ACCOUNT', payload: account });
      },
      deleteAccount(accountCode) {
        dispatch({ type: 'DELETE_ACCOUNT', payload: accountCode });
      },
      toggleMobileMenu() {
        dispatch({ type: 'TOGGLE_MOBILE_MENU' });
      },
      setMobileMenu(open) {
        dispatch({ type: 'SET_MOBILE_MENU', payload: open });
      },
      setTheme(theme) {
        dispatch({ type: 'SET_THEME', payload: theme });
        try {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
          console.error('Failed to persist theme', error);
        }
      },
      setAiMode(mode) {
        dispatch({ type: 'SET_AI_MODE', payload: mode });
      },
      setBotAnalysis(analysis) {
        dispatch({ type: 'SET_BOT_ANALYSIS', payload: analysis });
      },
      setSelectedCountry(code) {
        dispatch({ type: 'SET_SELECTED_COUNTRY', payload: code });
      },
      setCompanyName(name) {
        dispatch({ type: 'SET_COMPANY_NAME', payload: name });
      },
      setLowStockThreshold(value) {
        const parsed = Number.parseInt(value, 10);
        const normalized = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
        dispatch({ type: 'SET_LOW_STOCK_THRESHOLD', payload: normalized });
      },
      addStockBatch(batch) {
        dispatch({ type: 'ADD_STOCK_BATCH', payload: batch });
      },
      updateStockBatch(batch) {
        dispatch({ type: 'UPDATE_STOCK_BATCH', payload: batch });
      },
      addStockMovement(movement) {
        dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });
      },
      setNearExpiryWindow(days) {
        dispatch({ type: 'SET_NEAR_EXPIRY_WINDOW', payload: days });
      },
      recomputeBatchStatuses(options) {
        dispatch({ type: 'RECOMPUTE_BATCH_STATUSES', payload: options ?? {} });
      },
      setTaskFilter(filter) {
        dispatch({ type: 'SET_TASK_FILTER', payload: filter });
      },
      createTask(payload) {
        dispatch({ type: 'CREATE_TASK', payload });
      },
      updateTask(task) {
        dispatch({ type: 'UPDATE_TASK', payload: task });
      },
      deleteTask(taskId) {
        dispatch({ type: 'DELETE_TASK', payload: taskId });
      },
      joinTask(payload) {
        dispatch({ type: 'JOIN_TASK', payload });
      },
      assignTaskToBranch(payload) {
        dispatch({ type: 'ASSIGN_TASK_TO_BRANCH', payload });
      },
      createBranch(data) {
        dispatch({ type: 'CREATE_BRANCH', payload: data });
      },
      setCurrentBranch(branchId) {
        dispatch({ type: 'SET_CURRENT_BRANCH', payload: branchId });
      },
      postBranchAnnouncement(payload) {
        dispatch({ type: 'POST_BRANCH_ANNOUNCEMENT', payload });
      },
      addBranchMessage(payload) {
        dispatch({ type: 'ADD_BRANCH_MESSAGE', payload });
      },
      createTeam(data) {
        dispatch({ type: 'CREATE_BRANCH', payload: data });
      },
      setCurrentTeam(teamId) {
        dispatch({ type: 'SET_CURRENT_BRANCH', payload: teamId });
      },
      postTeamAnnouncement(payload) {
        dispatch({ type: 'POST_BRANCH_ANNOUNCEMENT', payload });
      },
      addTeamMessage(payload) {
        dispatch({ type: 'ADD_BRANCH_MESSAGE', payload });
      },
      setInboxFilter(filter) {
        dispatch({ type: 'SET_INBOX_FILTER', payload: filter });
      },
      setInboxSearchTerm(term) {
        dispatch({ type: 'SET_INBOX_SEARCH_TERM', payload: term });
      },
      setActiveConversation(conversationId) {
        dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversationId });
      },
      markConversationRead(conversationId) {
        dispatch({ type: 'MARK_CONVERSATION_READ', payload: conversationId });
      },
      sendMessage(payload) {
        dispatch({ type: 'SEND_MESSAGE', payload });
      },
      addReaction(payload) {
        dispatch({ type: 'ADD_REACTION', payload });
      },
      toggleReaction(payload) {
        dispatch({ type: 'TOGGLE_REACTION', payload });
      },
      markMessageRead(messageId) {
        dispatch({ type: 'MARK_MESSAGE_READ', payload: messageId });
      },
      ensureLowStockAlert(payload) {
        dispatch({ type: 'ENSURE_LOW_STOCK_ALERT', payload });
      },
      submitStockRequest(payload) {
        dispatch({ type: 'SUBMIT_STOCK_REQUEST', payload });
      },
      handleStockRequestAction(payload) {
        dispatch({ type: 'HANDLE_STOCK_REQUEST_ACTION', payload });
      },
      createMessage(message) {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      },
      deleteMessage(messageId) {
        dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
      },
      startAiChatSession(categoryKey, categoryText) {
        dispatch({
          type: 'START_AI_SESSION',
          payload: {
            categoryKey,
            categoryText,
            history: [
              {
                sender: 'welcome',
                content: `<p>Great, how can I help you with <strong>${categoryText}</strong>?</p>`,
                timestamp: Date.now(),
              },
            ],
          },
        });
      },
      showAiCategories() {
        dispatch({ type: 'SHOW_AI_CATEGORIES' });
      },
      appendAiMessage(message) {
        dispatch({ type: 'APPEND_AI_MESSAGE', payload: message });
      },
      setAiChatHistory(history) {
        dispatch({ type: 'SET_AI_CHAT_HISTORY', payload: history });
      },
      setAiSettings(settings) {
        dispatch({ type: 'SET_AI_SETTINGS', payload: settings });
      },
      setQuickSaleActive(active) {
        dispatch({ type: 'SET_QUICK_SALE_ACTIVE', payload: active });
      },
      updateQuickSaleState(partial) {
        dispatch({ type: 'UPDATE_QUICK_SALE', payload: partial });
      },
      finalizeQuickSale(payload) {
        if (payload?.sale) {
          dispatch({ type: 'ADD_SALE', payload });
        }
        dispatch({ type: 'FINALIZE_QUICK_SALE' });
      },
      addPurchaseOrder(purchaseOrder) {
        dispatch({ type: 'ADD_PURCHASE_ORDER', payload: purchaseOrder });
      },
      updatePurchaseOrder(purchaseOrder) {
        dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: purchaseOrder });
      },
      deletePurchaseOrder(purchaseOrderId) {
        dispatch({ type: 'DELETE_PURCHASE_ORDER', payload: purchaseOrderId });
      },
      receivePurchaseOrder(payload) {
        dispatch({ type: 'RECEIVE_PURCHASE_ORDER', payload });
      },
      updatePoPaymentStatus(purchaseOrderId, paymentStatus) {
        dispatch({ type: 'UPDATE_PO_PAYMENT_STATUS', payload: { purchaseOrderId, paymentStatus } });
      },
      recordPoPayment(payload) {
        dispatch({ type: 'RECORD_PO_PAYMENT', payload });
      },
      addProduct(product) {
        dispatch({ type: 'ADD_PRODUCT', payload: product });
      },
      updateProduct(product) {
        dispatch({ type: 'UPDATE_PRODUCT', payload: product });
      },
      deleteProduct(productId) {
        dispatch({ type: 'DELETE_PRODUCT', payload: productId });
      },
      addInvoice(invoice) {
        dispatch({ type: 'ADD_INVOICE', payload: invoice });
      },
      updateInvoice(invoice) {
        dispatch({ type: 'UPDATE_INVOICE', payload: invoice });
      },
      deleteInvoice(invoiceId) {
        dispatch({ type: 'DELETE_INVOICE', payload: invoiceId });
      },
      addCustomer(customer) {
        dispatch({ type: 'ADD_CUSTOMER', payload: customer });
      },
      updateCustomer(customer) {
        dispatch({ type: 'UPDATE_CUSTOMER', payload: customer });
      },
      deleteCustomer(customerId) {
        dispatch({ type: 'DELETE_CUSTOMER', payload: customerId });
      },
      addExpense(expense) {
        dispatch({ type: 'ADD_EXPENSE', payload: expense });
      },
      updateExpense(expense) {
        dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
      },
      deleteExpense(expenseId) {
        dispatch({ type: 'DELETE_EXPENSE', payload: expenseId });
      },
      addSale(payload) {
        dispatch({ type: 'ADD_SALE', payload });
      },
      updateSale(sale) {
        dispatch({ type: 'UPDATE_SALE', payload: sale });
      },
      deleteSale(saleId) {
        dispatch({ type: 'DELETE_SALE', payload: saleId });
      },
      createJournalEntry(entry) {
        dispatch({ type: 'CREATE_JOURNAL_ENTRY', payload: entry });
      },
      deleteJournalEntry(target) {
        dispatch({ type: 'DELETE_JOURNAL_ENTRY', payload: target });
      },
      openModal(content, props) {
        dispatch({ type: 'OPEN_MODAL', payload: { content, props } });
      },
      closeModal() {
        dispatch({ type: 'CLOSE_MODAL' });
      },
      addLog(logEntry) {
        dispatch({ type: 'ADD_LOG', payload: logEntry });
      },
      pushNotification(notification) {
        const normalized = createNotification(notification);
        const withId = normalized.id != null
          ? normalized
          : { ...normalized, id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}` };
        dispatch({ type: 'PUSH_NOTIFICATION', payload: withId });
      },
      dismissNotification(id) {
        dispatch({ type: 'DISMISS_NOTIFICATION', payload: id });
      },
      reportDamagedStock(productId, quantity, reason, notes) {
        dispatch({
          type: 'REPORT_DAMAGED_STOCK',
          payload: { productId, quantity, reason, notes },
        });
      },
    }), [],
  );

  const conversations = useMemo(
    () => selectConversations(state),
    [state],
  );

  const activeSupervisionDirectory = useMemo(
    () => buildActiveSupervisionDirectory(state.supervisionLinks),
    [state.supervisionLinks],
  );

  const accessibleUserIds = useMemo(
    () => computeAccessibleUserIds(state.currentUser, state.users, activeSupervisionDirectory),
    [state.currentUser, state.users, activeSupervisionDirectory],
  );

  const supervisionDirectory = useMemo(
    () => buildSupervisionDirectory(state.supervisionLinks),
    [state.supervisionLinks],
  );

  const featureGrantMatrix = useMemo(
    () => buildFeatureGrantMatrix(state.featureGrants),
    [state.featureGrants],
  );

  const hasFeaturePermission = useCallback(
    (userId, permission) => {
      if (!permission) {
        return false;
      }
      const targetId = String(userId ?? '');
      const targetUser = state.users.find((candidate) => String(candidate?.id) === targetId);
      if (!targetUser) {
        return false;
      }
      if ((targetUser.role ?? '').toLowerCase() === 'admin') {
        return true;
      }
      const overrides = featureGrantMatrix?.[targetId] ?? null;
      return computeEffectivePermissions(targetUser.role, overrides).has(permission);
    },
    [featureGrantMatrix, state.users],
  );

  const stateValue = useMemo(
    () => ({
      ...state,
      conversations,
      teams: Array.isArray(state.branches) ? state.branches : [],
      stockRequests: Array.isArray(state.tasks) ? state.tasks : [],
      currentTeamId: state.currentBranchId,
      supervisionDirectory,
      activeSupervisionDirectory,
      accessibleUserIds,
      featureGrantMatrix,
      featureLayouts: Array.isArray(state.featureLayouts) ? state.featureLayouts : [],
      hasFeaturePermission,
    }),
    [
      state,
      conversations,
      supervisionDirectory,
      activeSupervisionDirectory,
      accessibleUserIds,
      featureGrantMatrix,
      state.featureLayouts,
      hasFeaturePermission,
    ],
  );

  return (
    <AppStateContext.Provider value={stateValue}>
      <AppActionsContext.Provider value={actions}>
        {children}
      </AppActionsContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === null) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export function useAppActions() {
  const context = useContext(AppActionsContext);
  if (context === null) {
    throw new Error('useAppActions must be used within an AppStateProvider');
  }
  return context;
}

export function getInvoiceTemplateEntry(state, scope) {
  return resolveTemplateEntryForScope(state, scope);
}

export function getPurchaseOrderTemplateEntry(state, scope) {
  return resolvePurchaseOrderTemplateEntryForScope(state, scope);
}

export function prepareInvoiceForDownload(state, invoice, options = {}) {
  if (!state || !invoice) {
    return null;
  }
  const companyNameFallback = state.companyName ?? 'Your Company';
  const issuerId = invoice.issuedBy ?? invoice.issuedByUser?.id ?? state.currentUser?.id ?? null;
  const templateConfig = resolveInvoiceTemplateConfigForIssuer(state, issuerId);
  const preparedInvoice = applyInvoiceTemplateToInvoice(
    {
      ...invoice,
      companyName: invoice.companyName ?? companyNameFallback,
    },
    templateConfig,
    companyNameFallback,
  );
  const shareUrl = buildInvoiceShareUrl(state, preparedInvoice, options.baseUrl);
  let barcodeDataUrl = preparedInvoice.barcodeDataUrl ?? null;
  const allowBarcode = preparedInvoice.layoutOptions?.showBarcode !== false;
  if (!allowBarcode) {
    barcodeDataUrl = null;
  } else if (!barcodeDataUrl && options.generateBarcode !== false && shareUrl) {
    barcodeDataUrl = createBarcodeDataUrl(shareUrl);
  }
  return {
    ...preparedInvoice,
    shareUrl,
    barcodeDataUrl,
  };
}

export { buildInvoiceShareUrl };






























































































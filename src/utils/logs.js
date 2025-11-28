const LOG_PREFIX = 'log';

function buildId() {
  return `${LOG_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

function normalizeActor(actor = {}) {
  const id = actor?.id ?? actor?.actorId ?? null;
  const name = actor?.name ?? actor?.fullName ?? actor?.username ?? actor?.actorName ?? 'System';
  return { id, name };
}

function formatId(value) {
  if (value === null || value === undefined) {
    return 'unknown';
  }
  return String(value);
}

function formatAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value ?? '0');
  }
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ensureSegments(segments = []) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [{ type: 'text', value: 'Action recorded.' }];
  }
  return segments.filter((segment) => segment && typeof segment.value !== 'undefined');
}

function amountSegment(value, tone = 'green') {
  return { type: 'amount', value: formatAmount(value), tone };
}

function keywordSegment(value, tone = 'yellow') {
  return { type: 'keyword', value: String(value ?? ''), tone };
}

function idSegment(value) {
  return { type: 'id', value: formatId(value) };
}

function statusSegment(value, tone = 'blue') {
  return { type: 'status', value: String(value ?? ''), tone };
}

function text(value) {
  return { type: 'text', value: String(value ?? '') };
}

function resolveCode(actionType, entity = {}) {
  const id = formatId(entity.id ?? entity.entityId ?? entity.invoiceNumber ?? entity.saleId ?? 'unknown');
  switch (actionType) {
    case 'ADD_SALE':
      return `SALE-C-${id}`;
    case 'UPDATE_SALE':
      return `SALE-U-${id}`;
    case 'DELETE_SALE':
      return `SALE-D-${id}`;
    case 'CREATE_EXPENSE':
      return `EXP-C-${id}`;
    case 'UPDATE_EXPENSE':
      return `EXP-U-${id}`;
    case 'DELETE_EXPENSE':
      return `EXP-D-${id}`;
    case 'ADD_PRODUCT':
      return `PRD-C-${id}`;
    case 'UPDATE_PRODUCT':
      return `PRD-U-${id}`;
    case 'DELETE_PRODUCT':
      return `PRD-D-${id}`;
    case 'ADD_CUSTOMER':
      return `CUS-C-${id}`;
    case 'UPDATE_CUSTOMER':
      return `CUS-U-${id}`;
    case 'DELETE_CUSTOMER':
      return `CUS-D-${id}`;
    case 'UPDATE_INVOICE_STATUS':
      return `INV-U-${id}`;
    case 'DELETE_INVOICE':
      return `INV-D-${id}`;
    case 'ADD_PURCHASE_ORDER':
      return `PO-C-${id}`;
    case 'UPDATE_PURCHASE_ORDER':
      return `PO-U-${id}`;
    case 'DELETE_PURCHASE_ORDER':
      return `PO-D-${id}`;
    case 'RECEIVE_PURCHASE_ORDER':
      return `PO-R-${id}`;
    case 'RECORD_PO_PAYMENT':
      return `PO-P-${id}`;
    case 'UPSERT_FEATURE_GRANT':
      return `PERM-U-${id}`;
    case 'SAVE_INVOICE_TEMPLATE':
      return `TPL-INV-${entity.templateId ?? 'default'}`;
    case 'SAVE_PO_TEMPLATE':
      return `TPL-PO-${entity.templateId ?? 'default'}`;
    case 'CREATE_SUPERVISION_REQUEST':
      return `SUP-REQ-${id}`;
    case 'SET_SUPERVISION_STATUS':
      return `SUP-STAT-${id}`;
    case 'CREATE_TASK':
      return `TASK-C-${id}`;
    case 'COMPLETE_TASK':
      return `TASK-F-${id}`;
    case 'REPORT_DAMAGED_STOCK':
      return `DMG-R-${id}`;
    default:
      return `${String(actionType ?? 'GEN').slice(0, 3).toUpperCase()}-${id}`;
  }
}

function buildUpdateSegments(label, fromValue, toValue, toneFrom = 'red', toneTo = 'green', valueType = 'text') {
  const segments = [
    text(`: ${label} changed from `),
  ];
  if (valueType === 'amount') {
    segments.push(amountSegment(fromValue, toneFrom));
    segments.push(text(' to '));
    segments.push(amountSegment(toValue, toneTo));
  } else if (valueType === 'keyword') {
    segments.push(keywordSegment(fromValue, toneFrom === 'red' ? 'red' : toneFrom));
    segments.push(text(' to '));
    segments.push(keywordSegment(toValue, toneTo));
  } else {
    segments.push(text(String(fromValue ?? 'N/A')));
    segments.push(text(' to '));
    segments.push(text(String(toValue ?? 'N/A')));
  }
  return segments;
}

function buildMessage(actionType, entity = {}, changes = {}, extraMessage) {
  switch (actionType) {
    case 'ADD_SALE': {
      const saleType = entity.saleType ?? 'Sale';
      return ensureSegments([
        text('Created Sale #'),
        idSegment(entity.id ?? 'pending'),
        text(' on '),
        keywordSegment(saleType, String(saleType).toLowerCase() === 'cash' ? 'green' : 'yellow'),
        text(' for '),
        amountSegment(entity.total ?? 0, 'green'),
      ]);
    }
    case 'UPDATE_SALE': {
      const segments = [
        text('Updated Sale #'),
        idSegment(entity.id ?? 'unknown'),
      ];
      if (changes?.total) {
        segments.push(...buildUpdateSegments('Total', changes.total.from, changes.total.to, 'red', 'green', 'amount'));
      }
      if (changes?.saleType) {
        segments.push(...buildUpdateSegments('Type', changes.saleType.from, changes.saleType.to, 'yellow', 'green', 'keyword'));
      }
      if (segments.length === 2) {
        segments.push(text(' : details updated.'));
      }
      return ensureSegments(segments);
    }
    case 'DELETE_SALE':
      return ensureSegments([
        text('Deleted Sale #'),
        idSegment(entity.id ?? 'unknown'),
        text(' for customer '),
        keywordSegment(entity.customerName ?? 'Unknown', 'purple'),
        text('.'),
      ]);
    case 'CREATE_EXPENSE':
      return ensureSegments([
        text('Created Expense #'),
        idSegment(entity.id ?? 'pending'),
        text(' for '),
        keywordSegment(entity.description ?? 'Expense', 'purple'),
        text(' in category '),
        keywordSegment(entity.category ?? 'General', 'yellow'),
        text('.'),
      ]);
    case 'UPDATE_EXPENSE': {
      const segments = [
        text('Updated Expense #'),
        idSegment(entity.id ?? 'unknown'),
      ];
      if (changes?.amount) {
        segments.push(...buildUpdateSegments('Amount', changes.amount.from, changes.amount.to, 'red', 'green', 'amount'));
      }
      if (changes?.category) {
        segments.push(...buildUpdateSegments('Category', changes.category.from, changes.category.to, 'purple', 'yellow', 'keyword'));
      }
      if (segments.length === 2) {
        segments.push(text(' : details updated.'));
      }
      return ensureSegments(segments);
    }
    case 'DELETE_EXPENSE':
      return ensureSegments([
        text('Deleted Expense #'),
        idSegment(entity.id ?? 'unknown'),
        text(' ('),
        keywordSegment(entity.description ?? 'Expense', 'purple'),
        text(').'),
      ]);
    case 'ADD_PRODUCT':
      return ensureSegments([
        text('Created product '),
        keywordSegment(entity.name ?? 'Product', 'purple'),
        entity.sku ? text(` (SKU ${entity.sku})`) : text(''),
      ]);
    case 'UPDATE_PRODUCT': {
      const segments = [
        text('Updated product '),
        keywordSegment(entity.name ?? 'Product', 'purple'),
      ];
      if (changes?.price) {
        segments.push(...buildUpdateSegments(' price', changes.price.from, changes.price.to, 'red', 'green', 'amount'));
      }
      if (changes?.stock) {
        segments.push(...buildUpdateSegments(' stock', changes.stock.from, changes.stock.to, 'yellow', 'green'));
      }
      if (changes?.category) {
        segments.push(...buildUpdateSegments(' category', changes.category.from, changes.category.to, 'purple', 'yellow', 'keyword'));
      }
      return ensureSegments(segments);
    }
    case 'DELETE_PRODUCT':
      return ensureSegments([
        text('Deleted product '),
        keywordSegment(entity.name ?? 'Product', 'purple'),
        text('.'),
      ]);
    case 'ADD_CUSTOMER':
      return ensureSegments([
        text('Created customer '),
        keywordSegment(entity.name ?? 'Customer', 'purple'),
        text('.'),
      ]);
    case 'UPDATE_CUSTOMER': {
      const segments = [
        text('Updated customer '),
        keywordSegment(entity.name ?? 'Customer', 'purple'),
      ];
      if (changes?.email) {
        segments.push(...buildUpdateSegments(' email', changes.email.from, changes.email.to));
      }
      if (changes?.phone) {
        segments.push(...buildUpdateSegments(' phone', changes.phone.from, changes.phone.to));
      }
      return ensureSegments(segments);
    }
    case 'DELETE_CUSTOMER':
      return ensureSegments([
        text('Deleted customer '),
        keywordSegment(entity.name ?? 'Customer', 'purple'),
        text('.'),
      ]);
    case 'UPDATE_INVOICE_STATUS':
      return ensureSegments([
        text('Updated Invoice #'),
        idSegment(entity.invoiceNumber ?? entity.id ?? 'unknown'),
        text(' status to '),
        statusSegment(entity.status ?? 'Unknown', 'blue'),
        text('.'),
      ]);
    case 'DELETE_INVOICE':
      return ensureSegments([
        text('Deleted Invoice #'),
        idSegment(entity.invoiceNumber ?? entity.id ?? 'unknown'),
        text('.'),
      ]);
    case 'ADD_PURCHASE_ORDER':
      return ensureSegments([
        text('Created Purchase Order #'),
        idSegment(entity.id ?? 'unknown'),
        text(' for '),
        keywordSegment(entity.supplierName ?? 'Supplier', 'purple'),
        text(' totaling '),
        amountSegment(entity.total ?? 0, 'green'),
        text('.'),
      ]);
    case 'UPDATE_PURCHASE_ORDER': {
      const segments = [
        text('Updated Purchase Order #'),
        idSegment(entity.id ?? 'unknown'),
      ];
      if (changes?.total) {
        segments.push(...buildUpdateSegments('Total', changes.total.from, changes.total.to, 'red', 'green', 'amount'));
      }
      if (changes?.status) {
        segments.push(text(' : Status changed to '));
        segments.push(statusSegment(changes.status.to ?? entity.status ?? 'updated', 'blue'));
      }
      if (segments.length === 2) {
        segments.push(text(' : details updated.'));
      }
      return ensureSegments(segments);
    }
    case 'DELETE_PURCHASE_ORDER':
      return ensureSegments([
        text('Deleted Purchase Order #'),
        idSegment(entity.id ?? 'unknown'),
        text('.'),
      ]);
    case 'RECEIVE_PURCHASE_ORDER':
      return ensureSegments([
        text('Marked Purchase Order #'),
        idSegment(entity.id ?? 'unknown'),
        text(' as received.'),
      ]);
    case 'RECORD_PO_PAYMENT':
      return ensureSegments([
        text('Recorded payment of '),
        amountSegment(entity.amount ?? 0, 'green'),
        text(' for Purchase Order #'),
        idSegment(entity.id ?? 'unknown'),
        entity.paymentAccount ? text(` via ${entity.paymentAccount}.`) : text('.'),
      ]);
    case 'UPSERT_FEATURE_GRANT':
      return ensureSegments([
        text('Updated permissions for '),
        keywordSegment(entity.employeeName ?? `Employee ${entity.id ?? ''}`, 'purple'),
        text(': +'),
        keywordSegment(entity.grantedCount ?? 0, 'green'),
        text(' / -'),
        keywordSegment(entity.revokedCount ?? 0, 'red'),
        text('.'),
      ]);
    case 'SAVE_INVOICE_TEMPLATE':
      return ensureSegments([
        text('Saved invoice template '),
        keywordSegment(entity.templateId ?? 'default', 'purple'),
        text(' for scope '),
        keywordSegment(entity.scope ?? 'global', 'yellow'),
        text('.'),
      ]);
    case 'SAVE_PO_TEMPLATE':
      return ensureSegments([
        text('Saved purchase order template '),
        keywordSegment(entity.templateId ?? 'default', 'purple'),
        text(' for scope '),
        keywordSegment(entity.scope ?? 'global', 'yellow'),
        text('.'),
      ]);
    case 'CREATE_SUPERVISION_REQUEST':
      return ensureSegments([
        text('Created supervision request for '),
        keywordSegment(entity.employeeName ?? 'team member', 'purple'),
        text(' (status: '),
        statusSegment(entity.status ?? 'pending', 'yellow'),
        text(').'),
      ]);
    case 'SET_SUPERVISION_STATUS':
      return ensureSegments([
        text('Supervision request for '),
        keywordSegment(entity.employeeName ?? 'team member', 'purple'),
        text(' was '),
        statusSegment(entity.status ?? 'updated', entity.status === 'active' ? 'green' : entity.status === 'revoked' ? 'red' : 'orange'),
        text('.'),
      ]);
    case 'CREATE_TASK':
      return ensureSegments([
        text('Created Task: "'),
        keywordSegment(entity.title ?? 'Untitled', 'purple'),
        text('".'),
      ]);
    case 'COMPLETE_TASK':
      return ensureSegments([
        text('Completed Task: "'),
        keywordSegment(entity.title ?? 'Untitled', 'green'),
        text('".'),
      ]);
    case 'REPORT_DAMAGED_STOCK':
      return ensureSegments([
        text('Reported '),
        keywordSegment(entity.quantity ?? 0, 'red'),
        text(' damaged items for '),
        keywordSegment(entity.productName ?? 'Product', 'purple'),
        text(': '),
        text(entity.reason ?? 'Unknown issue'),
        text('.'),
      ]);
    default:
      return ensureSegments([
        text(extraMessage ?? 'Recorded activity.'),
      ]);
  }
}

export function createLogEntry(payload = {}) {
  const {
    actor,
    actionType,
    entity = {},
    changes = {},
    logNumber = null,
  } = payload;
  const actorInfo = normalizeActor(actor);
  const code = resolveCode(actionType, entity);
  const messageSegments = buildMessage(actionType, entity, changes, payload.message);

  return {
    id: buildId(),
    logNumber,
    code,
    timestamp: new Date().toISOString(),
    actorId: actorInfo.id,
    actorName: actorInfo.name,
    message: messageSegments,
    actionType: actionType ?? 'GENERAL',
    entity,
    changes,
  };
}

export default createLogEntry;

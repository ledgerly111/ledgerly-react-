import { useEffect, useMemo, useRef, useState } from "react";

const stockStatusClasses = {
  alert: "bg-amber-500/20 text-amber-300",
  submitted: "bg-sky-500/20 text-sky-300",
  pending_review: "bg-yellow-500/20 text-yellow-300",
  approved: "bg-emerald-500/20 text-emerald-300",
  issue_reported: "bg-orange-500/20 text-orange-300",
  manager_declined: "bg-red-500/20 text-red-300",
  fulfilled: "bg-purple-500/20 text-purple-300",
  declined: "bg-red-500/20 text-red-300",
};

const supervisionStatusClasses = {
  pending: "bg-amber-500/20 text-amber-300",
  accepted: "bg-emerald-500/20 text-emerald-300",
  active: "bg-emerald-500/20 text-emerald-300",
  declined: "bg-red-500/20 text-red-300",
  revoked: "bg-gray-500/20 text-gray-300",
};

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDetailedTimestamp(timestamp) {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return String(timestamp);
  }
  return date.toLocaleString();
}

function getUser(users, userId) {
  if (!Array.isArray(users)) {
    return null;
  }
  const numericId = Number(userId);
  if (!Number.isFinite(numericId)) {
    return users.find((user) => user?.id === userId) ?? null;
  }
  return users.find((user) => user?.id === numericId) ?? null;
}

function getUserName(user) {
  if (!user) {
    return null;
  }
  return user.name ?? user.username ?? null;
}

function formatRole(role) {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "supervisor":
      return "Supervisor";
    case "worker":
      return "Worker";
    default:
      if (!role) {
        return "Team";
      }
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

function formatIssueType(issueType) {
  switch (issueType) {
    case "missing_goods":
      return "Missing goods";
    case "damaged_goods":
      return "Damaged goods";
    case "custom":
      return "Reported issue";
    default:
      return issueType ? issueType.replace(/_/g, " ") : "Reported issue";
  }
}

function cloneLowStockItems(stockDetails) {
  if (!stockDetails || !Array.isArray(stockDetails.lowStockItems)) {
    return [];
  }
  return stockDetails.lowStockItems.map((item) => ({
    productId: item.productId,
    name: item.name,
    sku: item.sku,
    currentStock: item.currentStock,
    reorderLevel: item.reorderLevel,
    suggestedRestock: item.suggestedRestock,
    requestedQuantity: item.requestedQuantity,
  }));
}

function deriveRequestedItems(items) {
  return items.map((item) => {
    const fallbacks = [item.requestedQuantity, item.suggestedRestock, item.reorderLevel, 0];
    const quantity = fallbacks.find((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
    return {
      productId: item.productId,
      quantity: Number(quantity ?? 0),
    };
  });
}

export default function ViewMessageModal({
  message,
  users,
  currentUserId,
  focusReply = false,
  onQuickReply,
  onStockAction,
  onSubmitStockRequest,
  onSupervisionDecision,
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [issueType, setIssueType] = useState("missing_goods");
  const [issueReason, setIssueReason] = useState("");
  const replyRef = useRef(null);

  const stockDetails = useMemo(() => message?.stockDetails ?? {}, [message]);
  const lowStockItems = useMemo(() => cloneLowStockItems(stockDetails), [stockDetails]);
  const initialRequestedItems = useMemo(() => deriveRequestedItems(cloneLowStockItems(stockDetails)), [stockDetails]);

  const [requestedItems, setRequestedItems] = useState(initialRequestedItems);
  const [requestNote, setRequestNote] = useState(stockDetails.requestNote ?? "");

  const managerLookupId = message?.supervisionManagerId ?? message?.from;
  const employeeLookupId = message?.supervisionEmployeeId ?? message?.to;
  const isSupervisionMessage = message?.type === "supervision";
  const supervisionStatusRaw = message?.supervisionStatus ?? message?.status ?? "pending";
  const supervisionStatus = typeof supervisionStatusRaw === "string"
    ? supervisionStatusRaw.toLowerCase()
    : "pending";
  const supervisionManager = useMemo(
    () => getUser(users, managerLookupId),
    [users, managerLookupId],
  );
  const supervisionEmployee = useMemo(
    () => getUser(users, employeeLookupId),
    [users, employeeLookupId],
  );
  const supervisionManagerName = getUserName(supervisionManager) ?? "Manager";
  const supervisionEmployeeName = getUserName(supervisionEmployee) ?? "Employee";
  const canRespondToSupervision = isSupervisionMessage
    && Number(message?.to) === Number(currentUserId)
    && supervisionStatus === "pending";
  const safeOnSupervisionDecision = typeof onSupervisionDecision === "function"
    ? onSupervisionDecision
    : () => {};

  const recipientOptions = useMemo(() => {
    if (!Array.isArray(users)) {
      return [];
    }
    return users
      .filter((user) => user && user.id !== currentUserId && ["admin", "manager", "supervisor"].includes(user.role))
      .map((user) => ({
        id: user.id,
        name: getUserName(user) ?? `User ${user.id}`,
        role: user.role ?? "manager",
      }));
  }, [users, currentUserId]);

  const recipientOptionKey = useMemo(
    () => recipientOptions.map((option) => option.id).join(","),
    [recipientOptions],
  );

  const [selectedRecipient, setSelectedRecipient] = useState(() => {
    if (Number.isFinite(Number(stockDetails.recipientId))) {
      return Number(stockDetails.recipientId);
    }
    return recipientOptions[0]?.id ?? null;
  });

  useEffect(() => {
    if (focusReply && !isSupervisionMessage && replyRef.current) {
      replyRef.current.focus();
    }
  }, [focusReply, isSupervisionMessage]);

  useEffect(() => {
    setRequestedItems(initialRequestedItems);
    setRequestNote(stockDetails.requestNote ?? "");
    setIssueFormOpen(false);
    setIssueType("missing_goods");
    setIssueReason("");
  }, [message?.id, initialRequestedItems, stockDetails.requestNote]);

  useEffect(() => {
    const fallbackRecipient = Number.isFinite(Number(stockDetails.recipientId))
      ? Number(stockDetails.recipientId)
      : recipientOptions[0]?.id ?? null;
    setSelectedRecipient(fallbackRecipient ?? null);
  }, [message?.id, stockDetails.recipientId, recipientOptionKey, recipientOptions]);

  if (!message) {
    return <div className="text-gray-300">Message not found.</div>;
  }

  const sender = getUser(users, message.from);
  const recipient = getUser(users, message.to);
  const senderName = getUserName(sender) ?? "System";
  const stockStatusRaw = message.stockStatus ?? message.status ?? null;
  const stockStatus = stockStatusRaw ?? "alert";
  const isStockMessage = message.type === "stock" || message.conversationType === "stock";
  const supervisionStatusClass = supervisionStatusClasses[supervisionStatus] ?? supervisionStatusClasses.pending;
  const supervisionStatusLabel = supervisionStatus.charAt(0).toUpperCase() + supervisionStatus.slice(1);
  const isSystemAlert = message.category === "system-alert";
  const statusClass = stockStatusClasses[stockStatus] ?? "bg-slate-500/20 text-slate-200";

  const workerUser = getUser(users, stockDetails.workerId);
  const workerName = getUserName(workerUser) ?? (stockDetails.workerId != null ? `User ${stockDetails.workerId}` : "Not assigned");
  const reviewerUser = getUser(users, stockDetails.reviewedBy ?? stockDetails.approvedBy ?? stockDetails.recipientId ?? message.to);
  const reviewerName = getUserName(reviewerUser) ?? stockDetails.recipientName ?? (recipient ? getUserName(recipient) : "Unassigned");

  const requestedAt = stockDetails.requestedAt ?? message.timestamp;
  const lastUpdatedAt = stockDetails.lastUpdatedAt
    ?? stockDetails.receivedAt
    ?? stockDetails.reviewedAt
    ?? stockDetails.approvedAt
    ?? message.timestamp;

  const isWorkerStockAlert = isStockMessage && message.to === currentUserId && stockStatus === "alert";
  const isManagerDeclinedForMe = isStockMessage && stockStatus === "manager_declined" && message.to === currentUserId;
  const isPendingReviewForMe = isStockMessage && stockStatus === "pending_review" && message.to === currentUserId;
  const isIssueReportedForMe = isStockMessage && stockStatus === "issue_reported" && message.to === currentUserId;
  const isApprovedAwaitingReceive = isStockMessage && stockStatus === "approved" && message.to === currentUserId;
  const isFulfilled = isStockMessage && stockStatus === "fulfilled";
  const showManagerActions = isStockMessage && (isPendingReviewForMe || isIssueReportedForMe);
  const showWorkerComposer = isStockMessage && typeof onSubmitStockRequest === "function" && (isWorkerStockAlert || isManagerDeclinedForMe);
  const showWorkerDecision = isApprovedAwaitingReceive;

  const historyEntries = Array.isArray(message.history) ? message.history : [];

  const sendStockAction = async (actionType, extra = {}) => {
    if (typeof onStockAction !== "function") {
      return;
    }
    setActionPending(true);
    try {
      await Promise.resolve(onStockAction({ actionType, ...extra }));
    } finally {
      setActionPending(false);
    }
  };

  const handleReplySubmit = async (event) => {
    event.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || !onQuickReply) {
      return;
    }
    setSending(true);
    try {
      await Promise.resolve(onQuickReply(trimmed));
      setReplyText("");
    } finally {
      setSending(false);
    }
  };

  const handleQuantityChange = (productId, value) => {
    setRequestedItems((prev) => prev.map((item) => (
      item.productId === productId
        ? { ...item, quantity: Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0) }
        : item
    )));
  };

  const handleStockRequestSubmit = async (event) => {
    event.preventDefault();
    if (typeof onSubmitStockRequest !== "function") {
      return;
    }
    if (!Number.isFinite(Number(selectedRecipient))) {
      window.alert("Please select a recipient before sending the request.");
      return;
    }
    setActionPending(true);
    try {
      await Promise.resolve(onSubmitStockRequest({
        requestedItems,
        requestNote,
        recipientId: Number(selectedRecipient),
      }));
    } finally {
      setActionPending(false);
    }
  };

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    if (!issueType) {
      return;
    }
    await sendStockAction("report-stock-issue", {
      issueType,
      reason: issueReason.trim(),
    });
    setIssueFormOpen(false);
    setIssueReason("");
    setIssueType("missing_goods");
  };

  const handleManagerDecision = async (actionType) => {
    if (actionType === "decline-request") {
      const reason = window.prompt("Please share a short note for the worker (optional):");
      if (reason === null) {
        return;
      }
      await sendStockAction(actionType, { reason: reason.trim() });
      return;
    }
    await sendStockAction(actionType);
  };

  const renderStockItems = () => {
    if (!lowStockItems.length) {
      return (
        <div className="rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 p-4 text-sm text-gray-400">
          No stock details provided.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {lowStockItems.map((item) => {
          const matchingRequest = requestedItems.find((entry) => entry.productId === item.productId);
          const requestedQty = matchingRequest?.quantity ?? 0;
          return (
            <div key={item.productId ?? item.sku} className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h5 className="text-base font-semibold text-white">{item.name ?? "Unnamed product"}</h5>
                  <p className="text-xs text-gray-400">SKU: {item.sku ?? "N/A"}</p>
                </div>
                {showWorkerComposer ? (
                  <div className="flex items-center gap-2">
                    <label htmlFor={`request-${item.productId}`} className="text-xs text-gray-400">Request Qty</label>
                    <input
                      id={`request-${item.productId}`}
                      type="number"
                      min={0}
                      step={1}
                      className="w-24 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white"
                      value={requestedQty}
                      onChange={(event) => handleQuantityChange(item.productId, Number(event.target.value))}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-300">
                    Requested: <span className="font-semibold text-white">{requestedQty}</span>
                  </div>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-xs text-gray-400 sm:grid-cols-3">
                <div>
                  <dt className="uppercase tracking-wide">Current stock</dt>
                  <dd className="text-white">{item.currentStock ?? 0}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">Reorder level</dt>
                  <dd className="text-white">{item.reorderLevel ?? 0}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">Suggested restock</dt>
                  <dd className="text-white">{item.suggestedRestock ?? requestedQty}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRequestOverview = () => {
    if (!isStockMessage) {
      return null;
    }
    return (
      <section className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Requested by</p>
            <p className="text-sm font-semibold text-white">{workerName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Reviewer</p>
            <p className="text-sm font-semibold text-white">{reviewerName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Requested on</p>
            <p className="text-sm text-gray-200">{formatDetailedTimestamp(requestedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Last update</p>
            <p className="text-sm text-gray-200">{formatDetailedTimestamp(lastUpdatedAt)}</p>
          </div>
        </div>
      </section>
    );
  };

  const renderStockRequestComposer = () => {
    const isResubmission = stockStatus === "manager_declined";
    const submitLabel = isResubmission ? "Resubmit Request" : "Send Request";
    const hasRecipients = recipientOptions.length > 0;

    return (
      <form className="space-y-4" onSubmit={handleStockRequestSubmit}>
        {isResubmission ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            <p className="font-semibold text-red-200">
              <i className="fas fa-circle-exclamation mr-2" />Request declined
            </p>
            <p className="mt-1 text-red-100/80">
              {stockDetails.reviewNote ? stockDetails.reviewNote : "Adjust the quantities and send the request back to your supervisor."}
            </p>
          </div>
        ) : null}

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="font-medium text-gray-200">Send request to</span>
          <select
            className="w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400/40"
            value={selectedRecipient ?? ""}
            onChange={(event) => setSelectedRecipient(event.target.value ? Number(event.target.value) : null)}
            disabled={!hasRecipients || actionPending}
          >
            {!hasRecipients ? (
              <option value="">No supervisors available</option>
            ) : (
              <option value="">Select recipient</option>
            )}
            {recipientOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {formatRole(option.role)}
              </option>
            ))}
          </select>
        </label>

        <div className="legacy-message-modal__task">
          <h5 className="legacy-message-modal__task-title">
            <i className="fas fa-boxes-stacked mr-2" />Low Stock Items
          </h5>
          {renderStockItems()}
        </div>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Additional details</span>
          <textarea
            className="legacy-message-modal__reply-input"
            rows={4}
            placeholder="Specify supplier instructions, preferred delivery date, or justification..."
            value={requestNote}
            onChange={(event) => setRequestNote(event.target.value)}
          />
        </label>

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="submit"
            className="perplexity-button px-4 py-2 text-sm"
            disabled={actionPending || !hasRecipients}
          >
            {actionPending ? "Sending..." : submitLabel}
          </button>
        </div>
      </form>
    );
  };

  const renderIssueForm = () => (
    <form className="space-y-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4" onSubmit={handleIssueSubmit}>
      <div>
        <span className="text-sm font-semibold text-orange-200">What happened?</span>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="issue-type"
              value="missing_goods"
              checked={issueType === "missing_goods"}
              onChange={() => setIssueType("missing_goods")}
            />
            Missing goods
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="issue-type"
              value="damaged_goods"
              checked={issueType === "damaged_goods"}
              onChange={() => setIssueType("damaged_goods")}
            />
            Damaged goods
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-200">
            <input
              type="radio"
              name="issue-type"
              value="custom"
              checked={issueType === "custom"}
              onChange={() => setIssueType("custom")}
            />
            Something else
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm text-gray-200">
        Additional details (optional)
        <textarea
          className="legacy-message-modal__reply-input"
          rows={3}
          placeholder="Share what went wrong so your supervisor can follow up"
          value={issueReason}
          onChange={(event) => setIssueReason(event.target.value)}
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-lg border border-gray-700 bg-gray-800/70 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700"
          onClick={() => {
            if (actionPending) {
              return;
            }
            setIssueFormOpen(false);
            setIssueReason("");
            setIssueType("missing_goods");
          }}
          disabled={actionPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="perplexity-button px-4 py-2 text-sm"
          disabled={actionPending}
        >
          {actionPending ? "Reporting..." : "Submit issue"}
        </button>
      </div>
    </form>
  );

  const renderWorkerDecisionPanel = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="perplexity-button px-4 py-2 text-sm"
          onClick={() => sendStockAction("confirm-stock-received")}
          disabled={actionPending}
        >
          {actionPending ? "Updating..." : "Accept stock"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-orange-500/50 bg-transparent px-4 py-2 text-sm font-medium text-orange-200 hover:bg-orange-500/10"
          onClick={() => setIssueFormOpen((previous) => !previous)}
          disabled={actionPending}
        >
          Report issue
        </button>
      </div>
      {issueFormOpen ? renderIssueForm() : null}
    </div>
  );

  const renderManagerActions = () => (
    <div className="space-y-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
      <button
        type="button"
        className="perplexity-button px-4 py-2 text-sm"
        onClick={() => handleManagerDecision("approve-stock-request")}
        disabled={actionPending}
      >
        {actionPending ? "Processing..." : "Approve"}
      </button>
      <button
        type="button"
        className="rounded-lg border border-red-500/50 bg-transparent px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/10"
        onClick={() => handleManagerDecision("decline-request")}
        disabled={actionPending}
      >
        Decline
      </button>
    </div>
  );

  const renderCompletionBanner = () => (
    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      <p className="font-semibold text-emerald-200">
        <i className="fas fa-circle-check mr-2" />Stock transaction completed
      </p>
      <p className="mt-1 text-emerald-100/80">
        Inventory has been updated. Review the history below for the complete audit trail.
      </p>
    </div>
  );

  const renderStatusNotices = () => {
    if (!isStockMessage) {
      return null;
    }
    const notices = [];
    if (stockStatus === "approved" && stockDetails.reviewNote && message.to === currentUserId) {
      notices.push(
        <div key="approved-note" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <p className="font-semibold text-emerald-200">
            <i className="fas fa-clipboard-check mr-2" />Supervisor note
          </p>
          <p className="mt-1 text-emerald-100/80">{stockDetails.reviewNote}</p>
        </div>,
      );
    }
    if (stockStatus === "manager_declined" && message.to === currentUserId) {
      notices.push(
        <div key="declined-note" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
          <p className="font-semibold text-red-200">
            <i className="fas fa-circle-exclamation mr-2" />Request declined
          </p>
          <p className="mt-1 text-red-100/80">
            {stockDetails.reviewNote ? stockDetails.reviewNote : "Update the request and send it again."}
          </p>
        </div>,
      );
    }
    if (stockStatus === "issue_reported" && message.to === currentUserId) {
      notices.push(
        <div key="issue-reported" className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-100">
          <p className="font-semibold text-orange-200">
            <i className="fas fa-circle-info mr-2" />{formatIssueType(stockDetails.issueType)}
          </p>
          <p className="mt-1 text-orange-100/80">
            {stockDetails.issueNote ? stockDetails.issueNote : "The worker reported an issue with this delivery."}
          </p>
        </div>,
      );
    }
    if (!notices.length) {
      return null;
    }
    return <div className="space-y-3">{notices}</div>;
  };

  const renderHistory = () => {
    if (!historyEntries.length) {
      return null;
    }
    return (
      <div className="legacy-message-modal__history">
        <h5>History</h5>
        <ul>
          {historyEntries.map((entry, index) => (
            <li key={(entry.timestamp ? `${entry.timestamp}-${index}` : `history-${index}`)}>
              <span className="legacy-message-modal__history-time">{formatDetailedTimestamp(entry.timestamp)}</span>
              <span className="legacy-message-modal__history-entry">
                {(entry.userName ?? entry.user ?? "User")}: {entry.action ?? "Updated"}
              </span>
              {entry.reason ? (
                <span className="legacy-message-modal__history-reason">Reason: {entry.reason}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderSupervisionInvite = () => {
    if (!isSupervisionMessage) {
      return null;
    }
    const requestedAt = message.requestedAt ?? message.timestamp;
    const note = message.notes ?? message.meta?.note ?? "";
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-100">
          <p className="flex items-center gap-2 text-base font-semibold text-white">
            <i className="fas fa-user-shield"></i>
            Supervision invitation
          </p>
          <ul className="mt-3 space-y-2 text-sm text-sky-100/90">
            <li>
              <span className="text-sky-200/80">Supervisor:</span>
              <span className="ml-2 font-medium text-white">{supervisionManagerName}</span>
            </li>
            <li>
              <span className="text-sky-200/80">Employee:</span>
              <span className="ml-2 font-medium text-white">{supervisionEmployeeName}</span>
            </li>
            <li>
              <span className="text-sky-200/80">Requested:</span>
              <span className="ml-2 text-white/90">{formatDetailedTimestamp(requestedAt)}</span>
            </li>
          </ul>
          {note ? (
            <div className="mt-4 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-100/90">
              <strong className="block text-white">Supervisor note</strong>
              <span className="opacity-90">{note}</span>
            </div>
          ) : null}
        </div>
        {canRespondToSupervision ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-gray-600/60 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800/60"
              onClick={() => safeOnSupervisionDecision("decline")}
            >
              <i className="fas fa-user-times mr-2"></i>
              Decline
            </button>
            <button
              type="button"
              className="perplexity-button px-4 py-2 text-sm font-medium"
              onClick={() => safeOnSupervisionDecision("accept")}
            >
              <i className="fas fa-user-check mr-2"></i>
              Join supervision
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-gray-700/70 bg-gray-900/60 px-4 py-3 text-sm text-gray-200">
            <span className="font-semibold text-white">Status</span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${supervisionStatusClass}`}>
              {supervisionStatusLabel}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    if (isSupervisionMessage) {
      return renderSupervisionInvite();
    }
    if (!isStockMessage) {
      return null;
    }
    const notices = renderStatusNotices();
    const actionBlocks = [];

    if (showWorkerComposer) {
      actionBlocks.push(
        <div key="composer" className="space-y-4">
          {renderStockRequestComposer()}
        </div>,
      );
    }

    if (showWorkerDecision) {
      actionBlocks.push(
        <div key="worker-actions" className="space-y-4">
          {renderWorkerDecisionPanel()}
        </div>,
      );
    }

    if (showManagerActions) {
      actionBlocks.push(
        <div key="manager-actions" className="space-y-4">
          {renderManagerActions()}
        </div>,
      );
    }

    if (isFulfilled) {
      actionBlocks.push(
        <div key="completed" className="space-y-4">
          {renderCompletionBanner()}
        </div>,
      );
    }

    if (!notices && !actionBlocks.length) {
      return null;
    }

    return (
      <div className="space-y-4">
        {notices}
        {actionBlocks}
      </div>
    );
  };

  return (
    <div className="legacy-message-modal space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-700 pb-4 sm:flex-row sm:items-center">
        <div className={`legacy-message-modal__avatar ${isSystemAlert ? "legacy-message-modal__avatar--alert" : ""}`}>
          {isSystemAlert ? (
            <i className="fas fa-triangle-exclamation text-yellow-400" />
          ) : (
            <span>{senderName?.charAt(0) ?? "S"}</span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">
            {isSystemAlert ? "System Alert" : senderName}
          </h3>
          <p className="text-sm text-gray-400">{formatDetailedTimestamp(message.timestamp)}</p>
        </div>
        {isStockMessage ? (
          <span className={`legacy-message-modal__status ${statusClass}`}>
            {String(stockStatus ?? "Stock").replace(/_/g, " ")}
          </span>
        ) : null}
        {isSupervisionMessage ? (
          <span className={`legacy-message-modal__status ${supervisionStatusClass}`}>
            {supervisionStatusLabel}
          </span>
        ) : null}
      </div>

      <div className="legacy-message-modal__body">
        <h4 className="legacy-message-modal__subject">{message.subject ?? "(No subject)"}</h4>
        <p className="legacy-message-modal__content">{message.content}</p>
      </div>

      {isStockMessage ? (
        <>
          {renderRequestOverview()}
          <div className="legacy-message-modal__task">
            <h5 className="legacy-message-modal__task-title">
              <i className="fas fa-boxes-stacked mr-2" />Stock Request Details
            </h5>
            {renderStockItems()}
            {stockDetails.requestNote ? (
              <div className="mt-4 rounded-lg border border-gray-700/60 bg-gray-900/40 p-3 text-sm text-gray-300">
                <strong className="text-white">Worker note:</strong> {stockDetails.requestNote}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {renderActions()}

      {renderHistory()}

      {!isStockMessage && !isSupervisionMessage ? (
        <form className="legacy-message-modal__reply" onSubmit={handleReplySubmit}>
          <label className="text-sm text-gray-400">
            Replying to {senderName}
            {recipient ? `, sent to ${recipient.name ?? recipient.username}` : ""}
          </label>
          <textarea
            ref={replyRef}
            className="legacy-message-modal__reply-input"
            rows={4}
            placeholder="Type your reply..."
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
          />
          <div className="flex justify-end">
            <button type="submit" className="perplexity-button px-4 py-2 text-sm" disabled={sending || !replyText.trim()}>
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      ) : null}

      <footer className="legacy-message-modal__meta">
        <span>Delivered {formatRelativeTime(message.timestamp)}</span>
        {recipient ? <span>Recipient: {recipient.name ?? recipient.username ?? `User ${recipient.id}`}</span> : null}
        {isStockMessage ? <span>Requester: {workerName}</span> : null}
        {isSupervisionMessage ? <span>Supervisor: {supervisionManagerName}</span> : null}
      </footer>
    </div>
  );
}




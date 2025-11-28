import { useMemo, useState } from 'react';

const STATUS_LABELS = {
  pending_worker_approval: { text: 'Awaiting Worker', tone: 'bg-amber-500/15 text-amber-200' },
  pending_manager_approval: { text: 'Awaiting Manager', tone: 'bg-sky-500/15 text-sky-200' },
  approved_pending_acceptance: { text: 'Needs Acceptance', tone: 'bg-purple-500/15 text-purple-200' },
  completed: { text: 'Completed', tone: 'bg-emerald-500/15 text-emerald-200' },
  declined: { text: 'Declined', tone: 'bg-red-500/15 text-red-200' },
};

function formatDateTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function MessageDetailModal({
  message,
  users = [],
  products = [],
  currentUser = null,
  onTaskAction,
  onQuickReply,
  onClose,
}) {
  const [replyValue, setReplyValue] = useState('');
  const sender = useMemo(
    () => users.find((user) => user.id === message?.from) ?? null,
    [users, message?.from],
  );
  const statusInfo = message?.type === 'task' ? STATUS_LABELS[message.status] ?? null : null;
  const product = useMemo(() => {
    if (!message?.taskDetails?.productId) {
      return null;
    }
    return products.find((item) => item.id === message.taskDetails.productId) ?? null;
  }, [products, message?.taskDetails?.productId]);
  const requester = useMemo(
    () => (message?.requesterId ? users.find((user) => user.id === message.requesterId) ?? null : null),
    [users, message?.requesterId],
  );
  const history = Array.isArray(message?.history) ? message.history.slice().reverse() : [];
  const isTaskActionAvailable = (action) => {
    if (message?.type !== 'task' || !currentUser) {
      return false;
    }
    switch (action) {
      case 'send-stock-request':
        return message.status === 'pending_worker_approval' && message.to === currentUser.id;
      case 'approve-stock-request':
        return message.status === 'pending_manager_approval' && message.to === currentUser.id;
      case 'accept-stock':
        return message.status === 'approved_pending_acceptance' && message.to === currentUser.id;
      case 'decline-request':
        return (message.status === 'pending_worker_approval' || message.status === 'pending_manager_approval') && message.to === currentUser.id;
      default:
        return false;
    }
  };

  if (!message) {
    return (
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Message</h3>
            <p className="text-sm text-gray-400">Message not found.</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-gray-800/80 p-2 text-gray-300 hover:bg-gray-700"
            onClick={() => onClose?.()}
          >
            <i className="fas fa-times" />
          </button>
        </header>
        <p className="text-sm text-gray-400">This message is unavailable.</p>
      </div>
    );
  }

  const handleQuickReplySubmit = (event) => {
    event.preventDefault();
    if (!replyValue.trim()) {
      return;
    }
    onQuickReply?.(replyValue.trim());
    setReplyValue('');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-white">{message.subject ?? 'No subject'}</h3>
          <div className="text-sm text-gray-400">
            From {sender?.name ?? 'System'} • {formatDateTime(message.timestamp)}
          </div>
        </div>
        <button
          type="button"
          className="rounded-full bg-gray-800/80 p-2 text-gray-300 hover:bg-gray-700"
          onClick={() => onClose?.()}
        >
          <i className="fas fa-times" />
        </button>
      </header>

      {statusInfo ? (
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.tone}`}>
          <i className="fas fa-clipboard-check" />
          {statusInfo.text}
        </div>
      ) : null}

      <article className="rounded-2xl border border-gray-700/60 bg-gray-900/60 px-5 py-4 text-sm text-gray-200">
        <p className="whitespace-pre-wrap leading-relaxed">{message.content ?? 'No content provided.'}</p>
      </article>

      {message.type === 'task' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Task Details</h4>
          </div>
          <div className="grid gap-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4 text-xs text-gray-300 sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Requester</span>
              <span>{requester?.name ?? 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Requested Stock</span>
              <span>{message.taskDetails?.requestedStock ?? '—'} units</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Product</span>
              <span>{product?.name ?? `Product #${message.taskDetails?.productId ?? '—'}`}</span>
            </div>
            {product ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Current Stock</span>
                <span>{product.stock ?? 0} units</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            {isTaskActionAvailable('send-stock-request') ? (
              <button
                type="button"
                className="perplexity-button px-3 py-2 text-xs font-semibold"
                onClick={() => onTaskAction?.('send-stock-request')}
              >
                <i className="fas fa-paper-plane mr-2" />Send to Manager
              </button>
            ) : null}
            {isTaskActionAvailable('approve-stock-request') ? (
              <button
                type="button"
                className="ai-button px-3 py-2 text-xs font-semibold"
                onClick={() => onTaskAction?.('approve-stock-request')}
              >
                <i className="fas fa-check mr-2" />Approve
              </button>
            ) : null}
            {isTaskActionAvailable('accept-stock') ? (
              <button
                type="button"
                className="bot-button px-3 py-2 text-xs font-semibold"
                onClick={() => onTaskAction?.('accept-stock')}
              >
                <i className="fas fa-box-open mr-2" />Accept Stock
              </button>
            ) : null}
            {isTaskActionAvailable('decline-request') ? (
              <button
                type="button"
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
                onClick={() => onTaskAction?.('decline-request')}
              >
                <i className="fas fa-times mr-2" />Decline
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-white">History</h4>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No history recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {history.map((entry, index) => (
              <li key={index} className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-3 text-xs text-gray-300">
                <div className="flex items-center justify-between text-gray-400">
                  <span>{entry.userName ?? entry.user ?? 'User'}</span>
                  <span>{formatDateTime(entry.timestamp)}</span>
                </div>
                <div className="mt-1 text-sm text-white">{entry.action}</div>
                {entry.reason ? <div className="mt-1 text-xs italic text-gray-400">Reason: {entry.reason}</div> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {message.type !== 'branch' ? (
        <footer className="rounded-xl border border-gray-700/60 bg-gray-900/40 px-4 py-3">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleQuickReplySubmit}>
            <textarea
              className="flex-1 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400/40"
              rows={2}
              placeholder="Send a quick reply"
              value={replyValue}
              onChange={(event) => setReplyValue(event.target.value)}
            />
            <button type="submit" className="perplexity-button px-4 py-2 text-sm font-semibold" disabled={!replyValue.trim()}>
              <i className="fas fa-paper-plane mr-2" />Reply
            </button>
          </form>
        </footer>
      ) : null}
    </div>
  );
}


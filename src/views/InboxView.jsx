import { useCallback, useEffect, useMemo, useState } from "react";
import TeamFormModal from "../components/BranchFormModal.jsx";
import ComposeMessageModal from "../components/ComposeMessageModal.jsx";
import ViewMessageModal from "../components/inbox/ViewMessageModal.jsx";
import { useAppActions, useAppState } from "../context/AppContext.jsx";

const FILTERS = [
  { value: 'all', label: 'All', icon: 'fas fa-inbox' },
  { value: 'personal', label: 'Personal', icon: 'fas fa-user' },
  { value: 'team', label: 'Team', icon: 'fas fa-users' },
  { value: 'stock', label: 'Stock Requests', icon: 'fas fa-boxes-stacked' },
];

const stockStatusTone = {
  alert: 'warning',
  submitted: 'info',
  pending_review: 'warning',
  approved: 'success',
  issue_reported: 'warning',
  manager_declined: 'danger',
  fulfilled: 'success',
  declined: 'danger',
};

const supervisionStatusTone = {
  pending: 'warning',
  accepted: 'success',
  active: 'success',
  declined: 'danger',
  revoked: 'info',
};

function formatMessageTime(timestamp) {
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

function getMessageCategory(message) {
  if (!message) {
    return 'personal';
  }
  const type = message.type ?? message.conversationType ?? 'personal';
  if (type === 'direct' || type === 'message') {
    return 'personal';
  }
  if (type === 'team') {
    return 'team';
  }
  if (type === 'task') {
    return 'stock';
  }
  if (type === 'stock') {
    return 'stock';
  }
  if (type === 'supervision') {
    return 'personal';
  }
  return type;
}

function getUser(users, userId) {
  if (!Array.isArray(users)) {
    return null;
  }
  return users.find((user) => user.id === userId) ?? null;
}

function getUserName(user) {
  if (!user) {
    return null;
  }
  return user.name ?? user.username ?? null;
}

function getInitials(name) {
  if (!name) {
    return "?";
  }
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function buildStatusLabel(status) {
  if (!status) {
    return null;
  }
  return status.replace(/_/g, " ");
}

function sanitizeSearchTerm(term) {
  return (term ?? "").trim().toLowerCase();
}

export default function InboxView() {
  const {
    messages,
    teams,
    users,
    currentUser,
    inboxFilter,
    inboxSearchTerm,
    products,
    hasFeaturePermission,
  } = useAppState();
  const {
    setInboxFilter,
    setInboxSearchTerm,
    markMessageRead,
    handleStockRequestAction,
    openModal,
    closeModal,
    createMessage,
    deleteMessage,
    pushNotification,
    setCurrentTeam,
    setView,
    createTeam,
    submitStockRequest,
    ensureLowStockAlert,
    setSupervisionStatus,
  } = useAppActions();
  const [localFilter, setLocalFilter] = useState(inboxFilter ?? 'all');

  useEffect(() => {
    setLocalFilter(inboxFilter ?? 'all');
  }, [inboxFilter]);

  const currentUserId = currentUser?.id ?? null;
  const canManageTeams = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'team.manageStructure');
    }
    return ['admin', 'manager'].includes(currentUser?.role ?? 'guest');
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);
  const searchTerm = sanitizeSearchTerm(inboxSearchTerm);

  useEffect(() => {
    if (currentUserId && currentUser?.role === 'worker') {
      ensureLowStockAlert({ workerId: currentUserId });
    }
  }, [currentUserId, currentUser?.role, ensureLowStockAlert, products]);

  const normalizedMessages = useMemo(() => {
    if (!Array.isArray(messages) || !currentUserId) {
      return [];
    }
    return messages.filter((message) => message.from === currentUserId || message.to === currentUserId);
  }, [messages, currentUserId]);

  const teamUnreadCounts = useMemo(() => {
    const map = new Map();
    if (!currentUserId) {
      return map;
    }
    normalizedMessages.forEach((message) => {
      const category = getMessageCategory(message);
      if (category === 'team' && message.teamId != null && message.to === currentUserId && !message.read) {
        map.set(message.teamId, (map.get(message.teamId) ?? 0) + 1);
      }
    });
    return map;
  }, [normalizedMessages, currentUserId]);

  const userTeams = useMemo(() => {
    if (!Array.isArray(teams) || !currentUserId) {
      return [];
    }
    const seen = new Map();
    teams.forEach((team) => {
      if (!team) return;
      const isMember = Array.isArray(team.members) && team.members.includes(currentUserId);
      const isCreator = team.createdBy === currentUserId;
      if (isMember || isCreator) {
        seen.set(team.id, team);
      }
    });
    return Array.from(seen.values());
  }, [teams, currentUserId]);

  const filteredMessages = useMemo(() => {
    if (inboxFilter === "team") {
      return [];
    }
    const filtered = normalizedMessages.filter((message) => {
      const category = getMessageCategory(message);
      if (inboxFilter !== "all" && category !== inboxFilter) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      const fromUser = getUserName(getUser(users, message.from));
      const toUser = getUserName(getUser(users, message.to));
      const haystack = [
        message.subject,
        message.content,
        fromUser,
        toUser,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [normalizedMessages, inboxFilter, searchTerm, users]);

  const matchingUsers = useMemo(() => {
    if (!searchTerm) {
      return [];
    }
    return (users ?? [])
      .filter((user) => user.id !== currentUserId)
      .filter((user) => {
        const name = getUserName(user)?.toLowerCase() ?? "";
        const role = user.role?.toLowerCase() ?? "";
        return name.includes(searchTerm) || role.includes(searchTerm);
      })
      .slice(0, 6);
  }, [users, currentUserId, searchTerm]);

  const handleFilterSelect = useCallback((value) => {
    setLocalFilter(value);
    setInboxFilter(value);
  }, [setInboxFilter]);

  const handleSearchChange = useCallback((event) => {
    setInboxSearchTerm(event.target.value);
  }, [setInboxSearchTerm]);

  const handleCreateTeam = useCallback(() => {
    if (!currentUserId) {
      return;
    }
    if (!canManageTeams) {
      pushNotification({
        type: "warning",
        message: "You do not have permission to create teams.",
      });
      return;
    }
    openModal(TeamFormModal, {
      users,
      currentUserId,
      onCancel: closeModal,
      onSubmit: ({ name, memberIds }) => {
        createTeam({ name, memberIds, createdBy: currentUserId });
        pushNotification({
          type: "success",
          message: "Team created",
          description: `${name} is ready for collaboration.`,
          iconClass: "fas fa-users",
        });
        closeModal();
        setView("team-hub");
      },
    });
  }, [canManageTeams, openModal, users, currentUserId, createTeam, pushNotification, closeModal, setView]);

  const handleComposeMessage = useCallback((presetRecipientId = null) => {
    openModal(ComposeMessageModal, {
      users,
      currentUserId,
      initialValues: presetRecipientId != null ? { to: presetRecipientId } : undefined,
      onCancel: closeModal,
      onSubmit: ({ to, subject, content }) => {
        createMessage({
          id: Date.now(),
          from: currentUserId,
          to,
          subject,
          content,
          type: "personal",
          category: "message",
          timestamp: new Date().toISOString(),
          read: false,
        });
        pushNotification({
          type: "success",
          message: "Message sent",
          description: `Your message to ${getUserName(getUser(users, to)) ?? "the recipient"} was delivered to the inbox.`,
          iconClass: "fas fa-paper-plane",
        });
        closeModal();
      },
    });
  }, [openModal, users, currentUserId, createMessage, pushNotification, closeModal]);

  const handleSendQuickReply = useCallback((sourceMessage, body) => {
    if (!sourceMessage || !currentUserId) {
      return Promise.resolve();
    }
    const recipientId = sourceMessage.from === currentUserId ? sourceMessage.to : sourceMessage.from;
    createMessage({
      id: Date.now(),
      from: currentUserId,
      to: recipientId,
      subject: sourceMessage.subject ? `Re: ${sourceMessage.subject}` : "Reply",
      content: body,
      type: "personal",
      category: "reply",
      timestamp: new Date().toISOString(),
      read: false,
    });
    pushNotification({
      type: "success",
      message: "Reply sent",
      description: "Your quick reply has been added to the conversation.",
      iconClass: "fas fa-reply",
    });
    return Promise.resolve();
  }, [createMessage, currentUserId, pushNotification]);

  const handleStockAction = useCallback((messageId, payload) => {
    if (!messageId) {
      return Promise.resolve();
    }
    handleStockRequestAction({
      messageId,
      actorId: currentUserId,
      ...payload,
    });
    let shouldCloseModal = false;
    switch (payload.actionType) {
      case 'approve-stock-request':
        pushNotification({ type: 'success', message: 'Stock request approved' });
        shouldCloseModal = true;
        break;
      case 'decline-request':
        pushNotification({
          type: 'info',
          message: 'Stock request declined',
          description: payload.reason ? `Reason: ${payload.reason}` : undefined,
        });
        shouldCloseModal = true;
        break;
      case 'confirm-stock-received':
        pushNotification({ type: 'success', message: 'Inventory updated for received stock' });
        shouldCloseModal = true;
        break;
      case 'report-stock-issue':
        pushNotification({
          type: 'warning',
          message: 'Issue reported to supervisor',
          description: 'The reviewer has been notified about the delivery issue.',
        });
        shouldCloseModal = true;
        break;
      default:
        pushNotification({
          type: 'info',
          message: 'Stock request updated',
          description: 'The stock request status has been updated.',
          iconClass: 'fas fa-boxes-stacked',
        });
        break;
    }
    if (shouldCloseModal) {
      closeModal();
    }
    return Promise.resolve();
  }, [currentUserId, handleStockRequestAction, pushNotification, closeModal]);

  const handleSupervisionDecision = useCallback((message, decision, { close = false } = {}) => {
    if (!message || !message.supervisionLinkId || !currentUserId) {
      return;
    }
    const nextStatus = decision === 'accept' ? 'active' : 'declined';
    setSupervisionStatus({
      linkId: message.supervisionLinkId,
      status: nextStatus,
      responderId: currentUserId,
    });
    if (message.to === currentUserId && !message.read) {
      markMessageRead(message.id);
    }
    const manager = getUser(users, message.supervisionManagerId ?? message.from);
    const managerName = getUserName(manager) ?? 'your supervisor';
    const notificationConfig = decision === 'accept'
      ? { type: 'success', message: `You are now supervised by ${managerName}.` }
      : { type: 'info', message: `You declined supervision from ${managerName}.` };
    pushNotification(notificationConfig);
    if (close) {
      closeModal();
    }
  }, [currentUserId, setSupervisionStatus, markMessageRead, users, pushNotification, closeModal]);

  const handleOpenMessage = useCallback((message, { focusReply = false } = {}) => {
    if (!message) {
      return;
    }
    if (message.to === currentUserId && !message.read) {
      markMessageRead(message.id);
    }
    openModal(ViewMessageModal, {
      message,
      users,
      currentUserId,
      focusReply,
      onQuickReply: (body) => handleSendQuickReply(message, body),
      onStockAction: (payload) => handleStockAction(message.id, payload),
      onSubmitStockRequest: (payload) => {
        submitStockRequest({ ...payload, messageId: message.id, actorId: currentUserId });
        pushNotification({ type: 'success', message: 'Stock request sent for review' });
      },
      onSupervisionDecision: (decision) => handleSupervisionDecision(message, decision, { close: true }),
    });
  }, [currentUserId, markMessageRead, openModal, users, handleSendQuickReply, handleStockAction, submitStockRequest, pushNotification, handleSupervisionDecision]);

  const handleMarkAsRead = useCallback((event, message) => {
    event.stopPropagation();
    if (!message || message.read) {
      return;
    }
    markMessageRead(message.id);
    pushNotification({
      type: "success",
      message: "Message marked as read",
      iconClass: "fas fa-envelope-open",
    });
  }, [markMessageRead, pushNotification]);

  const handleQuickReply = useCallback((event, message) => {
    event.stopPropagation();
    handleOpenMessage(message, { focusReply: true });
  }, [handleOpenMessage]);

  const handleDeleteMessage = useCallback((event, message) => {
    event.stopPropagation();
    if (!message) {
      return;
    }
    const confirmed = window.confirm("Delete this message from your inbox?");
    if (!confirmed) {
      return;
    }
    deleteMessage(message.id);
    pushNotification({
      type: "success",
      message: "Message removed",
      description: "The message has been deleted from your inbox.",
      iconClass: "fas fa-trash",
    });
  }, [deleteMessage, pushNotification]);

  const handleSelectUser = useCallback((userId) => {
    handleComposeMessage(userId);
    setInboxSearchTerm("");
  }, [handleComposeMessage, setInboxSearchTerm]);

  const handleOpenTeam = useCallback((teamId) => {
    setCurrentTeam(teamId);
    setView("team-hub");
  }, [setCurrentTeam, setView]);

  const displayItems = inboxFilter === "team"
    ? userTeams.map((team) => ({ type: "team", data: team }))
    : filteredMessages.map((message) => ({ type: "message", data: message }));

  return (
    <div className="legacy-inbox space-y-6 fade-in">
      <div className="legacy-inbox__header">
        <div className="legacy-inbox__actions">
          {canManageTeams ? (
            <button type="button" className="ai-button px-4 py-2 rounded-xl font-medium" onClick={handleCreateTeam}>
              <i className="fas fa-users mr-2" />Create Team
            </button>
          ) : null}
          <button type="button" className="perplexity-button px-4 py-2 rounded-xl font-medium" onClick={() => handleComposeMessage()}>
            <i className="fas fa-edit mr-2" />New Message
          </button>
        </div>
      </div>

      <div className="legacy-inbox__search perplexity-card">
        <div className="legacy-inbox__search-inner">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search messages, employees, or teams..."
            value={inboxSearchTerm ?? ""}
            onChange={handleSearchChange}
            className="legacy-inbox__search-input"
          />
        </div>
        {matchingUsers.length ? (
          <div className="legacy-inbox__search-results">
            {matchingUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="legacy-inbox__search-result"
                onMouseDown={() => handleSelectUser(user.id)}
              >
                <div className="legacy-inbox__search-avatar">{getInitials(getUserName(user))}</div>
                <div>
                  <div className="legacy-inbox__search-name">{getUserName(user) ?? `User ${user.id}`}</div>
                  <div className="legacy-inbox__search-role">{user.role ?? "Member"}</div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="legacy-inbox__filters">
        {FILTERS.map((filter) => {
          const isActive = localFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              className={`legacy-inbox__filter ${isActive ? "legacy-inbox__filter--active" : ""}`}
              onClick={() => handleFilterSelect(filter.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleFilterSelect(filter.value);
                }
              }}
            >
              <i className={`${filter.icon} mr-2`}></i>
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="legacy-inbox__list perplexity-card">
        {displayItems.length === 0 ? (
          <div className="legacy-inbox__empty">
            <div className="legacy-inbox__empty-icon">
              <i className={`fas ${inboxFilter === 'team' ? 'fa-users' : 'fa-inbox'}`}></i>
            </div>
            <p className="legacy-inbox__empty-title">
              {inboxFilter === 'team' ? 'No teams yet' : 'No messages yet'}
            </p>
            <p className="legacy-inbox__empty-subtitle">
              {inboxFilter === 'team'
                ? (canManageTeams
                  ? 'Create a team to start group conversations.'
                  : 'You are not a member of any teams yet.')
                : 'Start a conversation or wait for new messages.'}
            </p>
            {inboxFilter === 'team' && canManageTeams ? (
              <button type="button" className="ai-button px-4 py-2 rounded-xl" onClick={handleCreateTeam}>
                <i className="fas fa-plus mr-2"></i>Create Team
              </button>
            ) : inboxFilter !== 'team' ? (
              <button type="button" className="perplexity-button px-4 py-2 rounded-xl" onClick={() => handleComposeMessage()}>
                <i className="fas fa-plus mr-2"></i>Start New Conversation
              </button>
            ) : null}
          </div>
        ) : (
          <div className="legacy-inbox__items">
            {displayItems.map((item, index) => {
              if (item.type === "team") {
                const team = item.data;
                const memberNames = (team.members ?? [])
                  .map((memberId) => getUserName(getUser(users, memberId)))
                  .filter(Boolean);
                const previewMembers = memberNames.slice(0, 3).join(", ");
                const unreadCount = teamUnreadCounts.get(team.id) ?? 0;
                return (
                  <button
                    key={`team-${team.id}`}
                    type="button"
                    className="legacy-branch"
                    onClick={() => handleOpenTeam(team.id)}
                  >
                    <div className="legacy-branch__avatar">
                      <i className="fas fa-users"></i>
                      {unreadCount > 0 ? <span className="legacy-branch__badge">{unreadCount}</span> : null}
                    </div>
                    <div className="legacy-branch__body">
                      <div className="legacy-branch__header">
                        <h3>{team.name}</h3>
                        <span>{team.members?.length ?? 0} members</span>
                      </div>
                      <p className="legacy-branch__members">
                        {previewMembers}
                        {(team.members?.length ?? 0) > 3 ? "..." : ""}
                      </p>
                    </div>
                  </button>
                );
              }

              const message = item.data;
              const otherUserId = message.from === currentUserId ? message.to : message.from;
              const otherUser = getUser(users, otherUserId);
              const sender = getUserName(getUser(users, message.from));
              const otherName = getUserName(otherUser) ?? "System";
              const isUnread = message.to === currentUserId && !message.read;
              const isSentByMe = message.from === currentUserId;
              const category = getMessageCategory(message);
              const supervisionStatus = message.type === "supervision"
                ? (message.supervisionStatus ?? message.status ?? "pending")
                : null;
              let statusLabel = null;
              let tone = "info";
              if (message.type === "supervision" && supervisionStatus) {
                statusLabel = `Supervision ${buildStatusLabel(supervisionStatus)}`;
                tone = supervisionStatusTone[supervisionStatus] ?? "info";
              } else if (category === "stock") {
                statusLabel = buildStatusLabel(message.stockStatus ?? message.status);
                tone = stockStatusTone[message.stockStatus ?? message.status] ?? "info";
              }
              const isSystemAlert = message.category === "system-alert";

              return (
                <div
                  key={message.id ?? `${message.conversationId ?? 'message'}-${message.timestamp ?? message.createdAt ?? 'ts'}-${index}`}
                  role="button"
                  tabIndex={0}
                  className={`legacy-message ${isUnread ? "legacy-message--unread" : ""}`}
                  onClick={() => handleOpenMessage(message)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleOpenMessage(message);
                    }
                  }}
                >
                  <div className={`legacy-message__avatar ${isSystemAlert ? 'legacy-message__avatar--alert' : ''}`}>
                    {isSystemAlert ? <i className="fas fa-triangle-exclamation"></i> : <span>{getInitials(otherName)}</span>}
                    {isUnread ? <span className="legacy-message__dot" /> : null}
                  </div>
                  <div className="legacy-message__body">
                    <div className="legacy-message__header">
                      <div className="legacy-message__sender">
                        <span className={isSystemAlert ? "text-red-400" : "text-white"}>
                          {isSystemAlert ? "System Alert" : sender ?? "System"}
                        </span>
                        {isSentByMe ? (
                          <span className="legacy-message__sent-icon" aria-label="Sent">
                            <i className="fas fa-check-double"></i>
                          </span>
                        ) : null}
                        {statusLabel ? (
                          <span className={`legacy-message__status legacy-message__status--${tone}`}>
                            {statusLabel}
                          </span>
                        ) : null}
                      </div>
                      <span className="legacy-message__time">{formatMessageTime(message.timestamp)}</span>
                    </div>
                    <div className="legacy-message__subject">{message.subject}</div>
                    <div className="legacy-message__preview">{message.content}</div>
                    <div className="legacy-message__actions">
                      {message.type === 'supervision' && message.to === currentUserId && (message.supervisionStatus ?? message.status) === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSupervisionDecision(message, 'accept');
                            }}
                          >
                            <i className="fas fa-user-check mr-1"></i>Join supervision
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSupervisionDecision(message, 'decline');
                            }}
                          >
                            <i className="fas fa-user-times mr-1"></i>Decline
                          </button>
                        </>
                      ) : null}
                      {!message.read && message.to === currentUserId ? (
                        <button type="button" onClick={(event) => handleMarkAsRead(event, message)}>
                          <i className="fas fa-check mr-1"></i>Mark as read
                        </button>
                      ) : null}
                      {category !== "stock" ? (
                        <button type="button" onClick={(event) => handleQuickReply(event, message)}>
                          <i className="fas fa-reply mr-1"></i>Quick Reply
                        </button>
                      ) : null}
                      <button type="button" onClick={(event) => handleDeleteMessage(event, message)}>
                        <i className="fas fa-trash mr-1"></i>Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}








































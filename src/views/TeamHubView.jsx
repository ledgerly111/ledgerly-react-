import { useEffect, useMemo, useRef, useState } from 'react';
import TeamFormModal from '../components/BranchFormModal.jsx';
import TeamMembersModal from '../components/TeamMembersModal.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';

const labelStyles = {
  green: 'border-green-500 bg-green-500/10 text-green-200',
  yellow: 'border-yellow-500 bg-yellow-500/10 text-yellow-200',
  red: 'border-red-500 bg-red-500/10 text-red-200',
};

function formatTimestamp(value) {
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

export default function TeamHubView() {
  const {
    branches: teams,
    currentBranchId: currentTeamId,
    users,
    currentUser,
    announcements,
    messages,
    tasks,
    selectedCountry,
    accessibleUserIds = [],
    hasFeaturePermission,
  } = useAppState();
  const {
    openModal,
    closeModal,
    createBranch: createTeam,
    setCurrentTeam: setCurrentTeam,
    postTeamAnnouncement: postTeamAnnouncement,
    addTeamMessage: addTeamMessage,
    updateBranchMembers,
    setView,
    pushNotification,
  } = useAppActions();

  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementLabel, setAnnouncementLabel] = useState('green');
  const [chatMessage, setChatMessage] = useState('');
  const chatContainerRef = useRef(null);

  const canManageTeams = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'team.manageStructure');
    }
    return ['admin', 'manager'].includes(currentUser?.role ?? 'guest');
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const canViewAllTeams = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'team.viewAll');
    }
    return (currentUser?.role ?? 'guest') === 'admin';
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const canBroadcast = useMemo(() => {
    if (typeof hasFeaturePermission === 'function') {
      return hasFeaturePermission(currentUser?.id, 'inbox.broadcast');
    }
    return ['admin', 'manager'].includes(currentUser?.role ?? 'guest');
  }, [currentUser?.id, currentUser?.role, hasFeaturePermission]);

  const accessibleUserIdSet = useMemo(() => {
    return new Set(
      (accessibleUserIds ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    );
  }, [accessibleUserIds]);

  const accessibleUsers = useMemo(() => {
    if (canViewAllTeams) {
      return users;
    }
    if (accessibleUserIdSet.size === 0) {
      return [];
    }
    return users.filter((user) => accessibleUserIdSet.has(Number(user?.id)));
  }, [users, accessibleUserIdSet, canViewAllTeams]);

  const teamList = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (canViewAllTeams) {
      return teams;
    }
    if (canManageTeams) {
      return teams.filter((team) => {
        const members = Array.isArray(team.members) ? team.members : [];
        return members.every((memberId) => accessibleUserIdSet.has(Number(memberId)));
      });
    }
    return teams.filter((team) => Array.isArray(team.members) && team.members.includes(currentUser.id));
  }, [teams, currentUser, canViewAllTeams, canManageTeams, accessibleUserIdSet]);

  const selectedTeam = useMemo(() => {
    if (!teamList.length) {
      return null;
    }
    const match = teamList.find((team) => team.id === currentTeamId);
    return match ?? teamList[0] ?? null;
  }, [teamList, currentTeamId]);

  const isTeamCreator = selectedTeam ? selectedTeam.createdBy === currentUser?.id : false;
  const canPostAnnouncements = canBroadcast || isTeamCreator;

  useEffect(() => {
    if (!teamList.length) {
      if (currentTeamId != null) {
        setCurrentTeam(null);
      }
      return;
    }
    if (currentTeamId == null) {
      setCurrentTeam(teamList[0].id);
      return;
    }
    if (!teamList.some((team) => team.id === currentTeamId)) {
      setCurrentTeam(teamList[0].id);
    }
  }, [teamList, currentTeamId, setCurrentTeam]);

  const teamMembers = useMemo(() => {
    if (!selectedTeam) {
      return [];
    }
    return selectedTeam.members
      .map((memberId) => users.find((user) => user.id === memberId))
      .filter(Boolean);
  }, [selectedTeam, users]);

  const teamAnnouncements = useMemo(() => {
    if (!selectedTeam) {
      return [];
    }
    return announcements
      .filter((announcement) => announcement.branchId === selectedTeam.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [announcements, selectedTeam]);

  const teamMessages = useMemo(() => {
    if (!selectedTeam) {
      return [];
    }
    return messages
      .filter((message) => message.type === 'branch' && message.branchId === selectedTeam.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messages, selectedTeam]);

  const teamTasks = useMemo(() => {
    if (!selectedTeam) {
      return [];
    }
    return tasks.filter((task) => !task.isSubTask && task.branchId === selectedTeam.id);
  }, [tasks, selectedTeam]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [teamMessages.length]);

  const handleOpenTeamModal = () => {
    if (!canManageTeams) {
      pushNotification({
        type: 'warning',
        message: 'You do not have permission to manage teams.',
      });
      return;
    }
    openModal(TeamFormModal, {
      users: accessibleUsers,
      currentUserId: currentUser?.id ?? null,
      onCancel: closeModal,
      onSubmit: (payload) => {
        createTeam({ ...payload, createdBy: currentUser?.id ?? null });
        closeModal();
      },
    });
  };

  const handleAddMembers = () => {
    if (!canManageTeams) {
      pushNotification({
        type: 'warning',
        message: 'You do not have permission to manage teams.',
      });
      return;
    }
    if (!selectedTeam) {
      return;
    }
    openModal(TeamMembersModal, {
      team: selectedTeam,
      users: accessibleUsers,
      onCancel: closeModal,
      onSubmit: ({ memberIds }) => {
        updateBranchMembers({
          branchId: selectedTeam.id,
          memberIds,
        });
        closeModal();
      },
    });
  };

  const handleExitToInbox = () => {
    setCurrentTeam(null);
    setView('inbox');
  };

  const handleAnnouncementSubmit = (event) => {
    event.preventDefault();
    if (!selectedTeam || !announcementContent.trim() || !canPostAnnouncements) {
      if (!canPostAnnouncements) {
        pushNotification({
          type: 'warning',
          message: 'You do not have permission to post announcements.',
        });
      }
      return;
    }
    postTeamAnnouncement({
      branchId: selectedTeam.id,
      content: announcementContent.trim(),
      labelColor: announcementLabel,
    });
    setAnnouncementContent('');
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    if (!selectedTeam || !chatMessage.trim()) {
      return;
    }
    addTeamMessage({
      branchId: selectedTeam.id,
      content: chatMessage.trim(),
    });
    setChatMessage('');
  };

  if (!selectedTeam) {
    return (
      <div className="space-y-6 fade-in">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Team Hub</h2>
            <p className="text-gray-400">Coordinate teams, share announcements, and keep everyone aligned.</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-end">
            <button
              type="button"
              className="team-hub__exit-button"
              onClick={handleExitToInbox}
            >
              <i className="fas fa-inbox mr-2" />Back to inbox
            </button>
            {canManageTeams ? (
              <button
                type="button"
                className="perplexity-button px-4 py-2 rounded-xl font-medium"
                onClick={handleOpenTeamModal}
              >
                <i className="fas fa-users mr-2" />Add Team
              </button>
            ) : null}
          </div>
        </header>

        {teamList.length === 0 ? (
          <div className="perplexity-card p-6 text-center text-gray-400">
            <i className="fas fa-users text-4xl mb-3" />
            <p>{canManageTeams ? 'Create your first team to get started.' : 'You are not part of any teams yet.'}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teamList.map((team) => (
              <button
                key={team.id}
                type="button"
                className="flex h-full flex-col rounded-2xl border border-gray-700/60 bg-gray-900/40 p-5 text-left transition-colors hover:border-purple-400/60 hover:bg-gray-900"
                onClick={() => setCurrentTeam(team.id)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                  <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-300">
                    {team.members?.length ?? 0} members
                  </span>
                </div>
                <div className="mt-4 flex -space-x-2">
                  {team.members?.slice(0, 4).map((memberId) => {
                    const member = users.find((user) => user.id === memberId);
                    if (!member) {
                      return null;
                    }
                    return (
                      <div
                        key={member.id}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-900 bg-gradient-to-br from-teal-500 to-blue-500 text-sm font-semibold text-white"
                        title={member.name}
                      >
                        {member.name.charAt(0)}
                      </div>
                    );
                  })}
                  {team.members && team.members.length > 4 ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-900 bg-gray-800 text-xs font-semibold text-gray-200">
                      +{team.members.length - 4}
                    </div>
                  ) : null}
                </div>
                <p className="mt-4 text-sm text-gray-400">
                  Tap to view announcements, chat, and team tasks.
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            className="mb-3 inline-flex items-center text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200"
            onClick={() => setCurrentTeam(null)}
          >
            <i className="fas fa-arrow-left mr-2" />Back to team list
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{selectedTeam.name}</h2>
            <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
              {teamMembers.length} members
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <span key={member.id} className="rounded-full bg-gray-800/80 px-3 py-1 text-xs text-gray-300">
                {member.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-end">
          <button
            type="button"
            className="team-hub__exit-button"
            onClick={handleExitToInbox}
          >
            <i className="fas fa-inbox mr-2" />Back to inbox
          </button>
          {canManageTeams ? (
            <button
              type="button"
              className="perplexity-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              onClick={handleAddMembers}
            >
              <i className="fas fa-user-plus text-sm" />
              <span>Add Members</span>
            </button>
          ) : null}
          <div className="rounded-xl border border-gray-700/60 bg-gray-900/40 px-4 py-2 text-sm text-gray-300">
            <span className="font-semibold text-white">Team ID:</span>{' '}
            <span className="font-mono text-purple-300">{selectedTeam.id}</span>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="perplexity-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">Announcements</h3>
            {canPostAnnouncements ? (
              <form className="space-y-4 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4" onSubmit={handleAnnouncementSubmit}>
                <textarea
                  className="form-input w-full"
                  rows={3}
                  placeholder="Share an update with the team..."
                  value={announcementContent}
                  onChange={(event) => setAnnouncementContent(event.target.value)}
                  required
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-gray-400">Label</span>
                    {['green', 'yellow', 'red'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          announcementLabel === color ? 'border-white' : 'border-transparent'
                        } ${
                          color === 'green'
                            ? 'bg-green-500'
                            : color === 'yellow'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        onClick={() => setAnnouncementLabel(color)}
                        aria-label={`Set ${color} label`}
                      />
                    ))}
                  </div>
                  <button type="submit" className="perplexity-button px-4 py-2 text-sm font-semibold">
                    Post Announcement
                  </button>
                </div>
              </form>
            ) : null}

            <div className="mt-4 space-y-4">
              {teamAnnouncements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 p-6 text-center text-sm text-gray-400">
                  No announcements yet.
                </div>
              ) : (
                teamAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`rounded-xl border-l-4 p-4 ${labelStyles[announcement.labelColor] ?? 'border-gray-600 bg-gray-900/40 text-gray-200'}`}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        Posted by{' '}
                        {users.find((user) => user.id === announcement.createdBy)?.name ?? 'Unknown'}
                      </span>
                      <span>{formatTimestamp(announcement.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-sm text-white">{announcement.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="perplexity-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Team Chat</h3>
              <span className="text-xs uppercase tracking-wide text-gray-400">Real-time collaboration</span>
            </div>
            <div
              ref={chatContainerRef}
              className="whatsapp-chat-window max-h-72 overflow-y-auto pr-2"
            >
              {teamMessages.length === 0 ? (
                <div className="whatsapp-empty-state">
                  Start the conversation with your team.
                </div>
              ) : (
                teamMessages.map((message, index) => {
                  const sender = users.find((user) => user.id === message.from);
                  const isMine = message.from === currentUser?.id;
                  const formattedTimestamp = formatTimestamp(message.timestamp);
                  return (
                    <div
                      key={message.id ?? `${message.branchId ?? 'team'}-${message.timestamp ?? index}-${index}`}
                      className={`whatsapp-message ${isMine ? 'whatsapp-message--sent' : 'whatsapp-message--received'}`}
                    >
                      {!isMine ? (
                        <div className="whatsapp-avatar">
                          {sender?.name?.charAt(0) ?? 'U'}
                        </div>
                      ) : null}
                      <div
                        className={`whatsapp-bubble ${isMine ? 'whatsapp-bubble--sent' : 'whatsapp-bubble--received'}`}
                      >
                        {!isMine ? (
                          <div className="whatsapp-sender">{sender?.name ?? 'Unknown'}</div>
                        ) : null}
                        <div className="whatsapp-text">{message.content}</div>
                        <span className="whatsapp-timestamp">{formattedTimestamp}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form className="whatsapp-input-row" onSubmit={handleSendMessage}>
              <button type="button" className="whatsapp-icon-button" aria-label="Add emoji">
                <i className="fas fa-smile" />
              </button>
              <input
                type="text"
                className="whatsapp-input"
                placeholder="Type a message"
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
              />
              <button type="submit" className="whatsapp-send-button" aria-label="Send message">
                <i className="fas fa-paper-plane" />
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="perplexity-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Team Tasks</h3>
              <span className="text-xs uppercase tracking-wide text-gray-400">{teamTasks.length} assigned</span>
            </div>
            {teamTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 p-6 text-center text-sm text-gray-400">
                No tasks have been assigned to this team yet.
              </div>
            ) : (
              <div className="space-y-3">
                {teamTasks.map((task) => {
                  const progress = task.goalTarget > 0 ? Math.min((task.progress / task.goalTarget) * 100, 100) : 0;
                  return (
                    <div key={task.id} className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold text-white">{task.title}</h4>
                          <p className="text-sm text-gray-400">{task.description}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          task.status === 'completed'
                            ? 'bg-green-500/15 text-green-300'
                            : 'bg-blue-500/15 text-blue-200'
                        }`}>
                          {task.status === 'completed' ? 'Completed' : 'Live'}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-xs text-gray-300 sm:grid-cols-2">
                        <div className="flex items-center justify-between">
                          <span>Due Date</span>
                          <span>{task.dueDate ?? 'Not set'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Goal</span>
                          <span className="font-semibold text-white">
                            {task.goalType === 'count'
                              ? `${task.goalTarget} sales`
                              : formatCurrency(task.goalTarget, { countryCode: selectedCountry, showSymbol: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Progress</span>
                          <span className="font-semibold text-white">
                            {task.goalType === 'count'
                              ? `${task.progress} sales`
                              : formatCurrency(task.progress, { countryCode: selectedCountry, showSymbol: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Participants</span>
                          <span className="font-semibold text-white">{task.participants?.length ?? 0}/{task.participantLimit ?? '-'}
                          </span>
                        </div>
                      </dl>
                      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-800/80">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

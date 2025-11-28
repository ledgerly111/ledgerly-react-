import { useEffect, useRef } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';

export default function NotificationCenter() {
  const { notifications } = useAppState();
  const { dismissNotification } = useAppActions();
  const timersRef = useRef(new Map());

  useEffect(() => {
    notifications.forEach((note) => {
      if (!note.duration || timersRef.current.has(note.id)) return;
      const timer = setTimeout(() => {
        dismissNotification(note.id);
        timersRef.current.delete(note.id);
      }, note.duration);
      timersRef.current.set(note.id, timer);
    });

    timersRef.current.forEach((timer, id) => {
      if (!notifications.some((note) => note.id === id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });
  }, [notifications, dismissNotification]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  if (!notifications.length) {
    return null;
  }

  return (
    <div id="notification-container" className="notification-container">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification ${notification.type ?? 'info'}`}>
          <div className="notification__icon">
            <i className={`${notification.iconClass ?? 'fas fa-info-circle'} ${notification.colorClass ?? 'text-blue-400'} text-lg`}></i>
          </div>
          <div className="notification__content">
            <p className="notification__message">{notification.message}</p>
            {notification.description ? (
              <p className="notification__description">{notification.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="notification__dismiss"
            onClick={() => dismissNotification(notification.id)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { Notification } from '../types';
import { BellIcon, WrenchIcon, FilterIcon } from '../constants';
import Popover from './ui/Popover';
import Button from './ui/Button';

interface NotificationBellProps {
  notifications: Notification[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, isOpen, onToggle, onClose, onNotificationClick, onMarkAllAsRead }) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const getIconForType = (type: 'maintenance' | 'stock') => {
    switch(type) {
      case 'maintenance': return <WrenchIcon className="h-5 w-5 text-warning-foreground" />;
      case 'stock': return <FilterIcon className="h-5 w-5 text-destructive" />;
    }
  }

  const getBgForType = (type: 'maintenance' | 'stock') => {
    switch(type) {
      case 'maintenance': return 'bg-warning/20';
      case 'stock': return 'bg-destructive/20';
    }
  }

  const trigger = (
    <button
      onClick={onToggle}
      className="relative p-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label={`${unreadCount} unread notifications`}
    >
      <BellIcon className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <Popover isOpen={isOpen} onClose={onClose} trigger={trigger}>
      <div className="flex flex-col max-h-[60vh]">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={onMarkAllAsRead} className="text-xs">
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedNotifications.length > 0 ? (
            <ul className="divide-y divide-border">
              {sortedNotifications.map(notification => (
                <li key={notification.id} className={`${!notification.read ? 'bg-muted/50' : ''}`}>
                  <button onClick={() => onNotificationClick(notification)} className="w-full text-left p-3 hover:bg-accent transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getBgForType(notification.type)}`}>
                          {getIconForType(notification.type)}
                      </div>
                      <div className="flex-1">
                          <p className="text-sm">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                      </div>
                      {!notification.read && <div className="mt-1 w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center p-8">
              Vous n'avez aucune notification.
            </p>
          )}
        </div>
      </div>
    </Popover>
  );
};

export default NotificationBell;

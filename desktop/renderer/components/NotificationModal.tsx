import React from 'react';
import { Notification } from '../types';
import { WrenchIcon, FilterIcon, CheckCircleIcon } from '../constants';
import { Dialog, DialogHeader, DialogTitle, DialogContent } from './ui/Dialog';
import Button from './ui/Button';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getIconForType = (type: 'maintenance' | 'stock') => {
    switch (type) {
      case 'maintenance': return <WrenchIcon className="h-5 w-5 text-warning-foreground" />;
      case 'stock': return <FilterIcon className="h-5 w-5 text-destructive" />;
      default: return null;
    }
  }

  const getBgForType = (type: 'maintenance' | 'stock') => {
    switch (type) {
      case 'maintenance': return 'bg-warning/20';
      case 'stock': return 'bg-destructive/20';
      default: return 'bg-muted';
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="default">
      <DialogHeader className="border-b pb-4">
        <div className="flex items-center justify-between w-full">
          <DialogTitle className="text-xl">Notifications</DialogTitle>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={onMarkAllAsRead} className="text-xs h-8">
              <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </DialogHeader>
      <DialogContent className="p-0 max-h-[70vh]">
        {sortedNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {sortedNotifications.map(notification => (
              <button
                key={notification.id}
                onClick={() => {
                  onNotificationClick(notification);
                  onClose();
                }}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-start gap-4 ${!notification.read ? 'bg-primary/5' : ''}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getBgForType(notification.type)}`}>
                  {getIconForType(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm ${!notification.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {notification.message}
                    </p>
                    {!notification.read && <span className="ml-2 w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FilterIcon className="h-8 w-8 text-muted-foreground opacity-20" />
            </div>
            <p className="text-muted-foreground">Vous n'avez aucune notification pour le moment.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;

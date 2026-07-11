import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export const useNotificationRealtime = () => {
  const utils = trpc.useUtils();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        () => {
          utils.notifications.list.invalidate();
          utils.notifications.unreadCount.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, utils]);
};

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export const useMessageRealtime = () => {
  const utils = trpc.useUtils();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUser.id}`,
        },
        () => {
          utils.messages.listConversations.invalidate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        () => {
          utils.messages.listConversations.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, utils]);
};


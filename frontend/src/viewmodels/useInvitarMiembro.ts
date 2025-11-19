import { useEffect, useState } from 'react';
import * as groupsApi from '../api/groups';
import * as friendsApi from '../api/friends';
import { Alert } from 'react-native';

export function useInvitarMiembro(grupoId?: string) {
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const fetchInvite = async () => {
    if (!grupoId) return;
    setLoadingInvite(true);
    try {
      const res = await groupsApi.createInviteLink(grupoId, 43200);
      setInviteData(res);
    } catch (e) {
      console.error('createInviteLink error', e);
      // Friendly message when forbidden (not admin)
      const status = (e as any)?.response?.status;
      if (status === 403) {
        Alert.alert('Sin permisos', 'Solo los administradores del grupo pueden generar links de invitacion');
      }
      setInviteData(null);
    } finally {
      setLoadingInvite(false);
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await friendsApi.getFriends();
      const arr = Array.isArray(res) ? res : res?.friends ?? [];
      setFriends(arr);
    } catch (e) {
      console.error('getFriends error', e);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    fetchInvite();
    fetchFriends();
  }, [grupoId]);

  const addMember = async (friendId: string) => {
    if (!grupoId) throw new Error('NO_GROUP_ID');
    return groupsApi.addMembers(grupoId, [friendId]);
  };

  return { 
    inviteData, 
    loadingInvite, 
    friends, 
    loadingFriends, 
    fetchInvite, 
    fetchFriends, 
    addMember 
  };
}
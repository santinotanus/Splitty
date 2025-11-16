// frontend/src/viewmodels/useInvitarMiembro.ts
import { useEffect, useState } from 'react';
import * as groupsApi from '../api/groups';
import * as friendsApi from '../api/friends';

export function useInvitarMiembro(grupoId?: string) {
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const fetchInvite = async () => {
    if (!grupoId) return;
    setLoadingInvite(true);
    try {
      // Generar link con expiración de 30 días (43200 minutos)
      const res = await groupsApi.createInviteLink(grupoId, 43200);
      setInviteData(res);
    } catch (e) {
      console.error('createInviteLink error', e);
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
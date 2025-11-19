import { useEffect, useState } from 'react';
import { getMyGroupsOffline } from '../api/offlineApi';
import * as balancesApi from '../api/balances';
import { useNetwork } from '../contexts/NetworkContext';

export function useInicio() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const { isConnected, isInternetReachable } = useNetwork();
  const isOnline = isConnected && isInternetReachable;

  const fetchGroups = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getMyGroupsOffline();
      let groupsArr = Array.isArray(result.data) ? result.data : [];
      setFromCache(result.fromCache);

      try {
        const { loadGroupEmojis } = await import('../utils/groupEmoji');
        const map = await loadGroupEmojis();
        groupsArr = groupsArr.map((g: any) => ({ 
          ...g, 
          emoji: map[g.id] ?? g.emoji ?? '✈️' 
        }));
      } catch (e) {
        console.warn('Error loading emojis:', e);
        groupsArr = groupsArr.map((g: any) => ({ 
          ...g, 
          emoji: g.emoji ?? '✈️' 
        }));
      }

      if (isOnline) {
        try {
          const withBalances = await Promise.all(
            groupsArr.map(async (g: any) => {
              try {
                const res = await balancesApi.getMyBalance(g.id);
                return { ...g, saldo: res?.balance ?? 0 };
              } catch (e) {
                return { ...g, saldo: g.saldo ?? g.balance ?? 0 };
              }
            })
          );
          setGroups(withBalances);
        } catch (e) {
          console.warn('Error loading balances:', e);
          setGroups(groupsArr);
        }
      } else {
        setGroups(groupsArr);
      }
    } catch (e: any) {
      console.error('Error loading groups:', e);
      setError(isOnline ? 'Error cargando grupos' : 'Sin datos guardados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return { 
    groups, 
    loading, 
    error, 
    fromCache, 
    isOnline,
    refresh: fetchGroups 
  };
}

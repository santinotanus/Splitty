import { api } from './client';
import { OfflineCache, CACHE_KEYS } from '../utils/offlineCache';
import NetInfo from '@react-native-community/netinfo';

export class OfflineApi {
  static async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    // Some platforms may return `null` for isInternetReachable.
    // Treat `isConnected` as sufficient when `isInternetReachable` is not provided.
    const connected = Boolean(state.isConnected);
    const reachable = state.isInternetReachable;
    if (reachable === null || reachable === undefined) return connected;
    return connected && Boolean(reachable);
  }

  static async fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<{ data: T; fromCache: boolean }> {
    const isOnline = await this.isOnline();

    if (isOnline && !forceRefresh) {
      try {
        const data = await fetchFn();
        await OfflineCache.set(cacheKey, data);
        return { data, fromCache: false };
      } catch (error) {
        console.warn('⚠️ Error al obtener datos, usando cache:', error);
      }
    }

    const cached = await OfflineCache.get<T>(cacheKey);
    if (cached !== null) {
      console.log('📦 Usando datos del cache');
      return { data: cached, fromCache: true };
    }

    throw new Error('No hay conexión y no hay datos en cache');
  }
}

// === GRUPOS ===
export async function getMyGroupsOffline() {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.MY_GROUPS,
    async () => {
      const res = await api.get('/grupos');
      return res.data;
    }
  );
}

export async function getGroupMembersOffline(groupId: string) {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.GROUP_MEMBERS(groupId),
    async () => {
      const res = await api.get(`/grupos/${groupId}/miembros`);
      return res.data;
    }
  );
}

export async function getGroupExpensesOffline(groupId: string) {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.GROUP_EXPENSES(groupId),
    async () => {
      const res = await api.get(`/groups/${groupId}/expenses`);
      return res.data;
    }
  );
}

export async function getMyBalanceOffline(groupId: string) {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.GROUP_BALANCE(groupId),
    async () => {
      const res = await api.get(`/groups/${groupId}/my/balance`);
      return res.data;
    }
  );
}

export async function getGroupDetailsOffline(groupId: string) {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.GROUP_DETAILS(groupId),
    async () => {
      const res = await api.get(`/grupos/${groupId}`);
      // normalize: backend might return { id, nombre, descripcion, emoji }
      return res.data;
    }
  );
}

// === AMIGOS ===
export async function getFriendsOffline() {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.MY_FRIENDS,
    async () => {
      const res = await api.get('/amigos');
      return res.data;
    }
  );
}

export async function getPendingRequestsOffline() {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.PENDING_REQUESTS,
    async () => {
      const res = await api.get('/amigos/solicitudes/recibidas');
      return res.data;
    }
  );
}

// === PERFIL ===
export async function getUserProfileOffline() {
  return OfflineApi.fetchWithCache(
    CACHE_KEYS.USER_PROFILE,
    async () => {
      const res = await api.get('/users/me');
      return res.data;
    }
  );
}

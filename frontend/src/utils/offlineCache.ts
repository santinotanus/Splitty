import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@splitty_cache:';
let CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 días (puede cambiarse con setCacheExpiry)

export function setCacheExpiry(ms: number) {
  if (typeof ms === 'number' && ms > 0) CACHE_EXPIRY = ms;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class OfflineCache {
  static async set<T>(key: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
      console.log('✅ Cache guardado:', key);
    } catch (error) {
      console.error('❌ Error guardando cache:', error);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
        await this.remove(key);
        return null;
      }

      console.log('✅ Cache recuperado:', key);
      return entry.data;
    } catch (error) {
      console.error('❌ Error leyendo cache:', error);
      return null;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      console.log('🗑️ Cache eliminado:', key);
    } catch (error) {
      console.error('❌ Error eliminando cache:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('🗑️ Todo el cache eliminado');
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
    }
  }
}

export const CACHE_KEYS = {
  MY_GROUPS: 'my_groups',
  GROUP_MEMBERS: (groupId: string) => `group_members_${groupId}`,
  GROUP_EXPENSES: (groupId: string) => `group_expenses_${groupId}`,
  GROUP_BALANCE: (groupId: string) => `group_balance_${groupId}`,
  GROUP_DETAILS: (groupId: string) => `group_details_${groupId}`,
  MY_FRIENDS: 'my_friends',
  PENDING_REQUESTS: 'pending_requests',
  USER_PROFILE: 'user_profile',
};

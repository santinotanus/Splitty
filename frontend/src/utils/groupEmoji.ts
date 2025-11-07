import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'groupEmojis:v1';

export async function saveGroupEmoji(groupId: string, emoji: string) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[groupId] = emoji;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('saveGroupEmoji error', e);
  }
}

export async function loadGroupEmojis(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('loadGroupEmojis error', e);
    return {};
  }
}

export async function getEmojiForGroup(groupId: string): Promise<string | null> {
  const map = await loadGroupEmojis();
  return map[groupId] ?? null;
}

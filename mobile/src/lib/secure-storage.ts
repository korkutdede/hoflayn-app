import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;

function webStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStorage()?.getItem(key) ?? null;

    const count = Number(await SecureStore.getItemAsync(`${key}.__chunks`));
    if (!Number.isInteger(count) || count <= 0) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(`${key}.${index}`),
      ),
    );
    return chunks.every((chunk) => chunk !== null) ? chunks.join('') : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      webStorage()?.setItem(key, value);
      return;
    }

    const previousCount = Number(
      await SecureStore.getItemAsync(`${key}.__chunks`),
    );
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${key}.${index}`, chunk),
      ),
    );
    await SecureStore.setItemAsync(`${key}.__chunks`, String(chunks.length));
    await SecureStore.deleteItemAsync(key);

    if (Number.isInteger(previousCount) && previousCount > chunks.length) {
      await Promise.all(
        Array.from(
          { length: previousCount - chunks.length },
          (_, index) =>
            SecureStore.deleteItemAsync(`${key}.${index + chunks.length}`),
        ),
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      webStorage()?.removeItem(key);
      return;
    }

    const count = Number(await SecureStore.getItemAsync(`${key}.__chunks`));
    if (Number.isInteger(count) && count > 0) {
      await Promise.all(
        Array.from({ length: count }, (_, index) =>
          SecureStore.deleteItemAsync(`${key}.${index}`),
        ),
      );
    }
    await Promise.all([
      SecureStore.deleteItemAsync(`${key}.__chunks`),
      SecureStore.deleteItemAsync(key),
    ]);
  },
};

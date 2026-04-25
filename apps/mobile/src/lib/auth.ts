import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'eventaat_access_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    // no-op: treat missing key as cleared
  }
}

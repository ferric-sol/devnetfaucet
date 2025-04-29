import { kv } from "@vercel/kv";

/**
 * Helper function to safely get values from KV
 */
export async function safeKvGet<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch (error) {
    console.error(`Error getting value for key ${key}:`, error);
    return null;
  }
}

/**
 * Helper function to safely set values in KV
 */
export async function safeKvSet(key: string, value: any): Promise<boolean> {
  try {
    await kv.set(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting value for key ${key}:`, error);
    return false;
  }
}

/**
 * Helper function to safely delete values from KV
 */
export async function safeKvDelete(key: string): Promise<boolean> {
  try {
    await kv.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting key ${key}:`, error);
    return false;
  }
}

/**
 * Helper function to safely set values in KV with expiry time
 */
export async function safeKvSetWithExpiry(key: string, value: any, expirySeconds: number): Promise<boolean> {
  try {
    await kv.set(key, value, { ex: expirySeconds });
    return true;
  } catch (error) {
    console.error(`Error setting value with expiry for key ${key}:`, error);
    return false;
  }
}

/**
 * Safely get all keys with a specific prefix
 */
export async function safeKvGetKeys(prefix: string): Promise<string[]> {
  try {
    return await kv.keys(`${prefix}*`);
  } catch (error) {
    console.error(`Error getting keys with prefix ${prefix}:`, error);
    return [];
  }
} 
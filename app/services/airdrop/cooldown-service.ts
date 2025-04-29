import { kv } from "@vercel/kv";
import { safeKvGet, safeKvSet, safeKvDelete, safeKvSetWithExpiry } from "@/app/services/storage/kv-storage";

const DEFAULT_COOLDOWN_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_COOLDOWN_TIME_SEC = 24 * 60 * 60; // 24 hours in seconds

/**
 * Get the cooldown expiry timestamp for a user
 */
export async function getUserCooldownExpiry(username: string): Promise<number | null> {
  try {
    const key = `cooldown:${username.toLowerCase()}`;
    const expiry = await safeKvGet<number>(key);
    return expiry || null;
  } catch (error) {
    console.error('Error getting user cooldown expiry:', error);
    return null;
  }
}

/**
 * Check if a user is in cooldown
 */
export async function isUserInCooldown(username: string): Promise<boolean> {
  try {
    const expiry = await getUserCooldownExpiry(username);
    if (!expiry) return false;
    
    return Date.now() < expiry;
  } catch (error) {
    console.error('Error checking if user is in cooldown:', error);
    return false;
  }
}

/**
 * Set cooldown for a user
 */
export async function setUserCooldown(
  username: string, 
  durationMs: number = DEFAULT_COOLDOWN_TIME_MS
): Promise<boolean> {
  try {
    const key = `cooldown:${username.toLowerCase()}`;
    const expiry = Date.now() + durationMs;
    const durationSec = Math.ceil(durationMs / 1000);
    
    return await safeKvSetWithExpiry(key, expiry, durationSec);
  } catch (error) {
    console.error('Error setting user cooldown:', error);
    return false;
  }
}

/**
 * Reset cooldown for a user
 */
export async function resetUserCooldown(username: string): Promise<boolean> {
  try {
    const key = `cooldown:${username.toLowerCase()}`;
    await safeKvDelete(key);
    return true;
  } catch (error) {
    console.error('Error resetting user cooldown:', error);
    return false;
  }
}

/**
 * Get cooldown remaining time in milliseconds
 */
export async function getCooldownRemainingTime(username: string): Promise<number> {
  try {
    const expiry = await getUserCooldownExpiry(username);
    if (!expiry) return 0;
    
    const now = Date.now();
    return expiry > now ? expiry - now : 0;
  } catch (error) {
    console.error('Error getting cooldown remaining time:', error);
    return 0;
  }
} 
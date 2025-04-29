import { kv } from "@vercel/kv";
import { UpgradedUser } from "@/app/models/types";
import { safeKvGet, safeKvSet } from "@/app/services/storage/kv-storage";

/**
 * Check if a user is upgraded
 */
export async function isUserUpgraded(username: string): Promise<boolean> {
  try {
    const upgradedUsers = await safeKvGet<UpgradedUser[]>('upgraded_users') || [];
    return upgradedUsers.some(user => user.username.toLowerCase() === username.toLowerCase());
  } catch (error) {
    console.log('Error checking if user is upgraded:', error);
    return false;
  }
}

/**
 * Add a user to the upgraded list
 */
export async function addToUpgradedList(username: string): Promise<boolean> {
  try {
    const upgradedUsers = await safeKvGet<UpgradedUser[]>('upgraded_users') || [];
    
    // Check if already upgraded (case insensitive comparison)
    if (upgradedUsers.some(user => user.username.toLowerCase() === username.toLowerCase())) {
      return false;
    }
    
    // Add to upgraded list
    const newUpgradedUser: UpgradedUser = {
      username: username.toLowerCase(), // Store lowercase for consistency
      upgradedAt: Date.now()
    };
    
    const updatedUpgradedList = [...upgradedUsers, newUpgradedUser];
    await safeKvSet('upgraded_users', updatedUpgradedList);
    
    return true;
  } catch (error) {
    console.error('Error adding user to upgraded list:', error);
    return false;
  }
}

/**
 * Remove a user from the upgraded list
 */
export async function removeFromUpgradedList(username: string): Promise<boolean> {
  try {
    const upgradedUsers = await safeKvGet<UpgradedUser[]>('upgraded_users') || [];
    
    // Case insensitive removal
    const updatedUpgradedList = upgradedUsers.filter(
      user => user.username.toLowerCase() !== username.toLowerCase()
    );
    
    if (updatedUpgradedList.length === upgradedUsers.length) {
      return false; // No user was removed
    }
    
    await safeKvSet('upgraded_users', updatedUpgradedList);
    return true;
  } catch (error) {
    console.error('Error removing user from upgraded list:', error);
    return false;
  }
}

/**
 * Get all upgraded users
 */
export async function getUpgradedUsers(): Promise<UpgradedUser[]> {
  try {
    return await safeKvGet<UpgradedUser[]>('upgraded_users') || [];
  } catch (error) {
    console.log('Error getting upgraded users:', error);
    return [];
  }
} 
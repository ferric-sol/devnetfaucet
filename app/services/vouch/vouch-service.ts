import { kv } from "@vercel/kv";
import { VouchRecord } from "@/app/models/types";
import { safeKvGet, safeKvSet, safeKvDelete } from "@/app/services/storage/kv-storage";
import { resetUserCooldown } from "@/app/services/airdrop/cooldown-service";

/**
 * Store a vouch request for a user
 */
export async function storeVouchRequest(username: string): Promise<void> {
  try {
    // Get existing vouch requests
    const existingRequests = await safeKvGet<string[]>('vouch_requests') || [];
    
    // Add new request if not already in the list
    if (!existingRequests.includes(username)) {
      const updatedRequests = [...existingRequests, username];
      await safeKvSet('vouch_requests', updatedRequests);
    }
  } catch (error) {
    console.error('Failed to store vouch request:', error);
  }
}

/**
 * Get all vouch requests
 */
export async function getVouchRequests(): Promise<string[]> {
  try {
    return await safeKvGet<string[]>('vouch_requests') || [];
  } catch (error) {
    console.log('Error getting vouch requests:', error);
    return [];
  }
}

/**
 * Check if a user is vouched
 */
export async function isUserVouched(username: string): Promise<boolean> {
  try {
    const vouchedUsers = await safeKvGet<VouchRecord[]>('vouched_users') || [];
    return vouchedUsers.some(record => record.username === username);
  } catch (error) {
    console.log('Error checking if user is vouched:', error);
    return false;
  }
}

/**
 * Vouch for a user
 */
export async function vouchForUser(username: string, voucherUsername: string, voucherType: 'github' | 'upgraded'): Promise<boolean> {
  try {
    // Check if user is already vouched
    if (await isUserVouched(username)) {
      return false;
    }
    
    // Get existing vouched users
    const vouchedUsers = await safeKvGet<VouchRecord[]>('vouched_users') || [];
    
    // Create new vouch record
    const vouchRecord: VouchRecord = {
      username,
      vouchedBy: voucherUsername,
      timestamp: Date.now(),
      voucherType
    };
    
    // Add to vouched users
    const updatedVouchedUsers = [...vouchedUsers, vouchRecord];
    await safeKvSet('vouched_users', updatedVouchedUsers);
    
    // Remove from vouch requests
    const vouchRequests = await safeKvGet<string[]>('vouch_requests') || [];
    const updatedRequests = vouchRequests.filter(req => req !== username);
    await safeKvSet('vouch_requests', updatedRequests);
    
    // Reset the user's airdrop cooldown timer
    try {
      // Use the cooldown service to reset the timer
      await resetUserCooldown(username);
      console.log(`Reset airdrop cooldown timer for ${username}`);
    } catch (error) {
      console.log('Error resetting airdrop cooldown timer:', error);
      // Continue even if this fails, as it's not critical
    }
    
    return true;
  } catch (error) {
    console.error('Failed to vouch for user:', error);
    return false;
  }
}

/**
 * Remove a vouch for a user
 */
export async function unvouchUser(username: string): Promise<boolean> {
  try {
    // Get existing vouched users
    const vouchedUsers = await safeKvGet<VouchRecord[]>('vouched_users') || [];
    
    // Remove the user from vouched users
    const updatedVouched = vouchedUsers.filter(record => record.username !== username);
    
    // Check if there was actually a change
    if (updatedVouched.length === vouchedUsers.length) {
      return false; // No user was removed
    }
    
    // Store updated vouched users
    await safeKvSet('vouched_users', updatedVouched);
    
    // Note: We don't restore the cooldown timer when unvouching
    // This allows the user to still use any remaining time from their vouched status
    // If they've already used their airdrop, they'll need to wait for the normal cooldown
    
    return true;
  } catch (error) {
    console.error('Failed to unvouch user:', error);
    return false;
  }
}

/**
 * Get all vouched users
 */
export async function getVouchedUsers(): Promise<VouchRecord[]> {
  try {
    return await safeKvGet<VouchRecord[]>('vouched_users') || [];
  } catch (error) {
    console.log('Error getting vouched users:', error);
    return [];
  }
} 
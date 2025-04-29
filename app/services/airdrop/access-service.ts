import { kv } from "@vercel/kv";
import { AccessRequest, WhitelistedUser, RejectedUser } from "@/app/models/types";
import { safeKvGet, safeKvSet } from "@/app/services/storage/kv-storage";

/**
 * Store an access request
 */
export async function storeAccessRequest(username: string, reason: string): Promise<void> {
  try {
    const now = Date.now();
    const request: AccessRequest = {
      username,
      reason,
      timestamp: now
    };
    
    // Get existing requests
    const existingRequests = await safeKvGet<AccessRequest[]>('access_requests') || [];
    
    // Add new request
    const updatedRequests = [...existingRequests, request];
    
    // Keep only the last 100 requests
    const limitedRequests = updatedRequests.length > 100 
      ? updatedRequests.slice(-100) 
      : updatedRequests;
    
    // Store updated requests
    await safeKvSet('access_requests', limitedRequests);
  } catch (error) {
    console.error('Failed to store access request:', error);
  }
}

/**
 * Get all access requests
 */
export async function getAccessRequests(): Promise<AccessRequest[]> {
  try {
    return await safeKvGet<AccessRequest[]>('access_requests') || [];
  } catch (error) {
    console.log('Error getting access requests:', error);
    return [];
  }
}

/**
 * Check if user is whitelisted
 */
export async function isUserWhitelisted(username: string): Promise<boolean> {
  try {
    const whitelistedUsers = await safeKvGet<WhitelistedUser[]>('whitelisted_users') || [];
    return whitelistedUsers.some(user => user.username === username);
  } catch (error) {
    console.log('Error checking if user is whitelisted:', error);
    return false;
  }
}

/**
 * Add a user to the whitelist
 */
export async function addToWhitelist(username: string): Promise<boolean> {
  try {
    const whitelistedUsers = await safeKvGet<WhitelistedUser[]>('whitelisted_users') || [];
    
    // Check if already whitelisted
    if (whitelistedUsers.some(user => user.username === username)) {
      return false;
    }
    
    // Add to whitelist
    const newWhitelistedUser: WhitelistedUser = {
      username,
      approvedAt: Date.now()
    };
    
    const updatedWhitelist = [...whitelistedUsers, newWhitelistedUser];
    await safeKvSet('whitelisted_users', updatedWhitelist);
    
    return true;
  } catch (error) {
    console.error('Error adding user to whitelist:', error);
    return false;
  }
}

/**
 * Get all whitelisted users
 */
export async function getWhitelistedUsers(): Promise<WhitelistedUser[]> {
  try {
    return await safeKvGet<WhitelistedUser[]>('whitelisted_users') || [];
  } catch (error) {
    console.log('Error getting whitelisted users:', error);
    return [];
  }
}

/**
 * Add a user to the rejected list
 */
export async function addToRejectedList(username: string): Promise<boolean> {
  try {
    const rejectedUsers = await safeKvGet<RejectedUser[]>('rejected_users') || [];
    
    // Check if already rejected
    if (rejectedUsers.some(user => user.username === username)) {
      return false;
    }
    
    // Add to rejected list
    const newRejectedUser: RejectedUser = {
      username,
      rejectedAt: Date.now()
    };
    
    const updatedRejectedList = [...rejectedUsers, newRejectedUser];
    await safeKvSet('rejected_users', updatedRejectedList);
    
    return true;
  } catch (error) {
    console.error('Error adding user to rejected list:', error);
    return false;
  }
}

/**
 * Get all rejected users
 */
export async function getRejectedUsers(): Promise<RejectedUser[]> {
  try {
    return await safeKvGet<RejectedUser[]>('rejected_users') || [];
  } catch (error) {
    console.log('Error getting rejected users:', error);
    return [];
  }
}

/**
 * Remove user from access requests
 */
export async function removeFromAccessRequests(username: string): Promise<boolean> {
  try {
    const accessRequests = await safeKvGet<AccessRequest[]>('access_requests') || [];
    const updatedRequests = accessRequests.filter(req => req.username !== username);
    
    if (updatedRequests.length === accessRequests.length) {
      return false; // No request was removed
    }
    
    await safeKvSet('access_requests', updatedRequests);
    return true;
  } catch (error) {
    console.error('Error removing user from access requests:', error);
    return false;
  }
}

/**
 * Remove user from whitelist
 */
export async function removeFromWhitelist(username: string): Promise<boolean> {
  try {
    const whitelistedUsers = await safeKvGet<WhitelistedUser[]>('whitelisted_users') || [];
    const updatedWhitelist = whitelistedUsers.filter(user => user.username !== username);
    
    if (updatedWhitelist.length === whitelistedUsers.length) {
      return false; // No user was removed
    }
    
    await safeKvSet('whitelisted_users', updatedWhitelist);
    return true;
  } catch (error) {
    console.error('Error removing user from whitelist:', error);
    return false;
  }
}

/**
 * Remove user from rejected list
 */
export async function removeFromRejectedList(username: string): Promise<boolean> {
  try {
    const rejectedUsers = await safeKvGet<RejectedUser[]>('rejected_users') || [];
    const updatedRejectedList = rejectedUsers.filter(user => user.username !== username);
    
    if (updatedRejectedList.length === rejectedUsers.length) {
      return false; // No user was removed
    }
    
    await safeKvSet('rejected_users', updatedRejectedList);
    return true;
  } catch (error) {
    console.error('Error removing user from rejected list:', error);
    return false;
  }
} 
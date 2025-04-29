import { kv } from "@vercel/kv";
import { AirdropRecord } from "@/app/models/types";
import { safeKvGet, safeKvSet } from "@/app/services/storage/kv-storage";

// In-memory fallback for airdrop history
const inMemoryAirdropHistory = new Array<AirdropRecord>();

/**
 * Store an airdrop record in history
 */
export async function storeAirdropRecord(record: AirdropRecord): Promise<void> {
  try {
    // Get existing records
    let history: AirdropRecord[] = [];
    
    const existingHistory = await safeKvGet<AirdropRecord[]>('airdrop_history');
    if (existingHistory) {
      history = existingHistory;
    }

    // Add new record to the beginning of the array
    history.unshift(record);
    
    // Keep only the last 100 records
    if (history.length > 100) {
      history = history.slice(0, 100);
    }

    // Store updated history
    await safeKvSet('airdrop_history', history);
  } catch (error) {
    console.error('Failed to store airdrop record:', error);
    
    // Update in-memory history as fallback
    inMemoryAirdropHistory.unshift(record);
    if (inMemoryAirdropHistory.length > 100) {
      inMemoryAirdropHistory.length = 100;
    }
  }
}

/**
 * Get recent airdrops with limit
 */
export async function getRecentAirdrops(limit: number = 10): Promise<AirdropRecord[]> {
  try {
    const history = await safeKvGet<AirdropRecord[]>('airdrop_history');
    if (history) {
      return history.slice(0, limit);
    }
  } catch (error) {
    console.log('Error getting airdrop history, using in-memory fallback:', error);
    return [...inMemoryAirdropHistory].slice(0, limit);
  }
  
  return [];
} 
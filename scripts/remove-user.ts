#!/usr/bin/env ts-node

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { kv } from "@vercel/kv";
import { resetUserCooldown } from "../app/services/airdrop/cooldown-service";
import { safeKvGet, safeKvSet } from "../app/services/storage/kv-storage";
import { AirdropRecord, VouchRecord, WhitelistedUser, UpgradedUser, AccessRequest } from "../app/models/types";

/**
 * Script to completely remove a user for testing
 * 
 * Usage: ts-node scripts/remove-user.ts <github-username>
 * 
 * This will:
 * 1. Remove any cooldown for the user
 * 2. Remove the user from vouched users
 * 3. Remove the user from whitelist
 * 4. Remove the user from upgraded users
 * 5. Remove the user from airdrop history
 * 6. Remove the user from vouch requests
 * 7. Remove the user from pending whitelist requests (access_requests)
 */

async function removeUser(username: string) {
  if (!username) {
    console.error("Please provide a GitHub username");
    process.exit(1);
  }

  console.log(`Removing user: ${username}`);
  
  // 1. Reset cooldown
  await resetUserCooldown(username);
  console.log("✅ Reset cooldown");
  
  // 2. Remove from vouched users
  try {
    const vouchedUsers = await safeKvGet<VouchRecord[]>('vouched_users') || [];
    const updatedVouched = vouchedUsers.filter(record => record.username !== username);
    await safeKvSet('vouched_users', updatedVouched);
    console.log(`✅ Removed from vouched users (${vouchedUsers.length - updatedVouched.length} records)`);
  } catch (error) {
    console.error("❌ Error removing from vouched users:", error);
  }
  
  // 3. Remove from whitelist
  try {
    const whitelistedUsers = await safeKvGet<WhitelistedUser[]>('whitelisted_users') || [];
    const updatedWhitelist = whitelistedUsers.filter(user => user.username !== username);
    await safeKvSet('whitelisted_users', updatedWhitelist);
    console.log(`✅ Removed from whitelist (${whitelistedUsers.length - updatedWhitelist.length} records)`);
  } catch (error) {
    console.error("❌ Error removing from whitelist:", error);
  }
  
  // 4. Remove from upgraded users
  try {
    const upgradedUsers = await safeKvGet<UpgradedUser[]>('upgraded_users') || [];
    const updatedUpgraded = upgradedUsers.filter(user => user.username.toLowerCase() !== username.toLowerCase());
    await safeKvSet('upgraded_users', updatedUpgraded);
    console.log(`✅ Removed from upgraded users (${upgradedUsers.length - updatedUpgraded.length} records)`);
  } catch (error) {
    console.error("❌ Error removing from upgraded users:", error);
  }
  
  // 5. Remove from airdrop history
  try {
    const history = await safeKvGet<AirdropRecord[]>('airdrop_history') || [];
    const updatedHistory = history.filter(record => record.username !== username);
    await safeKvSet('airdrop_history', updatedHistory);
    console.log(`✅ Removed from airdrop history (${history.length - updatedHistory.length} records)`);
  } catch (error) {
    console.error("❌ Error removing from airdrop history:", error);
  }
  
  // 6. Remove from vouch requests
  try {
    const vouchRequests = await safeKvGet<string[]>('vouch_requests') || [];
    const updatedRequests = vouchRequests.filter(req => req !== username);
    await safeKvSet('vouch_requests', updatedRequests);
    console.log(`✅ Removed from vouch requests (${vouchRequests.length - updatedRequests.length} records)`);
  } catch (error) {
    console.error("❌ Error removing from vouch requests:", error);
  }
  
  // 7. Remove from pending whitelist requests (access_requests)
  try {
    const accessRequests = await safeKvGet<AccessRequest[]>('access_requests') || [];
    const updatedAccessRequests = accessRequests.filter(req => req.username !== username);
    await safeKvSet('access_requests', updatedAccessRequests);
    console.log(`✅ Removed from pending whitelist requests (${accessRequests.length - updatedAccessRequests.length} records)`);
  } catch (error) {
    console.error("❌ Error removing from pending whitelist requests:", error);
  }
  
  console.log("✅ User completely removed from the system");
}

// Get username from command line argument
const username = process.argv[2];
removeUser(username)
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  }); 
// Define the structure for airdrop records
export interface AirdropRecord {
  username: string;
  walletAddress: string;
  timestamp: number;
  isAnonymous?: boolean;
}

// Define the structure for vouch records
export interface VouchRecord {
  username: string;
  vouchedBy: string;
  timestamp: number;
  voucherType: 'github' | 'upgraded';
}

// Define GitHub repository interfaces
export interface Repository {
  url: string;
  missing?: boolean;
}

export interface TomlData {
  repo?: Repository[];
}

// Define user types
export interface WhitelistedUser {
  username: string;
  approvedAt: number;
}

export interface UpgradedUser {
  username: string;
  upgradedAt: number;
}

export interface RejectedUser {
  username: string;
  rejectedAt: number;
}

export interface AccessRequest {
  username: string;
  reason: string;
  timestamp: number;
}

// Define vouch request structure
export interface VouchRequest {
  username: string;
  timestamp: number;
} 
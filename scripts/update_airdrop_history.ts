import { kv } from "@vercel/kv";

async function updateAirdropHistory() {
  try {
    // Get current airdrop history
    const history = await kv.get('airdrop_history') as any[] || [];
    
    if (history.length === 0) {
      console.log('No airdrop history found');
      return;
    }

    // Update the first record
    history[0] = {
      ...history[0],
      isAnonymous: true
    };

    // Store updated history
    await kv.set('airdrop_history', history);
    
    console.log('Successfully updated first airdrop record to anonymous');
  } catch (error) {
    console.error('Error updating airdrop history:', error);
  }
}

// Run the update
updateAirdropHistory(); 
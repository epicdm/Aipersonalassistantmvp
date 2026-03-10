#!/usr/bin/env node
/**
 * update-lk-trunk.js
 * 
 * Updates LiveKit SIP trunks to ensure:
 * 1. BFF WA Inbound trunk (ST_vr8WP5pC6qLa) also allows BFF server IP 66.118.37.63
 * 2. Dispatch rule SDR_kwnCC6cVrgsB routes to epic-voice-agent (verify)
 * 3. EPIC Shared Inbound trunk (ST_WEc3Hz4Xerb9) allows BFF server IP
 * 
 * Run: node /opt/bff/update-lk-trunk.js
 */

const { SipClient } = require('livekit-server-sdk');

const LK_URL = 'https://ai-agent-dl6ldsi8.livekit.cloud';
const LK_API_KEY = 'APIfFhqC7dRApB2';
const LK_API_SECRET = 'U5ln2qZ6BDX1SwYBnla31AgcyhInbSuepNDYPIfhs9V';

const BFF_IP = '66.118.37.63';

// Trunk IDs
const BFF_WA_TRUNK_ID = 'ST_vr8WP5pC6qLa';   // BFF WA Inbound (+17672950333)
const SHARED_TRUNK_ID = 'ST_WEc3Hz4Xerb9';     // EPIC Shared Inbound
const DISPATCH_RULE_ID = 'SDR_kwnCC6cVrgsB';   // BFF WA -> Jenny

const client = new SipClient(LK_URL, LK_API_KEY, LK_API_SECRET);

async function main() {
  console.log('=== LiveKit Trunk Updater ===\n');

  // 1. List current trunks to see current state
  const trunks = await client.listSipInboundTrunk();
  
  // Update BFF WA Inbound trunk - add BFF server IP to allowedAddresses
  const bffWaTrunk = trunks.find(t => t.sipTrunkId === BFF_WA_TRUNK_ID);
  if (!bffWaTrunk) {
    console.error(`ERROR: Trunk ${BFF_WA_TRUNK_ID} not found!`);
    process.exit(1);
  }

  console.log(`BFF WA Inbound Trunk: ${bffWaTrunk.name}`);
  console.log(`  Numbers: ${bffWaTrunk.numbers.join(', ')}`);
  console.log(`  Current allowed IPs: ${bffWaTrunk.allowedAddresses.join(', ')}`);

  // Add BFF server IP if not already there
  const bffWaAddresses = [...new Set([...bffWaTrunk.allowedAddresses, BFF_IP])];
  
  if (bffWaAddresses.length !== bffWaTrunk.allowedAddresses.length) {
    console.log(`\n  ➜ Adding ${BFF_IP} to allowed addresses...`);
    await client.updateSipInboundTrunk(BFF_WA_TRUNK_ID, {
      name: bffWaTrunk.name,
      numbers: bffWaTrunk.numbers,
      allowedAddresses: bffWaAddresses,
      headers: bffWaTrunk.headers,
      headersToAttributes: bffWaTrunk.headersToAttributes,
      krispEnabled: bffWaTrunk.krispEnabled,
    });
    console.log(`  ✓ Updated! Allowed IPs: ${bffWaAddresses.join(', ')}`);
  } else {
    console.log(`  ✓ ${BFF_IP} already in allowed addresses, no update needed`);
  }

  // 2. Update EPIC Shared Inbound trunk - add BFF server IP
  const sharedTrunk = trunks.find(t => t.sipTrunkId === SHARED_TRUNK_ID);
  if (sharedTrunk) {
    console.log(`\nEPIC Shared Inbound Trunk: ${sharedTrunk.name}`);
    console.log(`  Current allowed IPs: ${sharedTrunk.allowedAddresses.join(', ')}`);

    const sharedAddresses = [...new Set([...sharedTrunk.allowedAddresses, BFF_IP])];
    if (sharedAddresses.length !== sharedTrunk.allowedAddresses.length) {
      console.log(`  ➜ Adding ${BFF_IP} to allowed addresses...`);
      await client.updateSipInboundTrunk(SHARED_TRUNK_ID, {
        name: sharedTrunk.name,
        numbers: sharedTrunk.numbers,
        allowedAddresses: sharedAddresses,
        krispEnabled: sharedTrunk.krispEnabled,
      });
      console.log(`  ✓ Updated!`);
    } else {
      console.log(`  ✓ ${BFF_IP} already present`);
    }
  }

  // 3. Verify dispatch rule
  const rules = await client.listSipDispatchRule();
  const dispatchRule = rules.find(r => r.sipDispatchRuleId === DISPATCH_RULE_ID);
  
  if (dispatchRule) {
    console.log(`\nDispatch Rule: ${dispatchRule.name}`);
    console.log(`  Trunk IDs: ${dispatchRule.trunkIds.join(', ')}`);
    const agents = dispatchRule.roomConfig?.agents || [];
    agents.forEach(a => console.log(`  Agent: ${a.agentName}`));
    console.log(`  ✓ Dispatch rule verified`);
  } else {
    console.log(`\nWARN: Dispatch rule ${DISPATCH_RULE_ID} not found!`);
  }

  console.log('\n=== Done ===');
  console.log('\nSummary:');
  console.log('  - BFF WA Inbound trunk accepts calls from Meta + BFF server');
  console.log('  - epic-voice-agent handles inbound calls via dispatch rule');
  console.log('  - Agent registered at wss://ai-agent-dl6ldsi8.livekit.cloud');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

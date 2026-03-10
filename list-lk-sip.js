#!/usr/bin/env node
const { SipClient } = require('livekit-server-sdk');

const client = new SipClient(
  'https://ai-agent-dl6ldsi8.livekit.cloud',
  'APIfFhqC7dRApB2',
  'U5ln2qZ6BDX1SwYBnla31AgcyhInbSuepNDYPIfhs9V'
);

async function main() {
  try {
    const trunks = await client.listSipInboundTrunk();
    console.log('=== INBOUND TRUNKS ===');
    console.log(JSON.stringify(trunks, null, 2));
  } catch (e) {
    console.error('Error listing trunks:', e.message);
  }

  try {
    const rules = await client.listSipDispatchRule();
    console.log('\n=== DISPATCH RULES ===');
    console.log(JSON.stringify(rules, null, 2));
  } catch (e) {
    console.error('Error listing dispatch rules:', e.message);
  }
}

main();

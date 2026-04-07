const { SipClient } = require('./node_modules/livekit-server-sdk');

const client = new SipClient(
  'https://ai-agent-dl6ldsi8.livekit.cloud',
  'APIfFhqC7dRApB2',
  'U5ln2qZ6BDX1SwYBnla31AgcyhInbSuepNDYPIfhs9V'
);

async function main() {
  const trunk = await client.createSipInboundTrunk({
    name: 'WA-Voice-3742',
    numbers: ['+17678183742'],
    allowedAddresses: ['66.118.37.12'],
    mediaEncryption: 'SIP_MEDIA_ENCRYPT_DISABLE',
    krispEnabled: true,
  });
  console.log('TRUNK_ID:', trunk.sipTrunkId);

  const rule = await client.createSipDispatchRule({
    name: 'WA-3742-Dispatch',
    trunkIds: [trunk.sipTrunkId],
    rule: {
      dispatchRuleIndividual: {
        roomPrefix: 'wa-call-',
      }
    },
    attributes: {
      agentName: 'aria',
      channel: 'whatsapp-voice',
    }
  });
  console.log('DISPATCH_ID:', rule.sipDispatchRuleId);
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });

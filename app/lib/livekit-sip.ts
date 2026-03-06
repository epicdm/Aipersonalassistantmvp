/**
 * LiveKit SIP integration for AIVA
 * Creates inbound trunks + dispatch rules so phone calls route to the single LiveKit agent
 */

import { SipClient, RoomConfiguration, RoomAgentDispatch } from "livekit-server-sdk";

const LK_URL = process.env.LIVEKIT_URL || "";
const LK_KEY = process.env.LIVEKIT_API_KEY || "";
const LK_SECRET = process.env.LIVEKIT_API_SECRET || "";
const MAGNUS_SIP_IP = process.env.MAGNUS_SIP_IP || "157.245.83.64";
const AGENT_NAME = process.env.LIVEKIT_AGENT_NAME || "epic-voice-agent";

function getSipClient() {
  if (!LK_URL || !LK_KEY || !LK_SECRET) {
    throw new Error("LiveKit credentials not configured");
  }
  const httpUrl = LK_URL.replace("wss://", "https://").replace("ws://", "http://");
  return new SipClient(httpUrl, LK_KEY, LK_SECRET);
}

/**
 * Create an inbound SIP trunk for a phone number
 */
export async function createInboundTrunk(
  phoneNumber: string,
  agentId: string,
  userId: string
) {
  const sip = getSipClient();
  const formatted = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

  const trunk = await sip.createSipInboundTrunk(
    `AIVA Inbound - ${formatted}`,
    [formatted],
    {
      allowedAddresses: [MAGNUS_SIP_IP],
      krispEnabled: true,
      headers: {
        "X-Platform": "AIVA",
        "X-Agent-ID": agentId,
        "X-User-ID": userId,
      },
      headersToAttributes: {
        "X-Agent-ID": "agent_id",
      },
    }
  );

  return {
    trunkId: trunk.sipTrunkId,
    numbers: trunk.numbers ? Array.from(trunk.numbers) : [formatted],
  };
}

/**
 * Create a dispatch rule to route inbound calls to the AI agent
 */
export async function createDispatchRule(
  trunkId: string,
  phoneNumber: string,
  agentId: string,
  userId: string
) {
  const sip = getSipClient();
  const digits = phoneNumber.replace(/\D/g, "");
  const roomPrefix = `sip-${digits}__`;

  const metadata = JSON.stringify({
    agent_id: agentId,
    user_id: userId,
    phone_number: phoneNumber,
    platform: "aiva",
  });

  const roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: AGENT_NAME,
        metadata: JSON.stringify({
          source: "inbound_call",
          agent_id: agentId,
          user_id: userId,
          phone_number: phoneNumber,
        }),
      }),
    ],
  });

  const rule = await sip.createSipDispatchRule(
    { type: "individual", roomPrefix },
    {
      name: `Route ${phoneNumber} -> ${AGENT_NAME}`,
      trunkIds: [trunkId],
      hidePhoneNumber: false,
      metadata,
      roomConfig,
    }
  );

  return {
    ruleId: rule.sipDispatchRuleId,
  };
}

/**
 * Full provisioning: create inbound trunk + dispatch rule
 */
export async function provisionLiveKitSip(
  phoneNumber: string,
  agentId: string,
  userId: string
) {
  const trunk = await createInboundTrunk(phoneNumber, agentId, userId);
  const rule = await createDispatchRule(trunk.trunkId, phoneNumber, agentId, userId);

  return {
    trunkId: trunk.trunkId,
    ruleId: rule.ruleId,
    numbers: trunk.numbers,
  };
}

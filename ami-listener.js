#!/usr/bin/env node
/**
 * EPIC AI — Asterisk AMI Listener
 * Connects to voice00.epic.dm AMI and sends WhatsApp notifications
 * for missed calls, call completions, etc.
 */

const net = require('net');
const fetch = require('node-fetch');

const AMI_HOST = '157.245.83.64';
const AMI_PORT = 5038;
const AMI_USER = 'epic-ai-app';
const AMI_SECRET = 'magnT6OtlpQHt74bwMj6ussolution';

const WA_TOKEN = process.env.META_WA_TOKEN || '';
const WA_PHONE_ID = process.env.META_PHONE_ID || '1003873729481088';
const BFF_DB_URL = process.env.DATABASE_URL || 'postgresql://ocmt:ocmt_secure_2026@localhost:5432/bff';
const BFF_API = 'http://localhost:3015';

// Active call tracking
const activeCalls = new Map(); // uniqueid -> { callerPhone, didNumber, startTime, answered }

let socket = null;
let reconnectTimer = null;
let buffer = '';

function sendAction(action) {
  if (!socket || socket.destroyed) return;
  const msg = Object.entries(action).map(([k,v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n';
  socket.write(msg);
}

function parseMessage(raw) {
  const lines = raw.split('\r\n').filter(Boolean);
  const obj = {};
  for (const line of lines) {
    const idx = line.indexOf(': ');
    if (idx > -1) {
      obj[line.slice(0, idx)] = line.slice(idx + 2);
    }
  }
  return obj;
}

async function sendWhatsApp(to, message) {
  if (!WA_TOKEN || !to) return;
  const phone = to.replace(/\D/g, '');
  if (phone.length < 7) return;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    });
    const data = await res.json();
    if (data.error) console.error('[WA Error]', data.error.message);
    else console.log('[WA Sent] to', phone);
  } catch (e) {
    console.error('[WA Failed]', e.message);
  }
}

async function findAgentByDID(didNumber) {
  try {
    const clean = didNumber.replace(/\D/g, '');
    const res = await fetch(`${BFF_API}/api/voip/status/${clean}`).catch(() => null);
    if (res && res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return null;
}

async function handleEvent(event) {
  const eventType = event.Event;

  // Track new channels
  if (eventType === 'Newchannel') {
    const callerNum = event.CallerIDNum || '';
    const exten = event.Exten || event.Extension || '';
    const uniqueid = event.Uniqueid || '';

    // Only track PSTN inbound calls to our DIDs (1767818XXXX)
    if (exten.match(/^1767818\d{4}$/) && callerNum && uniqueid) {
      activeCalls.set(uniqueid, {
        callerPhone: callerNum,
        didNumber: exten,
        startTime: Date.now(),
        answered: false,
      });
      console.log(`[AMI] Inbound call: ${callerNum} → ${exten} (${uniqueid})`);
    }
  }

  // Track answered calls
  if (eventType === 'Bridge' || eventType === 'Answer') {
    const uniqueid = event.Uniqueid || event.Uniqueid1 || '';
    if (activeCalls.has(uniqueid)) {
      activeCalls.get(uniqueid).answered = true;
      console.log(`[AMI] Call answered: ${uniqueid}`);
    }
  }

  // Handle hangup — check for missed calls
  if (eventType === 'Hangup') {
    const uniqueid = event.Uniqueid || '';
    const cause = event.Cause || '0';
    const causeTxt = event['Cause-txt'] || '';

    const call = activeCalls.get(uniqueid);
    if (call) {
      activeCalls.delete(uniqueid);
      const duration = Math.round((Date.now() - call.startTime) / 1000);

      console.log(`[AMI] Hangup: ${call.callerPhone} → ${call.didNumber}, answered=${call.answered}, duration=${duration}s, cause=${cause} (${causeTxt})`);

      if (!call.answered) {
        // MISSED CALL — notify customer via WhatsApp
        const businessInfo = await findAgentByDID(call.didNumber);
        const agentName = businessInfo?.displayName || 'your contact';

        const customerMsg = `Hi! 👋 You called us but we missed you. We're sorry we couldn't pick up!\n\nHow can I help you? Just reply here and I'll assist you right away. 😊\n\n— ${agentName}`;
        await sendWhatsApp(call.callerPhone, customerMsg);

        console.log(`[AMI] Sent missed call WhatsApp to ${call.callerPhone}`);
      } else if (duration > 5) {
        // Completed call — optional follow-up (disabled by default)
        // const followup = `Thanks for calling! Was everything resolved? Let me know if you need anything else. 😊`;
        // await sendWhatsApp(call.callerPhone, followup);
      }
    }
  }
}

function connect() {
  console.log('[AMI] Connecting to', AMI_HOST, AMI_PORT);

  socket = new net.Socket();
  socket.setKeepAlive(true, 10000);

  socket.connect(AMI_PORT, AMI_HOST, () => {
    console.log('[AMI] Connected, sending login...');
    sendAction({ Action: 'Login', Username: AMI_USER, Secret: AMI_SECRET });
  });

  socket.on('data', (data) => {
    buffer += data.toString();
    const messages = buffer.split('\r\n\r\n');
    buffer = messages.pop(); // Keep incomplete message

    for (const msg of messages) {
      if (!msg.trim()) continue;
      const parsed = parseMessage(msg);

      if (parsed.Response === 'Success' && parsed.Message === 'Authentication accepted') {
        console.log('[AMI] Authenticated successfully');
        sendAction({ Action: 'Events', EventMask: 'call,cdr' });
      }

      if (parsed.Response === 'Error') {
        console.error('[AMI] Error response:', parsed.Message);
      }

      if (parsed.Event) {
        handleEvent(parsed).catch(e => console.error('[AMI] Event handler error:', e.message));
      }
    }
  });

  socket.on('error', (err) => {
    console.error('[AMI] Socket error:', err.message);
  });

  socket.on('close', () => {
    console.log('[AMI] Disconnected. Reconnecting in 10s...');
    socket = null;
    buffer = '';
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 10000);
  });
}

// HTTP endpoint for click-to-call originate + health
const http = require('http');
const httpServer = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/originate') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { customerPhone, agentDID } = JSON.parse(body);
        if (!customerPhone || !agentDID) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing customerPhone or agentDID' }));
          return;
        }

        const normalized = customerPhone.replace(/\D/g, '');
        const did = agentDID.replace(/\D/g, '');

        // Originate call via AMI
        sendAction({
          Action: 'Originate',
          ActionID: `callback-${Date.now()}`,
          Channel: `PJSIP/+${normalized}@magnus-outbound`,
          Context: 'pstn-inbound',
          Exten: did,
          Priority: 1,
          CallerID: `"EPIC AI Callback" <+${did}>`,
          Timeout: 30000,
          Async: 'yes',
        });

        console.log(`[AMI] Originated callback: ${normalized} → ${did}`);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Call initiated' }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      connected: socket && !socket.destroyed,
      activeCalls: activeCalls.size,
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

httpServer.listen(3016, () => {
  console.log('[AMI] HTTP server on port 3016');
});

connect();
console.log('[AMI] Listener started');

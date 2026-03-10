#!/usr/bin/env node
/**
 * EPIC AI Voice Bridge — AudioSocket + Deepgram + DeepSeek + EdgeTTS
 * 
 * Asterisk AudioSocket protocol:
 *   Each frame: [kind:1 byte][length:2 bytes big-endian][payload:length bytes]
 *   kind 0x00 = hangup
 *   kind 0x01 = UUID (16 bytes)  
 *   kind 0x10 = audio (raw slin16 PCM, 8kHz, mono, 16-bit signed LE)
 *   kind 0xFF = error
 * 
 * Flow: Asterisk → AudioSocket TCP → Deepgram STT → DeepSeek → EdgeTTS → back to Asterisk
 * 
 * Agent personality is loaded dynamically from /api/voice/context?phone_number=EXTEN
 * UUID frame (AS_UUID) from Asterisk encodes the called number in the last bytes.
 * Alternatively, Asterisk can write called number to /tmp/voice-context/<uuid>.json
 */

const net = require('net');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { WebSocket } = require('ws');

require('dotenv').config({ path: '/opt/bff/.env' });

const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-443f0af69dc14ee095fce92d16928850';
const PORT = 3014;
const TMP = '/tmp/agi-voice';
const CONTEXT_DIR = '/tmp/voice-context';
const BFF_API = process.env.BFF_API_URL || 'http://localhost:3000';

if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
if (!fs.existsSync(CONTEXT_DIR)) fs.mkdirSync(CONTEXT_DIR, { recursive: true });

const DEFAULT_SYSTEM_PROMPT = `You are Jenny, an AI voice assistant for EPIC Communications — a telecom and internet service provider in Dominica.
Be warm, helpful, and VERY concise. This is a voice call — maximum 2 short sentences per reply.
Never use markdown, lists, or special characters. Speak naturally as if on the phone.
You can help with: internet service, billing questions, technical support, and new sign-ups.
If you cannot help, offer to connect them with a human team member.`;

const DEFAULT_AGENT_NAME = 'Jenny';
const DEFAULT_VOICE = 'en-US-JennyNeural';

// AudioSocket frame kinds
const AS_HANGUP = 0x00;
const AS_UUID = 0x01;
const AS_AUDIO = 0x10;

/**
 * Fetch agent context from BFF API given a phone number.
 * Returns { agentName, systemPrompt, voice } or defaults.
 */
async function fetchAgentContext(phoneNumber) {
  if (!phoneNumber) return null;
  
  return new Promise((resolve) => {
    const url = `${BFF_API}/api/voice/context?phone_number=${encodeURIComponent(phoneNumber)}`;
    console.log(`[Context] Fetching agent context for ${phoneNumber}: ${url}`);
    
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.found) {
            console.log(`[Context] Found agent: ${json.agentName}`);
            resolve({
              agentName: json.agentName || DEFAULT_AGENT_NAME,
              systemPrompt: json.systemPrompt || DEFAULT_SYSTEM_PROMPT,
              voice: json.voice || DEFAULT_VOICE,
            });
          } else {
            console.log(`[Context] No agent for ${phoneNumber}, using defaults`);
            resolve({
              agentName: DEFAULT_AGENT_NAME,
              systemPrompt: json.systemPrompt || DEFAULT_SYSTEM_PROMPT,
              voice: DEFAULT_VOICE,
            });
          }
        } catch (e) {
          console.error('[Context] Parse error:', e.message);
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.error('[Context] Fetch error:', e.message);
      resolve(null);
    });
    req.on('timeout', () => {
      req.destroy();
      console.error('[Context] Fetch timeout');
      resolve(null);
    });
  });
}

/**
 * Try to read called number from /tmp/voice-context/<uuid>.json
 * Asterisk AGI/dialplan can write this file before calling AudioSocket.
 */
function readContextFile(uuid) {
  try {
    const filePath = path.join(CONTEXT_DIR, `${uuid}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Clean up after reading
      fs.unlink(filePath, () => {});
      return data;
    }
  } catch (e) {
    console.error('[Context] File read error:', e.message);
  }
  return null;
}

function readFrames(socket, onFrame) {
  let buf = Buffer.alloc(0);
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 3) {
      const kind = buf[0];
      const len = buf.readUInt16BE(1);
      if (buf.length < 3 + len) break;
      const payload = buf.slice(3, 3 + len);
      buf = buf.slice(3 + len);
      onFrame(kind, payload);
    }
  });
}

function writeAudio(socket, pcmBuffer) {
  if (socket.destroyed) return;
  const header = Buffer.alloc(3);
  header[0] = AS_AUDIO;
  header.writeUInt16BE(pcmBuffer.length, 1);
  socket.write(Buffer.concat([header, pcmBuffer]));
}

function writeHangup(socket) {
  if (socket.destroyed) return;
  const frame = Buffer.from([AS_HANGUP, 0x00, 0x00]);
  socket.write(frame);
}

async function ttsToRaw(text, voice = DEFAULT_VOICE) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(TMP, `tts-${Date.now()}.wav`);
    const raw = path.join(TMP, `tts-${Date.now()}.raw`);

    exec(
      `/home/epicadmin/.local/bin/edge-tts --voice "${voice}" --text "${text.replace(/"/g, "'")}" --write-media "${tmp}"`,
      async (err) => {
        if (err) { reject(err); return; }
        // Convert to 8kHz mono s16le raw PCM
        exec(
          `ffmpeg -y -i "${tmp}" -ar 8000 -ac 1 -f s16le "${raw}"`,
          (err2) => {
            fs.unlink(tmp, () => {});
            if (err2) { reject(err2); return; }
            fs.readFile(raw, (err3, data) => {
              fs.unlink(raw, () => {});
              if (err3) reject(err3);
              else resolve(data);
            });
          }
        );
      }
    );
  });
}

async function deepseekReply(userText, history, systemPrompt) {
  return new Promise((resolve, reject) => {
    const messages = [
      { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userText },
    ];

    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 100,
      temperature: 0.7,
      stream: false,
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices[0].message.content.trim());
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function handleCall(socket) {
  const callId = `call-${Date.now()}`;
  console.log(`[${callId}] New connection`);

  let history = [];
  let dgSocket = null;
  let callActive = true;
  let greetingPlayed = false;
  let processingReply = false;
  
  // Agent context — loaded after UUID received
  let agentName = DEFAULT_AGENT_NAME;
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let agentVoice = DEFAULT_VOICE;
  let contextLoaded = false;
  let contextPending = null; // Promise for context load

  socket.on('error', err => console.error(`[${callId}] Socket error:`, err.message));
  socket.on('close', () => {
    callActive = false;
    if (dgSocket && dgSocket.readyState === WebSocket.OPEN) dgSocket.close();
    console.log(`[${callId}] Call ended`);
  });

  // Open Deepgram streaming STT
  const dgUrl = `wss://api.deepgram.com/v1/listen?` +
    `encoding=linear16&sample_rate=8000&channels=1&language=en` +
    `&model=nova-3&punctuate=true&interim_results=true` +
    `&endpointing=200&utterance_end_ms=1000`;

  dgSocket = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${DEEPGRAM_KEY}` },
  });

  dgSocket.on('open', async () => {
    console.log(`[${callId}] Deepgram connected`);

    // Wait for context to load (with 3s timeout)
    if (contextPending) {
      try {
        const ctx = await Promise.race([
          contextPending,
          new Promise(r => setTimeout(() => r(null), 3000)),
        ]);
        if (ctx) {
          agentName = ctx.agentName;
          systemPrompt = ctx.systemPrompt;
          agentVoice = ctx.voice;
          console.log(`[${callId}] Context loaded: agent=${agentName}, voice=${agentVoice}`);
        }
      } catch (e) {
        console.error(`[${callId}] Context load error:`, e.message);
      }
    }
    contextLoaded = true;

    // Play greeting
    try {
      const greeting = `Thank you for calling. This is ${agentName}. How can I help you today?`;
      console.log(`[${callId}] Generating greeting as ${agentName}...`);
      const pcm = await ttsToRaw(greeting, agentVoice);
      console.log(`[${callId}] Playing greeting (${pcm.length} bytes)`);

      // Send in 20ms chunks (160 samples * 2 bytes = 320 bytes at 8kHz)
      const chunkSize = 320;
      for (let i = 0; i < pcm.length; i += chunkSize) {
        if (!callActive) break;
        writeAudio(socket, pcm.slice(i, i + chunkSize));
        await new Promise(r => setTimeout(r, 20));
      }
      greetingPlayed = true;
      console.log(`[${callId}] Greeting done, listening...`);
    } catch (err) {
      console.error(`[${callId}] Greeting error:`, err.message);
      greetingPlayed = true;
    }
  });

  dgSocket.on('message', async (raw) => {
    if (!greetingPlayed || processingReply || !callActive) return;

    try {
      const msg = JSON.parse(raw);
      const transcript = msg?.channel?.alternatives?.[0]?.transcript?.trim();
      const isFinal = msg?.is_final;
      const speechFinal = msg?.speech_final;

      if (!transcript) return;

      if (isFinal && speechFinal) {
        console.log(`[${callId}] FINAL: "${transcript}"`);
        processingReply = true;

        // Check for goodbye
        if (/^(bye|goodbye|hang up|no more)/i.test(transcript)) {
          try {
            const byePcm = await ttsToRaw('Goodbye! Have a great day.', agentVoice);
            const chunkSize = 320;
            for (let i = 0; i < byePcm.length; i += chunkSize) {
              writeAudio(socket, byePcm.slice(i, i + chunkSize));
              await new Promise(r => setTimeout(r, 20));
            }
          } catch (_) {}
          writeHangup(socket);
          return;
        }

        try {
          // Get AI response using agent's personality
          const reply = await deepseekReply(transcript, history, systemPrompt);
          console.log(`[${callId}] ${agentName}: "${reply}"`);

          // Update history
          history.push({ role: 'user', content: transcript });
          history.push({ role: 'assistant', content: reply });
          if (history.length > 12) history = history.slice(-12);

          // TTS with agent's voice
          const pcm = await ttsToRaw(reply, agentVoice);
          console.log(`[${callId}] Playing reply (${pcm.length} bytes)`);

          const chunkSize = 320;
          for (let i = 0; i < pcm.length; i += chunkSize) {
            if (!callActive) break;
            writeAudio(socket, pcm.slice(i, i + chunkSize));
            await new Promise(r => setTimeout(r, 20));
          }
        } catch (err) {
          console.error(`[${callId}] Reply error:`, err.message);
        } finally {
          processingReply = false;
        }
      }
    } catch (_) {}
  });

  dgSocket.on('error', err => console.error(`[${callId}] Deepgram error:`, err.message));
  dgSocket.on('close', () => console.log(`[${callId}] Deepgram closed`));

  // Handle incoming AudioSocket frames
  readFrames(socket, (kind, payload) => {
    if (kind === AS_UUID) {
      // UUID is 16 bytes — convert to standard UUID string
      const hex = payload.toString('hex');
      const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
      console.log(`[${callId}] Call UUID: ${uuid}`);
      
      // Try to load context from file first (written by Asterisk AGI)
      const fileCtx = readContextFile(uuid);
      if (fileCtx && fileCtx.calledNumber) {
        console.log(`[${callId}] Called number from context file: ${fileCtx.calledNumber}`);
        contextPending = fetchAgentContext(fileCtx.calledNumber);
      } else {
        // No context file — will use defaults
        console.log(`[${callId}] No context file found for UUID ${uuid}, using default agent`);
        contextPending = Promise.resolve(null);
      }
    } else if (kind === AS_AUDIO) {
      // Forward raw PCM to Deepgram
      if (dgSocket && dgSocket.readyState === WebSocket.OPEN && greetingPlayed && !processingReply) {
        dgSocket.send(payload);
      }
    } else if (kind === AS_HANGUP) {
      console.log(`[${callId}] Hangup received`);
      callActive = false;
      socket.destroy();
    }
  });
}

// Start AudioSocket TCP server
const server = net.createServer(handleCall);
server.listen(PORT, () => {
  console.log(`EPIC AI AudioSocket Bridge listening on port ${PORT}`);
  console.log(`Deepgram: ${DEEPGRAM_KEY ? 'configured' : 'MISSING'}`);
  console.log(`BFF API: ${BFF_API}`);
  console.log(`Context dir: ${CONTEXT_DIR}`);
});

server.on('error', err => console.error('Server error:', err));

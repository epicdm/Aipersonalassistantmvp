#!/usr/bin/env node
/**
 * BFF AI Voice Agent Server
 * Receives AGI calls from Asterisk, runs STT→LLM→TTS loop
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const FormData = require('form-data');
const fetch = require('node-fetch');

const PORT = 3008;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-443f0af69dc14ee095fce92d16928850';
const TTS_PORT = 3007;
const TMP_DIR = '/tmp/agi-voice';

fs.mkdirSync(TMP_DIR, { recursive: true });

// Transcribe audio file using Groq Whisper
async function transcribe(audioPath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'en');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, ...form.getHeaders() },
    body: form
  });
  const data = await res.json();
  return data.text || '';
}

// Get AI response from DeepSeek
async function getAIResponse(userText, history = []) {
  const messages = [
    {
      role: 'system',
      content: `You are an AI voice assistant for EPIC Communications, a telecom and internet service provider in Dominica. 
You answer calls on behalf of EPIC. Be helpful, warm, and concise — this is a voice call so keep responses SHORT (1-3 sentences max).
You can help with: internet service inquiries, billing questions, technical support, new service sign-ups, and general information.
If asked about something you cannot handle, say you will connect them with a team member.`
    },
    ...history,
    { role: 'user', content: userText }
  ];

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 150,
      temperature: 0.7
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "I'm sorry, I didn't catch that. Could you repeat?";
}

// Convert text to speech using local TTS server, return wav path
async function textToSpeech(text, outPath) {
  const res = await fetch(`http://localhost:${TTS_PORT}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: 'en-US-JennyNeural' })
  });

  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const buf = await res.buffer();
  fs.writeFileSync(outPath, buf);
  
  // Convert mp3 to ulaw wav for Asterisk if needed
  const wavPath = outPath.replace('.mp3', '.wav');
  execSync(`ffmpeg -i "${outPath}" -ar 8000 -ac 1 -acodec pcm_mulaw "${wavPath}" -y 2>/dev/null`);
  return wavPath;
}

// Main AGI handler endpoint
// Called by Asterisk AGI with call session ID
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200);
    res.end('AI Voice Agent running');
    return;
  }

  let body = '';
  req.on('data', d => body += d);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const { action, callId, audioPath, text } = data;

      if (action === 'transcribe') {
        // Transcribe recorded audio
        const transcript = await transcribe(audioPath);
        console.log(`[${callId}] Transcribed: "${transcript}"`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ transcript }));

      } else if (action === 'respond') {
        // Get AI response and generate TTS
        const history = data.history || [];
        console.log(`[${callId}] User said: "${text}"`);
        
        const aiResponse = await getAIResponse(text, history);
        console.log(`[${callId}] AI response: "${aiResponse}"`);

        const mp3Path = path.join(TMP_DIR, `${callId}-response.mp3`);
        const wavPath = await textToSpeech(aiResponse, mp3Path);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: aiResponse, audioPath: wavPath }));

      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Unknown action' }));
      }
    } catch (err) {
      console.error('AI Voice Agent error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`AI Voice Agent server running on port ${PORT}`);
});

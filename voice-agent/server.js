/**
 * BFF Voice Agent Server
 * 
 * Handles inbound WhatsApp voice calls routed via:
 * Meta Calling API → wa.meta.vc → Magnus Billing → This SIP agent
 * 
 * Uses FreeSWITCH ESL (Event Socket Layer) to control calls
 * AI responses via OpenAI Realtime API (or DeepSeek TTS fallback)
 * 
 * Port: 3008
 */

const express = require('express')
const { Esl } = require('modesl')
const crypto = require('crypto')

const app = express()
app.use(express.json())

const ESL_HOST = process.env.ESL_HOST || '818.epic.dm'
const ESL_PORT = process.env.ESL_PORT || 8021
const ESL_PASSWORD = process.env.ESL_PASSWORD || 'ClueCon'
const BFF_API_URL = process.env.BFF_API_URL || 'http://localhost:3002'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const PORT = process.env.VOICE_AGENT_PORT || 3008

// Track active calls
const activeCalls = new Map()

/**
 * Inbound call webhook - called by Magnus/FusionPBX when a call arrives
 * This endpoint handles the call control logic
 */
app.post('/call/inbound', async (req, res) => {
  const { call_uuid, caller_id, called_number, sip_from } = req.body
  console.log(`[Call] Inbound: ${caller_id} → ${called_number} (UUID: ${call_uuid})`)

  // Find which BFF agent owns this DID
  const agent = await findAgentByDID(called_number)
  if (!agent) {
    console.warn(`[Call] No agent found for DID: ${called_number}`)
    res.json({ action: 'hangup', cause: 'NO_ROUTE_DESTINATION' })
    return
  }

  activeCalls.set(call_uuid, { agent, callerPhone: caller_id, startTime: Date.now() })

  // Answer the call with AI greeting
  const greeting = getAgentGreeting(agent)
  
  res.json({
    action: 'answer',
    instructions: [
      { action: 'speak', text: greeting, voice: 'en-US-JennyNeural' },
      { action: 'listen', timeout: 10, callback: `${BFF_API_URL}/api/voice/speech?uuid=${call_uuid}` },
    ]
  })
})

/**
 * Speech input webhook - called when user speaks
 */
app.post('/call/speech', async (req, res) => {
  const { call_uuid, transcript, confidence } = req.body
  const callData = activeCalls.get(call_uuid)
  
  if (!callData) {
    res.json({ action: 'hangup' })
    return
  }

  console.log(`[Call] Speech (${call_uuid}): "${transcript}" (confidence: ${confidence})`)

  if (!transcript || transcript.trim() === '') {
    res.json({
      instructions: [
        { action: 'speak', text: "Sorry, I didn't catch that. Could you say that again?" },
        { action: 'listen', timeout: 10, callback: `${BFF_API_URL}/api/voice/speech?uuid=${call_uuid}` },
      ]
    })
    return
  }

  // Get AI response
  const aiResponse = await getAIResponse(callData.agent, transcript, callData.callerPhone)
  
  // Check if AI wants to end the call
  if (aiResponse.toLowerCase().includes('[end call]') || aiResponse.toLowerCase().includes('goodbye')) {
    const cleanResponse = aiResponse.replace('[end call]', '').trim()
    res.json({
      instructions: [
        { action: 'speak', text: cleanResponse },
        { action: 'hangup' },
      ]
    })
    activeCalls.delete(call_uuid)
    return
  }

  // Continue conversation
  res.json({
    instructions: [
      { action: 'speak', text: aiResponse },
      { action: 'listen', timeout: 10, callback: `${BFF_API_URL}/api/voice/speech?uuid=${call_uuid}` },
    ]
  })
})

/**
 * Call hangup webhook
 */
app.post('/call/hangup', async (req, res) => {
  const { call_uuid, duration } = req.body
  console.log(`[Call] Hangup: ${call_uuid} (duration: ${duration}s)`)
  
  const callData = activeCalls.get(call_uuid)
  if (callData) {
    // Log call to BFF database
    await logCallToDatabase(callData, duration)
    activeCalls.delete(call_uuid)
  }
  
  res.json({ ok: true })
})

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeCalls: activeCalls.size,
    timestamp: new Date().toISOString(),
  })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findAgentByDID(didNumber) {
  try {
    const cleanDID = didNumber.replace(/\D/g, '')
    const res = await fetch(`${BFF_API_URL}/api/voice/lookup?did=${cleanDID}`, {
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET || 'bff-internal-2026' }
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('[Voice] findAgentByDID error:', err.message)
    return null
  }
}

function getAgentGreeting(agent) {
  const name = agent.name || 'your assistant'
  const template = agent.template || 'assistant'
  
  const greetings = {
    receptionist: `Thank you for calling. This is ${name}. How may I direct your call?`,
    support: `Hello! You've reached ${name}. I'm here to help. What can I assist you with today?`,
    sales: `Hi there! Thanks for calling. I'm ${name}. Are you interested in learning about what we offer?`,
    concierge: `Welcome! I'm ${name}, your personal concierge. How can I make your day easier?`,
    collector: `Hello, this is ${name} calling regarding your account. Do you have a moment to speak?`,
    assistant: `Hey! I'm ${name}, your AI assistant. What can I help you with?`,
  }
  
  return greetings[template] || greetings.assistant
}

async function getAIResponse(agent, userSpeech, callerPhone) {
  try {
    const systemPrompt = `You are ${agent.name}, a voice AI assistant. 
Template: ${agent.template || 'assistant'}
Purpose: ${agent.purpose || 'Help callers with their needs'}
Tone: ${agent.tone || 'friendly and professional'}

IMPORTANT RULES FOR VOICE:
- Keep responses SHORT (2-3 sentences max) - this is a phone call
- Be conversational and natural
- If you need to end the call, include [end call] at the end
- Never use markdown, bullet points, or formatting
- If asked for a WhatsApp message, say you'll follow up via WhatsApp after the call`

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userSpeech },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    const data = await res.json()
    return data.choices?.[0]?.message?.content || "I'm sorry, I had trouble processing that. Could you try again?"
  } catch (err) {
    console.error('[Voice] AI error:', err.message)
    return "I'm having a bit of trouble right now. Please try again in a moment."
  }
}

async function logCallToDatabase(callData, duration) {
  try {
    await fetch(`${BFF_API_URL}/api/voice/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET || 'bff-internal-2026',
      },
      body: JSON.stringify({
        agentId: callData.agent.id,
        callerPhone: callData.callerPhone,
        duration,
        startTime: callData.startTime,
      }),
    })
  } catch (err) {
    console.error('[Voice] Log error:', err.message)
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Voice Agent] Server running on port ${PORT}`)
  console.log(`[Voice Agent] ESL target: ${ESL_HOST}:${ESL_PORT}`)
  console.log(`[Voice Agent] BFF API: ${BFF_API_URL}`)
})

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const WA_TOKEN = process.env.WHATSAPP_TOKEN || process.env.META_WA_TOKEN || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GRAPH_API_VERSION = 'v25.0'

/**
 * Download a WhatsApp media file by its media ID.
 * Step 1: GET media metadata to find the download URL
 * Step 2: Download the actual file
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  // Step 1: Get the media URL
  const metaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    }
  )

  if (!metaRes.ok) {
    const err = await metaRes.text()
    throw new Error(`Failed to get media metadata: ${metaRes.status} ${err}`)
  }

  const metaData = await metaRes.json()
  const mediaUrl = metaData.url

  if (!mediaUrl) {
    throw new Error('No URL in media metadata response')
  }

  // Step 2: Download the actual file
  const fileRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
    signal: AbortSignal.timeout(30000),
  })

  if (!fileRes.ok) {
    const err = await fileRes.text()
    throw new Error(`Failed to download media: ${fileRes.status} ${err}`)
  }

  const arrayBuffer = await fileRes.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Convert OGG/Opus audio (WhatsApp format) to WAV using ffmpeg
 */
function convertToWav(inputBuffer: Buffer): Buffer {
  const tmpId = crypto.randomUUID().slice(0, 8)
  const inputPath = path.join('/tmp', `wa_audio_${tmpId}.ogg`)
  const outputPath = path.join('/tmp', `wa_audio_${tmpId}.wav`)

  try {
    fs.writeFileSync(inputPath, inputBuffer)

    execSync(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -sample_fmt s16 "${outputPath}" 2>/dev/null`,
      { timeout: 15000 }
    )

    const wavBuffer = fs.readFileSync(outputPath)
    return wavBuffer
  } finally {
    // Clean up temp files
    try { fs.unlinkSync(inputPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}
  }
}

/**
 * Transcribe audio using Groq's Whisper API (free tier)
 */
async function transcribeWithGroq(wavBuffer: Buffer): Promise<string> {
  // Build multipart form data manually
  const boundary = `----FormBoundary${crypto.randomUUID().replace(/-/g, '')}`

  const preamble = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="model"',
    '',
    'whisper-large-v3',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="audio.wav"',
    'Content-Type: audio/wav',
    '',
    '',
  ].join('\r\n')

  const epilogue = `\r\n--${boundary}--\r\n`

  const preambleBuffer = Buffer.from(preamble, 'utf-8')
  const epilogueBuffer = Buffer.from(epilogue, 'utf-8')
  const body = Buffer.concat([preambleBuffer, wavBuffer, epilogueBuffer])

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq transcription failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  return (data.text || '').trim()
}

/**
 * Main function: download WhatsApp voice note, convert, and transcribe.
 * Returns the transcribed text or null if transcription isn't available.
 */
export async function transcribeVoiceNote(mediaId: string): Promise<string | null> {
  if (!WA_TOKEN) {
    console.error('[Transcribe] No WhatsApp token available')
    return null
  }

  if (!GROQ_API_KEY) {
    console.error('[Transcribe] No GROQ_API_KEY available for transcription')
    return null
  }

  try {
    console.log(`[Transcribe] Downloading media ${mediaId}...`)
    const audioBuffer = await downloadWhatsAppMedia(mediaId)
    console.log(`[Transcribe] Downloaded ${audioBuffer.length} bytes`)

    console.log('[Transcribe] Converting to WAV...')
    const wavBuffer = convertToWav(audioBuffer)
    console.log(`[Transcribe] WAV size: ${wavBuffer.length} bytes`)

    console.log('[Transcribe] Sending to Groq Whisper...')
    const text = await transcribeWithGroq(wavBuffer)
    console.log(`[Transcribe] Result: "${text.slice(0, 100)}"`)

    return text || null
  } catch (error: any) {
    console.error('[Transcribe Error]', error?.message || error)
    return null
  }
}

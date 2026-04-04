/**
 * Voice note transcription for WhatsApp audio messages
 * Uses Groq Whisper API (free, fast)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

/**
 * Download media from WhatsApp and transcribe with Groq Whisper
 */
export async function transcribeWhatsAppAudio(mediaId: string): Promise<string | null> {
  if (!WHATSAPP_TOKEN) return null;

  try {
    // Step 1: Get media URL from WhatsApp
    const mediaRes = await fetch(
      `https://graph.facebook.com/v25.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    if (!mediaRes.ok) {
      console.error("[Voice] Failed to get media URL:", await mediaRes.text());
      return null;
    }
    const mediaData = await mediaRes.json();
    const mediaUrl = mediaData.url;
    if (!mediaUrl) return null;

    // Step 2: Download the audio file
    const audioRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    });
    if (!audioRes.ok) {
      console.error("[Voice] Failed to download audio:", await audioRes.text());
      return null;
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/ogg" });

    // Step 3: Transcribe with Groq Whisper
    if (GROQ_API_KEY) {
      const transcript = await transcribeWithGroq(audioBlob);
      if (transcript) return transcript;
    }

    // Fallback: faster-whisper on main server
    return await transcribeWithFasterWhisper(audioBuffer);
  } catch (e) {
    console.error("[Voice] Transcription error:", e);
    return null;
  }
}

async function transcribeWithGroq(audioBlob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice.ogg");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "text");
    formData.append("language", "en");
    formData.append("temperature", "0");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (!res.ok) {
      console.error("[Voice/Groq] Error:", await res.text());
      return null;
    }

    const text = await res.text();
    return text.trim() || null;
  } catch (e) {
    console.error("[Voice/Groq] Exception:", e);
    return null;
  }
}

async function transcribeWithFasterWhisper(audioBuffer: ArrayBuffer): Promise<string | null> {
  try {
    // Send to our main server which has faster-whisper installed
    const ACE_URL = process.env.ACE_WHISPER_URL || "http://165.245.134.236:8765";

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "voice.ogg");

    const res = await fetch(`${ACE_URL}/transcribe`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

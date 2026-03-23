const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "1003873729481088";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const TTS_URL = "http://localhost:3007/tts";
const WA_MEDIA_UPLOAD_URL = `https://graph.facebook.com/v21.0/${PHONE_ID}/media`;

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  if (!WHATSAPP_TOKEN) {
    throw new Error("WHATSAPP_TOKEN not configured");
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error: ${err}`);
  }
}

// ─── Send voice note reply via TTS ────────────────────────────
export async function sendWhatsAppVoiceNote(phone: string, text: string, voice = "en-US-JennyNeural"): Promise<void> {
  if (!WHATSAPP_TOKEN) throw new Error("WHATSAPP_TOKEN not configured");

  // Step 1: Generate audio via local TTS server
  const ttsRes = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
    signal: AbortSignal.timeout(15000),
  });
  if (!ttsRes.ok) throw new Error(`TTS failed: ${await ttsRes.text()}`);

  const audioBuffer = await ttsRes.arrayBuffer();

  // Step 2: Upload audio to WhatsApp Media API
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", "audio/mpeg");
  formData.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "voice.mp3");

  const uploadRes = await fetch(WA_MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    body: formData,
  });
  if (!uploadRes.ok) throw new Error(`Media upload failed: ${await uploadRes.text()}`);

  const uploadData = await uploadRes.json();
  const mediaId = uploadData.id;
  if (!mediaId) throw new Error("No media ID returned from upload");

  // Step 3: Send audio message
  const msgRes = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "audio",
      audio: { id: mediaId },
    }),
  });
  if (!msgRes.ok) throw new Error(`Audio send failed: ${await msgRes.text()}`);
}

// ─── Native WhatsApp typing indicator ────────────────────
export async function sendTypingIndicator(messageId: string): Promise<void> {
  const token = process.env.META_WA_TOKEN || WHATSAPP_TOKEN;
  if (!token || !messageId) return;
  try {
    await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // non-critical
  }
}

// ─── Interactive buttons (native WhatsApp) ────────────────────
export async function sendInteractiveButtons(
  phone: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
  headerText?: string,
  footerText?: string
): Promise<void> {
  const token = process.env.META_WA_TOKEN || WHATSAPP_TOKEN;
  if (!token) throw new Error("WHATSAPP_TOKEN not configured");

  const interactive: any = {
    type: "button",
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map((btn) => ({
        type: "reply",
        reply: { id: btn.id, title: btn.title.slice(0, 20) },
      })),
    },
  };
  if (headerText) interactive.header = { type: "text", text: headerText };
  if (footerText) interactive.footer = { text: footerText };

  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "interactive",
      interactive,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[WA Interactive Buttons]", err);
    // Fallback to plain text
    await sendWhatsAppMessage(phone, bodyText);
  }
}

// ─── Interactive list message (native WhatsApp) ───────────────
export async function sendInteractiveList(
  phone: string,
  bodyText: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  headerText?: string,
  footerText?: string
): Promise<void> {
  const token = process.env.META_WA_TOKEN || WHATSAPP_TOKEN;
  if (!token) throw new Error("WHATSAPP_TOKEN not configured");

  const interactive: any = {
    type: "list",
    body: { text: bodyText },
    action: {
      button: buttonLabel.slice(0, 20),
      sections: sections.map((s) => ({
        title: s.title.slice(0, 24),
        rows: s.rows.slice(0, 10).map((r) => ({
          id: r.id.slice(0, 200),
          title: r.title.slice(0, 24),
          description: r.description?.slice(0, 72),
        })),
      })),
    },
  };
  if (headerText) interactive.header = { type: "text", text: headerText };
  if (footerText) interactive.footer = { text: footerText };

  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "interactive",
      interactive,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[WA Interactive List]", err);
    // Fallback to plain text
    await sendWhatsAppMessage(phone, bodyText);
  }
}

// ─── Mark message as read (native WhatsApp) ───────────────────
export async function markAsRead(messageId: string): Promise<void> {
  const token = process.env.META_WA_TOKEN || WHATSAPP_TOKEN;
  if (!token || !messageId) return;
  try {
    await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // non-critical
  }
}

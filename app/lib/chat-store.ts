/**
 * Shared in-memory chat history store.
 * Used by /api/chat (read/write) and /api/admin/conversations (read/inject).
 *
 * In production this would be Redis or a database.
 * For MVP, in-memory is fine — resets on server restart.
 */

type ChatMessage = { role: string; content: string };

const chatStore = new Map<string, ChatMessage[]>();

// Barge-in pending messages (admin → user, delivered on next poll)
const bargeStore = new Map<string, Array<{
  id: string;
  text: string;
  from: string;
  timestamp: string;
}>>();

export function getChatStore() {
  return chatStore;
}

export function getBargePending() {
  return bargeStore;
}

export function getUserHistory(userId: string): ChatMessage[] {
  return chatStore.get(userId) || [];
}

export function setUserHistory(userId: string, messages: ChatMessage[]) {
  chatStore.set(userId, messages);
}

export function appendUserMessage(userId: string, role: string, content: string) {
  const history = chatStore.get(userId) || [];
  history.push({ role, content });
  // Keep last 30 messages
  if (history.length > 30) {
    chatStore.set(userId, history.slice(-30));
  } else {
    chatStore.set(userId, history);
  }
}

export function injectHint(userId: string, hint: string) {
  appendUserMessage(userId, "system", `[SUPERVISOR HINT]: ${hint}`);
}

export function injectBarge(userId: string, message: string, adminId: string) {
  // Add to chat history as assistant message
  appendUserMessage(userId, "assistant", message);

  // Add to barge pending for the chat UI to pick up
  const pending = bargeStore.get(userId) || [];
  pending.push({
    id: Math.random().toString(36).slice(2, 10),
    text: message,
    from: adminId,
    timestamp: new Date().toISOString(),
  });
  bargeStore.set(userId, pending);
}

export function popBargePending(userId: string) {
  const pending = bargeStore.get(userId) || [];
  bargeStore.delete(userId);
  return pending;
}

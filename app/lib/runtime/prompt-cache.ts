// app/lib/runtime/prompt-cache.ts
// 5-minute system prompt cache

type CacheEntry = {
  prompt: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function getCachedPrompt(key: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.prompt
}

export function setCachedPrompt(key: string, prompt: string): void {
  cache.set(key, {
    prompt,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

export function clearPromptCache(): void {
  cache.clear()
}

/**
 * Instagram Story & Comment Automation
 * Handles auto-replies to story mentions and AI-powered comment responses.
 */

import { metaFetch } from '@/app/lib/api-retry'
import { sendInstagramMessage } from '@/app/lib/instagram'

const META_TOKEN = process.env.META_WA_TOKEN || ''

// ─── Story Mentions ──────────────────────────────────────────────────────────

export interface StoryMention {
  senderId: string
  senderUsername: string
  storyUrl?: string
  mediaId: string
  timestamp: string
}

export interface AutoReplyRule {
  trigger: 'story_mention' | 'comment' | 'keyword'
  keyword?: string
  response: string
  enabled: boolean
}

export async function processStoryMention(
  mention: StoryMention,
  rules: AutoReplyRule[],
  pageAccessToken?: string
): Promise<{ replied: boolean; response?: string }> {
  const rule = rules.find(r => r.trigger === 'story_mention' && r.enabled)
  if (!rule) return { replied: false }

  const response = rule.response
    .replace('{username}', mention.senderUsername)

  await sendInstagramMessage(mention.senderId, response, pageAccessToken)
  return { replied: true, response }
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface IGComment {
  id: string
  text: string
  from: { id: string; username: string }
  timestamp: string
  mediaId: string
}

export async function getComments(
  mediaId: string,
  pageAccessToken?: string
): Promise<IGComment[]> {
  const token = pageAccessToken || META_TOKEN
  if (!token) return []

  try {
    const res = await metaFetch(
      `https://graph.facebook.com/v25.0/${mediaId}/comments?fields=id,text,from,timestamp&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return (data.data || []).map((c: any) => ({
      id: c.id,
      text: c.text,
      from: c.from,
      timestamp: c.timestamp,
      mediaId,
    }))
  } catch {
    return []
  }
}

export async function replyToComment(
  commentId: string,
  message: string,
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required')

  await metaFetch(
    `https://graph.facebook.com/v25.0/${commentId}/replies`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }
  )
}

export async function hideComment(
  commentId: string,
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required')

  await metaFetch(
    `https://graph.facebook.com/v25.0/${commentId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hide: true }),
    }
  )
}

// ─── Process incoming comment with AI or rules ─────────────────────────────

export async function processComment(
  comment: IGComment,
  rules: AutoReplyRule[],
  agentResponse?: string,
  pageAccessToken?: string
): Promise<{ replied: boolean; hidden: boolean; response?: string }> {
  // Check keyword rules first
  const keywordRule = rules.find(r =>
    r.trigger === 'keyword' && r.enabled && r.keyword &&
    comment.text.toLowerCase().includes(r.keyword.toLowerCase())
  )

  if (keywordRule) {
    await replyToComment(comment.id, keywordRule.response, pageAccessToken)
    return { replied: true, hidden: false, response: keywordRule.response }
  }

  // Check comment auto-reply rule
  const commentRule = rules.find(r => r.trigger === 'comment' && r.enabled)

  if (commentRule && agentResponse) {
    await replyToComment(comment.id, agentResponse, pageAccessToken)
    return { replied: true, hidden: false, response: agentResponse }
  }

  return { replied: false, hidden: false }
}

/**
 * Facebook Page Management — insights, posts, comments.
 * Uses Page Access Token from Facebook Login.
 */

import { metaFetch } from '@/app/lib/api-retry'

const META_TOKEN = process.env.META_WA_TOKEN || ''

// ─── Page Insights ───────────────────────────────────────────────────────────

export interface PageInsights {
  pageId: string
  name: string
  followersCount: number
  likesCount: number
  postsCount: number
  reachLast7d?: number
  engagementLast7d?: number
}

export async function getPageInsights(
  pageId: string,
  pageAccessToken?: string
): Promise<PageInsights | null> {
  const token = pageAccessToken || META_TOKEN
  if (!token) return null

  try {
    const res = await metaFetch(
      `https://graph.facebook.com/v25.0/${pageId}?fields=id,name,followers_count,fan_count,posts.limit(0).summary(true)`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()

    return {
      pageId: data.id,
      name: data.name,
      followersCount: data.followers_count || 0,
      likesCount: data.fan_count || 0,
      postsCount: data.posts?.summary?.total_count || 0,
    }
  } catch {
    return null
  }
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(
  pageId: string,
  message: string,
  link?: string,
  pageAccessToken?: string
): Promise<{ id: string }> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required')

  const body: any = { message }
  if (link) body.link = link

  const res = await metaFetch(
    `https://graph.facebook.com/v25.0/${pageId}/feed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  )

  return res.json()
}

export async function createPhotoPost(
  pageId: string,
  imageUrl: string,
  caption?: string,
  pageAccessToken?: string
): Promise<{ id: string }> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required')

  const res = await metaFetch(
    `https://graph.facebook.com/v25.0/${pageId}/photos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: imageUrl,
        ...(caption ? { caption } : {}),
      }),
    }
  )

  return res.json()
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface FBComment {
  id: string
  message: string
  from: { id: string; name: string }
  created_time: string
}

export async function getPageComments(
  postId: string,
  pageAccessToken?: string
): Promise<FBComment[]> {
  const token = pageAccessToken || META_TOKEN
  if (!token) return []

  try {
    const res = await metaFetch(
      `https://graph.facebook.com/v25.0/${postId}/comments?fields=id,message,from,created_time&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return data.data || []
  } catch {
    return []
  }
}

export async function replyToPageComment(
  commentId: string,
  message: string,
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required')

  await metaFetch(
    `https://graph.facebook.com/v25.0/${commentId}/comments`,
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

// ─── Page Info Update ────────────────────────────────────────────────────────

export async function updatePageInfo(
  pageId: string,
  fields: {
    about?: string
    description?: string
    hours?: Record<string, string>
    phone?: string
    website?: string
  },
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required')

  await metaFetch(
    `https://graph.facebook.com/v25.0/${pageId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(fields),
    }
  )
}

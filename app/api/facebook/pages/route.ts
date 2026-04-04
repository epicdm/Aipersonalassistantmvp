/**
 * GET  /api/facebook/pages — get page insights
 * POST /api/facebook/pages — create a post
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getPageInsights, createPost, createPhotoPost, getPageComments, replyToPageComment } from '@/app/lib/facebook-pages'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pageId = req.nextUrl.searchParams.get('pageId')
  if (!pageId) return NextResponse.json({ error: 'pageId required' }, { status: 400 })

  const pageAccessToken = req.nextUrl.searchParams.get('token') || undefined

  const insights = await getPageInsights(pageId, pageAccessToken)
  if (!insights) return NextResponse.json({ error: 'Could not fetch page insights' }, { status: 500 })

  return NextResponse.json({ insights })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, pageId, pageAccessToken } = body

  if (!pageId) return NextResponse.json({ error: 'pageId required' }, { status: 400 })

  try {
    switch (action) {
      case 'post': {
        const { message, link } = body
        if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
        const result = await createPost(pageId, message, link, pageAccessToken)
        return NextResponse.json(result, { status: 201 })
      }

      case 'photo': {
        const { imageUrl, caption } = body
        if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
        const result = await createPhotoPost(pageId, imageUrl, caption, pageAccessToken)
        return NextResponse.json(result, { status: 201 })
      }

      case 'reply': {
        const { commentId, message } = body
        if (!commentId || !message) return NextResponse.json({ error: 'commentId and message required' }, { status: 400 })
        await replyToPageComment(commentId, message, pageAccessToken)
        return NextResponse.json({ success: true })
      }

      case 'comments': {
        const { postId } = body
        if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
        const comments = await getPageComments(postId, pageAccessToken)
        return NextResponse.json({ comments })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: post, photo, reply, comments' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[FB Pages]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

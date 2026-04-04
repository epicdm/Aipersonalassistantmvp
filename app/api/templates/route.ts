/**
 * GET  /api/templates — list all templates from Meta
 * POST /api/templates — create a new template (submit for approval)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTemplates, createTemplate, type CreateTemplateParams } from '@/app/lib/whatsapp-templates'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const status = req.nextUrl.searchParams.get('status') || undefined
    const templates = await getTemplates(status)
    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('[Templates GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body: CreateTemplateParams = await req.json()
    if (!body.name || !body.language || !body.category || !body.components) {
      return NextResponse.json({ error: 'name, language, category, and components required' }, { status: 400 })
    }

    const result = await createTemplate(body)
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[Templates POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

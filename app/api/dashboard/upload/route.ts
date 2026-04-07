/**
 * Dashboard App — Product Image Upload
 * POST /api/dashboard/upload
 *
 * Auth: ?token={dashboard_token}
 * Accepts: multipart/form-data with a 'file' field
 *
 * Phase 2: stores to BFF local /public/uploads/{agentId}/{filename}
 * Phase 3: migrate to Cloudflare R2 (same API surface, just swap storage)
 *
 * Returns: { url: "/uploads/{agentId}/{filename}" }
 *
 * Constraints:
 *   - Max 5MB per file
 *   - Accepted types: image/jpeg, image/png, image/webp, image/gif
 *   - Filename: {timestamp}-{originalname} to avoid collisions
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const UPLOADS_DIR    = join(process.cwd(), 'public', 'uploads')

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'file field required' }, { status: 400 })
  }

  // Type check
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  // Size check
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 })
  }

  // Build safe filename
  const originalName = (file as any).name || 'image'
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`

  // Write to disk
  try {
    const agentUploadDir = join(UPLOADS_DIR, agentId)
    await mkdir(agentUploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    await writeFile(join(agentUploadDir, filename), Buffer.from(bytes))
  } catch (err) {
    console.error('[dashboard/upload] write error:', err)
    return NextResponse.json({ error: 'Upload failed, please try again' }, { status: 503 })
  }

  const url = `/uploads/${agentId}/${filename}`
  return NextResponse.json({ url }, { status: 200 })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { tenantCache } from '@/app/lib/tenant-cache'

export async function POST(
  _req: NextRequest,
  { params }: { params: { tenantId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findFirst({ where: { clerkId: userId } })
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tenant = await prisma.tenantRegistry.update({
    where: { tenantId: params.tenantId },
    data: { status: 'active' },
  })

  // Invalidate cache so webhook routing picks up the re-activated tenant
  tenantCache.invalidate(tenant.waPhoneNumberId)

  return NextResponse.json({ ok: true, tenantId: tenant.tenantId, status: 'active' })
}

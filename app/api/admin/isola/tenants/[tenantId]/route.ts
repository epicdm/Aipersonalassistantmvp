/**
 * GET /api/admin/isola/tenants/[tenantId]
 * Detail view for one Isola tenant. Admin only.
 */
import { NextResponse } from 'next/server'
import { requireSessionUser } from '@/app/lib/auth-boundary'
import { prisma } from '@/app/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const userOrError = await requireSessionUser()
  if (userOrError instanceof NextResponse) return userOrError
  const dbUser = await prisma.user.findUnique({ where: { id: userOrError.id }, select: { isAdmin: true } })
  if (!dbUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tenantId } = await params
  const tenant = await prisma.tenantRegistry.findUnique({
    where: { tenantId },
    select: {
      tenantId: true, waPhoneNumberId: true, businessName: true,
      displayPhone: true, template: true, status: true,
      chatwootAccountId: true, chatwootStatus: true,
      chatwootProvisionedAt: true, createdAt: true,
      containerPort: true, wabaId: true, businessId: true,
    },
  })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const [deadLetters, recentDL] = await Promise.all([
    prisma.deadLetter.count({ where: { tenantId, resolved: false } }),
    prisma.deadLetter.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, attempts: true, failureReason: true, createdAt: true, resolved: true },
    }),
  ])

  return NextResponse.json({ tenant, deadLetters, recentDeadLetters: recentDL })
}

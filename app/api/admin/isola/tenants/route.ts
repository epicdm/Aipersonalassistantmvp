/**
 * GET /api/admin/isola/tenants
 * List all provisioned Isola tenants (TenantRegistry).
 * Admin only (User.isAdmin = true via Clerk session).
 */
import { NextResponse } from 'next/server'
import { requireSessionUser } from '@/app/lib/auth-boundary'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
  const userOrError = await requireSessionUser()
  if (userOrError instanceof NextResponse) return userOrError

  const dbUser = await prisma.user.findUnique({ where: { id: userOrError.id }, select: { isAdmin: true } })
  if (!dbUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tenants = await prisma.tenantRegistry.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      tenantId:           true,
      waPhoneNumberId:    true,
      businessName:       true,
      displayPhone:       true,
      template:           true,
      status:             true,
      chatwootAccountId:  true,
      chatwootStatus:     true,
      chatwootProvisionedAt: true,
      createdAt:          true,
    },
  })

  // Attach dead-letter counts
  const dlCounts = await prisma.deadLetter.groupBy({
    by: ['tenantId'],
    where: { resolved: false, tenantId: { not: null } },
    _count: { _all: true },
  })
  const dlMap = new Map(dlCounts.map((r) => [r.tenantId!, r._count._all]))

  return NextResponse.json({
    total: tenants.length,
    tenants: tenants.map((t) => ({
      ...t,
      deadLetterCount: dlMap.get(t.tenantId) ?? 0,
    })),
  })
}

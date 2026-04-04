/**
 * GET /api/isola/provision-status?tenantId=xxx
 * Polls tenantRegistry status for Path B onboarding progress screen.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

const STEP_LABELS: Record<string, string> = {
  pending_otp:   'Verifying your number with WhatsApp...',
  provisioning:  'Starting your AI agent...',
  active:        'Your agent is live!',
  inactive:      'Provisioning failed — our team has been alerted.',
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

  const tenant = await prisma.tenantRegistry.findUnique({
    where: { tenantId },
    select: { status: true, waPhoneNumberId: true, containerPort: true, didNumber: true },
  }).catch(() => null)

  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    status: tenant.status,
    label:  STEP_LABELS[tenant.status] || tenant.status,
    active: tenant.status === 'active',
  })
}

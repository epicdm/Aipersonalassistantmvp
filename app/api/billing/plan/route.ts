import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, pendingPlan: true },
  })

  return NextResponse.json({
    plan: user?.plan ?? 'free',
    pendingPlan: user?.pendingPlan ?? null,
  })
}

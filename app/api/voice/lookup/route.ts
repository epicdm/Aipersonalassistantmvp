import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

type IsolaSignupRecord = {
  id: string
  containerUrl: string | null
}

type IsolaSignupDelegate = {
  findFirst(args: {
    where: {
      status: string
      OR: Array<{ didNumber: string }>
    }
    select: {
      id: true
      containerUrl: true
    }
  }): Promise<IsolaSignupRecord | null>
}

type TenantRegistry = {
  tenantId: string
  containerPort: number
  didNumber: string | null
  status: string
}

type TenantRegistryDelegate = {
  findFirst(args: {
    where: {
      status: string
      OR: Array<{ didNumber: string }>
    }
    select: {
      tenantId: true
      containerPort: true
    }
  }): Promise<Pick<TenantRegistry, 'tenantId' | 'containerPort'> | null>
}

const INTERNAL_SECRET =
  process.env.INTERNAL_SECRET === undefined
    ? 'bff-internal-2026'
    : process.env.INTERNAL_SECRET

const OCMT_HOST = process.env.OCMT_HOST || '66.118.37.12'

function normalizeDidCandidates(did: string): string[] {
  const cleaned = did.replace(/\D+/g, '')
  const candidates = new Set<string>()

  if (cleaned) candidates.add(cleaned)
  if (/^1\d{10}$/.test(cleaned)) candidates.add(cleaned.slice(1))

  return Array.from(candidates)
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (INTERNAL_SECRET && secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const did = searchParams.get('did')?.trim() || ''
  if (!did) {
    return NextResponse.json({ error: 'did required' }, { status: 400 })
  }

  const didCandidates = normalizeDidCandidates(did)
  const isolaSignup = (prisma as unknown as { isolaSignup: IsolaSignupDelegate }).isolaSignup

  // Check new isola_signup table first (Sprint 11b+ tenants)
  const signup = await isolaSignup.findFirst({
    where: {
      status: 'active',
      OR: didCandidates.map((value) => ({ didNumber: value })),
    },
    select: {
      id: true,
      containerUrl: true,
    },
  })

  if (signup?.containerUrl) {
    console.log(`[voice/lookup] did=${did} found=${signup.containerUrl} (isola_signup)`)
    return NextResponse.json({ containerUrl: signup.containerUrl, tenantId: signup.id })
  }

  // Fallback: check legacy tenant_registry (pre-Sprint 11b tenants)
  const tenantRegistry = (prisma as unknown as { tenantRegistry: TenantRegistryDelegate }).tenantRegistry

  const legacy = await tenantRegistry.findFirst({
    where: {
      status: 'active',
      OR: didCandidates.map((value) => ({ didNumber: value })),
    },
    select: {
      tenantId: true,
      containerPort: true,
    },
  })

  if (legacy?.containerPort) {
    const containerUrl = `http://${OCMT_HOST}:${legacy.containerPort}`
    console.log(`[voice/lookup] did=${did} found=${containerUrl} (tenant_registry)`)
    return NextResponse.json({ containerUrl, tenantId: legacy.tenantId })
  }

  console.log(`[voice/lookup] did=${did} found=`)
  return NextResponse.json({ error: 'not found' }, { status: 404 })
}

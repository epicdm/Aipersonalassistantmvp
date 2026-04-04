import { vi } from 'vitest'

// Mock environment variables for all tests
process.env.TENANT_MASTER_KEY = 'test-master-key-for-unit-tests-only'
process.env.META_APP_SECRET = 'test-app-secret'
process.env.META_APP_ID = 'test-app-id'
process.env.META_WA_TOKEN = 'test-wa-token'
process.env.META_PHONE_ID = 'test-phone-id'
process.env.ERIC_PHONE = '17671234567'
process.env.OCMT_URL = 'http://localhost:4000'
process.env.NEXT_PUBLIC_BASE_URL = 'https://bff.epic.dm'

// Mock prisma globally
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    tenantRegistry: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    agentActivity: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

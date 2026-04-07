import { prisma } from '@/app/lib/prisma'
import type { AuditEntry } from '@/app/lib/runtime/types'

export async function logAuditEntries(agentId: string, audit: AuditEntry[]) {
  for (const entry of audit) {
    await prisma.agentActivity.create({
      data: {
        agentId,
        type: entry.type,
        summary: entry.summary,
        metadata: entry.metadata ?? {},
      },
    })
  }
}

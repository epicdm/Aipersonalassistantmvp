import crypto from 'crypto'
import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'
import { logAuditEntries } from '@/app/lib/runtime/audit-log'
import type { AuditEntry, PolicyMode, PlannedAction } from '@/app/lib/runtime/types'

export async function executePlannedActions(input: {
  agent: { id: string; ownerPhone?: string | null; config?: any }
  phone: string
  conversation: { id: string }
  policyMode: PolicyMode
  actions: PlannedAction[]
  audit: AuditEntry[]
}) {
  const effectivePhoneId = input.agent.config?.phoneNumberId || undefined

  for (const action of input.actions) {
    if (action.type !== 'reply') continue
    const reply = String(action.payload?.reply || '')
    if (!reply) continue

    if (input.policyMode === 'draft') {
      await prisma.messageDraft.create({
        data: {
          id: crypto.randomUUID(),
          agentId: input.agent.id,
          conversationId: input.conversation.id,
          draftText: reply,
          status: 'pending',
        },
      })
      continue
    }

    if (input.policyMode === 'execute') {
      await sendWhatsAppMessage(input.phone, reply, effectivePhoneId)
    }
  }

  if (input.audit.length > 0) {
    await logAuditEntries(input.agent.id, input.audit)
  }
}

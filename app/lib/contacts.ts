/**
 * Contact resolution — shared by webhook handler and internal booking route.
 * Finds or creates a Contact record for a given phone number, scoped to agent.
 */

import crypto from 'crypto'
import { prisma } from '@/app/lib/prisma'

export async function findOrCreateContact(
  agent: { id: string; userId: string },
  phone: string,
  fallbackName?: string,
) {
  let contact = await prisma.contact.findFirst({
    where: { userId: agent.userId, phone },
  })

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: agent.userId,
        primaryAgentId: agent.id,
        name: fallbackName || phone,
        phone,
      },
    })
  }

  const agentContact = await prisma.agentContact.findFirst({
    where: { agentId: agent.id, contactId: contact.id },
  })

  if (!agentContact) {
    await prisma.agentContact.create({
      data: {
        id: crypto.randomUUID(),
        agentId: agent.id,
        contactId: contact.id,
      },
    }).catch(() => null)
  } else {
    await prisma.agentContact.update({
      where: { id: agentContact.id },
      data: { lastContactAt: new Date() },
    }).catch(() => null)
  }

  return contact
}

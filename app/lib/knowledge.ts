import { prisma } from '@/app/lib/prisma'

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function cleanLine(label: string, value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? `${label}: ${trimmed}` : null
}

function truncate(text: string, max = 600): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function extractProfileLines(config: unknown): string[] {
  const cfg = asObject(config)
  const knowledge = asObject(cfg.knowledge)
  const business = asObject(cfg.business)

  return [
    cleanLine('Business name', knowledge.businessName ?? business.name),
    cleanLine('Hours', knowledge.hours),
    cleanLine('Services', knowledge.services),
    cleanLine('FAQ', knowledge.faq ?? knowledge.commonQuestions),
    cleanLine('Escalate when', knowledge.escalation ?? knowledge.escalationTriggers),
    cleanLine('Restrictions', knowledge.restrictions),
    cleanLine('Target customers', knowledge.targetCustomers),
  ].filter(Boolean) as string[]
}

export async function buildKnowledgeContext(agentId: string, config: unknown): Promise<string> {
  const profileLines = extractProfileLines(config)

  const sources = await prisma.knowledgeSource.findMany({
    where: {
      agentId,
      embedStatus: { in: ['ready', 'synced', 'complete'] },
      OR: [
        { content: { not: null } },
        { url: { not: null } },
        { filePath: { not: null } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  }).catch(() => [])

  const sourceLines = sources
    .map((source) => {
      const content = typeof source.content === 'string' ? source.content.trim() : ''
      const location = source.url || source.filePath || source.name
      if (content) {
        return `Source (${source.type} • ${source.name}): ${truncate(content.replace(/\s+/g, ' '), 800)}`
      }
      return location ? `Source (${source.type} • ${source.name}): ${location}` : null
    })
    .filter(Boolean) as string[]

  const blocks: string[] = []
  if (profileLines.length) {
    blocks.push('Business profile:\n' + profileLines.map((line) => `- ${line}`).join('\n'))
  }
  if (sourceLines.length) {
    blocks.push('Knowledge sources:\n' + sourceLines.map((line) => `- ${line}`).join('\n'))
  }

  return blocks.join('\n\n')
}

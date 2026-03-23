import { prisma } from 'wasp/server'

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

function truncate(text: string, max = 800): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export async function buildKnowledgeContext(agentId: string, config: unknown): Promise<string> {
  const cfg = asObject(config)
  const knowledge = asObject(cfg.knowledge)
  const business = asObject(cfg.business)

  const profileLines = [
    cleanLine('Business name', knowledge.businessName ?? business.name),
    cleanLine('Hours', knowledge.hours),
    cleanLine('Services', knowledge.services),
    cleanLine('FAQ', knowledge.faq ?? knowledge.commonQuestions),
    cleanLine('Escalation', knowledge.escalation ?? knowledge.escalationTriggers),
    cleanLine('Restrictions', knowledge.restrictions),
  ].filter(Boolean) as string[]

  const sources = await prisma.knowledgeSource.findMany({
    where: {
      agentId,
      embedStatus: { in: ['ready', 'synced', 'complete'] },
      OR: [{ content: { not: null } }, { url: { not: null } }, { filePath: { not: null } }],
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  }).catch(() => [])

  const sourceLines = sources
    .map((source) => {
      if (source.content?.trim()) {
        return `Source (${source.type} • ${source.name}): ${truncate(source.content.replace(/\s+/g, ' '))}`
      }
      return `Source (${source.type} • ${source.name}): ${source.url || source.filePath || source.name}`
    })
    .filter(Boolean)

  const blocks: string[] = []
  if (profileLines.length) blocks.push('Business profile:\n' + profileLines.map((line) => `- ${line}`).join('\n'))
  if (sourceLines.length) blocks.push('Knowledge sources:\n' + sourceLines.map((line) => `- ${line}`).join('\n'))
  return blocks.join('\n\n')
}

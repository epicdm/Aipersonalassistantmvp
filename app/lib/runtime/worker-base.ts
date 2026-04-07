// app/lib/runtime/worker-base.ts
// Shared agentic loop: system prompt → LLM → tool call → second LLM

import { callAI } from '@/app/lib/ai-provider'
import { executeTool, type ToolCall } from './tool-registry'
import { getCachedPrompt, setCachedPrompt } from './prompt-cache'
import type { RuntimeContext, WorkerDecision } from './types'

export interface WorkerConfig {
  name: string
  systemPrompt: string
  tools: string[]
}

export async function runAgenticLoop(
  config: WorkerConfig,
  context: RuntimeContext & { messageText?: string },
  makeDecision: (llmOutput: string) => WorkerDecision
): Promise<WorkerDecision> {
  const cacheKey = `${config.name}:${context.agentId}`
  let systemPrompt = getCachedPrompt(cacheKey)
  
  if (!systemPrompt) {
    systemPrompt = config.systemPrompt
    setCachedPrompt(cacheKey, systemPrompt)
  }

  // First LLM call
  const response1 = await callAI({
    system: systemPrompt,
    messages: [
      { role: 'user', content: context.messageText || 'Hello' }
    ],
    temperature: 0.7,
  })

  const llmOutput = response1.content

  // Check for tool calls in output
  const toolCall = extractToolCall(llmOutput)
  
  if (toolCall) {
    // Execute tool
    const toolResult = await executeTool(toolCall)
    
    // Second LLM call with tool result
    const response2 = await callAI({
      system: systemPrompt,
      messages: [
        { role: 'user', content: context.messageText || 'Hello' },
        { role: 'assistant', content: llmOutput },
        { role: 'user', content: `Tool result: ${JSON.stringify(toolResult)}` }
      ],
      temperature: 0.7,
    })

    return makeDecision(response2.content)
  }

  return makeDecision(llmOutput)
}

function extractToolCall(output: string): ToolCall | null {
  // Simple regex to extract tool calls from LLM output
  const match = output.match(/\[TOOL:(\w+\.\w+)\](.+?)\[\/TOOL\]/s)
  if (!match) return null
  
  try {
    const params = JSON.parse(match[2] || '{}')
    return { tool: match[1] as any, params }
  } catch {
    return null
  }
}

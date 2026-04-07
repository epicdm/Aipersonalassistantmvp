// app/lib/ai-provider.ts
import Anthropic from '@anthropic-ai/sdk'

export type AIProvider = 'deepseek' | 'anthropic' | 'openai'

export interface CallAIOptions {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxTokens?: number
  provider?: AIProvider
}

export interface AIResponse {
  content: string
  usage?: { input_tokens: number; output_tokens: number }
}

const DEFAULT_MAX_TOKENS = 800

export async function callAI(options: CallAIOptions): Promise<AIResponse> {
  const provider = options.provider ?? detectProvider()
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
  switch (provider) {
    case 'anthropic': return callAnthropic(options, maxTokens)
    case 'deepseek': return callDeepSeek(options, maxTokens)
    case 'openai': return callOpenAI(options, maxTokens)
    default: throw new Error('No AI provider configured')
  }
}

function detectProvider(): AIProvider {
  // Prioritize DeepSeek since OAuth tokens don't work with Anthropic API directly
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  throw new Error('No AI provider configured')
}

async function callAnthropic(options: CallAIOptions, maxTokens: number): Promise<AIResponse> {
  // OAuth tokens don't work with SDK - use fetch
  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  const isOAuth = apiKey.startsWith('sk-ant-oat')
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Anthropic-Version': '2023-06-01',
  }
  
  if (isOAuth) {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else {
    headers['x-api-key'] = apiKey
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages: options.messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic error: ${response.status} ${error}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || ''
  
  return {
    content,
    usage: {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
    }
  }
}

async function callDeepSeek(options: CallAIOptions, maxTokens: number): Promise<AIResponse> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer ' + (process.env.DEEPSEEK_API_KEY || '') 
    },
    body: JSON.stringify({ 
      model: 'deepseek-chat', 
      messages: [{ role: 'system', content: options.system }, ...options.messages], 
      temperature: options.temperature ?? 0.7, 
      max_tokens: maxTokens 
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error('DeepSeek error: ' + response.status + ' ' + err)
  }
  const data = await response.json()
  return { 
    content: data.choices[0]?.message?.content ?? '', 
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    }
  }
}

async function callOpenAI(options: CallAIOptions, maxTokens: number): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer ' + (process.env.OPENAI_API_KEY || '') 
    },
    body: JSON.stringify({ 
      model: 'gpt-4o-mini', 
      messages: [{ role: 'system', content: options.system }, ...options.messages], 
      temperature: options.temperature ?? 0.7, 
      max_tokens: maxTokens 
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error('OpenAI error: ' + response.status + ' ' + err)
  }
  const data = await response.json()
  return { 
    content: data.choices[0]?.message?.content ?? '', 
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    }
  }
}

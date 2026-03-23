import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const BOT_TOKEN = '8552413210:AAEblPTR4tECTUcT1XZclyKrV_E0cxTnAJU'
const OWNER_ID = 5136767981
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

const SYSTEM_PROMPT = `You are Dev, the autonomous AI operations manager for the BFF platform.
You run ON the BFF server at 66.118.37.63. You have full control.

The BFF app is a WhatsApp AI assistant SaaS platform:
- Next.js 16 app at /opt/bff
- PM2 process: bff-web on port 3004, runs 'next start -p 3004'
- PostgreSQL: localhost:5432, user ocmt, pass ocmt_secure_2026, db bff
- Nginx proxies bff.epic.dm → port 3004
- Live URL: https://bff.epic.dm
- Git repo: /opt/bff (branch: main, remote: github.com/epicdm/Aipersonalassistantmvp)

Your capabilities:
- Check server status, PM2, logs
- Read and edit source files
- Run builds and restarts
- Check the database
- Git operations
- Fix bugs in the codebase

To execute a shell command, include it EXACTLY like this in your reply:
[CMD:your command here]

You can include multiple commands. Each will be executed in sequence.
After commands run, you'll see their output and can respond with follow-up commands.

Rules:
- ALWAYS execute when asked to check/fix something, don't just describe
- Keep replies SHORT — you're on Telegram, not writing a report
- If a command fails, diagnose and try another approach
- Never run destructive commands (rm -rf, DROP TABLE, etc.) without explicit confirmation
- For rebuilds, always check build output before restarting

Common commands:
- Status: [CMD:pm2 list]
- Logs: [CMD:pm2 logs bff-web --lines 20 --nostream]
- Restart: [CMD:pm2 restart bff-web]
- Build: [CMD:cd /opt/bff && npm run build 2>&1 | tail -30]
- DB check: [CMD:PGPASSWORD=ocmt_secure_2026 psql -U ocmt -d bff -h localhost -c '\\dt']
- Git status: [CMD:cd /opt/bff && git log --oneline -5]
- Site check: [CMD:curl -s -o /dev/null -w '%{http_code}' http://localhost:3004/]`

async function sendTelegram(chatId: number, text: string) {
  // Sanitize text for HTML parse mode - escape special chars not in tags
  const safeText = text
    .replace(/&(?!amp;|lt;|gt;|quot;)/g, '&amp;')
  
  try {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: safeText,
        parse_mode: 'HTML',
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      // Fallback: send without parse mode if HTML fails
      await fetch(`${TG_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      })
    }
  } catch (err) {
    console.error('[BFF-OPS] sendTelegram error:', err)
  }
}

async function callDeepSeek(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 1000,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(20000),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ''
}

async function executeCommand(cmd: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 30000,
      shell: '/bin/bash',
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.HOME}/.local/bin:${process.env.PATH}` },
    })
    const output = (stdout + stderr).trim()
    return output.slice(0, 3000) || '(no output)'
  } catch (err: any) {
    return `Error: ${err.message?.slice(0, 500) || 'unknown'}`
  }
}

// Simple in-memory conversation history per chat (last 10 messages)
const conversationHistory = new Map<number, { role: string; content: string }[]>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId: number = message?.chat?.id
    const senderId: number = message?.from?.id
    const text: string = message?.text?.trim() || ''

    // Only respond to owner
    if (senderId !== OWNER_ID) return NextResponse.json({ ok: true })
    if (!text) return NextResponse.json({ ok: true })

    // Get or init conversation history
    if (!conversationHistory.has(chatId)) {
      conversationHistory.set(chatId, [])
    }
    const history = conversationHistory.get(chatId)!

    // Add user message to history
    history.push({ role: 'user', content: text })
    if (history.length > 20) history.splice(0, history.length - 20)

    // Get AI response
    let aiReply = await callDeepSeek([
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10),
    ])

    // Execute any commands found in the reply
    const cmdRegex = /\[CMD:([^\]]+)\]/g
    let match
    const cmdOutputs: string[] = []

    while ((match = cmdRegex.exec(aiReply)) !== null) {
      const cmd = match[1].trim()
      const output = await executeCommand(cmd)
      cmdOutputs.push(`<b>$ ${cmd}</b>\n<code>${output}</code>`)
    }

    // Remove CMD tokens from the reply text
    const cleanReply = aiReply.replace(/\[CMD:[^\]]+\]/g, '').trim()

    // Build final message
    let finalMessage = cleanReply
    if (cmdOutputs.length > 0) {
      finalMessage = (cleanReply ? cleanReply + '\n\n' : '') + cmdOutputs.join('\n\n')
    }
    if (!finalMessage) finalMessage = '(done)'

    // Add AI reply to history
    history.push({ role: 'assistant', content: aiReply })

    // Send to Telegram (split if too long)
    if (finalMessage.length > 4000) {
      const chunks = finalMessage.match(/.{1,4000}/gs) || [finalMessage]
      for (const chunk of chunks) {
        await sendTelegram(chatId, chunk)
      }
    } else {
      await sendTelegram(chatId, finalMessage)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[BFF-OPS]', err)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  await sendTelegram(OWNER_ID, '🟢 BFF DevOps agent is online. Type <b>status</b> to check the platform.')
  return NextResponse.json({ ok: true, agent: 'bff-ops' })
}

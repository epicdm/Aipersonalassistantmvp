import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', logger(console.log))
app.use('*', cors())

const PREFIX = '/make-server-9e48b216'

// Auth middleware helper
async function getAuthUser(c: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) return null
  return user
}

// Get agent settings
app.get(`${PREFIX}/settings`, async (c) => {
  const user = await getAuthUser(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const settings = await kv.get(`agent_settings_${user.id}`)
    return c.json(settings || {
      name: "My Assistant",
      purpose: "I am a helpful AI assistant.",
      status: "Draft",
      tools: { calendar: false, email: false, knowledge: false },
      whatsappStatus: "Disconnected",
      phoneNumber: ""
    })
  } catch (err) {
    return c.json({ error: 'Failed to fetch settings' }, 500)
  }
})

// Save agent settings
app.post(`${PREFIX}/settings`, async (c) => {
  const user = await getAuthUser(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const body = await c.req.json()
    await kv.set(`agent_settings_${user.id}`, body)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed to save settings' }, 500)
  }
})

// Mock signup route (as required by instructions)
app.post(`${PREFIX}/signup`, async (c) => {
  const { email, password, name } = await c.req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
    email_confirm: true
  })

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ user: data.user })
})

Deno.serve(app.fetch)

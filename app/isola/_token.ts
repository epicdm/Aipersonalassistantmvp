import { cookies } from 'next/headers'
import { validateToken } from '@/app/lib/dashboard-auth'

/** Read + validate token from URL param or cookie (for server components) */
export async function getToken(searchParams: { token?: string }): Promise<{ token: string; agentId: string } | null> {
  const jar = await cookies()
  const token = searchParams.token || jar.get('isola_token')?.value || ''
  const agentId = validateToken(token)
  if (!agentId) return null
  return { token, agentId }
}

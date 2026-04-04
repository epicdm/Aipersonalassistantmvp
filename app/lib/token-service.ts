import { prisma } from '@/app/lib/prisma'
import { encryptToken, decryptToken } from '@/app/lib/crypto'
import { alertEric } from '@/app/lib/alert'

const META_APP_ID     = process.env.META_APP_ID     || ''
const META_APP_SECRET = process.env.META_APP_SECRET || ''

/**
 * Encrypt and store a token for a tenant.
 */
export async function storeToken(
  tenantId: string,
  plainToken: string,
  tokenType: 'expiring' | 'permanent' = 'expiring',
  expiresInDays = 60,
): Promise<void> {
  const tokenEncrypted = encryptToken(plainToken)
  const tokenExpiresAt = tokenType === 'expiring'
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  await prisma.tenantRegistry.update({
    where: { tenantId },
    data: { tokenEncrypted, tokenExpiresAt, tokenType },
  })

  console.log('[token-lifecycle]', { tenantId, action: 'store', tokenType, expiresAt: tokenExpiresAt?.toISOString() || 'permanent' })
}

/**
 * Decrypt and return a tenant's token.
 */
export async function getToken(tenantId: string): Promise<string> {
  const tenant = await prisma.tenantRegistry.findUniqueOrThrow({
    where: { tenantId },
    select: { tokenEncrypted: true },
  })
  return decryptToken(tenant.tokenEncrypted)
}

/**
 * Attempt to refresh a tenant's token via Meta's fb_exchange_token.
 * On success: updates DB with new token + expiry.
 * On error 190 (expired): sets status=token_expired, alerts admin.
 * On other errors: logs warning, sets needsReauth implicitly via status.
 */
export async function refreshToken(tenantId: string): Promise<{ success: boolean; error?: string }> {
  let currentToken: string
  try {
    currentToken = await getToken(tenantId)
  } catch (err: any) {
    console.error('[token-lifecycle]', { tenantId, action: 'refresh', result: 'decrypt_failed', error: err.message })
    return { success: false, error: 'Failed to decrypt current token' }
  }

  try {
    const url = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${currentToken}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })

    let data: any
    try {
      data = await res.json()
    } catch {
      console.error('[token-lifecycle]', { tenantId, action: 'refresh', result: 'invalid_json', status: res.status })
      await alertEric(`Token refresh for tenant ${tenantId} returned non-JSON response (status ${res.status})`)
      return { success: false, error: 'Meta returned non-JSON response' }
    }

    if (data.access_token) {
      const newEncrypted = encryptToken(data.access_token)
      const expiresIn = data.expires_in || 60 * 24 * 60 * 60 // default 60 days
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

      await prisma.tenantRegistry.update({
        where: { tenantId },
        data: { tokenEncrypted: newEncrypted, tokenExpiresAt },
      })

      console.log('[token-lifecycle]', { tenantId, action: 'refresh', result: 'success', newExpiry: tokenExpiresAt.toISOString() })
      return { success: true }
    }

    // Token expired (error 190) or other Meta error
    const errorCode = data.error?.code
    if (errorCode === 190) {
      await prisma.tenantRegistry.update({
        where: { tenantId },
        data: { status: 'token_expired' },
      })
      await alertEric(`Token expired for tenant ${tenantId} (error 190). Tenant agent paused. Re-authentication needed via Embedded Signup.`)
      console.log('[token-lifecycle]', { tenantId, action: 'refresh', result: 'token_expired' })
      return { success: false, error: 'Token expired — re-authentication required' }
    }

    // Other Meta error — flag for re-auth
    await alertEric(`Token refresh failed for tenant ${tenantId}: ${data.error?.message || JSON.stringify(data)}`)
    console.log('[token-lifecycle]', { tenantId, action: 'refresh', result: 'meta_error', error: data.error?.message })
    return { success: false, error: data.error?.message || 'Unknown Meta error' }

  } catch (err: any) {
    console.error('[token-lifecycle]', { tenantId, action: 'refresh', result: 'network_error', error: err.message })
    await alertEric(`Token refresh network error for tenant ${tenantId}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

/**
 * Find tenants with tokens expiring within the given threshold.
 */
export async function checkExpiring(daysThreshold: number) {
  const threshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000)
  return prisma.tenantRegistry.findMany({
    where: {
      tokenType: 'expiring',
      tokenExpiresAt: { lt: threshold },
      status: { in: ['active', 'provisioning'] },
    },
    select: { tenantId: true, waPhoneNumberId: true, tokenExpiresAt: true, businessName: true },
  })
}

/**
 * Health-check a tenant's token by calling GET /me on the Meta API.
 * For permanent tokens that don't need refresh.
 */
export async function healthCheck(tenantId: string): Promise<{ healthy: boolean; error?: string }> {
  let token: string
  try {
    token = await getToken(tenantId)
  } catch (err: any) {
    console.error('[token-lifecycle]', { tenantId, action: 'health-check', result: 'decrypt_failed' })
    return { healthy: false, error: 'Decrypt failed' }
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/me?access_token=${token}`, {
      signal: AbortSignal.timeout(10000),
    })

    let data: any
    try {
      data = await res.json()
    } catch {
      console.log('[token-lifecycle]', { tenantId, action: 'health-check', result: 'invalid_json' })
      return { healthy: false, error: 'Non-JSON response from Meta' }
    }

    if (data.id) {
      console.log('[token-lifecycle]', { tenantId, action: 'health-check', result: 'healthy' })
      return { healthy: true }
    }

    console.log('[token-lifecycle]', { tenantId, action: 'health-check', result: 'unhealthy', error: data.error?.message })
    if (data.error?.code === 190) {
      await prisma.tenantRegistry.update({ where: { tenantId }, data: { status: 'token_expired' } })
      await alertEric(`Permanent token expired for tenant ${tenantId}. Re-authentication needed.`)
    }
    return { healthy: false, error: data.error?.message }
  } catch (err: any) {
    console.log('[token-lifecycle]', { tenantId, action: 'health-check', result: 'network_error', error: err.message })
    return { healthy: false, error: err.message }
  }
}

/**
 * Business enrichment: pull Facebook Page + Instagram data after auth.
 * Called async after Embedded Signup completes.
 */
import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'
import { alertEric } from '@/app/lib/alert'

// ── Category → Template mapping ─────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  // Retail
  'butcher shop': 'retail', 'grocery store': 'retail', 'retail': 'retail',
  'shopping & retail': 'retail', 'clothing store': 'retail', 'supermarket': 'retail',
  'convenience store': 'retail', 'pet store': 'retail', 'bookstore': 'retail',
  'pharmacy': 'retail', 'hardware store': 'retail',
  // Restaurant / Hospitality
  'restaurant': 'restaurant', 'café': 'restaurant', 'cafe': 'restaurant',
  'bar': 'restaurant', 'bakery': 'restaurant', 'food & beverage': 'restaurant',
  'hotel': 'hospitality', 'bed and breakfast': 'hospitality',
  // Medical
  'doctor': 'medical', 'dentist': 'medical', 'medical center': 'medical',
  'hospital': 'medical', 'health/beauty': 'medical', 'veterinarian': 'medical',
  'optician': 'medical', 'physiotherapist': 'medical',
  // Professional
  'lawyer': 'professional', 'accountant': 'professional', 'consultant': 'professional',
  'real estate agent': 'professional', 'insurance agent': 'professional',
  'financial service': 'professional', 'professional service': 'professional',
  // Collections
  'financial service': 'collections', 'collection agency': 'collections',
  // ISP / Telecom
  'internet company': 'isp', 'telecommunication': 'isp', 'telecom': 'isp',
  'internet service provider': 'isp',
}

export function mapCategoryToTemplate(fbCategory: string): string {
  const lower = fbCategory.toLowerCase().trim()
  // Exact match
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower]
  // Partial match
  for (const [key, template] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return template
  }
  return 'service' // default
}

// ── Enrichment from Facebook ─────────────────────────────────────────────────

export interface EnrichedBusiness {
  pageName: string
  pageId: string
  category: string
  template: string
  description: string | null
  about: string | null
  website: string | null
  phone: string | null
  email: string | null
  hours: any | null
  location: string | null
  logoUrl: string | null
  coverUrl: string | null
  fanCount: number | null
  rating: number | null
  instagramHandle: string | null
  instagramBio: string | null
  instagramFollowers: number | null
  instagramPicUrl: string | null
}

export async function enrichFromFacebook(
  userToken: string,
  matchPhone?: string
): Promise<EnrichedBusiness | null> {
  try {
    // Pull all pages the user admins
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,category,description,about,website,phone,emails,hours,location,single_line_address,cover,fan_count,followers_count,overall_star_rating,instagram_business_account&limit=10&access_token=${userToken}`,
      { signal: AbortSignal.timeout(15000) }
    )

    let pagesData: any
    try { pagesData = await pagesRes.json() } catch { return null }

    const pages = pagesData?.data || []
    if (pages.length === 0) return null

    // Pick the best page: match by phone number, or first page
    let page = pages[0]
    if (matchPhone && pages.length > 1) {
      const phoneDigits = matchPhone.replace(/\D/g, '')
      const phoneMatch = pages.find((p: any) => {
        const pPhone = (p.phone || '').replace(/\D/g, '')
        return pPhone && (pPhone.includes(phoneDigits) || phoneDigits.includes(pPhone))
      })
      if (phoneMatch) page = phoneMatch
    }

    // Get logo
    let logoUrl: string | null = null
    try {
      const picRes = await fetch(
        `https://graph.facebook.com/v25.0/${page.id}/picture?type=large&redirect=false&access_token=${userToken}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const picData = await picRes.json().catch(() => null)
      logoUrl = picData?.data?.url || null
    } catch {}

    // Get Instagram if linked
    let instagramHandle: string | null = null
    let instagramBio: string | null = null
    let instagramFollowers: number | null = null
    let instagramPicUrl: string | null = null

    const igId = page.instagram_business_account?.id
    if (igId) {
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/v25.0/${igId}?fields=username,name,biography,profile_picture_url,followers_count&access_token=${userToken}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const igData = await igRes.json().catch(() => null)
        if (igData?.username) {
          instagramHandle = `@${igData.username}`
          instagramBio = igData.biography || null
          instagramFollowers = igData.followers_count || null
          instagramPicUrl = igData.profile_picture_url || null
        }
      } catch {}
    }

    const category = page.category || 'Business'
    const template = mapCategoryToTemplate(category)

    return {
      pageName: page.name || 'Unknown Business',
      pageId: page.id,
      category,
      template,
      description: page.description || null,
      about: page.about || null,
      website: page.website || null,
      phone: page.phone || null,
      email: page.emails?.[0] || null,
      hours: page.hours || null,
      location: page.single_line_address || page.location?.city || null,
      logoUrl,
      coverUrl: page.cover?.source || null,
      fanCount: page.fan_count || null,
      rating: page.overall_star_rating || null,
      instagramHandle,
      instagramBio,
      instagramFollowers,
      instagramPicUrl,
    }
  } catch (err: any) {
    console.error('[enrichment] Facebook API error:', err.message)
    return null
  }
}

// ── Build agent knowledge from enriched data ─────────────────────────────────

export function seedAgentKnowledge(enriched: EnrichedBusiness): Record<string, any> {
  return {
    businessName: enriched.pageName,
    hours: enriched.hours
      ? Object.entries(enriched.hours).map(([k, v]) => `${k}: ${v}`).join(', ')
      : null,
    services: enriched.description || enriched.about || null,
    topFAQs: null, // can be enriched later from page posts/reviews
    escalationContact: enriched.phone || enriched.email || null,
    website: enriched.website,
    location: enriched.location,
    category: enriched.category,
    importedFrom: 'facebook',
  }
}

// ── Send pre-filled WhatsApp Flow after enrichment ───────────────────────────

export async function sendPrefilledFlow(
  phone: string,
  enriched: EnrichedBusiness,
  fromPhoneId?: string
): Promise<void> {
  const META_TOKEN = process.env.META_WA_TOKEN || ''
  const phoneId = fromPhoneId || process.env.META_PHONE_ID || process.env.WHATSAPP_PHONE_ID || ''
  const FLOW_ID = process.env.ISOLA_ONBOARDING_FLOW_ID

  if (!FLOW_ID) {
    console.error('[enrichment] No ISOLA_ONBOARDING_FLOW_ID set, sending confirmation instead')
    return sendEnrichmentConfirmation(phone, enriched, fromPhoneId)
  }

  // Format hours for pre-fill
  let hoursStr = ''
  if (enriched.hours) {
    const entries = Object.entries(enriched.hours).slice(0, 3)
    hoursStr = entries.map(([k, v]) => `${k}: ${v}`).join(', ')
  }

  await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: phone, type: 'interactive',
      interactive: {
        type: 'flow',
        body: { text: `We imported your business details from Facebook! Review and confirm:` },
        action: { name: 'flow', parameters: {
          flow_message_version: '3', flow_id: FLOW_ID, flow_cta: 'Review & Confirm',
          flow_action: 'navigate', flow_action_payload: {
            screen: 'TEMPLATE',
            data: {
              greeting: `Welcome ${enriched.pageName}! We imported your details.`,
              // Pre-fill fields — Flow screens will show these
              prefilled_name: enriched.pageName,
              prefilled_category: enriched.category,
              prefilled_template: enriched.template,
              prefilled_email: enriched.email || '',
              prefilled_hours: hoursStr,
              prefilled_website: enriched.website || '',
            },
          },
        }},
      },
    }),
  })

  console.log('[enrichment] Sent pre-filled Flow to:', phone)
}

// ── Send confirmation message to WhatsApp (fallback) ─────────────────────────

export async function sendEnrichmentConfirmation(
  phone: string,
  enriched: EnrichedBusiness,
  fromPhoneId?: string
): Promise<void> {
  const lines = [`*${enriched.pageName}*`]
  if (enriched.category) lines.push(`🏷️ ${enriched.category} → ${enriched.template} template`)
  if (enriched.location) lines.push(`📍 ${enriched.location}`)
  if (enriched.website) lines.push(`🌐 ${enriched.website}`)
  if (enriched.phone) lines.push(`📞 ${enriched.phone}`)
  if (enriched.hours) lines.push(`🕐 Hours imported`)
  if (enriched.instagramHandle) {
    lines.push(`📸 ${enriched.instagramHandle}${enriched.instagramFollowers ? ` (${enriched.instagramFollowers.toLocaleString()} followers)` : ''}`)
  }
  if (enriched.rating) lines.push(`⭐ ${enriched.rating}/5 rating`)
  if (enriched.fanCount) lines.push(`👍 ${enriched.fanCount.toLocaleString()} likes`)

  const body = `We imported your business details from Facebook:\n\n${lines.join('\n')}\n\nYour AI agent will use this information to answer customer questions. Everything look right?`

  // Send as interactive button message
  const META_TOKEN = process.env.META_WA_TOKEN || ''
  const phoneId = fromPhoneId || process.env.META_PHONE_ID || process.env.WHATSAPP_PHONE_ID || ''

  await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: phone, type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'onboard_activate', title: 'Activate My Agent' } },
            { type: 'reply', reply: { id: 'onboard_edit', title: 'Edit Details' } },
          ],
        },
      },
    }),
  })
}

import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

/**
 * Multi-source business scanner
 * 
 * Strategy:
 * 1. Detect URL type (website, Facebook, Instagram, Google Maps)
 * 2. Use the right extraction method for each
 * 3. For Facebook: use Graph API if possible, otherwise parse meta tags + og:* data
 * 4. Try multiple sources: the URL itself + Google search for supplementary data
 * 5. Combine everything and send to DeepSeek for structuring
 */

// ─── Source Extractors ────────────────────────────────────────

async function fetchWebPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        // Use a real browser user agent to get full content
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return "";
    const html = await res.text();
    return html;
  } catch {
    return "";
  }
}

function extractMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  
  // Open Graph tags (Facebook uses these)
  const ogMatches = html.matchAll(/<meta\s+(?:property|name)="(og:[^"]+)"\s+content="([^"]*)"[^>]*>/gi);
  for (const m of ogMatches) meta[m[1]] = m[2];

  // Regular meta tags
  const metaMatches = html.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"[^>]*>/gi);
  for (const m of metaMatches) meta[m[1]] = m[2];

  // Reverse order meta tags (content first)
  const revMatches = html.matchAll(/<meta\s+content="([^"]*)"\s+(?:property|name)="([^"]+)"[^>]*>/gi);
  for (const m of revMatches) meta[m[2]] = m[1];

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) meta["title"] = titleMatch[1].trim();

  return meta;
}

function extractStructuredData(html: string): any[] {
  // JSON-LD structured data (most businesses have this)
  const jsonLdMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  const results: any[] = [];
  
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1].trim());
      if (Array.isArray(data)) {
        results.push(...data);
      } else {
        results.push(data);
      }
    } catch {
      // Skip malformed JSON-LD
    }
  }
  return results;
}

function extractFacebookData(html: string): Record<string, any> {
  const data: Record<string, any> = {};
  const meta = extractMetaTags(html);
  
  // Facebook pages expose a lot via og: tags
  if (meta["og:title"]) data.name = meta["og:title"];
  if (meta["og:description"]) data.description = meta["og:description"];
  if (meta["og:type"]) data.type = meta["og:type"];
  if (meta["og:url"]) data.url = meta["og:url"];
  if (meta["og:image"]) data.image = meta["og:image"];
  
  // Facebook-specific meta
  if (meta["al:ios:url"]) data.fbAppUrl = meta["al:ios:url"];

  // Try to get page category from HTML
  const categoryMatch = html.match(/data-key="page_category"[^>]*>([^<]+)/i) ||
                        html.match(/"category"\s*:\s*"([^"]+)"/i) ||
                        html.match(/"page_category"\s*:\s*"([^"]+)"/i);
  if (categoryMatch) data.category = categoryMatch[1];

  // Look for phone numbers
  const phoneMatch = html.match(/(?:tel:|phone[:\s]*|call[:\s]*)([+\d\s\-().]{7,})/i) ||
                     html.match(/"telephone"\s*:\s*"([^"]+)"/i);
  if (phoneMatch) data.phone = phoneMatch[1].trim();

  // Look for address
  const addressMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i) ||
                       html.match(/"address"\s*:\s*\{([^}]+)\}/i);
  if (addressMatch) data.address = addressMatch[1];

  // Look for hours in page data
  const hoursMatch = html.match(/"hours"\s*:\s*\{([^}]+)\}/i) ||
                     html.match(/"openingHours"\s*:\s*"([^"]+)"/i) ||
                     html.match(/"openingHoursSpecification"\s*:\s*(\[[\s\S]*?\])/i);
  if (hoursMatch) data.hoursRaw = hoursMatch[1];

  // Extract visible text for additional context
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  data.textSnippet = textContent.slice(0, 3000);

  return data;
}

function extractGoogleMapsData(html: string): Record<string, any> {
  const data: Record<string, any> = {};
  const meta = extractMetaTags(html);
  
  if (meta["og:title"]) data.name = meta["og:title"].replace(" - Google Maps", "");
  if (meta["og:description"]) data.description = meta["og:description"];
  
  return data;
}

function detectUrlType(url: string): "facebook" | "instagram" | "google_maps" | "website" {
  const lower = url.toLowerCase();
  if (lower.includes("facebook.com") || lower.includes("fb.com")) return "facebook";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("google.com/maps") || lower.includes("goo.gl/maps")) return "google_maps";
  return "website";
}

// ─── Facebook Graph API ───────────────────────────────────────

async function fetchFacebookPage(url: string): Promise<Record<string, any> | null> {
  // Extract page ID or username from URL
  const fbMatch = url.match(/facebook\.com\/(?:pages\/[^/]+\/)?([^/?]+)/i);
  if (!fbMatch) return null;
  
  const pageId = fbMatch[1];
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Meta Business token works for Graph API too
  
  if (!WHATSAPP_TOKEN) return null;

  try {
    // Facebook Graph API — get page info with all fields
    const fields = "name,about,category,category_list,description,emails,phone,website,location,hours,single_line_address,fan_count,cover,picture,general_info,founded,company_overview,products,mission";
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${WHATSAPP_TOKEN}`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!res.ok) {
      console.warn("Facebook Graph API error:", res.status);
      return null;
    }
    
    const data = await res.json();
    
    // Transform to our format
    const result: Record<string, any> = {
      name: data.name,
      description: data.about || data.description || data.company_overview || null,
      phone: data.phone || null,
      email: data.emails?.[0] || null,
      category: data.category || data.category_list?.[0]?.name || null,
      website: data.website || null,
      founded: data.founded || null,
      mission: data.mission || null,
      products: data.products || null,
      generalInfo: data.general_info || null,
      fanCount: data.fan_count || null,
      image: data.cover?.source || data.picture?.data?.url || null,
    };

    // Location
    if (data.location) {
      result.location = {
        address: data.single_line_address || data.location.street,
        city: data.location.city,
        state: data.location.state,
        country: data.location.country,
        zip: data.location.zip,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      };
    }

    // Hours — Facebook returns as {"mon_1_open": "09:00", "mon_1_close": "17:00", ...}
    if (data.hours) {
      const dayMap: Record<string, string> = { mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday", sun: "sunday" };
      result.hours = {};
      for (const [abbr, fullDay] of Object.entries(dayMap)) {
        const open = data.hours[`${abbr}_1_open`];
        const close = data.hours[`${abbr}_1_close`];
        result.hours[fullDay] = {
          open: open || null,
          close: close || null,
          closed: !open,
        };
      }
    }

    // Categories as services hint
    if (data.category_list) {
      result.categories = data.category_list.map((c: any) => c.name);
    }

    return result;
  } catch (e) {
    console.warn("Facebook Graph API fetch failed:", e);
    return null;
  }
}

// ─── Main Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    let fetchUrl = url.trim();
    if (!fetchUrl.startsWith("http://") && !fetchUrl.startsWith("https://")) {
      fetchUrl = "https://" + fetchUrl;
    }

    const urlType = detectUrlType(fetchUrl);
    
    // Fetch the page
    const html = await fetchWebPage(fetchUrl);
    
    // Extract data based on source type
    const meta = extractMetaTags(html);
    const structuredData = extractStructuredData(html);
    let sourceData: Record<string, any> = {};

    switch (urlType) {
      case "facebook": {
        // Try Graph API first (rich data), fall back to HTML scraping
        const fbApiData = await fetchFacebookPage(fetchUrl);
        if (fbApiData) {
          sourceData = fbApiData;
          // If we got Graph API data, we can skip the AI extraction and return directly
          if (fbApiData.name) {
            return NextResponse.json({
              success: true,
              data: {
                name: fbApiData.name,
                industry: fbApiData.category || "business",
                description: fbApiData.description || fbApiData.mission || null,
                phone: fbApiData.phone || null,
                email: fbApiData.email || null,
                location: fbApiData.location || null,
                hours: fbApiData.hours || null,
                services: fbApiData.categories || [],
                products: fbApiData.products ? [fbApiData.products] : [],
                socialMedia: { facebook: fetchUrl, website: fbApiData.website },
                yearFounded: fbApiData.founded || null,
                specialFeatures: fbApiData.generalInfo ? [fbApiData.generalInfo] : [],
                targetAudience: null,
                pricingTier: null,
                website: fbApiData.website || fetchUrl,
                logoUrl: fbApiData.image || null,
                ratings: { score: null, count: fbApiData.fanCount, source: "facebook" },
                teamSize: null,
                languages: [],
                paymentMethods: [],
              },
              source: "facebook_api",
              confidence: "high",
            });
          }
        }
        // Fallback to HTML scraping if Graph API fails
        sourceData = extractFacebookData(html);
        break;
      }
      case "google_maps":
        sourceData = extractGoogleMapsData(html);
        break;
      default:
        // Generic website extraction
        sourceData = {
          name: meta["og:title"] || meta["title"] || "",
          description: meta["og:description"] || meta["description"] || "",
          image: meta["og:image"] || "",
        };
    }

    // Build comprehensive text content for AI analysis
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Compile all available data
    const allData = {
      url: fetchUrl,
      urlType,
      metaTags: meta,
      structuredData: structuredData.length > 0 ? JSON.stringify(structuredData).slice(0, 4000) : null,
      sourceExtraction: sourceData,
      textContent: textContent.slice(0, 8000),
    };

    // Send everything to DeepSeek for intelligent extraction
    const prompt = `You are an expert business data analyst. Extract EVERY piece of business information from the following sources. Be thorough — the more details you extract, the better the customer experience.

SOURCE TYPE: ${urlType}
URL: ${fetchUrl}

META TAGS:
${JSON.stringify(meta, null, 2).slice(0, 2000)}

STRUCTURED DATA (JSON-LD):
${allData.structuredData || "None found"}

SOURCE-SPECIFIC EXTRACTION:
${JSON.stringify(sourceData, null, 2).slice(0, 2000)}

PAGE TEXT CONTENT:
${allData.textContent}

Extract ALL of the following. Use null ONLY if truly not available. Infer from context when possible (e.g., if the page mentions "open daily 9-5", fill in the hours for each day).

Return ONLY valid JSON:
{
  "name": "Full business name",
  "industry": "Specific industry (e.g., Caribbean restaurant, boutique hotel, dental clinic, hair salon, ISP, law firm, auto repair)",
  "description": "2-3 sentence description of what the business does, its vibe, and what makes it unique",
  "phone": "Primary phone number with country code if visible, or null",
  "email": "Contact email or null",
  "location": {
    "address": "Full street address or null",
    "city": "City name",
    "state": "State/province or null",
    "country": "Country",
    "coordinates": null
  },
  "hours": {
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"open": "09:00", "close": "13:00", "closed": false},
    "sunday": {"open": null, "close": null, "closed": true}
  },
  "services": ["List every service, product, or offering mentioned"],
  "products": ["Specific products with prices if mentioned"],
  "socialMedia": {
    "facebook": "URL or null",
    "instagram": "URL or null",
    "twitter": "URL or null",
    "linkedin": "URL or null",
    "youtube": "URL or null"
  },
  "teamSize": "Number of employees if mentioned, or null",
  "yearFounded": "Year if mentioned, or null",
  "languages": ["Languages the business operates in"],
  "paymentMethods": ["Payment methods accepted if mentioned"],
  "specialFeatures": ["Unique selling points, awards, certifications, notable features"],
  "targetAudience": "Who this business primarily serves",
  "pricingTier": "budget, mid-range, premium, or luxury — infer from context",
  "website": "${fetchUrl}",
  "logoUrl": "Logo or main image URL if found, or null",
  "ratings": {"score": null, "count": null, "source": null}
}`;

    const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!deepseekRes.ok) {
      throw new Error(`DeepSeek API error: ${deepseekRes.status}`);
    }

    const deepseekData = await deepseekRes.json();
    const rawContent = deepseekData.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawContent];
    const jsonStr = jsonMatch[1] || rawContent;

    let businessInfo;
    try {
      businessInfo = JSON.parse(jsonStr.trim());
    } catch {
      // Fallback with whatever we could extract
      businessInfo = {
        name: sourceData.name || meta["og:title"] || meta["title"] || new URL(fetchUrl).hostname,
        industry: "business",
        description: sourceData.description || meta["og:description"] || meta["description"] || null,
        phone: sourceData.phone || null,
        location: null,
        hours: null,
        services: [],
        email: null,
        website: fetchUrl,
        socialMedia: {},
        specialFeatures: [],
      };
    }

    return NextResponse.json({ 
      success: true, 
      data: businessInfo,
      source: urlType,
      confidence: structuredData.length > 0 ? "high" : html.length > 1000 ? "medium" : "low",
    });
  } catch (error: any) {
    console.error("Business scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan business", details: error.message },
      { status: 500 }
    );
  }
}

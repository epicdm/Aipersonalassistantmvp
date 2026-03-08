import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-443f0af69dc14ee095fce92d16928850";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Normalize URL
    let fetchUrl = url.trim();
    if (!fetchUrl.startsWith("http://") && !fetchUrl.startsWith("https://")) {
      fetchUrl = "https://" + fetchUrl;
    }

    // Fetch page content
    let pageContent = "";
    try {
      const res = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BFF-AI-Bot/1.0; +https://bff.epic.dm)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const html = await res.text();
        // Strip HTML tags and clean up text
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000); // Limit to 6k chars for DeepSeek
      }
    } catch (fetchErr) {
      // If fetch fails, still try to infer from URL
      console.warn("Could not fetch URL:", fetchErr);
      pageContent = `Website: ${fetchUrl}`;
    }

    // Send to DeepSeek for structured extraction
    const prompt = `You are analyzing a business website. Extract structured business information from the following page content.

URL: ${fetchUrl}
Page Content:
${pageContent}

Return ONLY a valid JSON object with these exact fields (use null for missing data):
{
  "name": "Business name",
  "industry": "Industry type (e.g. restaurant, hotel, law firm, salon, retail, healthcare, construction)",
  "description": "1-2 sentence description of the business",
  "phone": "Phone number or null",
  "location": "City, Country or address or null",
  "hours": {
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"open": null, "close": null, "closed": true},
    "sunday": {"open": null, "close": null, "closed": true}
  },
  "services": ["service1", "service2", "service3"],
  "email": "contact email or null",
  "website": "${fetchUrl}"
}

Only return the JSON, no other text.`;

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
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!deepseekRes.ok) {
      throw new Error(`DeepSeek API error: ${deepseekRes.status}`);
    }

    const deepseekData = await deepseekRes.json();
    const rawContent = deepseekData.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawContent];
    const jsonStr = jsonMatch[1] || rawContent;

    let businessInfo;
    try {
      businessInfo = JSON.parse(jsonStr.trim());
    } catch {
      businessInfo = {
        name: new URL(fetchUrl).hostname.replace("www.", "").split(".")[0],
        industry: "business",
        description: "A business website",
        phone: null,
        location: null,
        hours: null,
        services: [],
        email: null,
        website: fetchUrl,
      };
    }

    return NextResponse.json({ success: true, data: businessInfo });
  } catch (error: any) {
    console.error("Business scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan business", details: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { TEMPLATES } from "@/app/lib/templates";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-443f0af69dc14ee095fce92d16928850";

export async function POST(req: NextRequest) {
  try {
    const businessInfo = await req.json();

    const templatesDesc = TEMPLATES.map(
      (t) =>
        `- ${t.slug}: "${t.name}" — ${t.description} (good for: ${t.tagline})`
    ).join("\n");

    const prompt = `You are an AI business consultant. Based on this business information, recommend the 2-3 most relevant AI agent templates.

Business Info:
- Name: ${businessInfo.name || "Unknown"}
- Industry: ${businessInfo.industry || "Unknown"}
- Description: ${businessInfo.description || ""}
- Services: ${(businessInfo.services || []).join(", ")}
- Phone: ${businessInfo.phone ? "Yes" : "No"}
- Location: ${businessInfo.location || "Unknown"}

Available Templates:
${templatesDesc}

Return ONLY a valid JSON array with 2-3 recommended templates:
[
  {
    "slug": "template-slug",
    "reason": "One sentence explaining why this fits their business specifically"
  }
]

Pick the most relevant templates. Do not recommend all 5. Only return the JSON array.`;

    const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!deepseekRes.ok) {
      throw new Error(`DeepSeek API error: ${deepseekRes.status}`);
    }

    const data = await deepseekRes.json();
    const rawContent = data.choices?.[0]?.message?.content || "[]";

    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawContent];
    const jsonStr = jsonMatch[1] || rawContent;

    let recommendations;
    try {
      recommendations = JSON.parse(jsonStr.trim());
      // Validate slugs exist
      recommendations = recommendations.filter((r: any) =>
        TEMPLATES.some((t) => t.slug === r.slug)
      );
    } catch {
      // Fallback: recommend receptionist + sales as safe defaults
      recommendations = [
        { slug: "receptionist", reason: "Great for handling customer inquiries and booking appointments." },
        { slug: "sales", reason: "Perfect for following up on leads and growing your customer base." },
      ];
    }

    // Attach full template data
    const enriched = recommendations.map((r: { slug: string; reason: string }) => {
      const tpl = TEMPLATES.find((t) => t.slug === r.slug);
      return { ...r, template: tpl };
    });

    return NextResponse.json({ success: true, recommendations: enriched });
  } catch (error: any) {
    console.error("Recommend error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: error.message },
      { status: 500 }
    );
  }
}

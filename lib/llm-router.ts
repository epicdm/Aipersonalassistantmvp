// /opt/bff/lib/llm-router.ts
// LLM Routing Layer for BFF
// Routes by complexity and logs token usage

// Temporarily disabled Prisma for build
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// Model pricing (per 1M tokens)
const MODEL_PRICING = {
  "deepseek/deepseek-chat": { input: 0.28, output: 0.42 },
  "anthropic/claude-3-5-sonnet": { input: 3.00, output: 15.00 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 }
};

// Classification signals for HEAVY model
const HEAVY_SIGNALS = {
  emotional: ["depress", "anxious", "crisis", "suicidal", "trauma", "grief"],
  legal: ["legal", "contract", "lawsuit", "attorney", "court"],
  medical: ["medical", "health", "diagnosis", "prescription", "symptom"],
  financial: ["investment", "tax", "financial advice", "stock", "crypto"]
};

export interface LLMRequest {
  userId: string;
  agentId: string;
  prompt: string;
  context?: string;
  userTier?: "FREE" | "PRO";
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class LLMRouter {
  private deepseekApiKey: string;
  private anthropicApiKey: string | null;
  
  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || null;
    
    if (!this.deepseekApiKey) {
      console.warn("DEEPSEEK_API_KEY not set. LLM routing will fail.");
    }
  }
  
  private classifyComplexity(request: LLMRequest): "LIGHT" | "HEAVY" {
    const text = (request.prompt + " " + (request.context || "")).toLowerCase();
    
    // PRO tier users get HEAVY by default if available
    if (request.userTier === "PRO" && this.anthropicApiKey) {
      return "HEAVY";
    }
    
    // Check for heavy signals
    for (const [category, keywords] of Object.entries(HEAVY_SIGNALS)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return "HEAVY";
      }
    }
    
    // Default to LIGHT
    return "LIGHT";
  }
  
  private async callDeepseek(prompt: string): Promise<{content: string, inputTokens: number, outputTokens: number}> {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.deepseekApiKey
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error("DeepSeek API error: " + response.status);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Estimate tokens (rough approximation: 4 chars per token)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(content.length / 4);
    
    return { content, inputTokens, outputTokens };
  }
  
  private async callAnthropic(prompt: string): Promise<{content: string, inputTokens: number, outputTokens: number}> {
    if (!this.anthropicApiKey) {
      throw new Error("Anthropic API key not configured");
    }
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    
    if (!response.ok) {
      throw new Error("Anthropic API error: " + response.status);
    }
    
    const data = await response.json();
    const content = data.content[0].text;
    const inputTokens = data.usage?.input_tokens || Math.ceil(prompt.length / 4);
    const outputTokens = data.usage?.output_tokens || Math.ceil(content.length / 4);
    
    return { content, inputTokens, outputTokens };
  }
  
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) return 0;
    
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return parseFloat((inputCost + outputCost).toFixed(6));
  }
  
  async route(request: LLMRequest): Promise<LLMResponse> {
    const complexity = this.classifyComplexity(request);
    let result;
    let model;
    
    try {
      if (complexity === "HEAVY" && this.anthropicApiKey) {
        model = "anthropic/claude-3-5-sonnet";
        result = await this.callAnthropic(request.prompt);
      } else {
        model = "deepseek/deepseek-chat";
        result = await this.callDeepseek(request.prompt);
      }
      
      const cost = this.calculateCost(model, result.inputTokens, result.outputTokens);
      
      // Log token usage to database - temporarily disabled for build
      // try {
      //   await prisma.tokenUsage.create({
      //     data: {
      //       userId: request.userId,
      //       agentId: request.agentId,
      //       model,
      //       inputTokens: result.inputTokens,
      //       outputTokens: result.outputTokens,
      //       costUsd: cost
      //     }
      //   });
      // } catch (dbError) {
      //   console.error("Failed to log token usage:", dbError);
      //   // Don't fail the request if logging fails
      // }
      
      return {
        content: result.content,
        model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: cost
      };
      
    } catch (error) {
      console.error("LLM routing error:", error);
      throw error;
    }
  }
}

export const llmRouter = new LLMRouter();

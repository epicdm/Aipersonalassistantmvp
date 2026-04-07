import { NextResponse } from 'next/server';
import { callAI } from '@/app/lib/ai-provider';

export async function GET() {
  try {
    console.log('[TEST] Calling DeepSeek AI...');
    
    const result = await callAI({
      system: 'You are a helpful customer service assistant.',
      messages: [{ role: 'user', content: 'What are your business hours?' }],
      maxTokens: 100,
    });
    
    return NextResponse.json({
      success: true,
      response: result.content,
      usage: result.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[TEST] AI Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

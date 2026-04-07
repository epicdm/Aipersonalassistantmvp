import { NextResponse } from 'next/server';
import { checkEscalationTriggers } from '@/app/lib/runtime/watch-service';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    const escalation = checkEscalationTriggers(message);
    
    return NextResponse.json({
      message,
      escalation,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Test escalation keywords
  const tests = [
    'I want to talk to a human',
    'This is terrible service',
    'I need a refund now',
    'Just a regular question',
    'I want to speak to a manager',
    'Scam! Fraud! Lawyer!',
  ];
  
  const results = tests.map(msg => ({
    message: msg,
    escalation: checkEscalationTriggers(msg),
  }));
  
  return NextResponse.json({ tests: results });
}

// Template-specific onboarding question sets
// Each template has targeted questions that extract the knowledge the AI needs to excel at its role

export interface OnboardingQuestion {
  key: string        // field name to store in agent.config.knowledge
  question: string   // what to ask the owner
  required: boolean
}

export const TEMPLATE_QUESTIONS: Record<string, OnboardingQuestion[]> = {
  assistant: [
    { key: 'ownerName', question: "First, what's your name? I'll use it when talking to you 😊", required: true },
    { key: 'topPriorities', question: "What are your top 3 priorities right now? (work, personal, anything)", required: true },
    { key: 'dailyRoutine', question: "What does a typical day look like for you? When do you usually wake up and what's your schedule like?", required: false },
    { key: 'decisionBoundary', question: "What can I handle on your behalf vs what should I always check with you first?", required: true },
    { key: 'communicationStyle', question: "How do you prefer your updates — short and quick, or with full details?", required: false },
    { key: 'offLimits', question: "Last one: is there anything off-limits that I should never do without asking you first?", required: false },
  ],
  'study-buddy': [
    { key: 'studentName', question: "Hey! What's your name and what are you studying? (school, subject, level)", required: true },
    { key: 'currentFocus', question: "What subject or topic do you need the most help with right now?", required: true },
    { key: 'upcomingExams', question: "Do you have any upcoming exams or deadlines? When are they?", required: false },
    { key: 'learningStyle', question: "How do you learn best — explanations, examples, practice questions, or a mix?", required: false },
    { key: 'weakAreas', question: "What are the concepts you find hardest to understand?", required: false },
  ],
  receptionist: [
    { key: 'businessName', question: "What's the name of your business?", required: true },
    { key: 'services', question: "What services or products do you offer? List them with prices if possible.", required: true },
    { key: 'hours', question: "What are your business hours? Include lunch breaks and any days you're closed.", required: true },
    { key: 'bookingMethod', question: "How do customers book with you — walk-in, phone, appointment only, or online?", required: true },
    { key: 'cancellationPolicy', question: "What's your cancellation or no-show policy?", required: false },
    { key: 'topFAQs', question: "What questions do customers ask most often? Give me 3-5 with the answers.", required: true },
    { key: 'escalationContact', question: "If someone asks something I can't handle — who do I contact and how? (name and WhatsApp/phone)", required: true },
  ],
  concierge: [
    { key: 'propertyName', question: "What's the name of your property or venue?", required: true },
    { key: 'propertyType', question: "What type of property is it? (hotel, Airbnb, villa, tour company, etc.)", required: true },
    { key: 'whatsIncluded', question: "What's included in the stay or visit vs what costs extra?", required: true },
    { key: 'checkInOut', question: "What are your check-in and check-out times and procedures?", required: true },
    { key: 'commonGuestRequests', question: "What do guests most commonly ask for or need help with?", required: true },
    { key: 'localRecommendations', question: "What are your top 5 local recommendations? (restaurants, beaches, activities, hidden gems)", required: true },
    { key: 'houseRules', question: "Any house rules or important policies guests need to know?", required: false },
    { key: 'emergencyContact', question: "Who handles maintenance or emergencies, and how do guests reach them?", required: true },
  ],
  collector: [
    { key: 'businessName', question: "What's the name of your business and what are customers being billed for?", required: true },
    { key: 'typicalDebt', question: "What's the typical overdue amount and how long before you contact them?", required: true },
    { key: 'paymentPlans', question: "Do you offer payment plans? If yes, what are the terms? (e.g., 3 months, no interest)", required: true },
    { key: 'paymentMethods', question: "What payment methods do you accept?", required: true },
    { key: 'tone', question: "What tone should I use — firm, empathetic, or somewhere in between?", required: true },
    { key: 'escalationPath', question: "What's the escalation path if someone won't pay? (disconnect, collections agency, legal)", required: true },
    { key: 'specialAccounts', question: "Are there any accounts I should treat differently — like long-time customers or hardship cases?", required: false },
  ],
  sales: [
    { key: 'businessName', question: "What's the name of your business and what do you sell?", required: true },
    { key: 'idealCustomer', question: "Who is your ideal customer? Describe them — age, location, problem they're solving.", required: true },
    { key: 'priceRange', question: "What's the price range for your products or services?", required: true },
    { key: 'commonObjections', question: "What objections do customers usually have, and how do you handle them?", required: true },
    { key: 'nextStep', question: "What's the next step when someone's interested — call, demo, site visit, or direct purchase?", required: true },
    { key: 'aggressiveness', question: "How aggressive should I be? (1=very soft, 5=medium, 10=very assertive)", required: false },
    { key: 'sellingPoints', question: "What are your top 3 selling points vs competitors?", required: true },
    { key: 'hotLeadContact', question: "Who do I escalate hot leads to, and how fast should they be contacted?", required: true },
  ],
  support: [
    { key: 'businessName', question: "What's the name of your business and what product or service do you support?", required: true },
    { key: 'commonIssues', question: "What are the most common issues customers have? Give me 3-5 with step-by-step solutions.", required: true },
    { key: 'supportHours', question: "What are your support hours?", required: true },
    { key: 'selfResolve', question: "What can I resolve on my own vs what always needs a human? Give me clear examples.", required: true },
    { key: 'verification', question: "How do I verify a customer's identity before discussing their account?", required: false },
    { key: 'escalationMethod', question: "Who do I escalate to and how? (email, call, ticket system — give me the details)", required: true },
  ],
}

// Get the opener message for a template's onboarding
export function getOnboardingOpener(template: string, agentName: string): string {
  const questionCount = TEMPLATE_QUESTIONS[template]?.length || 5
  const openers: Record<string, string> = {
    assistant: `Hi! I'm ${agentName} ✨ I'm your new personal AI assistant. I just need to learn a few things about you (${questionCount} quick questions) so I can actually be useful.\n\nLet's start: what's your name?`,
    'study-buddy': `Hey! I'm ${agentName} 📚 Your study buddy is here! I have ${questionCount} quick questions to get to know how I can best help you.\n\nFirst up: what's your name and what are you studying?`,
    receptionist: `Hi! I'm ${agentName} 📞 I'm your AI receptionist — ready to handle your calls and messages 24/7. I need to learn about your business first (${questionCount} questions).\n\nLet's start: what's the name of your business?`,
    concierge: `Welcome! I'm ${agentName} 🏨 Your AI concierge is ready to serve your guests. I need to learn about your property first (${questionCount} questions).\n\nFirst: what's the name of your property?`,
    collector: `Hi! I'm ${agentName} 💰 Your collections assistant. I'll help you get paid professionally and respectfully. ${questionCount} quick questions to get me set up.\n\nFirst: what's the name of your business and what are customers being billed for?`,
    sales: `Hi! I'm ${agentName} 🎯 Your AI sales assistant — I'll make sure no lead slips through the cracks. ${questionCount} questions to dial me in.\n\nFirst: what's the name of your business and what do you sell?`,
    support: `Hi! I'm ${agentName} 🎧 Your customer support agent — always on, never frustrated. ${questionCount} quick questions to learn your product.\n\nFirst: what's the name of your business and what product or service do you support?`,
  }
  return openers[template] || `Hi! I'm ${agentName}. I have ${questionCount} quick questions to get set up. What's the name of your business?`
}

// Extract and structure knowledge from the conversation transcript
export async function extractKnowledge(transcript: string[], agentName: string): Promise<Record<string, string>> {
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
  if (!DEEPSEEK_KEY) return {}

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Extract structured business information from this onboarding conversation.
Return ONLY a JSON object with clear key-value pairs. Keys should be camelCase descriptive names.
Extract ALL facts mentioned — business name, services, hours, prices, policies, contacts, FAQs, etc.
If something wasn't mentioned, omit that key.`,
          },
          {
            role: 'user',
            content: `Onboarding conversation:\n${transcript.join('\n')}\n\nExtract all business facts as JSON:`,
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) return {}
    return JSON.parse(content)
  } catch {
    return {}
  }
}

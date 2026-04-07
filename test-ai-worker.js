
const { orchestrateInboundMessage } = require('./app/lib/runtime/orchestrator');
const { prisma } = require('./app/lib/prisma');

async function testAI() {
  try {
    console.log('🔍 Looking up a test agent...');
    
    // Find an agent to test with
    const agent = await prisma.agent.findFirst();
    if (!agent) {
      console.error('❌ No agent found in database');
      process.exit(1);
    }
    
    console.log('✅ Found agent:', agent.id, agent.name);
    
    // Find or create a contact
    let contact = await prisma.contact.findFirst({
      where: { userId: agent.userId }
    });
    
    if (!contact) {
      console.log('Creating test contact...');
      contact = await prisma.contact.create({
        data: {
          userId: agent.userId,
          phone: '+18681234567',
          name: 'Test User',
        }
      });
    }
    
    console.log('✅ Using contact:', contact.phone);
    
    // Test the AI orchestration
    console.log('\n🤖 Testing AI customer worker...');
    console.log('Message: "What are your business hours?"');
    console.log('---');
    
    const startTime = Date.now();
    const decision = await orchestrateInboundMessage({
      agent: agent,
      phone: contact.phone,
      sessionType: 'customer',
      messageText: 'What are your business hours?',
      contactId: contact.id
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ AI Response received in', duration, 'ms');
    console.log('\n📤 Outbound messages:');
    decision.outbound.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.kind}] ${msg.text}`);
    });
    
    console.log('\n📝 Actions planned:');
    decision.actions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action.type} (risk: ${action.risk}, approval: ${action.requiresApproval})`);
    });
    
    console.log('\n📊 Audit trail:');
    decision.audit.forEach((entry, i) => {
      console.log(`  ${i + 1}. [${entry.type}] ${entry.summary}`);
    });
    
    console.log('\n✅ TEST COMPLETE - AI is working!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAI();


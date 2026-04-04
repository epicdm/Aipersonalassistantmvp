#!/usr/bin/env node
/**
 * Submit all Isola HSM templates to Meta.
 * Run: node scripts/submit-templates.js
 */

const TOKEN = process.env.WA_TOKEN || process.env.META_WA_TOKEN;
const WABA = process.env.WABA_ID || '272252189309178';

if (!TOKEN) { console.error('Set WA_TOKEN env var'); process.exit(1); }

const API = `https://graph.facebook.com/v25.0/${WABA}/message_templates`;

const templates = [
  {
    name: 'payment_reminder_v2', category: 'UTILITY',
    components: [
      {type:'HEADER',format:'TEXT',text:'Payment Reminder'},
      {type:'BODY',text:'Hi {{1}}, you have an outstanding balance of {{2}} with {{3}}.\n\nDue date: {{4}}\n\nTap below to pay now or contact us.',example:{body_text:[['John','$150.00','Butcher Shop','April 15, 2026']]}},
      {type:'FOOTER',text:'Powered by Isola'},
      {type:'BUTTONS',buttons:[{type:'QUICK_REPLY',text:'Pay Now'},{type:'QUICK_REPLY',text:'Contact Us'}]}
    ]
  },
  {
    name: 'isola_welcome', category: 'UTILITY',
    components: [
      {type:'BODY',text:'Hi {{1}}! Your AI agent for {{2}} is now live.\n\nYour WhatsApp number: {{3}}\n\nCustomers can message this number and your agent responds automatically. Monitor from your dashboard.',example:{body_text:[['Glenn','Butcher Shop','+1 767-818-3456']]}},
      {type:'FOOTER',text:'Powered by Isola'},
      {type:'BUTTONS',buttons:[{type:'URL',text:'Open Dashboard',url:'https://bff.epic.dm/dashboard'}]}
    ]
  },
  {
    name: 'order_confirmation', category: 'UTILITY',
    components: [
      {type:'HEADER',format:'TEXT',text:'Order Confirmed'},
      {type:'BODY',text:'Hi {{1}}, your order with {{2}} has been confirmed!\n\nOrder: {{3}}\nTotal: {{4}}\n\nWe will notify you when ready.',example:{body_text:[['John','Butcher Shop','2x Chicken, 1x Pork','$45.00']]}},
      {type:'FOOTER',text:'Powered by Isola'}
    ]
  },
  {
    name: 'booking_confirmation', category: 'UTILITY',
    components: [
      {type:'HEADER',format:'TEXT',text:'Booking Confirmed'},
      {type:'BODY',text:'Hi {{1}}, your booking with {{2}} is confirmed.\n\nDate: {{3}}\nTime: {{4}}\nService: {{5}}\n\nReply to reschedule.',example:{body_text:[['John','Dental Clinic','April 10','2:00 PM','Checkup']]}},
      {type:'FOOTER',text:'Powered by Isola'}
    ]
  },
  {
    name: 'delivery_update', category: 'UTILITY',
    components: [
      {type:'HEADER',format:'TEXT',text:'Delivery Update'},
      {type:'BODY',text:'Hi {{1}}, your order from {{2}} is {{3}}.\n\n{{4}}\n\nReply with questions.',example:{body_text:[['John','Butcher Shop','out for delivery','ETA: 30 minutes']]}},
      {type:'FOOTER',text:'Powered by Isola'}
    ]
  },
  {
    name: 'feedback_request', category: 'MARKETING',
    components: [
      {type:'BODY',text:'Hi {{1}}, thanks for choosing {{2}}! How was your experience?\n\nYour feedback helps us serve you better.',example:{body_text:[['John','Butcher Shop']]}},
      {type:'FOOTER',text:'Powered by Isola'},
      {type:'BUTTONS',buttons:[{type:'QUICK_REPLY',text:'Great!'},{type:'QUICK_REPLY',text:'Good'},{type:'QUICK_REPLY',text:'Not great'}]}
    ]
  },
  {
    name: 'promo_campaign', category: 'MARKETING',
    components: [
      {type:'BODY',text:'Hi {{1}}! {{2}} has a special offer for you.\n\n{{3}}\n\nOffer ends {{4}}.',example:{body_text:[['John','Butcher Shop','Buy 2 get 1 free on chicken','Sunday']]}},
      {type:'FOOTER',text:'Powered by Isola'},
      {type:'BUTTONS',buttons:[{type:'QUICK_REPLY',text:'Interested'},{type:'QUICK_REPLY',text:'Unsubscribe'}]}
    ]
  },
  {
    name: 'reengagement', category: 'MARKETING',
    components: [
      {type:'BODY',text:'Hi {{1}}, we miss you at {{2}}! {{3}}\n\nMessage us anytime.',example:{body_text:[['John','Butcher Shop','Come back for 10% off your next order.']]}},
      {type:'FOOTER',text:'Powered by Isola'},
      {type:'BUTTONS',buttons:[{type:'QUICK_REPLY',text:'Tell me more'},{type:'QUICK_REPLY',text:'Unsubscribe'}]}
    ]
  },
  {
    name: 'agent_live_notification', category: 'UTILITY',
    components: [
      {type:'BODY',text:'Hi {{1}}, your AI agent for {{2}} is now active!\n\nWhatsApp number: {{3}}\n\nCustomers can start messaging now. Open your dashboard to monitor.',example:{body_text:[['Glenn','Butcher Shop','+1 767-818-3456']]}},
      {type:'FOOTER',text:'Powered by Isola'},
      {type:'BUTTONS',buttons:[{type:'URL',text:'Open Dashboard',url:'https://bff.epic.dm/dashboard'}]}
    ]
  },
  {
    name: 'escalation_alert', category: 'UTILITY',
    components: [
      {type:'BODY',text:'Hi {{1}}, a customer ({{2}}) needs human help.\n\nTopic: {{3}}\nMessage: {{4}}\n\nCheck your dashboard to respond.',example:{body_text:[['Glenn','John 767-123-4567','Complaint','The order was wrong']]}},
      {type:'FOOTER',text:'Powered by Isola'},
      {type:'BUTTONS',buttons:[{type:'URL',text:'View Conversation',url:'https://bff.epic.dm/dashboard/conversations'}]}
    ]
  }
];

async function main() {
  console.log('Submitting', templates.length, 'templates to WABA', WABA);
  console.log('');

  let submitted = 0, failed = 0;

  for (const t of templates) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: t.name, language: 'en', category: t.category, components: t.components }),
      });
      const data = await res.json();
      if (data.id) {
        console.log(`✓ ${t.name.padEnd(28)} | ${data.id} | ${data.status} | ${t.category}`);
        submitted++;
      } else {
        console.log(`✗ ${t.name.padEnd(28)} | ${data.error?.message || JSON.stringify(data)}`);
        failed++;
      }
    } catch(e) {
      console.log(`✗ ${t.name.padEnd(28)} | ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Done: ${submitted} submitted, ${failed} failed`);
}

main();

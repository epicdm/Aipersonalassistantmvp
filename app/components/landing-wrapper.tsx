"use client";

const LANDING_HTML = String.raw`

<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet"/>
<style>
body{font-family:Inter,sans-serif;background:#f8f9fa;color:#191c1d;margin:0;}
.font-headline,.font-manrope{font-family:Manrope,sans-serif !important;}
.material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined';font-size:24px;line-height:1;display:inline-block;vertical-align:middle;}
@keyframes bff-pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
.ai-pulse{animation:bff-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;}
</style>

<nav style="background:#f8f9fa;position:sticky;top:0;z-index:50;border-bottom:1px solid #e1e3e3;">
  <div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:16px 24px;max-width:1280px;margin:0 auto;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span class="material-symbols-outlined" style="color:#004B57;font-size:28px;font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;">bubble_chart</span>
      <span style="color:#004B57;font-family:Manrope,sans-serif;font-weight:800;font-size:1.25rem;letter-spacing:-0.03em;">BFF</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px;">
      <a href="#pricing" style="color:#40484a;font-size:0.875rem;font-weight:500;text-decoration:none;">Pricing</a>
      <a href="/sign-in" style="color:#40484a;font-size:0.875rem;font-weight:500;text-decoration:none;">Sign in</a>
      <a href="/sign-up" style="background:#00333c;color:#ffffff;padding:8px 20px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:600;font-size:0.875rem;text-decoration:none;" onmouseover="this.style.background='#004B57'" onmouseout="this.style.background='#00333c'">Get started</a>
    </div>
  </div>
</nav>

<section style="padding:80px 24px 60px;max-width:600px;margin:0 auto;">
  <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:9999px;background:rgba(93,253,138,0.2);margin-bottom:24px;">
    <span style="width:8px;height:8px;border-radius:50%;background:#006d2f;display:inline-block;" class="ai-pulse"></span>
    <span style="color:#006d2f;font-family:Inter,sans-serif;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Now available for WhatsApp Business</span>
  </div>
  <h1 style="font-family:Manrope,sans-serif;font-weight:800;font-size:clamp(2.2rem,6vw,3.5rem);line-height:1.1;letter-spacing:-0.03em;color:#00333c;margin-bottom:20px;">
    Your Business, Powered by <span style="color:#006d2f;">AI WhatsApp</span> Assistants.
  </h1>
  <p style="font-family:Inter,sans-serif;font-size:1.1rem;color:#40484a;line-height:1.6;margin-bottom:36px;max-width:480px;">
    Automatically handle all customer conversations. Go live in minutes and transform how your business communicates.
  </p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <a href="/sign-up" style="background:#00333c;color:#ffffff;padding:14px 32px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:700;font-size:0.95rem;text-decoration:none;display:inline-flex;align-items:center;gap:8px;" onmouseover="this.style.background='#004B57'" onmouseout="this.style.background='#00333c'">
      Start for free
      <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
    </a>
    <a href="/sign-in" style="border:1px solid #bfc8ca;color:#40484a;padding:14px 24px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:600;font-size:0.95rem;text-decoration:none;" onmouseover="this.style.borderColor='#004B57';this.style.color='#00333c'" onmouseout="this.style.borderColor='#bfc8ca';this.style.color='#40484a'">
      Sign in
    </a>
  </div>
  <div style="display:flex;gap:24px;margin-top:24px;flex-wrap:wrap;">
    <span style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#70787b;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>No credit card required</span>
    <span style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#70787b;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">bolt</span>Live in 5 minutes</span>
    <span style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#70787b;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">shield</span>You stay in control</span>
  </div>
</section>

<section style="padding:60px 24px;background:#f2f4f4;border-top:1px solid #e1e3e3;border-bottom:1px solid #e1e3e3;">
  <div style="max-width:900px;margin:0 auto;">
    <h2 style="font-family:Manrope,sans-serif;font-weight:800;font-size:2rem;color:#00333c;letter-spacing:-0.02em;text-align:center;margin-bottom:48px;">How it works</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;">
      
        <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e1e3e3;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <span style="font-family:Inter,monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;color:#006d2f;font-weight:700;">01</span>
            <span class="material-symbols-outlined" style="color:#00333c;font-size:20px;">smart_toy</span>
          </div>
          <h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:1.1rem;color:#00333c;margin-bottom:8px;">Pick a template</h3>
          <p style="font-family:Inter,sans-serif;font-size:0.875rem;color:#40484a;line-height:1.6;">Choose from Sales, Support, Concierge or Personal AI. Pre-trained and ready in seconds.</p>
        </div>
        <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e1e3e3;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <span style="font-family:Inter,monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;color:#006d2f;font-weight:700;">02</span>
            <span class="material-symbols-outlined" style="color:#00333c;font-size:20px;">phone_iphone</span>
          </div>
          <h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:1.1rem;color:#00333c;margin-bottom:8px;">Connect WhatsApp</h3>
          <p style="font-family:Inter,sans-serif;font-size:0.875rem;color:#40484a;line-height:1.6;">Migrate your number, use your Meta API, or get a new number from BFF.</p>
        </div>
        <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e1e3e3;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <span style="font-family:Inter,monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;color:#006d2f;font-weight:700;">03</span>
            <span class="material-symbols-outlined" style="color:#00333c;font-size:20px;">bolt</span>
          </div>
          <h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:1.1rem;color:#00333c;margin-bottom:8px;">Go live</h3>
          <p style="font-family:Inter,sans-serif;font-size:0.875rem;color:#40484a;line-height:1.6;">Your AI handles customer messages 24/7. Learns your style and gets smarter every day.</p>
        </div>
    </div>
  </div>
</section>

<section style="padding:60px 24px;">
  <div style="max-width:900px;margin:0 auto;">
    <h2 style="font-family:Manrope,sans-serif;font-weight:800;font-size:2rem;color:#00333c;letter-spacing:-0.02em;text-align:center;margin-bottom:12px;">Pick your AI</h2>
    <p style="text-align:center;color:#40484a;font-size:1rem;margin-bottom:40px;">Templates built for how you actually work.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;">
      
        <a href="/sign-up" style="display:block;background:#ffffff;border:1px solid #e1e3e3;border-radius:12px;padding:20px;text-decoration:none;cursor:pointer;" onmouseover="this.style.borderColor='#004B57';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e1e3e3';this.style.transform='translateY(0)'">
          <div style="font-size:1.75rem;margin-bottom:8px;">📞</div>
          <p style="font-family:Manrope,sans-serif;font-weight:700;font-size:0.9rem;color:#00333c;margin-bottom:4px;">AI Receptionist</p>
          <p style="font-family:Inter,sans-serif;font-size:0.75rem;color:#70787b;">Never miss a call</p>
        </a>
        <a href="/sign-up" style="display:block;background:#ffffff;border:1px solid #e1e3e3;border-radius:12px;padding:20px;text-decoration:none;cursor:pointer;" onmouseover="this.style.borderColor='#004B57';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e1e3e3';this.style.transform='translateY(0)'">
          <div style="font-size:1.75rem;margin-bottom:8px;">🏨</div>
          <p style="font-family:Manrope,sans-serif;font-weight:700;font-size:0.9rem;color:#00333c;margin-bottom:4px;">Concierge</p>
          <p style="font-family:Inter,sans-serif;font-size:0.75rem;color:#70787b;">Guest experiences</p>
        </a>
        <a href="/sign-up" style="display:block;background:#ffffff;border:1px solid #e1e3e3;border-radius:12px;padding:20px;text-decoration:none;cursor:pointer;" onmouseover="this.style.borderColor='#004B57';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e1e3e3';this.style.transform='translateY(0)'">
          <div style="font-size:1.75rem;margin-bottom:8px;">🎯</div>
          <p style="font-family:Manrope,sans-serif;font-weight:700;font-size:0.9rem;color:#00333c;margin-bottom:4px;">Sales Assistant</p>
          <p style="font-family:Inter,sans-serif;font-size:0.75rem;color:#70787b;">Follow up every lead</p>
        </a>
        <a href="/sign-up" style="display:block;background:#ffffff;border:1px solid #e1e3e3;border-radius:12px;padding:20px;text-decoration:none;cursor:pointer;" onmouseover="this.style.borderColor='#004B57';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e1e3e3';this.style.transform='translateY(0)'">
          <div style="font-size:1.75rem;margin-bottom:8px;">🎧</div>
          <p style="font-family:Manrope,sans-serif;font-weight:700;font-size:0.9rem;color:#00333c;margin-bottom:4px;">Customer Support</p>
          <p style="font-family:Inter,sans-serif;font-size:0.75rem;color:#70787b;">24/7 help</p>
        </a>
        <a href="/sign-up" style="display:block;background:#ffffff;border:1px solid #e1e3e3;border-radius:12px;padding:20px;text-decoration:none;cursor:pointer;" onmouseover="this.style.borderColor='#004B57';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e1e3e3';this.style.transform='translateY(0)'">
          <div style="font-size:1.75rem;margin-bottom:8px;">💰</div>
          <p style="font-family:Manrope,sans-serif;font-weight:700;font-size:0.9rem;color:#00333c;margin-bottom:4px;">Collections</p>
          <p style="font-family:Inter,sans-serif;font-size:0.75rem;color:#70787b;">Get paid faster</p>
        </a>
        <a href="/sign-up" style="display:block;background:#ffffff;border:1px solid #e1e3e3;border-radius:12px;padding:20px;text-decoration:none;cursor:pointer;" onmouseover="this.style.borderColor='#004B57';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e1e3e3';this.style.transform='translateY(0)'">
          <div style="font-size:1.75rem;margin-bottom:8px;">📅</div>
          <p style="font-family:Manrope,sans-serif;font-weight:700;font-size:0.9rem;color:#00333c;margin-bottom:4px;">Personal Assistant</p>
          <p style="font-family:Inter,sans-serif;font-size:0.75rem;color:#70787b;">Life organization</p>
        </a>
    </div>
  </div>
</section>

<section id="pricing" style="padding:60px 24px;background:#f2f4f4;border-top:1px solid #e1e3e3;">
  <div style="max-width:900px;margin:0 auto;">
    <h2 style="font-family:Manrope,sans-serif;font-weight:800;font-size:2rem;color:#00333c;letter-spacing:-0.02em;text-align:center;margin-bottom:12px;">Simple pricing</h2>
    <p style="text-align:center;color:#40484a;margin-bottom:40px;">Start free. Upgrade when you need more.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;">
      
        <div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e1e3e3;">
          <h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:1.1rem;color:#00333c;margin-bottom:8px;">Free</h3>
          <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:6px;">
            <span style="font-family:Manrope,sans-serif;font-weight:800;font-size:2.2rem;color:#00333c;">$0</span>
            <span style="font-size:0.85rem;color:#70787b;">/mo</span>
          </div>
          <p style="font-size:0.8rem;color:#70787b;margin-bottom:20px;">Try it out</p>
          <ul style="list-style:none;padding:0;margin:0 0 24px 0;"><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#40484a;margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>1 AI agent</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#40484a;margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>100 messages/mo</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#40484a;margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>WhatsApp connect</li></ul>
          <a href="/sign-up" style="display:block;text-align:center;padding:12px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:700;font-size:0.875rem;text-decoration:none;background:transparent;color:#00333c;border:1px solid #004B57;transition:all 0.2s;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">Get started</a>
        </div>
        <div style="background:#00333c;border-radius:16px;padding:28px;border:1px solid #00333c;">
          <h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:1.1rem;color:#5dfd8a;margin-bottom:8px;">Starter</h3>
          <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:6px;">
            <span style="font-family:Manrope,sans-serif;font-weight:800;font-size:2.2rem;color:#ffffff;">$29</span>
            <span style="font-size:0.85rem;color:rgba(255,255,255,0.6);">/mo</span>
          </div>
          <p style="font-size:0.8rem;color:rgba(255,255,255,0.6);margin-bottom:20px;">For growing businesses</p>
          <ul style="list-style:none;padding:0;margin:0 0 24px 0;"><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:rgba(255,255,255,0.8);margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#5dfd8a;">check_circle</span>3 AI agents</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:rgba(255,255,255,0.8);margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#5dfd8a;">check_circle</span>5,000 messages/mo</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:rgba(255,255,255,0.8);margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#5dfd8a;">check_circle</span>All templates</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:rgba(255,255,255,0.8);margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#5dfd8a;">check_circle</span>Voice calls</li></ul>
          <a href="/sign-up" style="display:block;text-align:center;padding:12px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:700;font-size:0.875rem;text-decoration:none;background:#5dfd8a;color:#002109;border:none;transition:all 0.2s;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">Start free trial</a>
        </div>
        <div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e1e3e3;">
          <h3 style="font-family:Manrope,sans-serif;font-weight:700;font-size:1.1rem;color:#00333c;margin-bottom:8px;">Pro</h3>
          <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:6px;">
            <span style="font-family:Manrope,sans-serif;font-weight:800;font-size:2.2rem;color:#00333c;">$99</span>
            <span style="font-size:0.85rem;color:#70787b;">/mo</span>
          </div>
          <p style="font-size:0.8rem;color:#70787b;margin-bottom:20px;">For teams</p>
          <ul style="list-style:none;padding:0;margin:0 0 24px 0;"><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#40484a;margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>Unlimited agents</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#40484a;margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>Unlimited messages</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#40484a;margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>Custom knowledge</li><li style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#40484a;margin-bottom:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#006d2f;">check_circle</span>API access</li></ul>
          <a href="/sign-up" style="display:block;text-align:center;padding:12px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:700;font-size:0.875rem;text-decoration:none;background:transparent;color:#00333c;border:1px solid #004B57;transition:all 0.2s;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">Go pro</a>
        </div>
    </div>
  </div>
</section>

<section style="padding:80px 24px;text-align:center;">
  <h2 style="font-family:Manrope,sans-serif;font-weight:800;font-size:clamp(2rem,5vw,3rem);color:#00333c;letter-spacing:-0.03em;margin-bottom:16px;">Ready to go live?</h2>
  <p style="color:#40484a;font-size:1rem;margin-bottom:32px;">Join businesses already running on BFF.</p>
  <a href="/sign-up" style="background:#00333c;color:#ffffff;padding:16px 40px;border-radius:9999px;font-family:Inter,sans-serif;font-weight:700;font-size:1rem;text-decoration:none;display:inline-flex;align-items:center;gap:8px;" onmouseover="this.style.background='#004B57'" onmouseout="this.style.background='#00333c'">
    Get started - it is free
    <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
  </a>
</section>

<footer style="border-top:1px solid #e1e3e3;padding:32px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;background:#f8f9fa;">
  <span style="font-family:Manrope,sans-serif;font-weight:800;font-size:1.1rem;color:#00333c;">BFF</span>
  <p style="font-size:0.8rem;color:#70787b;">2026 EPIC Communications</p>
  <div style="display:flex;gap:20px;">
    <a href="/privacy" style="font-size:0.8rem;color:#70787b;text-decoration:none;">Privacy</a>
    <a href="/terms" style="font-size:0.8rem;color:#70787b;text-decoration:none;">Terms</a>
  </div>
</footer>

`;

export function LandingWrapper() {
  return (
    <div
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: LANDING_HTML }}
    />
  );
}

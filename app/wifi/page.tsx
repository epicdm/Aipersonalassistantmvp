import Link from 'next/link';
export default function WiFiLandingPage() {
  const whatsappLink = "https://wa.me/17672851568?text=Hi%20BFF!";
  return (
    <div style={{minHeight:'100vh',background:'#0a1628',color:'white',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',fontFamily:'sans-serif'}}>
      <div style={{background:'rgba(37,99,235,0.1)',color:'#60a5fa',padding:'0.5rem 1rem',borderRadius:'9999px',fontSize:'0.875rem',fontWeight:'600',marginBottom:'2rem'}}>
        📶 You're on EPICNET WiFi
      </div>
      <div style={{fontSize:'3rem',marginBottom:'1rem'}}>✨</div>
      <h1 style={{fontSize:'2.5rem',fontWeight:'800',textAlign:'center',marginBottom:'1rem'}}>Get Your Free<br/><span style={{color:'#2563eb'}}>Personal AI</span></h1>
      <p style={{color:'#9ca3af',textAlign:'center',maxWidth:'320px',marginBottom:'2rem',lineHeight:'1.6'}}>
        Create your own AI assistant in 2 minutes. Works on WhatsApp 24/7. Free to start.
      </p>
      <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'1rem',padding:'1.5rem',maxWidth:'320px',width:'100%',marginBottom:'2rem'}}>
        <p style={{color:'#6b7280',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'1rem'}}>What you get — free</p>
        {[['🤖','Your own named AI assistant'],['💬','Works on WhatsApp right now'],['🇩🇲','Real Dominican number on upgrade'],['📞','AI answers your calls on upgrade']].map(([icon,text],i) => (
          <div key={i} style={{display:'flex',gap:'0.75rem',alignItems:'center',marginBottom:'0.75rem'}}>
            <span style={{fontSize:'1.25rem'}}>{icon}</span>
            <span style={{color:'#d1d5db',fontSize:'0.875rem'}}>{text}</span>
          </div>
        ))}
      </div>
      <a href={whatsappLink} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.75rem',background:'#25D366',color:'white',fontWeight:'700',padding:'1rem',borderRadius:'1rem',maxWidth:'320px',width:'100%',textDecoration:'none',fontSize:'1.125rem',marginBottom:'1rem'}}>
        💬 Start on WhatsApp — Free
      </a>
      <a href="/signup" style={{display:'block',border:'1px solid #374151',color:'#9ca3af',fontWeight:'600',padding:'0.75rem',borderRadius:'1rem',maxWidth:'320px',width:'100%',textDecoration:'none',textAlign:'center',marginBottom:'3rem'}}>
        Sign up on web instead
      </a>
      <p style={{color:'#374151',fontSize:'0.75rem',textAlign:'center'}}>
        BFF by EPIC Communications · bff.epic.dm 🇩🇲
      </p>
    </div>
  );
}

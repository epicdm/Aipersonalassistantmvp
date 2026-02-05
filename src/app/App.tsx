import React, { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { Landing } from "./components/landing";
import { Auth } from "./components/auth";
import { Dashboard } from "./components/dashboard";
import { supabase } from "../utils/supabase-client";

type AppView = "landing" | "auth" | "dashboard";

export default function App() {
  const [view, setView] = useState<AppView>("landing");
  const [session, setSession] = useState<any>(null);

  // Simple session check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setView("dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setView("dashboard");
      } else {
        setView("landing");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = (newSession: any) => {
    setSession(newSession);
    setView("dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView("landing");
  };

  return (
    <div className="antialiased font-sans">
      <Toaster position="top-right" richColors />
      
      {view === "landing" && (
        <Landing onStart={() => setView("auth")} />
      )}
      
      {view === "auth" && (
        <Auth 
          onBack={() => setView("landing")} 
          onSuccess={handleAuthSuccess}
        />
      )}
      
      {view === "dashboard" && (
        <Dashboard 
          session={session} 
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
}

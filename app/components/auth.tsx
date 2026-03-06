import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Mail, Lock, User, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AuthProps {
  onBack: () => void;
  onSuccess: (session: any) => void;
  initialView?: "login" | "signup" | "forgot";
}

type AuthView = "login" | "signup" | "forgot";

export function Auth({ onBack, onSuccess, initialView = "login" }: AuthProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (view === "login") {
        const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: formData.email, password: formData.password }) });
        if (!res.ok) throw new Error((await res.json()).error || "Login failed");
        toast.success("Welcome back!");
        onSuccess(true);
      } else if (view === "signup") {
        const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: formData.email, password: formData.password, name: formData.name }) });
        if (!res.ok) throw new Error((await res.json()).error || "Signup failed");
        toast.success("Account created!");
        onSuccess(true);
      } else {
        toast.message("Password reset coming soon.");
        setView("login");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white mb-5 shadow-2xl shadow-indigo-500/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {view === "login" && "Welcome back"}
            {view === "signup" && "Create your AI"}
            {view === "forgot" && "Reset Password"}
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            {view === "login" && "Your agent is waiting for you"}
            {view === "signup" && "Build someone who works for you"}
            {view === "forgot" && "Enter your email to reset"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <AnimatePresence mode="wait">
            {view === "signup" && (
              <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input type="text" required placeholder="Your name" className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white placeholder:text-gray-600" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input type="email" required placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white placeholder:text-gray-600" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>

          {view !== "forgot" && (
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input type="password" required placeholder="••••••••" className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white placeholder:text-gray-600" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
          )}

          {view === "login" && (
            <div className="text-right">
              <button type="button" onClick={() => setView("forgot")} className="text-xs text-gray-500 hover:text-indigo-400 cursor-pointer">Forgot password?</button>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 cursor-pointer mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : view === "login" ? "Sign In" : view === "signup" ? "Create Account" : "Send Reset"}
          </button>
        </form>

        <div className="mt-8 text-center">
          {view === "login" ? (
            <p className="text-gray-500 text-sm">No account? <button onClick={() => setView("signup")} className="text-indigo-400 font-bold hover:underline cursor-pointer">Sign up</button></p>
          ) : (
            <p className="text-gray-500 text-sm">Have an account? <button onClick={() => setView("login")} className="text-indigo-400 font-bold hover:underline cursor-pointer">Sign in</button></p>
          )}
        </div>

        <button onClick={onBack} className="mt-6 flex items-center gap-2 text-gray-600 text-xs hover:text-gray-400 transition-colors mx-auto cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </button>
      </motion.div>
    </div>
  );
}

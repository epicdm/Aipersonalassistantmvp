import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Mail, Lock, User, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../utils/supabase-client";
import { projectId, publicAnonKey } from "/utils/supabase/info";

interface AuthProps {
  onBack: () => void;
  onSuccess: (session: any) => void;
}

type AuthView = "login" | "signup" | "forgot";

export function Auth({ onBack, onSuccess }: AuthProps) {
  const [view, setView] = useState<AuthView>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (view === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        onSuccess(data.session);
      } else if (view === "signup") {
        // Use the server route for signup to auto-confirm email as per instructions
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9e48b216/signup`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        
        // After signup, log them in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Account created successfully!");
        onSuccess(data.session);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
        if (error) throw error;
        toast.success("Reset link sent to your email!");
        setView("login");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
            <Bot className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold">
            {view === "login" && "Sign In"}
            {view === "signup" && "Create Account"}
            {view === "forgot" && "Reset Password"}
          </h2>
          <p className="text-gray-500 mt-1 text-center">
            {view === "login" && "Access your AI assistant dashboard"}
            {view === "signup" && "Join thousands of users optimizing their life"}
            {view === "forgot" && "Enter your email to receive a reset link"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {view === "signup" && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {view !== "forgot" && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
          )}

          {view === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setView("forgot")}
                className="text-sm text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              view === "login" ? "Sign In" : view === "signup" ? "Create Account" : "Send Reset Link"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          {view === "login" ? (
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <button onClick={() => setView("signup")} className="text-indigo-600 font-bold hover:underline cursor-pointer">Sign up</button>
            </p>
          ) : (
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <button onClick={() => setView("login")} className="text-indigo-600 font-bold hover:underline cursor-pointer">Sign in</button>
            </p>
          )}
        </div>

        <button
          onClick={onBack}
          className="mt-6 flex items-center gap-2 text-gray-400 text-sm hover:text-gray-600 transition-colors mx-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
      </motion.div>
    </div>
  );
}

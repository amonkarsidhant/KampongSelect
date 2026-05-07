"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function handleSocialLogin(provider: "google" | "github") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-full bg-kampong-red flex items-center justify-center text-white font-semibold">
            K
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">KampongSelect</h1>
            <p className="text-xs text-stone-400 mt-1">Cricket Club · 2026</p>
          </div>
        </div>

        {sent ? (
          <div className="border border-emerald-500/30 bg-emerald-950/20 p-5 rounded-lg text-sm">
            <p className="font-medium text-emerald-300 mb-1">Check your inbox</p>
            <p className="text-stone-300">
              We sent a sign-in link to <strong>{email}</strong>. Tap it on this device to continue.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-sm text-stone-300">Email address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full px-3 py-2.5 rounded-lg bg-stone-100/[0.04] border border-stone-100/10 focus:outline-none focus:border-kampong-red"
                />
              </label>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <button
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-kampong-red text-white font-medium text-sm disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-stone-100/10"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-stone-950 px-2 text-stone-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleSocialLogin("github")}
                className="flex items-center justify-center gap-2 py-2 rounded-lg border border-stone-100/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
              >
                GitHub
              </button>
            </div>

            <p className="text-xs text-stone-500 text-center pt-2">
              No password needed — we&apos;ll use your social account or a magic link.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

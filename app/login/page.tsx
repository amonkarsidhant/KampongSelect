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
          <div className="w-10 h-10 rounded-full bg-crimson flex items-center justify-center text-white font-semibold">
            K
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none font-display">
              KampongSelect
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Cricket Club · 2026
            </p>
          </div>
        </div>

        {sent ? (
          <div className="border border-success/30 bg-success/10 p-5 rounded-lg text-sm">
            <p className="font-medium text-success mb-1">Check your inbox</p>
            <p className="text-foreground-muted">
              We sent a secure sign-in link to <strong>{email}</strong>. Tap it
              on this device to continue.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-sm text-foreground-muted">
                  Club registered email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@kampongcricket.nl"
                  className="mt-1 w-full px-3 py-2.5 rounded-lg bg-surface border border-border focus:outline-none focus:border-crimson text-foreground placeholder:text-foreground-muted/50"
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-crimson text-white font-bold text-sm disabled:opacity-50 transition-transform active:scale-95"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>

            <p className="text-xs text-foreground-muted text-center pt-2">
              No password needed — we&apos;ll email you a secure one-tap sign-in
              link.
            </p>

            {process.env.NEXT_PUBLIC_ENABLE_GITHUB_LOGIN === "true" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-foreground-muted">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleSocialLogin("github")}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg border border-border bg-surface hover:bg-surface/80 transition-colors text-sm font-bold"
                  >
                    GitHub
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/app/components/ui";

export default function ProfessionalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/professional-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          totp_code: totpCode,
        }),
      });

      const payload = await response.json();

      if (response.ok && payload.success) {
        router.replace(payload.redirect || "/professional");
        return;
      }

      if (response.status === 401 && payload.error) {
        if (payload.error === "invalid_totp") {
          setError("invalid_totp");
          return;
        }
        setError("invalid_credentials");
        return;
      }

      if (response.status === 403 && payload.error) {
        if (payload.error === "pending_verification") {
          router.replace("/professional/pending");
          return;
        }

        if (payload.error === "account_rejected") {
          router.replace("/professional/rejected");
          return;
        }
      }

      if (response.status === 429) {
        setError("too_many_attempts");
        return;
      }

      setError("unknown");
    } catch {
      setError("unknown");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center justify-center">
        <div className="w-full space-y-4">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-primary">UnwindAI</h1>
            <p className="text-sm text-secondary">A secure space to manage your case.</p>
          </header>

          <div className="rounded-2xl border border-border bg-surface p-8">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="professional-email" className="text-sm text-secondary">
                  Professional email
                </label>
                <Input
                  id="professional-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-2 transition-shadow focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="professional-password" className="text-sm text-secondary">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="professional-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-11 text-sm outline-none ring-offset-2 transition-shadow focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={isSubmitting}
                    className="absolute inset-y-0 right-3 inline-flex items-center text-secondary transition-colors duration-150 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="professional-totp" className="text-sm text-secondary">
                  Authenticator code
                </label>
                <Input
                  id="professional-totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tracking-[0.2em] outline-none ring-offset-2 transition-shadow focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted">From your authenticator app</p>
              </div>

              {error === "invalid_credentials" ? (
                <p className="text-sm text-danger">Incorrect email or password.</p>
              ) : null}
              {error === "invalid_totp" ? (
                <p className="text-sm text-danger">Incorrect authenticator code. Try again.</p>
              ) : null}
              {error === "too_many_attempts" ? (
                <p className="text-sm text-danger">Too many attempts. Try again later.</p>
              ) : null}
              {error === "unknown" ? (
                <p className="text-sm text-danger">Something went wrong. Try again.</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

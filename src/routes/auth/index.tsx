import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import supabase from "../../lib/supabaseClient";

export const Route = createFileRoute("/auth/")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Actually.Studz 🤓" }] }),
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleOAuthStartedRef = useRef(false);

  const busy = submitting || googleLoading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error.message);
          return;
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setErrorMessage(error.message);
          return;
        }
      }
      await navigate({ to: "/" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleOAuthStartedRef.current || googleLoading) {
      return;
    }
    googleOAuthStartedRef.current = true;
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "http://localhost:8080/auth/callback",
        },
      });
      if (error) {
        setErrorMessage(error.message);
        googleOAuthStartedRef.current = false;
        setGoogleLoading(false);
        return;
      }
      // Success: full-page redirect to Google — leave googleLoading true until unload
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed.";
      setErrorMessage(message);
      googleOAuthStartedRef.current = false;
      setGoogleLoading(false);
    }
  };

  return (
    <section className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 sm:p-9 shadow-sm">
        <Link to="/" className="block text-center text-lg font-bold tracking-tight">
          Actually.Studz <span aria-hidden>🤓</span>
        </Link>
        <h1 className="mt-4 text-center text-2xl font-bold text-foreground">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to continue studying." : "Start mastering topics today."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-full bg-secondary p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setErrorMessage(null);
              }}
              className={cn(
                "rounded-full py-2 text-sm font-medium transition-all",
                mode === m
                  ? "bg-card text-primary shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <Field
              label="Full name"
              type="text"
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChange={setFullName}
              autoComplete="name"
              disabled={busy}
            />
          )}
          <Field
            label="Email"
            type="email"
            placeholder="you@ustp.edu.ph"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            disabled={busy}
          />
          <Field
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            disabled={busy}
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:pointer-events-none disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => {
            void handleGoogleSignIn();
          }}
          disabled={busy}
          aria-busy={googleLoading}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-background py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary hover:border-border disabled:pointer-events-none disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <GoogleIcon className="h-5 w-5 shrink-0" />
          )}
          Continue with Google
        </button>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  label: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-60"
      />
    </label>
  );
}

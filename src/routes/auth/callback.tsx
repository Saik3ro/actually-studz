import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import supabase from "../../lib/supabaseClient";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({ meta: [{ title: "Signing you in — Actually.Studz 🤓" }] }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;

    void (async () => {
      try {
        // Check for access_token in hash fragment (OAuth flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        
        if (accessToken) {
          // Session should already be available in the auth client.
          await navigate({ to: "/directory", replace: true });
          return;
        }

        // Fallback to code exchange for PKCE flow
        const code = new URL(window.location.href).searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (data.session || error?.status === 400) {
            await navigate({ to: "/directory", replace: true });
            return;
          }
        }

        // If neither worked, redirect to auth
        await navigate({ to: "/auth", replace: true });
      } catch (error) {
        console.error("Auth callback error:", error);
        await navigate({ to: "/auth", replace: true });
      }
    })();
  }, [navigate]);

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </section>
  );
}

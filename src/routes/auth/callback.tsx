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
      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        await new Promise((r) => setTimeout(r, 150));
        ({
          data: { session },
        } = await supabase.auth.getSession());
      }

      if (session) {
        await navigate({ to: "/", replace: true });
      } else {
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

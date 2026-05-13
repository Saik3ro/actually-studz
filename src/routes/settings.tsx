import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Actually.Studz 🤓" }] }),
});

function SettingsPage() {
  const [dark, setDark] = useState(false);
  const [notif, setNotif] = useState(true);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Customize your experience.</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card divide-y divide-border">
        <Toggle
          label="Dark mode"
          description="USTP Blue background with yellow accents."
          checked={dark}
          onChange={(v) => {
            setDark(v);
            document.documentElement.classList.toggle("dark", v);
          }}
        />
        <Toggle
          label="Email notifications"
          description="Get notified about new study tools and tips."
          checked={notif}
          onChange={setNotif}
        />
        <div className="p-5">
          <p className="font-medium text-foreground">Default quiz length</p>
          <p className="text-sm text-muted-foreground">How many questions per generated quiz.</p>
          <select className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
            <option>5 questions</option>
            <option>10 questions</option>
            <option>20 questions</option>
          </select>
        </div>
      </div>
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

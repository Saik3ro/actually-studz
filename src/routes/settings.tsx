import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

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
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Actually.Studz 🤓" }] }),
});

function initials(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  const single = parts[0] ?? trimmed;
  return single.slice(0, 2).toUpperCase();
}

function emailName(email: string): string {
  return email.split("@")[0] || "";
}

function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!user) return;
    setNameInput(profile?.full_name?.trim() || (user.email ? emailName(user.email) : ""));
  }, [user, profile?.full_name]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  const email = user.email ?? "";
  const heading = nameInput.trim() || emailName(email) || email;
  const avatarInitials = initials(heading);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal information.</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xl font-bold">
            {avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{heading}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <Field label="Display name" value={nameInput} onChange={setNameInput} />
        <Field label="Email" type="email" value={email} readOnly />

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save changes
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  readOnly,
}: {
  label: string;
  type?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all read-only:cursor-default read-only:bg-muted/40 read-only:text-muted-foreground"
      />
    </label>
  );
}

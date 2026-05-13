import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Actually.Studz 🤓" }] }),
});

function ProfilePage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal information.</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground text-2xl font-bold">
            JS
          </div>
          <div>
            <p className="font-semibold text-foreground">Juan Dela Cruz</p>
            <p className="text-sm text-muted-foreground">USTP CDO • BS Computer Science</p>
          </div>
        </div>

        <Field label="Display name" defaultValue="Juan Dela Cruz" />
        <Field label="Email" type="email" defaultValue="juan.delacruz@ustp.edu.ph" />
        <Field label="School / Program" defaultValue="USTP — BS Computer Science" />

        <button className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Save changes
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  type = "text",
  defaultValue,
}: {
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
      />
    </label>
  );
}

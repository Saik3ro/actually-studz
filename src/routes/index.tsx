import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Search, Paperclip, BookOpen, HelpCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Actually.Studz 🤓 — Master any topic" },
      { name: "description", content: "Upload your materials or search a topic. Generate notes, quizzes and flashcards in seconds." },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const canProceed = topic.trim().length > 0 || fileName !== null;

  const go = (mode: "notes" | "quiz") => {
    if (!canProceed) return;
    const id = encodeURIComponent(topic.trim() || fileName || "untitled");
    navigate({ to: "/content/$id", params: { id }, search: { mode } });
  };

  return (
    <section className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-3xl flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
          Actually.Studz <span aria-hidden>🤓</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
          Upload your materials or search a topic. We'll help you master it.
        </p>

        {/* Prompt */}
        <div className="mt-10 w-full">
          <div
            className={cn(
              "group flex items-center gap-2 rounded-full border border-border bg-card pl-5 pr-2 py-2 shadow-sm transition-all",
              "focus-within:border-primary focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/10"
            )}
          >
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic or upload a PDF..."
              className="flex-1 bg-transparent py-2 text-base sm:text-lg text-foreground placeholder:text-muted-foreground outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") go("notes");
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center justify-center h-10 w-10 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
              aria-label="Upload PDF"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </div>
          {fileName && (
            <p className="mt-3 text-sm text-muted-foreground">
              Attached: <span className="font-medium text-foreground">{fileName}</span>
            </p>
          )}
        </div>

        {/* Action cards */}
        <div className="mt-10 grid w-full grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <ActionCard
            icon={<BookOpen className="h-6 w-6" />}
            emoji="📝"
            title="Notes"
            description="Comprehensive, easy-to-understand study guides."
            disabled={!canProceed}
            onClick={() => go("notes")}
          />
          <ActionCard
            icon={<HelpCircle className="h-6 w-6" />}
            emoji="❓"
            title="Quiz"
            description="Customizable practice tests with instant answers."
            disabled={!canProceed}
            onClick={() => go("quiz")}
          />
        </div>
      </div>
    </section>
  );
}

function ActionCard({
  icon,
  emoji,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-2xl border border-border bg-card p-6 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-primary",
        disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-sm hover:border-border"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          <span aria-hidden className="mr-1">{emoji}</span>
          {title}
        </h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Generate <ArrowRight className="h-4 w-4" />
      </div>
      <div className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

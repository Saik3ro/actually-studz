import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, BookOpen, HelpCircle, Layers } from "lucide-react";

export const Route = createFileRoute("/saved")({
  component: SavedPage,
  head: () => ({ meta: [{ title: "Saved Topics — Actually.Studz 🤓" }] }),
});

const mockSaved = [
  { id: "Photosynthesis", title: "Photosynthesis", date: "May 10, 2026", has: ["notes", "quiz"] },
  { id: "Newton's Laws", title: "Newton's Laws of Motion", date: "May 8, 2026", has: ["notes", "flashcards"] },
  { id: "World War II", title: "World War II — Pacific Theater", date: "May 5, 2026", has: ["notes"] },
  { id: "Organic Chemistry", title: "Organic Chemistry Basics", date: "Apr 28, 2026", has: ["quiz", "flashcards"] },
  { id: "Linear Algebra", title: "Linear Algebra: Matrices", date: "Apr 22, 2026", has: ["notes", "quiz", "flashcards"] },
  { id: "Constitutional Law", title: "Philippine Constitutional Law", date: "Apr 15, 2026", has: ["notes"] },
];

const iconFor: Record<string, React.ReactNode> = {
  notes: <BookOpen className="h-3.5 w-3.5" />,
  quiz: <HelpCircle className="h-3.5 w-3.5" />,
  flashcards: <Layers className="h-3.5 w-3.5" />,
};

function SavedPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bookmark className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Saved Topics</h1>
          <p className="text-sm text-muted-foreground">Your library of generated study material.</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockSaved.map((item) => (
          <Link
            key={item.id}
            to="/content/$id"
            params={{ id: item.id }}
            search={{ mode: "notes" as const }}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-primary transition-all"
          >
            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{item.date}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.has.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground capitalize"
                >
                  {iconFor[h]} {h}
                </span>
              ))}
            </div>
            <div className="mt-4 h-1 w-8 rounded-full bg-accent group-hover:w-full transition-all duration-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}

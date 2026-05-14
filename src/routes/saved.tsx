import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, BookOpen, HelpCircle, Layers } from "lucide-react";
import supabase from "../lib/supabaseClient";

export const Route = createFileRoute("/saved")({
  component: SavedPage,
  head: () => ({ meta: [{ title: "Saved Topics — Actually.Studz 🤓" }] }),
});

type SavedTopic = {
  id: string;
  title: string;
  date: string;
  has: string[];
};

const iconFor: Record<string, React.ReactNode> = {
  notes: <BookOpen className="h-3.5 w-3.5" />,
  quiz: <HelpCircle className="h-3.5 w-3.5" />,
  flashcards: <Layers className="h-3.5 w-3.5" />,
};

function SavedPage() {
  const [savedTopics, setSavedTopics] = useState<SavedTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedTopics = async () => {
      try {
        const { data, error } = await supabase
          .from("study_sessions")
          .select("id, topic, created_at, generated_types")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const topics: SavedTopic[] = (data || []).map((session) => ({
          id: session.id.toString(),
          title: session.topic || "Untitled Topic",
          date: new Date(session.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          has: session.generated_types || [],
        }));

        setSavedTopics(topics);
      } catch (error) {
        console.error("Error fetching saved topics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedTopics();
  }, []);

  if (loading) {
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
        <div className="mt-8 text-center text-muted-foreground">Loading...</div>
      </section>
    );
  }

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

      {savedTopics.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">No saved topics yet. Generate your first study material!</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedTopics.map((item) => (
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
      )}
    </section>
  );
}

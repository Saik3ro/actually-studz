import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, BookOpen, HelpCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["notes", "quiz"]).optional(),
});

export const Route = createFileRoute("/content/$id")({
  component: ContentPage,
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [{ title: `${decodeURIComponent(params.id)} — Actually.Studz` }],
  }),
});

type Tab = "notes" | "answered" | "blank";

const mockNotes = [
  {
    term: "Photosynthesis",
    body: "The biochemical process in which plants, algae, and some bacteria convert light energy (typically sunlight) into chemical energy stored in glucose, using carbon dioxide and water as inputs and releasing oxygen as a byproduct.",
  },
  {
    term: "Chloroplast",
    body: "The plant cell organelle where photosynthesis occurs. Contains chlorophyll, the green pigment that absorbs light energy in the blue and red wavelengths.",
  },
  {
    term: "Light-dependent reactions",
    body: "First stage of photosynthesis, occurring in the thylakoid membranes. Light energy is captured and used to produce ATP and NADPH, while splitting water molecules and releasing O₂.",
  },
  {
    term: "Calvin Cycle",
    body: "Light-independent reactions that occur in the stroma. Uses ATP and NADPH from the previous stage to fix CO₂ into glucose through a series of enzyme-catalyzed steps.",
  },
];

const mockQuiz = [
  {
    q: "Which organelle is responsible for photosynthesis?",
    options: ["Mitochondrion", "Chloroplast", "Ribosome", "Nucleus"],
    answer: 1,
  },
  {
    q: "What gas is released as a byproduct of photosynthesis?",
    options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"],
    answer: 2,
  },
  {
    q: "The Calvin Cycle takes place in the ____ of the chloroplast.",
    options: ["thylakoid", "stroma", "membrane", "matrix"],
    answer: 1,
  },
];

function ContentPage() {
  const { id } = Route.useParams();
  const { mode } = Route.useSearch();
  const [tab, setTab] = useState<Tab>(mode === "quiz" ? "answered" : "notes");

  return (
    <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {decodeURIComponent(id)}
          </h1>
          <p className="text-sm text-muted-foreground">Generated study material</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-1 border-b border-border">
        <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
          <BookOpen className="h-4 w-4" /> Notes
        </TabButton>
        <TabButton active={tab === "answered"} onClick={() => setTab("answered")}>
          <HelpCircle className="h-4 w-4" /> Quiz (Answered)
        </TabButton>
        <TabButton active={tab === "blank"} onClick={() => setTab("blank")}>
          <HelpCircle className="h-4 w-4" /> Quiz (Blank)
        </TabButton>
      </div>

      <div className="mt-8">
        {tab === "notes" && <NotesView />}
        {tab === "answered" && <QuizView showAnswers />}
        {tab === "blank" && <QuizView />}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function NotesView() {
  return (
    <article className="prose prose-neutral max-w-none">
      <div className="space-y-6">
        {mockNotes.map((n, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <h3 className="text-lg font-bold text-foreground">{n.term}</h3>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              {n.body}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function QuizView({ showAnswers = false }: { showAnswers?: boolean }) {
  return (
    <ol className="space-y-6">
      {mockQuiz.map((item, i) => (
        <li key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {i + 1}
            </span>
            <p className="text-base font-medium text-foreground pt-1">{item.q}</p>
          </div>
          <ul className="mt-4 ml-11 space-y-2">
            {item.options.map((opt, j) => {
              const isAnswer = j === item.answer;
              return (
                <li
                  key={j}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm",
                    showAnswers && isAnswer && "border-primary bg-accent/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      showAnswers && isAnswer
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}
                  >
                    {showAnswers && isAnswer && (
                      <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span className="text-foreground">{opt}</span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}

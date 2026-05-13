import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — Actually.Studz 🤓" },
      { name: "description", content: "Actually.Studz is a study companion built for USTP students." },
    ],
  }),
});

function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">About Actually.Studz 🤓</h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Actually.Studz is a study companion that turns any topic or PDF into clean
        notes, quizzes, and flashcards. Built with the spirit of the University of
        Science and Technology of Southern Philippines — focused, clear, and a little
        playful.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Start studying
      </Link>
    </section>
  );
}

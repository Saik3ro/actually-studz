import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layers, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flashcards")({
  component: FlashcardsPage,
  head: () => ({ meta: [{ title: "Flashcards — Actually.Studz 🤓" }] }),
});

const mockDeck = [
  { term: "Mitochondria", definition: "The powerhouse of the cell — produces ATP through cellular respiration." },
  { term: "Osmosis", definition: "The movement of water across a semi-permeable membrane from low to high solute concentration." },
  { term: "Ionic Bond", definition: "A chemical bond formed by the electrostatic attraction between oppositely charged ions." },
  { term: "Newton's Second Law", definition: "Force equals mass times acceleration (F = ma)." },
  { term: "Photosynthesis", definition: "Plants convert light energy into chemical energy stored as glucose." },
];

function FlashcardsPage() {
  const [topic, setTopic] = useState("");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = mockDeck[index];

  const next = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % mockDeck.length);
  };
  const prev = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + mockDeck.length) % mockDeck.length);
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-sm text-muted-foreground">Generate and study a deck.</p>
        </div>
      </div>

      <div className="mt-8 flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic for your deck..."
          className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
        />
        <button className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Sparkles className="h-4 w-4" /> Generate
        </button>
      </div>

      {/* Card */}
      <div className="mt-10 [perspective:1200px]">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="relative w-full aspect-[4/3] sm:aspect-[16/9] [transform-style:preserve-3d] transition-transform duration-500"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}
        >
          <CardFace>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Term</span>
            <p className="mt-3 text-2xl sm:text-4xl font-bold text-foreground">{card.term}</p>
          </CardFace>
          <CardFace back>
            <span className="text-xs uppercase tracking-widest text-primary-foreground/80">Definition</span>
            <p className="mt-3 text-lg sm:text-2xl font-medium text-primary-foreground leading-relaxed">
              {card.definition}
            </p>
          </CardFace>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={prev} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary transition-colors">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-sm text-muted-foreground">
          {index + 1} / {mockDeck.length}
        </span>
        <button onClick={next} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary transition-colors">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">Click the card to flip it.</p>
    </section>
  );
}

function CardFace({
  children,
  back = false,
}: {
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 rounded-3xl border border-border shadow-md flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]",
        back ? "bg-primary text-primary-foreground" : "bg-card"
      )}
      style={{ transform: back ? "rotateY(180deg)" : undefined }}
    >
      {children}
    </div>
  );
}

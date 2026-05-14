import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layers, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Flashcard } from "@/components/ui/card";

export const Route = createFileRoute("/flashcards")({
  component: FlashcardsPage,
  head: () => ({ meta: [{ title: "Flashcards — Actually.Studz 🤓" }] }),
});

const mockDeck = [
  { 
    term: "Mitochondria", 
    definition: "The powerhouse of the cell — produces ATP through cellular respiration.",
    choices: ["Powerhouse of the cell", "Control center of the cell", "Storage organelle", "Protein factory"]
  },
  { 
    term: "Osmosis", 
    definition: "The movement of water across a semi-permeable membrane from low to high solute concentration.",
    choices: ["Movement of water across membrane", "Active transport", "Diffusion of gases", "Bulk transport"]
  },
  { 
    term: "Ionic Bond", 
    definition: "A chemical bond formed by the electrostatic attraction between oppositely charged ions.",
    choices: ["Electrostatic attraction between ions", "Sharing of electrons", "Sharing of protons", "Nuclear attraction"]
  },
  { 
    term: "Newton's Second Law", 
    definition: "Force equals mass times acceleration (F = ma).",
    choices: ["F = ma", "E = mc²", "PV = nRT", "a = v/t"]
  },
  { 
    term: "Photosynthesis", 
    definition: "Plants convert light energy into chemical energy stored as glucose.",
    choices: ["Convert light to chemical energy", "Convert chemical to light energy", "Store water", "Produce oxygen only"]
  },
];

function FlashcardsPage() {
  const [topic, setTopic] = useState("");
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const card = mockDeck[index];

  const next = () => {
    setIndex((i) => (i + 1) % mockDeck.length);
    setSelectedAnswer(null);
  };
  const prev = () => {
    setIndex((i) => (i - 1 + mockDeck.length) % mockDeck.length);
    setSelectedAnswer(null);
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
      <div className="mt-10">
        <Flashcard
          question={card.term}
          choices={card.choices}
          selectedAnswer={selectedAnswer}
          onAnswerSelect={setSelectedAnswer}
          cardNumber={index + 1}
          totalCards={mockDeck.length}
          onDontKnow={() => setSelectedAnswer("Don't know")}
        />
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
    </section>
  );
}

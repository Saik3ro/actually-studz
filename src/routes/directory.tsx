import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Search, Paperclip, BookOpen, HelpCircle, ArrowRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { generateNotes, generateQuiz, generateFlashcards } from "../lib/gemini";
import supabase from "../lib/supabaseClient";

export const Route = createFileRoute("/directory")({
  component: Directory,
  head: () => ({
    meta: [
      { title: "Actually.Studz 🤓 — Master any topic" },
      { name: "description", content: "Upload your materials or search a topic. Generate notes, quizzes and flashcards in seconds." },
    ],
  }),
});

type ContentType = "notes" | "quiz";

type GenerationResult = {
  notes?: Awaited<ReturnType<typeof generateNotes>>;
  quiz?: Awaited<ReturnType<typeof generateQuiz>>;
};

type QuizConfig = {
  multiple_choice: number;
  identification: number;
  true_false: number;
};

function Directory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    multiple_choice: 5,
    identification: 3,
    true_false: 2,
  });

  const canProceed = topic.trim().length > 0;
  const hasSelection = selectedTypes.length > 0;
  const canGenerate = canProceed && hasSelection && !loading;

  const toggleType = (type: ContentType) => {
    if (type === "quiz") {
      setSelectedTypes((current) => {
        const isSelected = current.includes(type);
        if (!isSelected) {
          setShowQuizConfig(true);
        }
        return isSelected ? current.filter((item) => item !== type) : [...current, type];
      });
    } else {
      setSelectedTypes((current) =>
        current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
      );
    }
  };

  const getMode = () => {
    if (selectedTypes.length === 1) return selectedTypes[0];
    return "both";
  };

  const handleGenerate = async () => {
    if (!user) {
      setErrorMessage("You must be signed in to generate content.");
      return;
    }

    if (!canGenerate) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const context = fileName ? `Uploaded file: ${fileName}` : undefined;
      const sessionPayload = {
        user_id: user.id,
        input_type: fileName ? "file" as const : "topic" as const,
        topic: topic.trim() || null,
        file_url: null,
        generated_types: selectedTypes,
      };

      const { data: sessionData, error: sessionError } = await supabase
        .from("study_sessions")
        .insert(sessionPayload)
        .select("id")
        .single();

      if (sessionError || !sessionData?.id) {
        throw new Error(sessionError?.message || "Failed to create study session.");
      }

      const sessionId = sessionData.id;
      const promises: Promise<any>[] = [];
      const generation: GenerationResult = {};

      if (selectedTypes.includes("notes")) {
        const notesResult = await generateNotes(topic.trim(), context);
        generation.notes = notesResult;
        promises.push(
          supabase.from("notes").insert({
            session_id: sessionId,
            title: notesResult.title,
            content_json: notesResult,
          }),
        );
      }

      if (selectedTypes.includes("quiz")) {
        const config = {
          formats: quizConfig,
        };
        const quizResult = await generateQuiz(topic.trim(), config, context);
        generation.quiz = quizResult;
        promises.push(
          supabase.from("quizzes").insert({
            session_id: sessionId,
            answered_version_json: quizResult.flashcards,
            blank_version_json: quizResult.flashcards,
            config_json: config,
          }),
        );
      }

      const insertResults = await Promise.all(promises);
      const insertError = insertResults.find((result) => (result as any).error)?.error;
      if (insertError) {
        throw new Error(insertError.message || "Failed to save generated content.");
      }

      setResult(generation);
      const id = String(sessionId);
      navigate({ to: "/content/$id", params: { id }, search: { mode: getMode() } });
    } catch (error) {
      setErrorMessage((error as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
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
              "focus-within:border-primary focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/10",
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
                if (e.key === "Enter" && hasSelection) {
                  handleGenerate();
                }
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
          {errorMessage ? (
            <p className="mt-3 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>

        {/* Action cards */}
        <div className="mt-10 grid w-full grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <ToggleCard
            icon={<BookOpen className="h-6 w-6" />}
            emoji="📝"
            title="Notes"
            description="Comprehensive, easy-to-understand study guides."
            selected={selectedTypes.includes("notes")}
            onToggle={() => toggleType("notes")}
            disabled={loading}
          />
          <ToggleCard
            icon={<HelpCircle className="h-6 w-6" />}
            emoji="❓"
            title="Quiz"
            description="Customizable practice tests with instant answers."
            selected={selectedTypes.includes("quiz")}
            onToggle={() => toggleType("quiz")}
            disabled={loading}
          />
        </div>

        {hasSelection ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
                (!canGenerate || loading) && "opacity-70 cursor-not-allowed hover:bg-primary",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Generating...
                </>
              ) : (
                "Generate"
              )}
            </button>
            <p className="text-sm text-muted-foreground">Selected: {selectedTypes.join(" + ")}</p>
          </div>
        ) : null}

        {/* Quiz Configuration Modal */}
        {showQuizConfig && selectedTypes.includes("quiz") && (
          <QuizConfigDialog
            config={quizConfig}
            onConfigChange={setQuizConfig}
            onClose={() => setShowQuizConfig(false)}
          />
        )}
      </div>
    </section>
  );
}

function ToggleCard({
  icon,
  emoji,
  title,
  description,
  selected,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "group relative text-left rounded-2xl border bg-card p-6 shadow-sm transition-all",
        selected ? "border-primary bg-primary/10 shadow-md" : "border-border hover:-translate-y-0.5 hover:shadow-md hover:border-primary",
        disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-sm hover:border-border",
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
        {selected ? "Selected" : "Select"} <ArrowRight className="h-4 w-4" />
      </div>
      <div className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function QuizConfigDialog({
  config,
  onConfigChange,
  onClose,
}: {
  config: QuizConfig;
  onConfigChange: (config: QuizConfig) => void;
  onClose: () => void;
}) {
  const totalItems = config.multiple_choice + config.identification + config.true_false;

  const handleConfigUpdate = (type: keyof QuizConfig, value: number) => {
    const newValue = Math.max(0, Math.min(20, value));
    onConfigChange({
      ...config,
      [type]: newValue,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Customize Quiz</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Multiple Choice: <span className="text-primary">{config.multiple_choice}</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={config.multiple_choice}
              onChange={(e) => handleConfigUpdate("multiple_choice", parseInt(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">0-20 questions</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Identification: <span className="text-primary">{config.identification}</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={config.identification}
              onChange={(e) => handleConfigUpdate("identification", parseInt(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">0-20 questions</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              True or False: <span className="text-primary">{config.true_false}</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={config.true_false}
              onChange={(e) => handleConfigUpdate("true_false", parseInt(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">0-20 questions</p>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-foreground">
              Total Questions: <span className="font-semibold text-primary">{totalItems}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">The quiz will render as flip-through flashcards.</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

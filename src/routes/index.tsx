import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { Search, Paperclip, BookOpen, HelpCircle, Layers, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { generateNotes, generateQuiz, generateFlashcards } from "../lib/gemini";
import { extractTextFromFile, generateTitleFromContent } from "../lib/file-processor";
import supabase from "../lib/supabaseClient";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Actually.Studz 🤓 — Master any topic" },
      { name: "description", content: "Upload your materials or search a topic. Generate notes, quizzes and flashcards in seconds." },
    ],
  }),
});

type ContentType = "notes" | "quiz" | "flashcards";

type GenerationResult = {
  notes?: Awaited<ReturnType<typeof generateNotes>>;
  quiz?: Awaited<ReturnType<typeof generateQuiz>>;
  flashcards?: { cards: { front: string; back: string }[] };
};

function PreviewFace({
  children,
  back = false,
}: {
  children: ReactNode;
  back?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 rounded-[2rem] border border-border shadow-lg flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]",
        back ? "bg-primary text-primary-foreground" : "bg-card"
      )}
      style={{ transform: back ? "rotateY(180deg)" : undefined }}
    >
      {children}
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>([]);
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canProceed = topic.trim().length > 0 || (fileName !== null && fileContent !== null);
  const hasSelection = selectedTypes.length > 0;
  const canGenerate = canProceed && hasSelection && !loading;

  const flashcardPreview = {
    front: "What is Proteus?",
    back: "Proteus is a mythical sea god in Greek mythology known for changing shape and form.",
  };

  const toggleType = (type: ContentType) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  };

  const getMode = () => {
    if (selectedTypes.length === 1) return selectedTypes[0];
    return "both";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setFileName(selectedFile.name);
    setFile(selectedFile);

    try {
      const content = await extractTextFromFile(selectedFile);
      setFileContent(content);

      // Auto-populate topic from file content if topic is empty
      if (!topic.trim()) {
        const generatedTitle = generateTitleFromContent(content, selectedFile.name);
        setTopic(generatedTitle);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to read file. Please try a different file format."
      );
      setFileName(null);
      setFile(null);
      setFileContent(null);
    }
  };

  const handleQuizClick = async () => {
    if (!user) {
      setErrorMessage("You must be signed in to create a quiz.");
      return;
    }

    if (!topic.trim() && !fileContent) {
      setErrorMessage("Please enter a topic or upload a file first.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const sessionPayload = {
        user_id: user.id,
        input_type: fileName ? "file" as const : "topic" as const,
        topic: topic.trim() || null,
        file_url: null,
        generated_types: ["quiz"] as const,
      };

      const { data: sessionData, error: sessionError } = await supabase
        .from("study_sessions")
        .insert(sessionPayload)
        .select("id")
        .single();

      if (sessionError || !sessionData?.id) {
        throw new Error(sessionError?.message || "Failed to create study session.");
      }

      // Store file content in localStorage for the quiz config page to use
      if (fileContent) {
        try {
          localStorage.setItem(`quiz_file_content_${sessionData.id}`, fileContent);
        } catch {
          // Ignore localStorage failures
        }
      }

      navigate({ to: "/quiz-config/$sessionId", params: { sessionId: String(sessionData.id) } });
    } catch (error) {
      setErrorMessage((error as Error).message || "Failed to navigate to quiz configuration.");
      setLoading(false);
    }
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
      let context: string | undefined;
      if (fileContent) {
        // If file content is available, use it as context
        context = `Uploaded file content (${fileName}):\n\n${fileContent}`;
      } else if (fileName) {
        // Fallback if file is present but content couldn't be extracted
        context = `Uploaded file: ${fileName}`;
      }

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
      const generationTasks: Promise<void>[] = [];

      if (selectedTypes.includes("notes")) {
        generationTasks.push((async () => {
          const notesResult = await generateNotes(topic.trim(), context);
          generation.notes = notesResult;
          promises.push(
            supabase.from("notes").insert({
              session_id: sessionId,
              title: notesResult.title,
              content_json: notesResult,
            }),
          );
        })());
      }

      if (selectedTypes.includes("quiz")) {
        generationTasks.push((async () => {
          const quizConfig = {
            formats: {
              multiple_choice: 5,
              identification: 3,
              true_false: 2,
            },
          };
          const quizResult = await generateQuiz(topic.trim(), quizConfig, context);
          generation.quiz = quizResult;
          promises.push(
            supabase.from("quizzes").insert({
              session_id: sessionId,
              answered_version_json: quizResult.answered_version,
              blank_version_json: quizResult.blank_version,
              config_json: quizConfig,
            }),
          );
        })());
      }

      if (selectedTypes.includes("flashcards")) {
        generationTasks.push((async () => {
          const flashcardsResult = await generateFlashcards(topic.trim(), 6, context);
          generation.flashcards = flashcardsResult;
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                `actualystudz_flashcards_${sessionId}`,
                JSON.stringify(flashcardsResult),
              );
            } catch {
              // ignore storage failures
            }
          }
        })());
      }

      await Promise.all(generationTasks);
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
              placeholder="Enter a topic or upload a PDF... (no topic needed if file attached)"
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
              onChange={handleFileChange}
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
        <div className="mt-10 grid w-full grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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
            onToggle={handleQuizClick}
            disabled={loading}
          />
          <ToggleCard
            icon={<Layers className="h-6 w-6" />}
            emoji="🃏"
            title="Flashcards"
            description="Interactive cards you can flip to reveal the answer."
            selected={selectedTypes.includes("flashcards")}
            onToggle={() => toggleType("flashcards")}
            disabled={loading}
          />
        </div>

        {selectedTypes.includes("flashcards") ? (
          <div className="mt-10 w-full rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-sm font-semibold text-primary">Flashcard Preview</p>
                <h2 className="mt-2 text-2xl font-bold text-foreground">Tap to flip the card and see the answer.</h2>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                Use flashcards to quiz yourself with front/back cards and build recall.
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setPreviewFlipped((value) => !value)}
                className="relative w-full max-w-2xl aspect-[4/3] sm:aspect-[16/9] [perspective:1200px] rounded-[2rem]"
                style={{ transformStyle: "preserve-3d", transform: previewFlipped ? "rotateY(180deg)" : "rotateY(0)" }}
              >
                <PreviewFace>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Front</span>
                  <p className="mt-3 text-3xl font-bold text-foreground">{flashcardPreview.front}</p>
                </PreviewFace>
                <PreviewFace back>
                  <span className="text-xs uppercase tracking-widest text-primary-foreground/80">Back</span>
                  <p className="mt-3 text-xl font-medium text-primary-foreground leading-relaxed">{flashcardPreview.back}</p>
                </PreviewFace>
              </button>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">Click the card to flip it.</p>
          </div>
        ) : null}

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
            <p className="text-sm text-muted-foreground">Selected: {selectedTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(" + ")}</p>
          </div>
        ) : null}
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

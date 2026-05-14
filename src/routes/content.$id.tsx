import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, BookOpen, HelpCircle, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { generateQuiz, generateFlashcards } from '../lib/gemini'

type QuizConfig = {
  multiple_choice: number;
  identification: number;
  true_false: number;
}

export const Route = createFileRoute('/content/$id')({
  component: ContentPage,
})

function ContentPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [notes, setNotes] = useState<any>(null)
  const [quizzes, setQuizzes] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>('notes')
  const [error, setError] = useState<string | null>(null)
  const [showQuizConfig, setShowQuizConfig] = useState(false)
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false)
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    multiple_choice: 5,
    identification: 3,
    true_false: 2,
  })
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch study session
        const { data: sessionData, error: sessionError } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('id', id)
          .single()

        if (sessionError) throw sessionError
        if (!sessionData) throw new Error('Study session not found')

        setSession(sessionData)

        // Fetch notes if generated
        if (sessionData.generated_types?.includes('notes')) {
          const { data: notesData, error: notesError } = await supabase
            .from('notes')
            .select('*')
            .eq('session_id', id)
            .single()

          if (notesError) throw notesError
          setNotes(notesData)
        }

        // Fetch quizzes if generated
        if (sessionData.generated_types?.includes('quiz')) {
          const { data: quizzesData, error: quizzesError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('session_id', id)
            .single()

          if (quizzesError) throw quizzesError
          setQuizzes(quizzesData)
          
          // Load saved quiz config if it exists
          if (quizzesData?.config_json?.formats) {
            setQuizConfig(quizzesData.config_json.formats)
          }
        }

        // Set initial active tab
        if (sessionData.generated_types?.includes('notes')) {
          setActiveTab('notes')
        } else if (sessionData.generated_types?.includes('quiz')) {
          setActiveTab('flashcards')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [id])

  useEffect(() => {
    setCurrentFlashcardIndex(0)
    setIsCardFlipped(false)
  }, [quizzes])

  const handleRegenerateQuiz = async () => {
    if (!quizzes || !session) return
    
    setRegeneratingQuiz(true)
    try {
      const config = {
        formats: quizConfig,
      }
      const context = session.topic ? `Topic: ${session.topic}` : undefined
      const newQuizResult = await generateQuiz(session.topic || '', config, context)
      
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({
          flashcards_json: newQuizResult.flashcards,
          config_json: config,
        })
        .eq('session_id', id)
      
      if (updateError) throw updateError
      
      setQuizzes({
        ...quizzes,
        flashcards_json: newQuizResult.flashcards,
        config_json: config,
      })
      setCurrentFlashcardIndex(0)
      setIsCardFlipped(false)
      
      setShowQuizConfig(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate quiz')
    } finally {
      setRegeneratingQuiz(false)
    }
  }

  const renderNotesTab = () => {
    if (!notes?.content_json?.sections) return <p>No notes available</p>

    return (
      <div className="space-y-6">
        {notes.content_json.sections.map((section: any, i: number) => (
          <div key={i} className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#0038A8]">{section.heading}</h2>
            
            {section.terms?.map((term: any, j: number) => (
              <div key={j} className="mb-4 pl-4 border-l-2 border-blue-200">
                <p className="font-semibold text-lg">{term.word}</p>
                <p className="text-muted-foreground mt-1">{term.definition}</p>
              </div>
            ))}
            
            <p className="mt-4 text-foreground leading-relaxed">{section.explanation}</p>
          </div>
        ))}
      </div>
    )
  }

  const renderFlashcardsTab = () => {
    const flashcards = quizzes?.answered_version_json || quizzes?.flashcards_json;
    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return <p>No flashcards available. Debug: {JSON.stringify({ hasQuizzes: !!quizzes, hasAnswered: !!quizzes?.answered_version_json, hasFlashcards: !!quizzes?.flashcards_json })}</p>
    }

    const card = flashcards[currentFlashcardIndex];
    const isFirst = currentFlashcardIndex === 0;
    const isLast = currentFlashcardIndex === flashcards.length - 1;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">Card {currentFlashcardIndex + 1} of {flashcards.length}</p>
              <p className="text-xs text-slate-500 mt-1">Type: {card.type?.replace('_', ' ') || 'flashcard'}</p>
            </div>
            <button
              onClick={() => setIsCardFlipped((current) => !current)}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {isCardFlipped ? 'Show Front' : 'Show Back'}
            </button>
          </div>

          <div className="min-h-[220px] rounded-3xl border border-slate-200 bg-slate-50 p-8 flex flex-col justify-center text-center transition-all duration-300">
            <p className="text-sm text-slate-500 mb-4">{isCardFlipped ? 'Back' : 'Front'}</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-900 leading-relaxed">
              {isCardFlipped ? card.back : card.front}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setCurrentFlashcardIndex((index) => Math.max(0, index - 1));
                setIsCardFlipped(false);
              }}
              disabled={isFirst}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => {
                setCurrentFlashcardIndex((index) => Math.min(flashcards.length - 1, index + 1));
                setIsCardFlipped(false);
              }}
              disabled={isLast}
              className="inline-flex items-center justify-center rounded-full bg-[#0038A8] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0038A8]" />
          <p className="text-lg text-gray-600">Loading your study materials...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="bg-[#0038A8] text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Study session not found</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="bg-[#0038A8] text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const hasNotes = session.generated_types?.includes('notes')
  const hasQuiz = session.generated_types?.includes('quiz')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: '/directory' })}
              className="flex items-center text-[#0038A8] hover:text-blue-700"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </button>
            <h1 className="text-xl font-bold text-gray-900">{session.topic}</h1>
            <div></div> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-8">
              {hasNotes && (
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'notes'
                      ? 'border-[#0038A8] text-[#0038A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📝 Notes
                </button>
              )}
              {hasQuiz && (
                <>
                  <button
                    onClick={() => setActiveTab('flashcards')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === 'flashcards'
                        ? 'border-[#0038A8] text-[#0038A8]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🃏 Quiz Flashcards
                  </button>
                </>
              )}
            </div>
            {hasQuiz && activeTab === 'flashcards' && (
              <button
                onClick={() => setShowQuizConfig(true)}
                disabled={regeneratingQuiz}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0038A8] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Customize Quiz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'notes' && renderNotesTab()}
        {activeTab === 'flashcards' && renderFlashcardsTab()}
      </div>

      {/* Quiz Config Modal */}
      {showQuizConfig && hasQuiz && (
        <QuizConfigDialog
          config={quizConfig}
          onConfigChange={setQuizConfig}
          onRegenerateClick={handleRegenerateQuiz}
          onClose={() => setShowQuizConfig(false)}
          isRegenerating={regeneratingQuiz}
        />
      )}
    </div>
  )
}

function QuizConfigDialog({
  config,
  onConfigChange,
  onRegenerateClick,
  onClose,
  isRegenerating,
}: {
  config: QuizConfig;
  onConfigChange: (config: QuizConfig) => void;
  onRegenerateClick: () => void;
  onClose: () => void;
  isRegenerating: boolean;
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
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Regenerate Quiz</h2>
          <button
            onClick={onClose}
            disabled={isRegenerating}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Multiple Choice: <span className="text-[#0038A8]">{config.multiple_choice}</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={config.multiple_choice}
              onChange={(e) => handleConfigUpdate("multiple_choice", parseInt(e.target.value))}
              disabled={isRegenerating}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">0-20 questions</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Identification: <span className="text-[#0038A8]">{config.identification}</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={config.identification}
              onChange={(e) => handleConfigUpdate("identification", parseInt(e.target.value))}
              disabled={isRegenerating}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">0-20 questions</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              True or False: <span className="text-[#0038A8]">{config.true_false}</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={config.true_false}
              onChange={(e) => handleConfigUpdate("true_false", parseInt(e.target.value))}
              disabled={isRegenerating}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">0-20 questions</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-900">
              Total Questions: <span className="font-semibold text-[#0038A8]">{totalItems}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">The quiz will be rendered as flip-through flashcards.</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isRegenerating}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onRegenerateClick}
            disabled={isRegenerating}
            className="flex-1 px-4 py-2 rounded-lg bg-[#0038A8] text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRegenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
}

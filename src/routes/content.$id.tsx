import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, BookOpen, HelpCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Save, FileText } from 'lucide-react'
import { toast } from 'sonner'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const Route = createFileRoute('/content/$id')({
  component: ContentPage,
})

type QuizItem = {
  format: string;
  key: string;
  sectionIndex: number;
  itemIndex: number;
  question: string;
  answer?: string;
  options?: string[];
  explanation?: string;
  [key: string]: any;
}

type QuizResultItem = QuizItem & {
  userAnswer: string;
  correctAnswer: string | undefined;
  isCorrect: boolean;
}

function ContentPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [notes, setNotes] = useState<any>(null)
  const [quizzes, setQuizzes] = useState<any>(null)
  const [flashcards, setFlashcards] = useState<{ cards: { front: string; back: string }[] } | null>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'results' | 'flashcards'>('notes')
  const [quizPageIndex, setQuizPageIndex] = useState(0)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('mode')
    : null

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch study session
        const { data: sessionData, error: sessionError } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('id', Number(id))
          .single() as any

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
        }

        if (sessionData.generated_types?.includes('flashcards')) {
          const storedFlashcards = sessionData.flashcards_json ?? sessionData.flashcards
          if (storedFlashcards) {
            setFlashcards(storedFlashcards)
          } else if (typeof window !== 'undefined') {
            const saved = window.localStorage.getItem(`actualystudz_flashcards_${id}`)
            if (saved) {
              try {
                setFlashcards(JSON.parse(saved))
              } catch {
                // ignore invalid JSON
              }
            }
          }
        }

        // Set initial active tab
        if (queryMode === 'flashcards' || sessionData.generated_types?.includes('flashcards')) {
          setActiveTab('flashcards')
        } else if (queryMode === 'quiz' || sessionData.generated_types?.includes('quiz')) {
          setActiveTab('quiz')
        } else if (sessionData.generated_types?.includes('notes')) {
          setActiveTab('notes')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [id])

  const handleCopyNotes = async () => {
    if (!notes?.content_json) return

    try {
      let notesText = `${notes.content_json.title}\n\n`

      notes.content_json.sections.forEach((section: any, sectionIndex: number) => {
        notesText += `${sectionIndex + 1}. ${section.heading}\n`

        if (section.terms && section.terms.length > 0) {
          section.terms.forEach((term: any, termIndex: number) => {
            const letter = String.fromCharCode(97 + termIndex) // a, b, c, etc.
            notesText += `  ${letter}. ${term.word}: ${term.definition}\n`
          })
        }

        if (section.explanation) {
          notesText += `  ${section.explanation}\n`
        }

        notesText += '\n'
      })

      await navigator.clipboard.writeText(notesText.trim())
      toast.success('Copied!', { duration: 2000 })
    } catch (err) {
      toast.error('Failed to copy notes')
    }
  }

  const buildQuizItems = (version: any): QuizItem[] => {
    if (!version?.sections) return []
    return version.sections.flatMap((section: any, sectionIndex: number) =>
      section.items.map((item: any, itemIndex: number) => ({
        ...item,
        format: section.format,
        key: `${sectionIndex}-${itemIndex}`,
        sectionIndex,
        itemIndex,
      }))
    )
  }

  const quizVersion = quizzes?.blank_version_json ?? quizzes?.answered_version_json
  const answeredVersion = quizzes?.answered_version_json

  const quizItems = useMemo(
    () => buildQuizItems(quizVersion),
    [quizVersion]
  )

  const answeredItems = useMemo(
    () => buildQuizItems(answeredVersion),
    [answeredVersion]
  )

  const currentQuizItem = quizItems[quizPageIndex]
  const currentQuizAnswer = answeredItems[quizPageIndex]?.answer

  const allAnswered = quizItems.length > 0 && quizItems.every((item) => {
    const answer = selectedAnswers[item.key]
    return answer !== undefined && answer !== ''
  })

  const quizResultItems = useMemo<QuizResultItem[]>(() =>
    quizItems.map((item, index) => {
      const userAnswer = selectedAnswers[item.key] ?? ''
      const correctAnswer = answeredItems[index]?.answer
      const normalize = (value: any) => String(value ?? '').trim().toLowerCase()
      const isCorrect = normalize(userAnswer) === normalize(correctAnswer)

      return {
        ...item,
        userAnswer,
        correctAnswer,
        isCorrect,
      }
    }),
    [quizItems, answeredItems, selectedAnswers]
  )

  const quizScore = quizResultItems.filter((item) => item.isCorrect).length

  const questionTypeLabels: Record<string, string> = {
    multiple_choice: 'Definition',
    true_false: 'True or False',
    identification: 'Identification',
    fill_blank: 'Fill in the Blank',
    essay: 'Essay',
  }

  const handleSelectOption = (itemKey: string, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [itemKey]: value }))
    setShowQuizAnswer(false)
  }

  const handleQuizNext = () => {
    setShowQuizAnswer(false)
    setQuizPageIndex((prev) => Math.min(prev + 1, quizItems.length - 1))
  }

  const handleQuizPrev = () => {
    setShowQuizAnswer(false)
    setQuizPageIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleQuizSubmit = () => {
    setActiveTab('results')
    setShowQuizAnswer(false)
  }

  const handleSaveToTopics = async () => {
    if (!session) return

    try {
      // Update the session to mark it as saved (if not already)
      const { error: updateError } = await (supabase.from('study_sessions') as any)
        .update({ saved_at: new Date().toISOString() })
        .eq('id', session.id)

      if (updateError) throw updateError

      toast.success('Saved!', { duration: 2000 })
      // Navigate to saved topics page
      navigate({ to: '/saved' })
    } catch (err) {
      toast.error('Failed to save to topics')
    }
  }

  const handleGenerateQuizFromNotes = () => {
    if (!session) return
    navigate({ to: '/quiz-config/$sessionId', params: { sessionId: id } })
  }

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const renderNotesTab = () => {
    if (!notes?.content_json?.sections) return <p>No notes available</p>

    return (
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          <button
            onClick={handleCopyNotes}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Copy className="h-4 w-4" />
            📝 Copy Notes
          </button>

          <button
            onClick={handleSaveToTopics}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            💾 Save to Topics
          </button>

          <button
            onClick={handleGenerateQuizFromNotes}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            ❓ Generate Quiz from Notes
          </button>

          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            ⬅ Back to Home
          </button>
        </div>

        {/* Notes Content Box */}
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-none">
          <style>{`
            .notes-content {
              font-family: 'Consolas', 'Courier New', monospace;
              text-align: justify;
              line-height: 1.6;
            }
            .notes-content .title {
              font-size: 2rem;
              font-weight: bold;
              text-align: center;
              margin-bottom: 2rem;
            }
            .notes-content .section {
              margin-bottom: 2rem;
            }
            .notes-content .section-heading {
              font-size: 1.5rem;
              font-weight: bold;
              margin-bottom: 1rem;
            }
            .notes-content .subsection {
              margin-left: 2rem;
              margin-bottom: 1rem;
            }
            .notes-content .term {
              font-weight: bold;
            }
            .notes-content .definition {
              margin-left: 0.5rem;
            }
            .notes-content .explanation {
              margin-top: 0.5rem;
              text-align: justify;
            }
          `}</style>

          <div className="notes-content">
            <div className="title">{notes.content_json.title}</div>

            {notes.content_json.sections.map((section: any, sectionIndex: number) => (
              <div key={sectionIndex} className="section">
                <div className="section-heading">
                  {sectionIndex + 1}. {section.heading}
                </div>

                {section.terms && section.terms.length > 0 && (
                  <div>
                    {section.terms.map((term: any, termIndex: number) => {
                      const letter = String.fromCharCode(97 + termIndex) // a, b, c, etc.
                      return (
                        <div key={termIndex} className="subsection">
                          <span className="term">{letter}. {term.word}:</span>
                          <span className="definition">{term.definition}</span>
                          {term.explanation && (
                            <div className="explanation">{term.explanation}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {section.explanation && (
                  <div className="explanation">{section.explanation}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderQuizAnsweredTab = () => {
    if (!answeredVersion?.sections) return <p>No quiz available</p>

    return (
      <div className="space-y-6">
        {answeredVersion.sections.map((section: any, i: number) => (
          <div key={i} className="mb-8">
            <h3 className="text-lg font-semibold mb-4 capitalize">{section.format.replace('_', ' ')}</h3>
            {section.items.map((item: any, j: number) => (
              <div key={j} className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
                <p className="font-medium mb-2">{j + 1}. {item.question}</p>
                
                {section.format === 'multiple_choice' && item.options && (
                  <div className="space-y-1">
                    {item.options.map((option: string, k: number) => (
                      <div key={k} className={`p-2 rounded ${option === item.answer ? 'bg-green-100 text-green-800' : 'bg-gray-50'}`}>
                        {option === item.answer && '✓ '} {option}
                      </div>
                    ))}
                  </div>
                )}
                
                {section.format === 'identification' && (
                  <p className="text-green-700 font-medium">Answer: {item.answer}</p>
                )}
                
                {section.format === 'true_false' && (
                  <p className={`font-medium ${item.answer ? 'text-green-700' : 'text-red-700'}`}>
                    {item.answer ? 'True' : 'False'}
                  </p>
                )}
                
                {section.format === 'fill_blank' && (
                  <p className="text-green-700 font-medium">Answer: {item.answer}</p>
                )}
                
                {section.format === 'essay' && (
                  <p className="text-green-700 font-medium">Answer: {item.answer}</p>
                )}
                
                {item.explanation && (
                  <p className="text-sm text-muted-foreground mt-2">Explanation: {item.explanation}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  const currentFlashcard = flashcards?.cards?.[flashcardIndex]

  const renderFlashcardsTab = () => {
    if (!flashcards?.cards?.length) return <p>No flashcards available</p>

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg border border-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Flashcards</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">{session.topic ?? 'Flashcards'}</h2>
            </div>
            <div className="text-right text-sm text-slate-500">
              {flashcardIndex + 1} / {flashcards.cards.length}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-card p-6 shadow-xl border border-slate-200">
          <div className="relative [perspective:1200px] mx-auto max-w-3xl">
            <button
              type="button"
              onClick={() => setFlashcardFlipped((prev) => !prev)}
              className="relative w-full aspect-[4/3] rounded-[2rem]"
              style={{ transformStyle: 'preserve-3d', transform: flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0)' }}
            >
              <div className="absolute inset-0 rounded-[2rem] border border-slate-200 bg-white p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
                <span className="text-xs uppercase tracking-widest text-slate-500">Front</span>
                <p className="mt-3 text-3xl font-bold text-slate-900">{currentFlashcard?.front}</p>
              </div>
              <div className="absolute inset-0 rounded-[2rem] border border-slate-200 bg-slate-900 p-8 flex flex-col items-center justify-center text-center text-white [backface-visibility:hidden]"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <span className="text-xs uppercase tracking-widest text-slate-400">Back</span>
                <p className="mt-3 text-2xl font-semibold leading-relaxed">{currentFlashcard?.back}</p>
              </div>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setFlashcardFlipped(false)
                setFlashcardIndex((prev) => Math.max(prev - 1, 0))
              }}
              disabled={flashcardIndex === 0}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="inline h-4 w-4" /> Prev
            </button>
            <button
              onClick={() => {
                setFlashcardFlipped(false)
                setFlashcardIndex((prev) => Math.min(prev + 1, flashcards.cards.length - 1))
              }}
              disabled={flashcardIndex === flashcards.cards.length - 1}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="inline h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">Tap the card to flip it.</p>
        </div>
      </div>
    )
  }

  const renderQuizBlankTab = () => {
    if (!quizItems.length) return <p>No quiz available</p>

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.35em] text-slate-400">{session.topic}</div>
              <h2 className="mt-2 text-3xl font-semibold">Quiz Practice</h2>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Progress</div>
              <div className="mt-1 text-2xl font-bold">{quizPageIndex + 1} / {quizItems.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {questionTypeLabels[currentQuizItem?.format ?? 'multiple_choice']}
            </span>
            <span className="text-sm text-slate-500">Question {quizPageIndex + 1}</span>
          </div>

          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-3">
            {currentQuizItem?.format === 'identification' || currentQuizItem?.format === 'multiple_choice'
              ? 'Type your answer'
              : 'Choose an answer'}
          </p>
          <p className="text-xl font-semibold text-slate-900 leading-relaxed">
            {currentQuizItem?.question}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {currentQuizItem?.format === 'true_false' ? (
              ['True', 'False'].map((option) => {
                const selected = selectedAnswers[currentQuizItem.key] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(currentQuizItem.key, option)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-150 ${selected ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
                  >
                    <span className="block text-sm font-medium text-slate-700">{option}</span>
                  </button>
                )
              })
            ) : currentQuizItem?.format === 'identification' || currentQuizItem?.format === 'multiple_choice' ? (
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={selectedAnswers[currentQuizItem.key] ?? ''}
                  onChange={(e) => handleSelectOption(currentQuizItem.key, e.target.value)}
                  placeholder="Type your answer here"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                />
              </div>
            ) : (
              shuffleArray(currentQuizItem?.options ?? []).map((option: string, optionIndex: number) => {
                const selected = selectedAnswers[currentQuizItem.key] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(currentQuizItem.key, option)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-150 ${selected ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
                  >
                    <span className="block text-sm font-medium text-slate-700">{String.fromCharCode(65 + optionIndex)}.</span>
                    <span className="mt-2 block text-base text-slate-900">{option}</span>
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setShowQuizAnswer((prev) => !prev)}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Don&apos;t know?
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleQuizPrev}
                disabled={quizPageIndex === 0}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              {quizPageIndex < quizItems.length - 1 ? (
                <button
                  onClick={handleQuizNext}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleQuizSubmit}
                  disabled={!allAnswered}
                  className="min-w-[120px] rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
          {!allAnswered && quizPageIndex === quizItems.length - 1 && (
            <p className="mt-3 text-sm text-slate-500">Answer all questions to submit.</p>
          )}

          {showQuizAnswer && currentQuizAnswer && (
            <div className="mt-6 rounded-2xl bg-slate-950/5 p-4 text-slate-900 border border-slate-200">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Answer</p>
              <p className="mt-2 text-base text-slate-800">{currentQuizAnswer}</p>
            </div>
          )}
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
  const hasQuiz = session.generated_types?.includes('quiz') || Boolean(quizItems.length)
  const hasFlashcards = session.generated_types?.includes('flashcards') || Boolean(flashcards?.cards?.length)

  const renderTabControls = () => {
    if (!hasNotes && !hasQuiz && !hasFlashcards) return null

    return (
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        {hasNotes ? (
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-full transition ${activeTab === 'notes' ? 'bg-[#0038A8] text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
          >
            Notes
          </button>
        ) : null}
        {hasQuiz ? (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2 rounded-full transition ${activeTab === 'quiz' ? 'bg-[#0038A8] text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
          >
            Quiz
          </button>
        ) : null}
        {hasFlashcards ? (
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-4 py-2 rounded-full transition ${activeTab === 'flashcards' ? 'bg-[#0038A8] text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
          >
            Flashcards
          </button>
        ) : null}
      </div>
    )
  }

  const renderQuizResults = () => {
    if (!quizResultItems.length) return <p>No quiz available</p>

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-lg border border-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-[0.25em]">Quiz results</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">You scored {quizScore} / {quizResultItems.length}</h2>
            </div>
            <button
              onClick={() => setActiveTab('quiz')}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Review Quiz
            </button>
          </div>
        </div>

        {quizResultItems.map((item, index) => (
          <div key={item.key} className="rounded-3xl bg-white p-6 shadow-lg border border-slate-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Question {index + 1}</p>
                <p className="mt-2 text-lg text-slate-900 font-medium">{item.question}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {item.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>

            {(item.format === 'multiple_choice' && item.options) && (
              <div className="mt-4 grid gap-2">
                {shuffleArray(item.options).map((option: string) => {
                  const isSelected = option === item.userAnswer
                  const isCorrect = option === item.correctAnswer
                  return (
                    <div key={option} className={`rounded-2xl p-3 border ${isCorrect ? 'border-emerald-400 bg-emerald-50' : isSelected ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white'}`}>
                      <p className="text-sm text-slate-900">{option}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {(item.format === 'identification' || item.format === 'true_false') && (
              <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Your answer</p>
                  <p className="mt-2 text-sm text-slate-900">{item.userAnswer || 'No answer'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Correct answer</p>
                  <p className="mt-2 text-sm text-slate-900">{item.correctAnswer ?? 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {renderTabControls()}

        {activeTab === 'flashcards' ? (
          renderFlashcardsTab()
        ) : hasNotes && activeTab === 'notes' ? (
          renderNotesTab()
        ) : activeTab === 'results' ? (
          renderQuizResults()
        ) : hasQuiz ? (
          renderQuizBlankTab()
        ) : hasFlashcards ? (
          renderFlashcardsTab()
        ) : (
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">No notes or quiz available for this session.</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="bg-[#0038A8] text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Generate New Content
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

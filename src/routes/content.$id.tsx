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
  const [activeTab, setActiveTab] = useState<'notes' | 'blank_quiz' | 'answered_quiz' | 'results' | 'flashcards'>('notes')
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

  const handleCopyAnswerKey = async () => {
    if (!quizItems.length) return

    try {
      let answerKeyText = `Answer Key\n\n`

      quizItems.forEach((item, index) => {
        answerKeyText += `${index + 1}. ${item.question}\n`

        if (item.format === 'true_false') {
          answerKeyText += `   Answer: ${item.answer}\n`
        } else if (item.format === 'multiple_choice') {
          answerKeyText += `   Answer: ${item.answer}\n`
        } else {
          // Multiple choice with options
          const correctIndex = item.options?.findIndex(option => option === item.answer)
          if (correctIndex !== undefined) {
            answerKeyText += `   Answer: ${String.fromCharCode(65 + correctIndex)}. ${item.answer}\n`
          }
        }

        if (item.explanation) {
          answerKeyText += `   Explanation: ${item.explanation}\n`
        }

        answerKeyText += '\n'
      })

      await navigator.clipboard.writeText(answerKeyText.trim())
      toast.success('Answer key copied!', { duration: 2000 })
    } catch (err) {
      toast.error('Failed to copy answer key')
    }
  }

  const handleSaveQuiz = async () => {
    if (!user || !session || !quizzes) {
      toast.error('Unable to save quiz. Please try again.')
      return
    }

    if (!quizItems || quizItems.length === 0) {
      toast.error('No quiz items to save.')
      return
    }

    try {
      const sessionId = Number(id)
      if (isNaN(sessionId)) {
        throw new Error(`Invalid session ID: ${id}`)
      }

      const quizDataToSave = {
        items: quizItems,
        answered_items: answeredItems,
      }

      // Validate data is JSON serializable
      JSON.stringify(quizDataToSave)

      console.log('Saving quiz with data:', {
        user_id: user.id,
        session_id: sessionId,
        title: session.topic || 'Untitled Quiz',
        quiz_data: quizDataToSave,
      })

      const { data, error } = await supabase
        .from('saved_quizzes')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          title: session.topic || 'Untitled Quiz',
          quiz_data: quizDataToSave,
        })
        .select()

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }

      toast.success('Quiz saved successfully!', { duration: 2000 })
      navigate({ to: '/saved-quizzes' })
    } catch (err) {
      console.error('Error saving quiz:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save quiz'
      toast.error(errorMessage)
    }
  }

  const handleCopyBlank = async () => {
    if (!quizItems.length) return

    try {
      let blankQuizText = `Blank Quiz\n\n`

      quizItems.forEach((item, index) => {
        blankQuizText += `${index + 1}. ${item.question}\n`

        if (item.format === 'true_false') {
          blankQuizText += `   True / False\n`
        } else if (item.format === 'multiple_choice') {
          // Multiple choice with options
          item.options?.forEach((option, optionIndex) => {
            blankQuizText += `   ${String.fromCharCode(65 + optionIndex)}. ${option}\n`
          })
          blankQuizText += `   Answer: ____________________\n`
        }

        blankQuizText += '\n'
      })

      await navigator.clipboard.writeText(blankQuizText.trim())
      toast.success('Blank quiz copied!', { duration: 2000 })
    } catch (err) {
      toast.error('Failed to copy blank quiz')
    }
  }

  const buildQuizItems = (version: any, fallbackVersion?: any): QuizItem[] => {
    if (!version?.sections) return []
    return version.sections.flatMap((section: any, sectionIndex: number) =>
      section.items.map((item: any, itemIndex: number) => {
        const fallbackItem = fallbackVersion?.sections?.[sectionIndex]?.items?.[itemIndex]
        const options = item.options?.length ? item.options : fallbackItem?.options
        
        return {
          ...item,
          format: section.format,
          key: `${sectionIndex}-${itemIndex}`,
          sectionIndex,
          itemIndex,
          options: options || undefined,
        }
      })
    )
  }

  const quizVersion = quizzes?.blank_version_json ?? quizzes?.answered_version_json
  const answeredVersion = quizzes?.answered_version_json

  const quizItems = useMemo(
    () => buildQuizItems(quizVersion, answeredVersion),
    [quizVersion, answeredVersion]
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
    quizItems.map((item) => {
      const userAnswer = selectedAnswers[item.key] ?? ''
      // Get the correct answer directly from the answered version using section and item indices
      const correctAnswer = answeredVersion?.sections?.[item.sectionIndex]?.items?.[item.itemIndex]?.answer
      const normalize = (value: any) => String(value ?? '').trim().toLowerCase()
      const isCorrect = normalize(userAnswer) === normalize(correctAnswer)

      return {
        ...item,
        userAnswer,
        correctAnswer,
        isCorrect,
      }
    }),
    [quizItems, answeredVersion, selectedAnswers]
  )

  const quizScore = quizResultItems.filter((item) => item.isCorrect).length

  const questionTypeLabels: Record<string, string> = {
    multiple_choice: 'Definition',
    true_false: 'True or False',
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
    navigate({ to: '/quiz-config/$id', params: { id } })
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
              color: #1a1a1a;
            }
            .notes-content .title {
              font-size: 2rem;
              font-weight: bold;
              text-align: center;
              margin-bottom: 2rem;
              color: #000;
            }
            .notes-content .section {
              margin-bottom: 2rem;
            }
            .notes-content .section-heading {
              font-size: 1.5rem;
              font-weight: bold;
              margin-bottom: 1rem;
              color: #0038A8;
            }
            .notes-content .subsection {
              margin-left: 2rem;
              margin-bottom: 1rem;
              color: #333;
            }
            .notes-content .term {
              font-weight: bold;
              color: #000;
            }
            .notes-content .definition {
              margin-left: 0.5rem;
              color: #555;
            }
            .notes-content .explanation {
              margin-top: 0.5rem;
              text-align: justify;
              color: #444;
            }
          `}</style>

          <div className="notes-content">
            <div className="title">{notes.content_json.title}</div>

            {!notes.content_json.sections || notes.content_json.sections.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <p>No sections found in notes data</p>
                <pre className="text-xs mt-4 bg-slate-100 p-4 overflow-auto">
                  {JSON.stringify(notes.content_json, null, 2).substring(0, 500)}
                </pre>
              </div>
            ) : (
              notes.content_json.sections.map((section: any, sectionIndex: number) => (
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
                    <div className="subsection">
                      <div className="explanation">{section.explanation}</div>
                    </div>
                  )}
                  
                  {(!section.terms || section.terms.length === 0) && !section.explanation && (
                    <div className="subsection text-slate-500 italic">
                      (Content not available)
                    </div>
                  )}
                </div>
              ))
            )}
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
                
                {section.format === 'true_false' && (
                  <p className={`font-medium ${item.answer ? 'text-green-700' : 'text-red-700'}`}>
                    {item.answer ? 'True' : 'False'}
                  </p>
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
              <h2 className="mt-2 text-3xl font-semibold">Blank Test</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyBlank}
                className="flex items-center gap-2 rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
              >
                <Copy className="h-4 w-4" />
                Copy Blank
              </button>
              <button
                onClick={handleSaveQuiz}
                className="flex items-center gap-2 rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
              >
                <Save className="h-4 w-4" />
                Save Quiz
              </button>
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
            Choose an answer
          </p>
          <p className="text-xl font-semibold text-slate-900 leading-relaxed">
            {currentQuizItem?.question}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {currentQuizItem?.format === 'true_false' ? (
              <div className="flex gap-4">
                <button
                  onClick={() => handleSelectOption(currentQuizItem.key, 'true')}
                  className={`px-6 py-3 rounded-lg border-2 transition-all duration-150 ${selectedAnswers[currentQuizItem.key] === 'true' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                >
                  TRUE
                </button>
                <button
                  onClick={() => handleSelectOption(currentQuizItem.key, 'false')}
                  className={`px-6 py-3 rounded-lg border-2 transition-all duration-150 ${selectedAnswers[currentQuizItem.key] === 'false' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                >
                  FALSE
                </button>
              </div>
            ) : currentQuizItem?.format === 'multiple_choice' ? (
              <div className="sm:col-span-2 space-y-3">
                {currentQuizItem?.options?.map((option: string, optIndex: number) => (
                  <label key={optIndex} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name={`q-${currentQuizItem.key}`}
                      value={option}
                      checked={selectedAnswers[currentQuizItem.key] === option}
                      onChange={() => handleSelectOption(currentQuizItem.key, option)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-base text-slate-900">{String.fromCharCode(65 + optIndex)}. {option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="sm:col-span-2">
                <p>No answer options available.</p>
              </div>
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
          <>
            <button
              onClick={() => setActiveTab('blank_quiz')}
              className={`px-4 py-2 rounded-full transition ${activeTab === 'blank_quiz' ? 'bg-[#0038A8] text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              Blank Test
            </button>
            <button
              onClick={() => setActiveTab('answered_quiz')}
              className={`px-4 py-2 rounded-full transition ${activeTab === 'answered_quiz' ? 'bg-[#0038A8] text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              Answer Key
            </button>
          </>
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

  const renderQuizAnswerTab = () => {
    if (!answeredItems.length) return <p>No quiz available</p>

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Answer Key</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyAnswerKey}
                className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy Answer Key
              </button>
              <button
                onClick={handleSaveQuiz}
                className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                Save Quiz
              </button>
            </div>
          </div>

          {answeredItems.map((item, index) => (
            <div key={item.key} className="border-b border-slate-100 pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">{item.question}</h3>

                  {item.format === 'true_false' ? (
                    <div className="rounded-2xl border border-emerald-500 bg-emerald-50 p-4">
                      <p className="text-sm font-medium text-slate-700">Answer: <span className="text-base font-semibold text-slate-900">{item.answer === true || item.answer === 'true' || item.answer === 'True' ? 'True' : 'False'}</span></p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {item.options?.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`rounded-2xl border p-4 ${option === item.answer ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                        >
                          <span className="block text-sm font-medium text-slate-700">{String.fromCharCode(65 + optionIndex)}.</span>
                          <span className="mt-2 block text-base text-slate-900">{option}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.explanation && (
                    <div className="mt-4 rounded-lg bg-blue-50 p-4">
                      <p className="text-sm text-blue-900">{item.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
                {item.options.map((option: string, optIndex: number) => {
                  const isSelected = option === item.userAnswer
                  const isCorrect = option === item.correctAnswer
                  return (
                    <div key={optIndex} className={`rounded-2xl p-3 border ${isCorrect ? 'border-emerald-400 bg-emerald-50' : isSelected ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white'}`}>
                      <p className="text-sm text-slate-900">{option}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {(item.format === 'true_false') && (
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
        ) : activeTab === 'blank_quiz' && hasQuiz ? (
          renderQuizBlankTab()
        ) : activeTab === 'answered_quiz' && hasQuiz ? (
          renderQuizAnswerTab()
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

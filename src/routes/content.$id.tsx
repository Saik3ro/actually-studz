import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, BookOpen, HelpCircle, ChevronDown, ChevronUp, Copy, Save, FileText } from 'lucide-react'
import { toast } from 'sonner'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

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
  const [activeTab, setActiveTab] = useState<'notes' | 'answered' | 'blank'>('notes')
  const [error, setError] = useState<string | null>(null)

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
        }

        // Set initial active tab
        if (sessionData.generated_types?.includes('notes')) {
          setActiveTab('notes')
        } else if (sessionData.generated_types?.includes('quiz')) {
          setActiveTab('answered')
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

  const handleSaveToTopics = async () => {
    if (!session) return

    try {
      // Update the session to mark it as saved (if not already)
      const { error: updateError } = await supabase
        .from('study_sessions')
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
          <style jsx>{`
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
    if (!quizzes?.content_json?.answered_version?.sections) return <p>No quiz available</p>

    return (
      <div className="space-y-6">
        {quizzes.content_json.answered_version.sections.map((section: any, i: number) => (
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

  const renderQuizBlankTab = () => {
    if (!quizzes?.content_json?.blank_version?.sections) return <p>No quiz available</p>

    return (
      <div className="space-y-6">
        {quizzes.content_json.blank_version.sections.map((section: any, i: number) => (
          <div key={i} className="mb-8">
            <h3 className="text-lg font-semibold mb-4 capitalize">{section.format.replace('_', ' ')}</h3>
            {section.items.map((item: any, j: number) => (
              <div key={j} className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
                <p className="font-medium mb-2">{j + 1}. {item.question}</p>
                
                {section.format === 'multiple_choice' && item.options && (
                  <div className="space-y-1">
                    {item.options.map((option: string, k: number) => (
                      <div key={k} className="p-2 rounded bg-gray-50">
                        {option}
                      </div>
                    ))}
                  </div>
                )}
                
                {section.format === 'identification' && (
                  <div className="border-b-2 border-gray-300 w-full h-8"></div>
                )}
                
                {section.format === 'true_false' && (
                  <div className="flex space-x-4">
                    <span className="px-3 py-1 bg-gray-50 rounded">True</span>
                    <span className="px-3 py-1 bg-gray-50 rounded">False</span>
                  </div>
                )}
                
                {section.format === 'fill_blank' && (
                  <div className="border-b-2 border-gray-300 w-full h-8"></div>
                )}
                
                {section.format === 'essay' && (
                  <div className="border border-gray-300 rounded p-4 min-h-[100px] bg-gray-50"></div>
                )}
              </div>
            ))}
          </div>
        ))}
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

  // Always show notes-focused interface
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {hasNotes ? (
          renderNotesTab()
        ) : (
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">No notes available for this session.</p>
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

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, BookOpen, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: '/' })}
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
        <div className="max-w-4xl mx-auto px-4">
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
                  onClick={() => setActiveTab('answered')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'answered'
                      ? 'border-[#0038A8] text-[#0038A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ✅ Quiz (Answered)
                </button>
                <button
                  onClick={() => setActiveTab('blank')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'blank'
                      ? 'border-[#0038A8] text-[#0038A8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📝 Quiz (Blank)
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'notes' && renderNotesTab()}
        {activeTab === 'answered' && renderQuizAnsweredTab()}
        {activeTab === 'blank' && renderQuizBlankTab()}
      </div>
    </div>
  )
}

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, HelpCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { generateQuiz } from '../lib/gemini'
import supabase from '../lib/supabaseClient'

export const Route = createFileRoute('/quiz-config/$sessionId')({
  component: QuizConfigPage,
})

type QuizFormat = 'multiple_choice' | 'identification' | 'true_false' | 'fill_blank' | 'essay'

function QuizConfigPage() {
  const { sessionId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [notes, setNotes] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [quizConfig, setQuizConfig] = useState<Record<QuizFormat, number>>({
    multiple_choice: 5,
    identification: 3,
    true_false: 2,
    fill_blank: 0,
    essay: 0,
  })

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        // Fetch study session
        const { data: sessionData, error: sessionError } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError) throw sessionError
        if (!sessionData) throw new Error('Study session not found')

        setSession(sessionData)

        // Fetch notes for context
        if (sessionData.generated_types?.includes('notes')) {
          const { data: notesData, error: notesError } = await supabase
            .from('notes')
            .select('*')
            .eq('session_id', sessionId)
            .single()

          if (notesError) throw notesError
          setNotes(notesData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session data')
      }
    }

    fetchSessionData()
  }, [sessionId])

  const updateFormatCount = (format: QuizFormat, count: number) => {
    setQuizConfig(prev => ({
      ...prev,
      [format]: Math.max(0, count)
    }))
  }

  const getTotalQuestions = () => {
    return Object.values(quizConfig).reduce((sum, count) => sum + count, 0)
  }

  const handleGenerateQuiz = async () => {
    if (!user || !session || !notes) return

    if (getTotalQuestions() === 0) {
      setError('Please select at least one question type')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Prepare context from notes
      let context = `Based on these study notes:\n\n${notes.content_json.title}\n\n`

      notes.content_json.sections.forEach((section: any, sectionIndex: number) => {
        context += `${sectionIndex + 1}. ${section.heading}\n`

        if (section.terms && section.terms.length > 0) {
          section.terms.forEach((term: any, termIndex: number) => {
            const letter = String.fromCharCode(97 + termIndex)
            context += `  ${letter}. ${term.word}: ${term.definition}\n`
          })
        }

        if (section.explanation) {
          context += `  ${section.explanation}\n`
        }

        context += '\n'
      })

      // Generate quiz with notes as context
      const quizResult = await generateQuiz(session.topic, { formats: quizConfig }, context)

      // Save quiz to database
      const { error: insertError } = await supabase
        .from('quizzes')
        .insert({
          session_id: sessionId,
          answered_version_json: quizResult.answered_version,
          blank_version_json: quizResult.blank_version,
          config_json: quizConfig,
        })

      if (insertError) throw insertError

      // Update session to include quiz in generated_types
      const { error: updateError } = await supabase
        .from('study_sessions')
        .update({
          generated_types: [...(session.generated_types || []), 'quiz']
        })
        .eq('id', sessionId)

      if (updateError) throw updateError

      // Navigate back to content page
      navigate({ to: '/content/$id', params: { id: sessionId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="bg-[#0038A8] text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !notes) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0038A8]" />
          <p className="text-lg text-gray-600">Loading quiz configuration...</p>
        </div>
      </div>
    )
  }

  const formatLabels: Record<QuizFormat, string> = {
    multiple_choice: 'Multiple Choice',
    identification: 'Identification',
    true_false: 'True/False',
    fill_blank: 'Fill in the Blank',
    essay: 'Essay',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: '/content/$id', params: { id: sessionId } })}
              className="flex items-center text-[#0038A8] hover:text-blue-700"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Notes
            </button>
            <h1 className="text-xl font-bold text-gray-900">Configure Quiz</h1>
            <div></div> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Topic: {session.topic}</h2>
            <p className="text-sm text-gray-600">
              Configure your quiz based on the study notes. Total questions: <span className="font-semibold">{getTotalQuestions()}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {(Object.keys(formatLabels) as QuizFormat[]).map((format) => (
              <div key={format} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{formatLabels[format]}</h3>
                  <p className="text-sm text-gray-600">
                    {format === 'multiple_choice' && 'Choose the correct answer from options'}
                    {format === 'identification' && 'Provide the correct term or answer'}
                    {format === 'true_false' && 'Determine if the statement is true or false'}
                    {format === 'fill_blank' && 'Complete the sentence with the missing word'}
                    {format === 'essay' && 'Write a detailed response'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateFormatCount(format, quizConfig[format] - 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    disabled={quizConfig[format] <= 0}
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium">{quizConfig[format]}</span>
                  <button
                    onClick={() => updateFormatCount(format, quizConfig[format] + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex space-x-4">
            <button
              onClick={() => navigate({ to: '/content/$id', params: { id: sessionId } })}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateQuiz}
              disabled={loading || getTotalQuestions() === 0}
              className="flex-1 px-4 py-2 bg-[#0038A8] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
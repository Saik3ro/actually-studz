import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Settings, ChevronLeft, Loader2 } from 'lucide-react'
import { generateQuiz } from '../lib/gemini'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const Route = createFileRoute('/quiz-config/$id')({
  component: QuizConfigPage,
})

type QuizFormat = 'multiple_choice' | 'true_false' | 'identification' | 'essay' | 'math_problems'

interface FormatConfig {
  enabled: boolean
  count: number
  max: number
}

function QuizConfigPage() {
  const { id } = useParams({ from: '/quiz-config/$id' })
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [notes, setNotes] = useState<any | null>(null)

  const [formats, setFormats] = useState<Record<QuizFormat, FormatConfig>>({
    multiple_choice: { enabled: true, count: 5, max: 20 },
    true_false: { enabled: true, count: 3, max: 20 },
    identification: { enabled: true, count: 3, max: 20 },
    essay: { enabled: false, count: 1, max: 10 },
    math_problems: { enabled: false, count: 1, max: 10 },
  })

  const updateFormat = (format: QuizFormat, updates: Partial<FormatConfig>) => {
    setFormats(prev => ({
      ...prev,
      [format]: { ...prev[format], ...updates }
    }))
  }

  const getTotalItems = () => {
    return Object.values(formats).reduce((sum, format) =>
      format.enabled ? sum + format.count : sum, 0
    )
  }

  const validateConfig = () => {
    const enabledFormats = Object.values(formats).filter(f => f.enabled)
    if (enabledFormats.length === 0) {
      return 'At least one quiz format must be enabled'
    }

    const totalItems = getTotalItems()
    if (totalItems < 1) {
      return 'Total items must be at least 1'
    }
    if (totalItems > 100) {
      return 'Total items cannot exceed 100'
    }

    return null
  }

  useEffect(() => {
    const fetchSessionAndNotes = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('id', id)
          .single()

        if (sessionError) throw sessionError
        if (!sessionData) throw new Error('Study session not found')
        setSession(sessionData)

        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('session_id', id)
          .single()

        if (notesError) {
          if (notesError.message?.includes('No rows')) {
            setError('No notes available for this session')
            setNotes(null)
          } else {
            throw notesError
          }
        } else {
          setNotes(notesData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session notes')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionAndNotes()
  }, [id])

  const handleGenerate = async () => {
    if (!user) {
      setError('You must be signed in to generate content')
      return
    }

    if (!session || !notes) {
      setError('No notes available for this session')
      return
    }

    const validationError = validateConfig()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Prepare config for generateQuiz
      const quizConfig = {
        formats: Object.fromEntries(
          Object.entries(formats)
            .filter(([, config]) => config.enabled)
            .map(([format, config]) => [format, config.count])
        )
      }

      // Generate quiz using notes content as context
      const quizResult = await generateQuiz(
        session.topic || 'Study Material',
        quizConfig,
        JSON.stringify(notes.content_json)
      )

      // Save to database
      const { error: insertError } = await supabase
        .from('quizzes')
        .insert({
          session_id: id,
          answered_version_json: quizResult.answered_version,
          blank_version_json: quizResult.blank_version,
          config_json: quizConfig,
        })

      if (insertError) throw insertError

      // Update session to include quiz
      const { error: updateError } = await supabase
        .from('study_sessions')
        .update({
          generated_types: ['quiz']
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Navigate to quiz display
      navigate({ to: '/content/$id', params: { id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const formatLabels: Record<QuizFormat, string> = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True or False',
    identification: 'Identification',
    essay: 'Essay',
    math_problems: 'Math Problems',
  }

  const formatDescriptions: Record<QuizFormat, string> = {
    multiple_choice: 'Choose the correct answer from multiple options',
    true_false: 'Determine if statements are true or false',
    identification: 'Provide the correct term or answer',
    essay: 'Write detailed responses to questions',
    math_problems: 'Solve mathematical problems and equations',
  }

  if (!loading && !notes) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <p className="text-lg font-semibold text-gray-900 mb-4">No notes available for this session</p>
          <p className="text-sm text-gray-600 mb-6">
            Please return to the content page and make sure notes were generated for this study session.
          </p>
          <button
            onClick={() => navigate({ to: '/content/$id', params: { id } })}
            className="px-6 py-3 bg-[#0038A8] text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Notes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background blur overlay */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10" />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0038A8]" />
            <p className="text-lg font-medium text-gray-900">Creating your quiz...</p>
            <p className="text-sm text-gray-600 mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate({ to: '/content/$id', params: { id } })}
            className="inline-flex items-center text-[#0038A8] hover:text-blue-700 mb-4"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back to Notes
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Consolas, monospace' }}>
            Customize Your Quiz
          </h1>
          <p className="text-gray-600" style={{ fontFamily: 'Consolas, monospace' }}>
            Choose formats and set the number of items
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8" style={{ fontFamily: 'Consolas, monospace' }}>
          {/* Total Items Display */}
          <div className="mb-6 p-4 bg-[#0038A8] text-white rounded-xl text-center">
            <p className="text-sm opacity-90">Total Questions</p>
            <p className="text-3xl font-bold">{getTotalItems()}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Format Configurations */}
          <div className="space-y-6">
            {(Object.keys(formats) as QuizFormat[]).map((format) => {
              const config = formats[format]
              return (
                <div key={format} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {formatLabels[format]}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {formatDescriptions[format]}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => updateFormat(format, { enabled: !config.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0038A8] focus:ring-offset-2 ${
                        config.enabled ? 'bg-[#0038A8]' : 'bg-gray-200'
                      }`}
                      disabled={loading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Number Input */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">
                      Number of items:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={config.max}
                      value={config.count}
                      onChange={(e) => updateFormat(format, { count: parseInt(e.target.value) || 1 })}
                      disabled={!config.enabled || loading}
                      className={`w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0038A8] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 ${
                        !config.enabled ? 'opacity-50' : ''
                      }`}
                    />
                    <span className="text-sm text-gray-500">
                      (max {config.max})
                    </span>
                    {!config.enabled && (
                      <span className="text-sm text-gray-400 italic">Disabled</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-4 sm:space-y-0 sm:flex sm:space-x-4">
            <button
              onClick={() => navigate({ to: '/content/$id', params: { id } })}
              className="w-full sm:w-1/2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !!validateConfig()}
              className="w-full sm:w-1/2 px-6 py-3 bg-[#0038A8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Settings className="h-5 w-5 mr-2" />
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
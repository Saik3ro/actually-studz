import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Copy, Save, Play, FileText } from 'lucide-react'
import { toast } from 'sonner'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const Route = createFileRoute('/quiz-overview/$id')({
  component: QuizOverviewPage,
})

type QuizItem = {
  format: string
  key: string
  sectionIndex: number
  itemIndex: number
  question: string
  answer?: string
  options?: string[]
  explanation?: string
  [key: string]: any
}

function QuizOverviewPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
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

        // Fetch quiz
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('session_id', id)
          .single()

        if (quizError) throw quizError
        setQuiz(quizData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz overview')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const getQuizSummary = () => {
    if (!quiz?.config_json) return null

    const config = quiz.config_json
    const totalItems = Object.values(config.formats).reduce((sum: number, count: number) => sum + count, 0)

    const formatLabels: Record<string, string> = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
    }

    const formats = Object.entries(config.formats)
      .filter(([, count]) => count > 0)
      .map(([format, count]) => `${count} ${formatLabels[format] || format.replace('_', ' ')}`)
      .join(', ')

    return { totalItems, formats }
  }

  const handleCopyBlank = async () => {
    if (!quiz?.blank_version_json?.sections) return

    try {
      let quizText = `${session?.topic || 'Quiz'}\n\n`

      quiz.blank_version_json.sections.forEach((section: any, sectionIndex: number) => {
        quizText += `${section.format.replace('_', ' ').toUpperCase()}\n\n`
        section.items.forEach((item: any, itemIndex: number) => {
          quizText += `${itemIndex + 1}. ${item.question}\n`

          if (section.format === 'multiple_choice' && item.options) {
            item.options.forEach((option: string, optionIndex: number) => {
              const letter = String.fromCharCode(65 + optionIndex)
              quizText += `   ${letter}. ${option}\n`
            })
          } else if (section.format === 'true_false') {
            quizText += `   True or False\n`
          }

          quizText += '\n'
        })
      })

      await navigator.clipboard.writeText(quizText.trim())
      toast.success('Blank quiz copied!', { duration: 2000 })
    } catch (err) {
      toast.error('Failed to copy quiz')
    }
  }

  const handleCopyAnswerKey = async () => {
    if (!quiz?.answered_version_json?.sections) return

    try {
      let quizText = `${session?.topic || 'Quiz'} - Answer Key\n\n`

      quiz.answered_version_json.sections.forEach((section: any, sectionIndex: number) => {
        quizText += `${section.format.replace('_', ' ').toUpperCase()}\n\n`
        section.items.forEach((item: any, itemIndex: number) => {
          const answer = item.answer !== undefined && item.answer !== null ? String(item.answer) : 'N/A'
          quizText += `${itemIndex + 1}. ${item.question}\n`

          if (section.format === 'multiple_choice' && item.options) {
            item.options.forEach((option: string, optionIndex: number) => {
              const letter = String.fromCharCode(65 + optionIndex)
              const isCorrect = option === item.answer
              quizText += `   ${letter}. ${option}${isCorrect ? ' ✓' : ''}\n`
            })
            quizText += `   Answer: ${answer}\n`
          } else if (section.format === 'true_false') {
            quizText += `   Answer: ${answer === 'N/A' ? answer : answer.toLowerCase() === 'true' ? 'True' : 'False'}\n`
          } else {
            quizText += `   Answer: ${answer}\n`
          }

          if (item.explanation) {
            quizText += `   Explanation: ${item.explanation}\n`
          }

          quizText += '\n'
        })
      })

      await navigator.clipboard.writeText(quizText.trim())
      toast.success('Answer key copied!', { duration: 2000 })
    } catch (err) {
      toast.error('Failed to copy answer key')
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

  const quizVersion = quiz?.blank_version_json ?? quiz?.answered_version_json
  const answeredVersion = quiz?.answered_version_json

  const quizItems = useMemo(
    () => buildQuizItems(quizVersion, answeredVersion),
    [quizVersion, answeredVersion]
  )

  const answeredItems = useMemo(
    () => buildQuizItems(answeredVersion),
    [answeredVersion]
  )

  const handlePracticeQuiz = () => {
    navigate({ to: '/content/$id', params: { id }, search: { mode: 'quiz' } })
  }

  const handleSaveQuiz = async () => {
    if (!session || !user) {
      alert('You must be logged in to save a quiz.')
      return
    }

    try {
      const quizDataToSave = {
        items: quizItems,
        answered_items: answeredItems,
      }

      const { error } = await supabase
        .from('saved_quizzes')
        .insert({
          user_id: user.id,
          session_id: session.id,
          title: session.title || session.topic,
          quiz_data: quizDataToSave,
        })

      if (error) {
        alert('Failed to save: ' + error.message)
      } else {
        alert('Quiz saved successfully!')
        navigate({ to: '/saved-quizzes' })
      }
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0038A8]" />
          <p className="text-lg text-gray-600">Loading quiz overview...</p>
        </div>
      </div>
    )
  }

  if (error || !session || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Quiz not found'}</p>
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

  const summary = getQuizSummary()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate({ to: '/content/$id', params: { id } })}
            className="inline-flex items-center text-[#0038A8] hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Content
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Consolas, monospace' }}>
            Quiz Overview
          </h1>
          <p className="text-gray-600" style={{ fontFamily: 'Consolas, monospace' }}>
            {session.topic}
          </p>
        </div>

        {/* Quiz Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8" style={{ fontFamily: 'Consolas, monospace' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Total Questions</p>
              <p className="text-4xl font-bold text-[#0038A8]">{summary?.totalItems || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Formats</p>
              <p className="text-lg font-medium text-gray-900">{summary?.formats || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Copy Quiz</h3>
            <p className="text-sm text-gray-600 mb-6">
              Copy the quiz in different formats for offline use.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCopyBlank}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Copy className="h-4 w-4" />
                Copy Blank Quiz
              </button>
              <button
                onClick={handleCopyAnswerKey}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Copy Answer Key
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Practice & Save</h3>
            <p className="text-sm text-gray-600 mb-6">
              Take the quiz or save it for later.
            </p>
            <div className="space-y-3">
              <button
                onClick={handlePracticeQuiz}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                <Play className="h-4 w-4" />
                Practice Quiz
              </button>
              <button
                onClick={handleSaveQuiz}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
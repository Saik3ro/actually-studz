import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

export const Route = createFileRoute('/practice-results')({
  component: PracticeResultsPage,
})

type QuizResult = {
  format: string
  key: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation?: string
}

function PracticeResultsPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<QuizResult[]>([])

  useEffect(() => {
    const storedResults = sessionStorage.getItem('quizResults')
    if (!storedResults) {
      navigate({ to: '/saved-quizzes' })
      return
    }

    try {
      const parsedResults = JSON.parse(storedResults)
      setResults(parsedResults)
    } catch (err) {
      console.error('Error parsing results:', err)
      navigate({ to: '/saved-quizzes' })
    }
  }, [navigate])

  const correctCount = results.filter(r => r.isCorrect).length
  const totalCount = results.length
  const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  const handleRetry = () => {
    sessionStorage.removeItem('quizResults')
    navigate({ to: '/practice' })
  }

  if (!results.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0038A8] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => navigate({ to: '/saved-quizzes' })}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Saved Quizzes
          </button>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Quiz Results</h1>
            <div className="mb-6">
              <div className="text-6xl font-bold text-slate-900 mb-2">{scorePercentage}%</div>
              <p className="text-lg text-slate-600">
                {correctCount} out of {totalCount} questions correct
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 bg-[#0038A8] text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              Practice Again
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={result.key} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {result.isCorrect ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                      Question {index + 1}
                    </span>
                    <span className={`text-sm font-medium ${result.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                      {result.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{result.question}</h3>

                  {result.format === 'essay' ? (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">Your Answer:</p>
                        <p className="text-slate-900">{result.userAnswer || 'No answer provided'}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-4">
                        <p className="text-sm font-medium text-emerald-700 mb-2">Sample Answer:</p>
                        <p className="text-emerald-900">{result.correctAnswer}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={`rounded-lg p-4 ${result.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className={`text-sm font-medium mb-2 ${result.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                          Your Answer:
                        </p>
                        <p className={result.isCorrect ? 'text-emerald-900' : 'text-red-900'}>
                          {result.userAnswer || 'No answer selected'}
                        </p>
                      </div>
                      {!result.isCorrect && (
                        <div className="rounded-lg bg-emerald-50 p-4">
                          <p className="text-sm font-medium text-emerald-700 mb-2">Correct Answer:</p>
                          <p className="text-emerald-900">{result.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {result.explanation && (
                    <div className="mt-4 rounded-lg bg-blue-50 p-4">
                      <p className="text-sm text-blue-900">{result.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
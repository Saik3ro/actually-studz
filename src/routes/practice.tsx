import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Copy, Save } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/practice')({
  component: PracticePage,
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
  correct_answer?: string
}

function PracticePage() {
  const navigate = useNavigate()
  const [quizData, setQuizData] = useState<any>(null)
  const [quizPageIndex, setQuizPageIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)

  useEffect(() => {
    const storedQuiz = sessionStorage.getItem('practiceQuiz')
    if (!storedQuiz) {
      navigate({ to: '/saved-quizzes' })
      return
    }

    try {
      const parsedQuiz = JSON.parse(storedQuiz)
      setQuizData(parsedQuiz)
    } catch (err) {
      console.error('Error parsing quiz data:', err)
      toast.error('Failed to load quiz')
      navigate({ to: '/saved-quizzes' })
    }
  }, [navigate])

  const quizItems = useMemo(() => {
    if (!quizData?.quiz_data?.items) return []
    return quizData.quiz_data.items
  }, [quizData])

  const answeredItems = useMemo(() => {
    if (!quizData?.quiz_data?.answered_items) return []
    return quizData.quiz_data.answered_items
  }, [quizData])

  const currentQuizItem = quizItems[quizPageIndex]
  const currentQuizAnswer = answeredItems[quizPageIndex]?.answer

  const allAnswered = quizItems.length > 0 && quizItems.every((item: QuizItem) => {
    const answer = selectedAnswers[item.key]
    return answer !== undefined && answer !== ''
  })

  const handleSelectOption = (itemKey: string, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [itemKey]: value }))
    setShowQuizAnswer(false)
  }

  const handleQuizNext = () => {
    if (quizPageIndex < quizItems.length - 1) {
      setQuizPageIndex((prev) => prev + 1)
    }
  }

  const handleQuizPrev = () => {
    if (quizPageIndex > 0) {
      setQuizPageIndex((prev) => prev - 1)
    }
  }

  const handleQuizSubmit = () => {
    // Calculate score and show results
    const results = quizItems.map((item: QuizItem, index: number) => {
      const userAnswer = selectedAnswers[item.key] ?? ''
      const correctAnswer = answeredItems[index]?.answer
      const normalize = (value: any) => String(value ?? '').trim().toLowerCase()
      const isCorrect = item.format === 'essay' ? false : normalize(userAnswer) === normalize(correctAnswer)

      return {
        ...item,
        userAnswer,
        correctAnswer,
        isCorrect
      }
    })

    sessionStorage.setItem('quizResults', JSON.stringify(results))
    navigate({ to: '/practice-results' })
  }

  const questionTypeLabels = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True or False',
    identification: 'Identification',
    essay: 'Essay'
  }

  if (!quizData || !quizItems.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0038A8] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.35em] text-slate-400">{quizData.title}</div>
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
            ) : currentQuizItem?.format === 'identification' ? (
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={selectedAnswers[currentQuizItem.key] ?? ''}
                  onChange={(e) => handleSelectOption(currentQuizItem.key, e.target.value)}
                  placeholder="Type your answer here"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                />
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
            ) : currentQuizItem?.format === 'essay' ? (
              <div className="sm:col-span-2">
                <textarea
                  value={selectedAnswers[currentQuizItem.key] ?? ''}
                  onChange={(e) => handleSelectOption(currentQuizItem.key, e.target.value)}
                  placeholder="Write your answer here..."
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white resize-none"
                />
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
              Don't know?
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

          {showQuizAnswer && currentQuizAnswer && (
            <div className="mt-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Answer:</strong> {currentQuizAnswer}
              </p>
              {currentQuizItem?.explanation && (
                <p className="text-sm text-blue-900 mt-2">
                  <strong>Explanation:</strong> {currentQuizItem.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
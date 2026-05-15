import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, Calendar, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const Route = createFileRoute('/saved-quizzes')({
  component: SavedQuizzesPage,
})

type SavedQuiz = {
  id: string
  title: string
  quiz_data?: {
    items?: any[]
    answered_items?: any[]
  }
  created_at: string
}

function SavedQuizzesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate({ to: '/auth' })
      return
    }

    fetchSavedQuizzes()
  }, [user, navigate])

  const fetchSavedQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_quizzes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedQuizzes(data || [])
    } catch (err) {
      console.error('Error fetching saved quizzes:', err)
      toast.error('Failed to load saved quizzes')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this saved quiz?')) return

    try {
      const { error } = await supabase
        .from('saved_quizzes')
        .delete()
        .eq('id', quizId)

      if (error) throw error

      setSavedQuizzes(prev => prev.filter(quiz => quiz.id !== quizId))
      toast.success('Quiz deleted successfully')
    } catch (err) {
      console.error('Error deleting quiz:', err)
      toast.error('Failed to delete quiz')
    }
  }

  const handlePracticeQuiz = (quiz: SavedQuiz) => {
    if (!quiz?.quiz_data?.items || quiz.quiz_data.items.length === 0) {
      alert('Quiz data unavailable for practice.')
      return
    }

    // Store quiz data in session storage for practice
    sessionStorage.setItem('practiceQuiz', JSON.stringify(quiz))
    navigate({ to: '/practice' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0038A8] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading saved quizzes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <h1 className="text-4xl font-bold text-slate-900">Saved Quizzes</h1>
          <p className="mt-2 text-lg text-slate-600">Practice with your saved quizzes</p>
        </div>

        {savedQuizzes.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No saved quizzes yet</h3>
            <p className="text-slate-600 mb-6">Save quizzes from the content page to practice later</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="bg-[#0038A8] text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Generate New Content
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {savedQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{quiz.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-slate-600">
                    {quiz.quiz_data?.items?.length ?? 0} questions
                  </p>
                </div>

                <button
                  onClick={() => handlePracticeQuiz(quiz)}
                  disabled={!quiz.quiz_data?.items?.length}
                  className="w-full bg-[#0038A8] text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  Practice Quiz
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

type Props = {
  children: ReactElement
}

export function ProtectedRoute({ children }: Props) {
  const token = useAuthStore((state) => state.token)
  const fetchMe = useAuthStore((state) => state.fetchMe)
  const loading = useAuthStore((state) => state.loading)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return <div className="page-loading">Loading...</div>
  }

  return children
}

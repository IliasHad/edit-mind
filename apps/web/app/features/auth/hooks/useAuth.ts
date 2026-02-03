import { useEffect, useState } from 'react'
import { useNavigate, useFetcher } from 'react-router'
import { useSession } from './useSession'
import type { LoginFormValues } from '~/types/auth'

export function useAuth() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { setSession } = useSession()
  const fetcher = useFetcher<{ error: string }>()

  const handleAuth = async (values: LoginFormValues, endpoint: string) => {
    setError(null)

    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value as string)
    })

    fetcher.submit(formData, { method: 'post', action: endpoint })
  }

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' })
      setSession({ isAuthenticated: false, user: null })
      navigate('/auth/login')
    } catch {
      setError('Failed to logout')
    }
  }
  
  const loading = fetcher.state === 'submitting'

  useEffect(() => {
    if (fetcher.data && 'error' in fetcher.data) {
      setError(fetcher.data.error)
    }
  }, [fetcher.data])

  return {
    loading,
    error,
    handleAuth,
    handleLogout,
  }
}
import { useEffect } from 'react'
import { redirect, useLoaderData, useNavigate, type LoaderFunctionArgs } from 'react-router'
import { useOnboarding } from '~/features/onboarding/hooks/useOnboarding'
import { getUser } from '~/services/user.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)

  if (!user) {
    return { user: null }
  }

  return redirect('/app/home')
}

export default function IndexPage() {
  const { user } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const { isOnboardingComplete } = useOnboarding()

  useEffect(() => {
    if (!user && isOnboardingComplete) {
      navigate('/auth/login')
    } else {
      navigate('/onboarding')
    }
  }, [user, navigate, isOnboardingComplete])

  return null
}

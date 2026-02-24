import { AuthForm } from '~/features/auth/components/AuthForm'
import { FormInput } from '~/features/auth/components/FormInput'
import { SubmitButton } from '~/features/auth/components/SubmitButton'
import { LoginSchema } from '~/features/auth/schemas/auth'
import { AuthHeader } from '~/features/auth/components/AuthHeader'
import { Link, useActionData, useNavigation, type ActionFunctionArgs, type MetaFunction } from 'react-router'
import { login } from '~/services/auth.server'

export const meta: MetaFunction = () => {
  return [{ title: 'Login | Edit Mind' }]
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const values = Object.fromEntries(formData)

  const result = LoginSchema.safeParse(values)
  if (!result.success) {
    return { error: 'Invalid form data', fieldErrors: result.error.flatten().fieldErrors }
  }

  return login(request, result.data)
}

export default function Login() {
  const actionData = useActionData<{ error: string, fieldErrors: { password?: string[], email?: string[] } }>()
  const navigation = useNavigation()

  const loading = navigation.state === 'submitting'

  return (
    <>
      <AuthHeader title="Welcome back" subtitle="Sign in to access your video library" />
      <AuthForm>
        {actionData?.error && <div className="text-red-500 text-sm mt-2">{actionData.error}</div>}
        <FormInput
          name="email"
          type="email"
          placeholder="Email"
          defaultError={actionData?.fieldErrors?.email?.[0]}
        />

        <FormInput
          name="password"
          type="password"
          placeholder="Password"
          defaultError={actionData?.fieldErrors?.password?.[0]}
        />
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-zinc-500">
          Don't have an account?{' '}
          <Link
            to="/auth/register"
            className="text-black dark:text-white font-medium hover:underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
        <SubmitButton loading={loading} text="Sign in" loadingText="Signing in..." />
      </AuthForm>
    </>
  )
}

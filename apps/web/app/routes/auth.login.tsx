import { AuthForm } from '~/features/auth/components/AuthForm'
import { FormInput } from '~/features/auth/components/FormInput'
import { SubmitButton } from '~/features/auth/components/SubmitButton'
import { LoginSchema } from '~/features/auth/schemas/auth'
import { AuthHeader } from '~/features/auth/components/AuthHeader'
import { useActionData, useNavigation, type ActionFunctionArgs, type MetaFunction } from 'react-router'
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
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  const loading = navigation.state === 'submitting'

  return (
    <>
      <AuthHeader title="Welcome back" subtitle="Sign in to access your video library" />
      <AuthForm>
        {actionData?.error && <div className="text-red-500 text-sm mt-2">{actionData.error}</div>}
        <FormInput name="email" type="email" placeholder="Email" />
        <FormInput name="password" type="password" placeholder="Password" />
        <SubmitButton loading={loading} text="Sign in" loadingText="Signing in..." />
      </AuthForm>
    </>
  )
}

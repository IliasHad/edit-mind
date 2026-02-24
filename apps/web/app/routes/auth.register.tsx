import { AuthForm } from '~/features/auth/components/AuthForm'
import { FormInput } from '~/features/auth/components/FormInput'
import { SubmitButton } from '~/features/auth/components/SubmitButton'
import { RegisterSchema } from '~/features/auth/schemas/auth';
import { AuthHeader } from '~/features/auth/components/AuthHeader'
import { Link, useActionData, useNavigation, type ActionFunctionArgs, type MetaFunction } from 'react-router'
import { register } from '~/services/auth.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Register | Edit Mind' }]
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const values = Object.fromEntries(formData)

  const result = RegisterSchema.safeParse(values)
  if (!result.success) {
    return { error: 'Invalid form data', fieldErrors: result.error.flatten().fieldErrors }
  }

  return register(request, result.data)
}

export default function Register() {
  const actionData = useActionData<{ error: string, fieldErrors: { password?: string[], email?: string[], confirmationPassword?: string[], name?: string[] } }>()
  const navigation = useNavigation()

  const loading = navigation.state === 'submitting'

  return (
    <>
      <AuthHeader title="Create your account" subtitle="Sign up to access your video library" />
      <AuthForm>
        {actionData?.error && <div className="text-red-500 text-sm mt-2">{actionData.error}</div>}
        <FormInput
          name="name"
          type="text"
          placeholder="Name"
          label='Name'
          defaultError={actionData?.fieldErrors?.name?.[0]}
        />
        <FormInput
          name="email"
          type="email"
          placeholder="Email"
          label='Email'
          defaultError={actionData?.fieldErrors?.email?.[0]}
        />
        <FormInput
          name="password"
          type="password"
          placeholder="Password"
          defaultError={actionData?.fieldErrors?.password?.[0]}
          label="Password"
        />
        <FormInput
          name="confirmationPassword"
          type="password"
          placeholder="Confirmation Password"
          defaultError={actionData?.fieldErrors?.confirmationPassword?.[0]}
          label='Confirmation Password'
        />
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-zinc-500">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="text-black dark:text-white font-medium hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
        <SubmitButton loading={loading} text="Sign up" loadingText="Signing up..." />
      </AuthForm>
    </>
  )
}
import { AuthForm } from '~/features/auth/components/AuthForm'
import { FormInput } from '~/features/auth/components/FormInput'
import { SubmitButton } from '~/features/auth/components/SubmitButton'
import { LoginSchema } from '~/features/auth/schemas/auth'
import { AuthHeader } from '~/features/auth/components/AuthHeader'
import { Link, useActionData, useNavigation, type ActionFunctionArgs, type MetaFunction } from 'react-router'
import { useTranslation } from 'react-i18next'
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

const authErrorKeyByMessage: Record<string, string> = {
  'Invalid form data': 'auth.errors.invalidFormData',
  'Invalid email or password': 'auth.errors.invalidCredentials',
  'Invalid email address': 'auth.errors.invalidEmail',
  'Password must be at least 4 characters': 'auth.errors.passwordMin',
}

export default function Login() {
  const actionData = useActionData<{ error: string, fieldErrors: { password?: string[], email?: string[] } }>()
  const navigation = useNavigation()
  const { t } = useTranslation()

  const loading = navigation.state === 'submitting'
  const translateAuthError = (message?: string) => message ? t(authErrorKeyByMessage[message] ?? message) : undefined

  return (
    <>
      <AuthHeader title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />
      <AuthForm>
        {actionData?.error && <div className="text-red-500 text-sm mt-2">{translateAuthError(actionData.error)}</div>}
        <FormInput
          name="email"
          type="email"
          placeholder={t('auth.fields.email')}
          label={t('auth.fields.email')}
          defaultError={translateAuthError(actionData?.fieldErrors?.email?.[0])}
        />

        <FormInput
          name="password"
          type="password"
          placeholder={t('auth.fields.password')}
          label={t('auth.fields.password')}
          defaultError={translateAuthError(actionData?.fieldErrors?.password?.[0])}
        />
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-zinc-500">
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/auth/register"
            className="text-black dark:text-white font-medium hover:underline underline-offset-4"
          >
            {t('auth.login.signUp')}
          </Link>
        </p>
        <SubmitButton loading={loading} text={t('auth.login.submit')} loadingText={t('auth.login.submitting')} />
      </AuthForm>
    </>
  )
}

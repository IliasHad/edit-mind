import { AuthForm } from '~/features/auth/components/AuthForm'
import { FormInput } from '~/features/auth/components/FormInput'
import { SubmitButton } from '~/features/auth/components/SubmitButton'
import { RegisterSchema } from '~/features/auth/schemas/auth';
import { AuthHeader } from '~/features/auth/components/AuthHeader'
import { Link, useActionData, useNavigation, type ActionFunctionArgs, type MetaFunction } from 'react-router'
import { useTranslation } from 'react-i18next'
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

const authErrorKeyByMessage: Record<string, string> = {
  'Invalid form data': 'auth.errors.invalidFormData',
  'An account with this email already exists': 'auth.errors.accountExists',
  'Invalid email address': 'auth.errors.invalidEmail',
  'Password must be at least 4 characters': 'auth.errors.passwordMin',
  'Name must be at least 2 characters': 'auth.errors.nameMin',
  'Passwords do not match': 'auth.errors.passwordsMismatch',
}

export default function Register() {
  const actionData = useActionData<{ error: string, fieldErrors: { password?: string[], email?: string[], confirmationPassword?: string[], name?: string[] } }>()
  const navigation = useNavigation()
  const { t } = useTranslation()

  const loading = navigation.state === 'submitting'
  const translateAuthError = (message?: string) => message ? t(authErrorKeyByMessage[message] ?? message) : undefined

  return (
    <>
      <AuthHeader title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} />
      <AuthForm>
        {actionData?.error && <div className="text-red-500 text-sm mt-2">{translateAuthError(actionData.error)}</div>}
        <FormInput
          name="name"
          type="text"
          placeholder={t('auth.fields.name')}
          label={t('auth.fields.name')}
          defaultError={translateAuthError(actionData?.fieldErrors?.name?.[0])}
        />
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
          defaultError={translateAuthError(actionData?.fieldErrors?.password?.[0])}
          label={t('auth.fields.password')}
        />
        <FormInput
          name="confirmationPassword"
          type="password"
          placeholder={t('auth.fields.confirmationPassword')}
          defaultError={translateAuthError(actionData?.fieldErrors?.confirmationPassword?.[0])}
          label={t('auth.fields.confirmationPassword')}
        />
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-zinc-500">
          {t('auth.register.hasAccount')}{' '}
          <Link
            to="/auth/login"
            className="text-black dark:text-white font-medium hover:underline underline-offset-4"
          >
            {t('auth.register.signIn')}
          </Link>
        </p>
        <SubmitButton loading={loading} text={t('auth.register.submit')} loadingText={t('auth.register.submitting')} />
      </AuthForm>
    </>
  )
}
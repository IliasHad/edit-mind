const auth = {
  sidebar: {
    titleLine1: 'Organize your',
    titleHighlight: 'video library',
    titleLine3: 'with AI',
    description:
      'Deep indexing, natural language search, and automatic rough cuts — all processed locally on your machine.',
  },
  fields: {
    name: 'Name',
    email: 'Email',
    password: 'Password',
    confirmationPassword: 'Confirmation Password',
  },
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to access your video library',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    submit: 'Sign in',
    submitting: 'Signing in…',
  },
  register: {
    title: 'Create your account',
    subtitle: 'Sign up to access your video library',
    hasAccount: 'Already have an account?',
    signIn: 'Sign in',
    submit: 'Sign up',
    submitting: 'Signing up…',
  },
  forgotPassword: 'Forgot password?',
  terms: {
    prefix: 'By creating an account, you agree to our',
    terms: 'Terms',
    and: 'and',
    privacy: 'Privacy Policy',
  },
  errors: {
    invalidFormData: 'Invalid form data',
    invalidCredentials: 'Invalid email or password',
    accountExists: 'An account with this email already exists',
    invalidEmail: 'Invalid email address',
    passwordMin: 'Password must be at least 4 characters',
    nameMin: 'Name must be at least 2 characters',
    passwordsMismatch: 'Passwords do not match',
  },
} as const

export default auth

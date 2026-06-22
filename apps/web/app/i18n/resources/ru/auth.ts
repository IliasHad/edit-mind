const auth = {
  sidebar: {
    titleLine1: 'Организуйте свою',
    titleHighlight: 'видеотеку',
    titleLine3: 'с помощью ИИ',
    description:
      'Глубокая индексация, поиск на естественном языке и автоматические черновые монтажи — всё локально на вашем компьютере.',
  },
  fields: {
    name: 'Имя',
    email: 'Email',
    password: 'Пароль',
    confirmationPassword: 'Подтверждение пароля',
  },
  login: {
    title: 'С возвращением',
    subtitle: 'Войдите, чтобы открыть свою видеотеку',
    noAccount: 'Нет аккаунта?',
    signUp: 'Зарегистрироваться',
    submit: 'Войти',
    submitting: 'Вход…',
  },
  register: {
    title: 'Создайте аккаунт',
    subtitle: 'Зарегистрируйтесь, чтобы открыть свою видеотеку',
    hasAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
    submit: 'Зарегистрироваться',
    submitting: 'Регистрация…',
  },
  forgotPassword: 'Забыли пароль?',
  terms: {
    prefix: 'Создавая аккаунт, вы соглашаетесь с нашими',
    terms: 'Условиями',
    and: 'и',
    privacy: 'Политикой конфиденциальности',
  },
  errors: {
    invalidFormData: 'Некорректные данные формы',
    invalidCredentials: 'Неверный email или пароль',
    accountExists: 'Аккаунт с таким email уже существует',
    invalidEmail: 'Некорректный email',
    passwordMin: 'Пароль должен содержать минимум 4 символа',
    nameMin: 'Имя должно содержать минимум 2 символа',
    passwordsMismatch: 'Пароли не совпадают',
  },
} as const

export default auth

import clsx from 'clsx'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'outline' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    const baseStyles = clsx(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap',
      'transition-all duration-150 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'text-base',
      '[&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0 [&_svg]:transition-transform'
    )

    const variantStyles = {
      primary: clsx(
        'bg-black dark:bg-white',
        'text-white dark:text-black',
        'shadow-sm dark:shadow-md',
        'hover:bg-zinc-800 dark:hover:bg-zinc-100',
        'hover:shadow-md dark:hover:shadow-lg',
        'focus-visible:ring-black dark:focus-visible:ring-white',
        'rounded-xl'
      ),
      secondary: clsx(
        'bg-zinc-100 dark:bg-zinc-800',
        'text-black dark:text-white',
        'border border-zinc-200 dark:border-zinc-700',
        'backdrop-blur-xl backdrop-saturate-150',
        'hover:bg-zinc-200 dark:hover:bg-zinc-700',
        'hover:border-zinc-300 dark:hover:border-zinc-600',
        'focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400',
        'shadow-sm',
        'rounded-xl'
      ),
      tertiary: clsx(
        'bg-linear-to-b from-purple-900 to-purple-950 dark:from-purple-800 dark:to-purple-900',
        'text-white',
        'shadow-md dark:shadow-lg',
        'hover:from-purple-800 hover:to-purple-900 dark:hover:from-purple-700 dark:hover:to-purple-800',
        'hover:shadow-lg dark:hover:shadow-xl',
        'focus-visible:ring-purple-600 dark:focus-visible:ring-purple-500',
        'border border-purple-800 dark:border-purple-700',
        'rounded-xl'
      ),
      destructive: clsx(
        'bg-red-500 dark:bg-red-500',
        'text-white dark:text-black',
        'shadow-md dark:shadow-lg',
        'hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800',
        'hover:shadow-lg dark:hover:shadow-xl',
        'focus-visible:ring-red-500 dark:focus-visible:ring-red-600',
        'rounded-xl'
      ),
      outline: clsx(
        'border-2 border-zinc-300 dark:border-zinc-700',
        'bg-transparent',
        'text-black dark:text-white',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
        'hover:border-zinc-400 dark:hover:border-zinc-600',
        'focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400',
        'rounded-xl'
      ),
      ghost: clsx(
        'bg-transparent',
        'text-black dark:text-white',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
        'active:bg-zinc-200 dark:active:bg-zinc-700',
        'focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400',
        'rounded-xl'
      ),
      link: clsx(
        'bg-transparent',
        'text-black dark:text-white',
        'underline-offset-4 hover:underline',
        'focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400',
        'px-0 h-auto',
        'active:scale-100'
      ),
    }

    const sizeStyles = {
      sm: 'h-8 px-3 text-sm gap-1.5 leading-none',
      default: 'h-10 px-4 text-base gap-2 leading-none',
      lg: 'h-11 px-5 text-lg gap-2 leading-none',
      xl: 'h-12 px-6 text-xl gap-2.5 leading-none',
      icon: 'h-10 w-10 p-0',
      'icon-sm': 'h-8 w-8 p-0',
      'icon-lg': 'h-11 w-11 p-0',
    }

    const buttonClasses = clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)

    return (
      <button ref={ref} type={type} className={buttonClasses} disabled={isDisabled} {...props}>
        {loading && (
          <ArrowPathIcon 
            className="w-4 h-4 animate-spin" 
            aria-hidden="true" 
          />
        )}
        {!loading && leftIcon && (
          <span className="flex items-center justify-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children && <span className="leading-none">{children}</span>}
        {!loading && rightIcon && (
          <span className="flex items-center justify-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
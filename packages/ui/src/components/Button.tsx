import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'link' | 'glass'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      fullWidth = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        className={twMerge(
          'inline-flex items-center justify-center gap-2',
          'font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'active:scale-[0.98]',
          '[&_svg]:shrink-0',

          fullWidth && 'w-full',

          getVariantStyles(variant),

          getSizeStyles(size),

          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <ArrowPathIcon className="animate-spin w-4" aria-hidden="true" />
        ) : (
          leftIcon && <span aria-hidden="true">{leftIcon}</span>
        )}

        {children && children}

        {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

function getVariantStyles(variant: ButtonProps['variant']): string {
  const variants = {
    primary: twMerge(
      'bg-white dark:bg-white',
      'text-black dark:text-black',
      'rounded-xl',
      'hover:bg-white/90 dark:hover:bg-white/90',
      'shadow-sm',
      'focus-visible:ring-white dark:focus-visible:ring-white',
      'focus-visible:ring-offset-black dark:focus-visible:ring-offset-transparent'
    ),

    secondary: twMerge(
      'bg-black dark:bg-black',
      'text-white dark:text-white',
      'rounded-xl',
      'hover:bg-black/90 dark:hover:bg-black/90',
      'shadow-sm',
      'focus-visible:ring-black dark:focus-visible:ring-black',
      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-transparent'
    ),

    ghost: twMerge(
      'bg-white/5 dark:bg-white/5',
      'text-black dark:text-white',
      'border border-black/10 dark:border-white/10',
      'rounded-xl',
      'hover:bg-black/5 dark:hover:bg-white/10',
      'hover:border-black/20 dark:hover:border-white/20',
      'focus-visible:ring-black/50 dark:focus-visible:ring-white/50',
      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-transparent'
    ),

    glass: twMerge(
      'bg-white/5 dark:bg-white/5',
      'text-black dark:text-white',
      'border border-white/10',
      'rounded-xl',
      'backdrop-blur-sm',
      'hover:bg-white/[0.07]',
      'hover:border-white/20',
      'focus-visible:ring-white/50',
      'focus-visible:ring-offset-transparent'
    ),

    destructive: twMerge(
      'bg-red-500/10 dark:bg-red-500/10',
      'text-red-600 dark:text-red-400',
      'border border-red-500/30',
      'rounded-xl',
      'hover:bg-red-500/20',
      'hover:border-red-500/50',
      'focus-visible:ring-red-500/50',
      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-transparent'
    ),

    outline: twMerge(
      'bg-transparent',
      'text-black dark:text-white',
      'border border-black/20 dark:border-white/20',
      'rounded-xl',
      'hover:bg-black/5 dark:hover:bg-white/5',
      'hover:border-black/30 dark:hover:border-white/30',
      'focus-visible:ring-black/50 dark:focus-visible:ring-white/50',
      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-transparent'
    ),

    link: twMerge(
      'bg-transparent',
      'text-black dark:text-white',
      'underline-offset-4',
      'hover:underline',
      'focus-visible:ring-black/50 dark:focus-visible:ring-white/50',
      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-transparent',
      'px-0 h-auto',
      'active:scale-100'
    ),
  }

  return variants[variant || 'primary']
}

function getSizeStyles(size: ButtonProps['size']): string {
  const sizes = {
    xs: 'p-1.5 text-xs gap-1.5 [&_svg]:w-3 [&_svg]:h-3',
    sm: 'p-2 text-sm gap-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5',
    md: 'p-3 text-sm gap-2 [&_svg]:w-4 [&_svg]:h-4',
    lg: 'p-4 text-base gap-2 [&_svg]:w-4 [&_svg]:h-4',
    xl: 'p-5 text-base gap-2.5 [&_svg]:w-5 [&_svg]:h-5',
    'icon-xs': 'h-7 w-7 p-0 [&_svg]:w-3 [&_svg]:h-3',
    'icon-sm': 'h-8 w-8 p-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
    'icon-md': 'h-10 w-10 p-0 [&_svg]:w-4 [&_svg]:h-4',
    'icon-lg': 'h-11 w-11 p-0 [&_svg]:w-5 [&_svg]:h-5',
  }

  return sizes[size || 'md']
}

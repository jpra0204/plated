import React from 'react'
import clsx from 'clsx'
import { useIsMobile } from '@/hooks/useIsMobile'

type Variant = 'primary' | 'secondary' | 'tertiary'
type Size = 'sm' | 'md' | 'lg' | 'responsive'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isMobile?: boolean
  isLoading?: boolean
  children: React.ReactNode
  className?: string
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  isMobile,
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) => {
  const isMobileDevice = isMobile ?? useIsMobile()
  const finalSize = size === 'responsive' || isMobileDevice ? 'responsive' : size

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg border-none transition-all duration-200 ease-in-out cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles: Record<Variant, string> = {
    primary: 'bg-primary text-white hover:bg-accent hover:text-text-primary',
    secondary: 'bg-background-secondary text-primary border-2 border-primary hover:bg-primary hover:text-white',
    tertiary: 'bg-transparent text-primary uppercase text-sm px-4 py-2 hover:underline',
  }

  const sizeStyles: Record<Size, string> = {
    sm: 'text-sm py-2 px-4',
    md: 'text-base py-3 px-6',
    lg: 'text-lg py-3.5 px-8',
    responsive: 'text-[clamp(0.875rem,2.5vw,1.125rem)] py-[clamp(0.5rem,2vw,0.875rem)] px-[clamp(1rem,4vw,2rem)]',
  }

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[finalSize], className)}
      {...props}
    >
      {isLoading ? <span className="animate-pulse">Loading...</span> : children}
    </button>
  )
}

import React from 'react'
import clsx from 'clsx'
import { useIsMobile } from '@/hooks/useIsMobile'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  name: string
  isMobile?: boolean
}

export const Input = ({
  label,
  error,
  name,
  className,
  isMobile,
  ...props
}: InputProps) => {
  const mobile = isMobile ?? useIsMobile()

  const inputClasses = clsx(
    'w-full font-sans text-text-primary rounded-lg transition-colors',
    'bg-white border border-[#CED4DA] focus:border-2 focus:border-primary focus:outline-none',
    'placeholder:text-[#ADB5BD]',
    mobile ? 'text-sm px-3 py-2' : 'text-base px-4 py-3',
    error && 'border-red-500',
    className
  )

  const labelClasses = clsx(
    'font-medium text-text-primary',
    mobile ? 'text-sm' : 'text-base'
  )

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={name} className={labelClasses}>
          {label}
        </label>
      )}
      <input id={name} name={name} className={inputClasses} {...props} />
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  )
}

import React from 'react'
import clsx from 'clsx'

type TypographyVariant =
  | 'headerTitle'
  | 'headerSubtitle'
  | 'sectionTitle'
  | 'bodyTitle'
  | 'bodySubtitle'
  | 'bodyText'
  | 'smallText'

type TypographyProps = {
  as?: React.ElementType
  variant: TypographyVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<TypographyVariant, string> = {
  headerTitle: 'text-[clamp(2rem,6vw,4rem)] font-bold leading-[1.2] text-text-primary',
  headerSubtitle: 'text-[clamp(1.125rem,4vw,1.5rem)] font-medium leading-[1.4] text-text-secondary',
  sectionTitle: 'text-[clamp(1.375rem,2vw,1.75rem)] font-semibold leading-[1.3] text-text-primary',
  bodyTitle: 'text-[clamp(1.125rem,1.5vw,1.25rem)] font-semibold leading-[1.3] text-text-primary',
  bodySubtitle: 'text-[clamp(1rem,1.25vw,1.125rem)] font-medium leading-[1.4] text-[#495057]',
  bodyText: 'text-base font-normal leading-[1.5] text-text-primary',
  smallText: 'text-sm font-normal leading-[1.5] text-[#868E96]',
}

export const Typography = ({
  as,
  variant,
  children,
  className,
}: TypographyProps) => {

    const Element: React.ElementType = as ?? 'p'
    return (
    <Element className={clsx(variantClasses[variant], className)}>
        {children}
    </Element>
  )
}

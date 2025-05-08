import React from 'react'
import clsx from 'clsx'
import { useIsMobile } from '@/hooks/useIsMobile'

interface PageWrapperProps {
  children: React.ReactNode
  isMobile?: boolean
}

export const PageWrapper = ({ children, isMobile }: PageWrapperProps) => {
    const mobile = isMobile ?? useIsMobile()

    return (
    <div
        className={clsx('w-full max-w-screen-xl mx-auto', mobile ? 'px-4 py-6' : 'px-8 py-12')}
        data-testid="page-wrapper"
    >
        {children}
    </div>
    )
}

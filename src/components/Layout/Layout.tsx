import React, { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface LayoutProps {
  children: ReactNode
  isMobile?: boolean
}

export const Layout = ({ children, isMobile }: LayoutProps) => {
  const mobile = isMobile ?? useIsMobile()

  return (
    <main
      className="min-h-screen bg-black text-gray-900 font-sans px-4 md:px-8"
      data-testid={mobile ? 'layout-mobile' : 'layout-desktop'}
    >
      {/* Add MobileNav/DesktopNav later based on `mobile` */}
      {children}
    </main>
  )
}

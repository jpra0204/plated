import React from 'react'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <main className="min-h-screen bg-black text-gray-900 font-sans px-4 md:px-8">
      {/* You can add Header, Footer, Nav here later */}
      {children}
    </main>
  )
}

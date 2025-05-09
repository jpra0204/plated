import React from 'react'
import { render, screen } from '@testing-library/react'
import { Layout } from '@/components/Layout/Layout'

describe('Layout', () => {
  it('renders children correctly', () => {
    render(
      <Layout>
        <p>Inside layout</p>
      </Layout>
    )
    expect(screen.getByText('Inside layout')).toBeInTheDocument()
  })

  it('uses desktop layout when isMobile is false', () => {
    render(
      <Layout isMobile={false}>
        <p>Desktop content</p>
      </Layout>
    )
    const layout = screen.getByTestId('layout-desktop')
    expect(layout).toBeInTheDocument()
  })

  it('uses mobile layout when isMobile is true', () => {
    render(
      <Layout isMobile>
        <p>Mobile content</p>
      </Layout>
    )
    const layout = screen.getByTestId('layout-mobile')
    expect(layout).toBeInTheDocument()
  })
})

import React from 'react'
import { render, screen } from '@testing-library/react'
import { PageWrapper } from '@/components/Layout/PageWrapper'

describe('PageWrapper', () => {
  it('renders children correctly', () => {
    render(
      <PageWrapper>
        <p>Wrapped content</p>
      </PageWrapper>
    )
    expect(screen.getByText('Wrapped content')).toBeInTheDocument()
  })

  it('uses mobile layout when isMobile is true', () => {
    render(
      <PageWrapper isMobile>
        <p>Mobile view</p>
      </PageWrapper>
    )
    const wrapper = screen.getByTestId('page-wrapper')
    expect(wrapper).toHaveClass('px-4', 'py-6')
  })

  it('uses desktop layout when isMobile is false', () => {
    render(
      <PageWrapper isMobile={false}>
        <p>Desktop view</p>
      </PageWrapper>
    )
    const wrapper = screen.getByTestId('page-wrapper')
    expect(wrapper).toHaveClass('px-8', 'py-12')
  })
})

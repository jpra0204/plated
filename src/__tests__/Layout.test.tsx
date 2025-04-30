import React from 'react'
import { render, screen } from '@testing-library/react'
import { Layout } from '@/components/Layout/Layout'

describe('Layout', () => {
  it('renders children inside the layout', () => {
    render(
      <Layout>
        <p>Test content inside layout</p>
      </Layout>
    )

    expect(screen.getByText('Test content inside layout')).toBeInTheDocument()
  })
})

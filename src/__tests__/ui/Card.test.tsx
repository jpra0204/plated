import React from 'react'
import { render, screen } from '@testing-library/react'
import { Card } from '@/components/ui/Card'

describe('Card', () => {
  it('renders title, subtitle, and text', () => {
    render(
      <Card
        title="Banana Bread"
        subtitle="1 hr • Beginner"
        text="Moist, easy, and crowd-pleasing"
      />
    )

    expect(screen.getByText('Banana Bread')).toBeInTheDocument()
    expect(screen.getByText('1 hr • Beginner')).toBeInTheDocument()
    expect(screen.getByText('Moist, easy, and crowd-pleasing')).toBeInTheDocument()
  })

  it('renders image placeholder when no imageSrc is provided', () => {
    render(<Card title="No Image Title" />)
    expect(screen.getByText('Image Placeholder')).toBeInTheDocument()
  })

  it('applies mobile layout when isMobile is true', () => {
    render(<Card title="Mobile Test" isMobile />)

    const card = screen.getByText('Mobile Test').closest('div')
    const image = screen.getByText('Image Placeholder').closest('div')

    expect(card).toHaveClass('p-4', 'gap-2')
    expect(image).toHaveClass('h-32')
  })

  it('applies desktop layout when isMobile is false', () => {
    render(<Card title="Desktop Test" isMobile={false} />)

    const card = screen.getByText('Desktop Test').closest('div')
    const image = screen.getByText('Image Placeholder').closest('div')

    expect(card).toHaveClass('p-6', 'gap-3')
    expect(image).toHaveClass('h-40')
  })
})

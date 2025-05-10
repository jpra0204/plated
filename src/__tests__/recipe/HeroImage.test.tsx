import React from 'react'
import { render, screen } from '@testing-library/react'
import { HeroImage } from '@/components/recipe/HeroImage'

jest.mock('next/image', () => (props: any) => {
  // Mock next/image with a basic img element
  return <img {...props} />
})

describe('HeroImage', () => {
  it('renders a Next.js Image with correct alt and src', () => {
    render(<HeroImage src="/images/test.jpg" alt="Delicious dish" />)

    const image = screen.getByAltText('Delicious dish')
    expect(image).toBeInTheDocument()
    expect(image.tagName).toBe('IMG')
    expect(image).toHaveAttribute('src', '/images/test.jpg')
  })
})

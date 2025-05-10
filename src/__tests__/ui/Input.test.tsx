import React from 'react'
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('renders label and input', () => {
    render(<Input name="recipe" label="Recipe Name" placeholder="e.g. Pasta" />)
    expect(screen.getByLabelText('Recipe Name')).toBeInTheDocument()
  })

  it('renders an error message if provided', () => {
    render(<Input name="recipe" label="Recipe Name" error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('applies placeholder text', () => {
    render(<Input name="recipe" placeholder="e.g. Pasta" />)
    expect(screen.getByPlaceholderText('e.g. Pasta')).toBeInTheDocument()
  })

  it('applies mobile classes when isMobile is true', () => {
    render(
      <Input
        name="recipe"
        label="Recipe Name"
        placeholder="e.g. Pasta"
        isMobile
      />
    )

    const input = screen.getByPlaceholderText('e.g. Pasta')
    const label = screen.getByText('Recipe Name')

    expect(input).toHaveClass('text-sm', 'px-3', 'py-2')
    expect(label).toHaveClass('text-sm')
  })

  it('applies desktop classes when isMobile is false', () => {
    render(
      <Input
        name="recipe"
        label="Recipe Name"
        placeholder="e.g. Pasta"
        isMobile={false}
      />
    )

    const input = screen.getByPlaceholderText('e.g. Pasta')
    const label = screen.getByText('Recipe Name')

    expect(input).toHaveClass('text-base', 'px-4', 'py-3')
    expect(label).toHaveClass('text-base')
  })
})

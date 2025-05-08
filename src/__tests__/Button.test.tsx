import React from 'react'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders button content', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('displays loading text when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('disables the button when disabled is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    screen.getByText('Click Me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick handler when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click Me</Button>);
    screen.getByText('Click Me').click();
    expect(handleClick).toHaveBeenCalledTimes(0);
  });

  it('renders the button in mobile size when isMobile is true', () => {
    render(<Button size="responsive" isMobile>Click Me</Button>)
    expect(screen.getByText('Click Me')).toHaveClass('text-[clamp(0.875rem,2.5vw,1.125rem)] py-[clamp(0.5rem,2vw,0.875rem)] px-[clamp(1rem,4vw,2rem)]')
  })
})

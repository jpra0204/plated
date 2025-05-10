import React from 'react'
import { render, screen } from '@testing-library/react'
import { MetadataItem } from '@/components/recipe/MetadataItem'

describe('MetadataItem', () => {
    it('renders the label and value', () => {
    render(<MetadataItem label="Servings" value="2" />)
    expect(screen.getByText('Servings')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    })
    it('renders the icon if provided', () => {
        const icon = <span data-testid="icon">🍽️</span>
        render(<MetadataItem label="Servings" value="2" icon={icon} />)
        expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('does not render an icon if not provided', () => {
        render(<MetadataItem label="Servings" value="2" />)
        expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    })
})

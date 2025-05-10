import React from 'react'
import { Typography } from '@/components/ui/Typography'

interface IngredientGroupProps {
  groupTitle: string
  ingredients: string[]
}

export const IngredientGroup = ({ groupTitle, ingredients }: IngredientGroupProps) => {
  return (
    <section className="mb-8" data-testid="ingredient-group">
      <Typography as="h3" variant="bodyTitle" className="mb-4">
        {groupTitle}
      </Typography>

      <ul className="list-disc pl-5 space-y-2">
        {ingredients.map((item, index) => (
          <li key={index} className="text-base text-text-primary">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

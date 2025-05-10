import React from 'react'
import { HeroImage } from './HeroImage'
import { Typography } from '@/components/ui/Typography'

interface SingleRecipePageProps {
  recipe: {
    title: string
    imageSrc: string
    imageAlt: string
    shortDescription: string
    metadata: { label: string; value: string }[]
    ingredientGroups: { groupTitle: string; ingredients: string[] }[]
    steps: string[]
    notes?: string
    tags: string[]
    author: string
    isSaved: boolean
  }
}

export const SingleRecipePage = ({ recipe }: SingleRecipePageProps) => {
  return (
    <article className="max-w-[680px] mx-auto px-4 md:px-8 pb-12">
      
    <Typography as="h1" variant="headerTitle" className="text-center md:text-left mt-8 mb-6">
            {recipe.title}
        </Typography>
      <HeroImage src={recipe.imageSrc} alt={recipe.imageAlt} />
    </article>
  )
}



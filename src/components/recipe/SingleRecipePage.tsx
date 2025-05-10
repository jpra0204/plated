import React from 'react'
import { HeroImage } from './HeroImage'
import { Typography } from '@/components/ui/Typography'
import { MetadataItem } from './MetadataItem'

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
        <Typography as="p" variant="bodySubtitle" className="text-center max-w-[60ch] mx-auto mb-8">
            {recipe.shortDescription}
        </Typography>
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {recipe.metadata.map((item, index) => (
                <MetadataItem key={index} label={item.label} value={item.value} />
            ))}
        </section>
    </article>
  )
}



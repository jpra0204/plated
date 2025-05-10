import React from 'react'
import {SingleRecipePage} from '@/components/recipe/SingleRecipePage'
import { mockRecipe } from '@/data/mockRecipe'

const PageRecipe = () => {
  
  return (
    <SingleRecipePage recipe={mockRecipe} />
  )
}

export default PageRecipe
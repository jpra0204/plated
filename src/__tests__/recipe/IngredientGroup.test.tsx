import React from "react";
import { render, screen } from "@testing-library/react";
import { IngredientGroup } from "@/components/recipe/IngredientGroup";

describe("IngredientGroup", () => {
    it("renders the group title and the ingredients and the main component", () => {
        const ingredientGroups = {
            groupTitle: 'For the Sauce',
            ingredients: [
                '2 large eggs',
                '1/2 cup grated Pecorino Romano',
                'Freshly ground black pepper',
            ]
        }
        render(<IngredientGroup groupTitle={ingredientGroups.groupTitle} ingredients={ingredientGroups.ingredients} />);
    
        expect(screen.getByText(ingredientGroups.groupTitle)).toBeInTheDocument();
        expect(screen.getByText(ingredientGroups.ingredients[0])).toBeInTheDocument();
        expect(screen.getByText(ingredientGroups.ingredients[1])).toBeInTheDocument();
        expect(screen.getByText(ingredientGroups.ingredients[2])).toBeInTheDocument();
        expect(screen.getByTestId('ingredient-group')).toBeInTheDocument();
    });
});
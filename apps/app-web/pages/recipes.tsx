"use client";
import { useEffect, useState } from "react";

interface Recipe {
    _id: string;
    title: string;
    servings: number;
    cookingTime: string;
    difficulty: string;
    cuisine: string;
    ingredients: string[];
    steps: string[];
    createdAt: string;
}

export default function MyRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    useEffect(() => {
        fetch("/api/recipes")
        .then((res) => res.json())
        .then(setRecipes);
    }, []);

    return (
        <div className="p-md">
            <h1 className="font-headline text-primary mb-md">My Recipes</h1>
            {recipes.length === 0 ? (
            <p>No recipes saved yet.</p>
            ) : (
            recipes.map((recipe) => (
                <div key={recipe._id} className="mb-lg p-md bg-background rounded-lg">
                    <h2 className="text-h1 font-headline">{recipe.title}</h2>
                    <p className="text-body-sm">
                        {recipe.cuisine} · {recipe.difficulty} · {recipe.cookingTime}
                    </p>
                    <h3 className="font-headline text-primary mb-xs">Ingredients</h3>
                    <ul className="list-disc pl-md mb-md">
                        {recipe.ingredients.map((ing, i) => (
                            <li key={i}>{ing}</li>
                        ))}
                    </ul>

                    <h3 className="font-headline text-primary mb-xs">Steps</h3>
                    <ol className="list-decimal pl-md">
                        {recipe.steps.map((step, i) => (
                            <li key={i} className="mb-xs">
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>
            ))
            )}
        </div>
    );
}

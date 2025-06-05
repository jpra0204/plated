"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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
    const { data: session, status } = useSession();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // If auth status is still "loading", do nothing yet
        if (status !== "authenticated") return;
    
        // Now we know status === "authenticated", so fetch
        setLoading(true);
        fetch("/api/recipes")
          .then((res) => {
            if (!res.ok) {
              // possible server error or no recipes
              return [];
            }
            return res.json();
          })
          .then((data) => {
            setRecipes(Array.isArray(data) ? data : []);
          })
          .catch(() => {
            setRecipes([]);
          })
          .finally(() => {
            setLoading(false);
          });
    }, [status]);

    if (status === "loading") {
        return (
            <div className="p-md">
              <h1 className="font-headline text-primary mb-md">My Recipes</h1>
              <p>Loading…</p>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
          <div className="p-md">
            <h1 className="font-headline text-primary mb-md">My Recipes</h1>
            <p>Please log in to see your saved recipes.</p>
          </div>
        );
    }

    if (loading) {
        return (
          <div className="p-md">
            <h1 className="font-headline text-primary mb-md">My Recipes</h1>
            <p>Loading…</p>
          </div>
        );
    }

    if (recipes.length === 0) {
        return (
            <div className="p-md">
                <h1 className="font-headline text-primary mb-md">My Recipes</h1>
                <p>No recipes saved yet.</p>
            </div>
        );
    }



    return (
        <div className="p-md">
            <h1 className="font-headline text-primary mb-md">My Recipes</h1>
            { recipes.map((recipe) => (
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
            ))}
        </div>
    );
}

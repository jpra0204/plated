"use client";

import Link from "next/link";
import { useState } from "react";

type Mood = "healthy" | "comfort" | "fancy";
interface Recipe {
    title: string;
    servings: number;
    ingredients: string[];
    steps: string[];
    cookingTime: string;
    difficulty: string;
    cuisine: string;
}

export default function PlatedChef() {
    // State variables
    const [mood, setMood] = useState<Mood>("healthy");
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generate = async () => {
        // Reset state
        setLoading(true);
        setError(null);
        setRecipe(null);

        try {
            const res = await fetch("/api/chef", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mood }),
            });
            if (!res.ok) {
            const { error: msg } = (await res.json()) as { error: string };
            throw new Error(msg || res.statusText);
            }
            const data = (await res.json()) as Recipe;
            setRecipe(data);
        } catch (err: any) {
            console.error("Chef error:", err);
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-md">
            <h1 className="font-headline text-primary mb-md">Plated Chef</h1>

            {/* Mood selector */}
            <div className="flex gap-sm mb-md">
                {(["healthy", "comfort", "fancy"] as Mood[]).map((m) => (
                    <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-md py-sm rounded-md ${
                        mood === m ? "bg-primary text-white" : "bg-background"
                    }`}
                    >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                ))}
            </div>

            {/* Generate button */}
            <button
                onClick={generate}
                disabled={loading}
                className="bg-secondary text-white px-lg py-sm rounded-md mb-lg"
            >
                { loading ? "Cooking…" : "Generate recipe" }
            </button>

            {/* Error */}
            {error && (
                <p className="text-secondary mb-md">⚠️ {error}</p>
            )}

            {/* Recipe card */}
            {recipe && (
                <div className="p-md bg-background rounded-lg">
                    <h2 className="text-h1 font-headline mb-sm">{recipe.title}</h2>
                    <p className="text-body-sm mb-md">Servings: {recipe.servings}</p>
                    <p className="text-body-sm mb-md">Cooking time: {recipe.cookingTime}</p>
                    <p className="text-body-sm mb-md">Difficulty: {recipe.difficulty}</p>
                    <p className="text-body-sm mb-md">Cuisine: {recipe.cuisine}</p>

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
                    <button className="mt-md bg-primary text-white px-lg py-sm rounded-md"
                        onClick={async () => {
                            await fetch("/api/recipes", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(recipe),
                            });
                            alert("Recipe saved!");
                        }}>
                        Save this recipe
                    </button>
                    <br />
                    <Link href="/cookbook">My Recipes</Link>
                </div>
            )}
        </div>
    );
}
